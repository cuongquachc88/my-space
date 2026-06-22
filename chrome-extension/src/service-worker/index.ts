const OFFSCREEN_URL = chrome.runtime.getURL('src/offscreen/index.html')

async function ensureOffscreen(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [OFFSCREEN_URL],
  })
  if (existing.length === 0) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'PGlite WASM database host',
    })
  }
}

async function sendToOffscreen(msg: unknown): Promise<unknown> {
  await ensureOffscreen()
  return chrome.runtime.sendMessage({ ...(msg as object), target: 'offscreen' })
}

// Open side panel on extension icon click
chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.sidePanel.open({ tabId: tab.id })
})

// Message router
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target === 'offscreen') return false

  const offscreenTypes = [
    'NOTES_LIST','NOTES_GET','NOTES_CREATE','NOTES_UPDATE','NOTES_DELETE',
    'VAULT_UNLOCK','VAULT_LOCK','VAULT_STATUS',
    'SECRETS_LIST','SECRETS_GET','SECRETS_CREATE','SECRETS_UPDATE','SECRETS_DELETE',
    'SUBS_LIST','SUBS_GET','SUBS_CREATE','SUBS_UPDATE','SUBS_DELETE',
    'DB_EXPORT','DB_IMPORT',
    'STACKS_LIST','STACKS_CREATE','STACKS_UPDATE','STACKS_DELETE',
    'PINS_LIST','PINS_CREATE','PINS_UPDATE','PINS_DELETE',
    'TODO_LISTS_LIST','TODO_LISTS_CREATE','TODO_LISTS_UPDATE','TODO_LISTS_DELETE',
    'TODO_TASKS_LIST','TODO_TASKS_CREATE','TODO_TASKS_UPDATE','TODO_TASKS_DELETE',
    'BILLS_LIST_MONTH','BILLS_LIST_SUB','BILLS_UPSERT','BILLS_DELETE','BILLS_GET_ALL',
  ]
  if (offscreenTypes.includes(msg.type)) {
    sendToOffscreen(msg).then(sendResponse).catch(e =>
      sendResponse({ ok: false, error: String(e) })
    )
    return true
  }

  if (msg.type === 'MAP_PIN_CAPTURE') {
    // Forward extracted pin from content script to the sidepanel
    chrome.runtime.sendMessage({ type: 'MAP_PIN_FROM_PAGE', payload: msg.payload })
      .catch(() => {/* sidepanel not open */})
    sendResponse({ ok: true })
    return false
  }

  if (msg.type === 'SYNC_STATUS') {
    chrome.storage.local.get(['driveConnected', 'syncedAt']).then(res => {
      sendResponse({ ok: true, data: { connected: !!res.driveConnected, lastSync: res.syncedAt ?? null } })
    })
    return true
  }

  if (msg.type === 'SYNC_CONNECT') {
    handleConnect()
      .then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e) }))
    return true
  }

  if (msg.type === 'SYNC_PUSH') {
    handlePush().then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e) }))
    return true
  }

  if (msg.type === 'SYNC_PULL') {
    handlePull().then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e) }))
    return true
  }

  if (msg.type === 'SYNC_PULL_CONFIRM') {
    const { password } = msg.payload as { password: string }
    handlePullConfirm(password).then(sendResponse).catch(e => sendResponse({ ok: false, error: String(e) }))
    return true
  }
})

// --- OAuth helpers ---

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata']

function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive, scopes: SCOPES }, result => {
      const token = typeof result === 'string' ? result : (result as { token?: string })?.token
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Auth failed'))
      } else {
        resolve(token)
      }
    })
  })
}

async function handleConnect(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getAuthToken(true)
    await chrome.storage.local.set({ driveConnected: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function getAccessToken(): Promise<string> {
  const { driveConnected } = await chrome.storage.local.get('driveConnected')
  if (!driveConnected) throw new Error('Not connected to Google Drive — connect first')
  return getAuthToken(false)
}

async function driveRequest(url: string, options: RequestInit): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, { ...options, headers })
  if (res.status === 401) {
    // Token expired — clear cache and get a fresh one, then retry once
    await chrome.storage.session.remove('driveAccessToken')
    const fresh = await getAccessToken()
    const retryHeaders = new Headers(options.headers)
    retryHeaders.set('Authorization', `Bearer ${fresh}`)
    const retry = await fetch(url, { ...options, headers: retryHeaders })
    if (!retry.ok) throw new Error(`Drive API error: ${retry.status}`)
    return retry
  }
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${res.statusText}`)
  return res
}

// Search appDataFolder for existing backup file ID
async function findFileId(): Promise<string | null> {
  const local = await chrome.storage.local.get('driveFileId')
  if (local.driveFileId) return local.driveFileId as string

  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name+%3D+%27keyvault-backup.json%27&fields=files(id)`,
    { headers: {} }
  )
  const { files } = await res.json() as { files: { id: string }[] }
  if (files.length > 0) {
    await chrome.storage.local.set({ driveFileId: files[0].id })
    return files[0].id
  }
  return null
}

// Write content to Drive using multipart upload (create or update in one request)
async function writeFileToDrive(fileId: string | null, body: string): Promise<string> {
  const boundary = 'my_space_boundary'
  const metadata = JSON.stringify({ name: 'keyvault-backup.json', parents: fileId ? undefined : ['appDataFolder'] })
  const multipart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    body,
    `--${boundary}--`,
  ].join('\r\n')

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`

  const res = await driveRequest(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  })
  const data = await res.json() as { id: string }
  if (!data.id) throw new Error('Drive upload returned no file id')
  await chrome.storage.local.set({ driveFileId: data.id })
  return data.id
}

async function handlePush(): Promise<{ ok: boolean; data?: { syncedAt: string }; error?: string }> {
  try {
    const keyReply = await sendToOffscreen({ type: 'VAULT_STATUS' }) as { ok: boolean; data: { locked: boolean } }
    if (keyReply.data.locked) throw new Error('Vault is locked — unlock before syncing')

    const { vaultSalt } = await chrome.storage.local.get('vaultSalt') as { vaultSalt: number[] }
    if (!vaultSalt) throw new Error('Vault not initialised — set a password first')

    const exportReply = await sendToOffscreen({ type: 'DB_EXPORT' }) as { ok: boolean; data: unknown }
    if (!exportReply.ok) throw new Error('DB export failed')

    const plaintext = JSON.stringify(exportReply.data)
    const encReply = await sendToOffscreen({ type: 'SYNC_ENCRYPT', payload: { plaintext } }) as { ok: boolean; data: { ciphertext: string; iv: string } }
    if (!encReply.ok) throw new Error('Encryption failed')

    const fileId = await findFileId()
    // Include salt so the backup is self-contained — decryptable on any device with the same password
    await writeFileToDrive(fileId, JSON.stringify({ ciphertext: encReply.data.ciphertext, iv: encReply.data.iv, salt: vaultSalt }))

    const syncedAt = new Date().toISOString()
    await chrome.storage.local.set({ syncedAt })
    return { ok: true, data: { syncedAt } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function handlePull(): Promise<{ ok: boolean; needsPassword?: boolean; data?: { syncedAt: string; notesUpdated: number; secretsAdded: number }; error?: string }> {
  try {
    const fileId = await findFileId()
    if (!fileId) throw new Error('No backup found on Drive — push first')
    const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {},
    })

    const text = await res.text()
    if (!text.trim()) throw new Error('No data on Drive — push first')

    const backup = JSON.parse(text) as { ciphertext: string; iv: string; salt?: number[] }
    const { ciphertext, iv } = backup
    const backupSalt: number[] | undefined = backup.salt

    const { vaultSalt } = await chrome.storage.local.get('vaultSalt') as { vaultSalt: number[] | undefined }

    // If the backup includes a salt and it differs from the local salt, we need the password
    // to re-derive the key used during push (cross-device / cross-profile scenario)
    const saltsDiffer = backupSalt && vaultSalt && JSON.stringify(backupSalt) !== JSON.stringify(vaultSalt)
    const noLocalSalt = backupSalt && !vaultSalt

    if (saltsDiffer || noLocalSalt) {
      // Store encrypted payload in session so SyncView can confirm with password
      await chrome.storage.session.set({ pendingPull: { ciphertext, iv, salt: backupSalt } })
      return { ok: true, needsPassword: true }
    }

    // Same salt (same device/profile) or legacy backup without salt — decrypt normally
    const decReply = await sendToOffscreen({ type: 'SYNC_DECRYPT', payload: { ciphertext, iv } }) as { ok: boolean; data: { plaintext: string } }
    if (!decReply.ok) {
      if (!backupSalt) {
        // Legacy backup — no salt stored. Must push from the original device first.
        throw new Error('Cannot decrypt: this backup was created with an older version. Push from your original device first to include the encryption key, then pull here.')
      }
      throw new Error('Decryption failed — wrong key or corrupted data')
    }

    return finishImport(decReply.data.plaintext)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function handlePullConfirm(password: string): Promise<{ ok: boolean; data?: { syncedAt: string; notesUpdated: number; secretsAdded: number }; error?: string }> {
  try {
    const session = await chrome.storage.session.get('pendingPull') as { pendingPull?: { ciphertext: string; iv: string; salt: number[] } }
    if (!session.pendingPull) throw new Error('No pending pull — start a pull first')
    const { ciphertext, iv, salt } = session.pendingPull

    const decReply = await sendToOffscreen({ type: 'SYNC_DECRYPT_WITH_SALT', payload: { ciphertext, iv, salt, password } }) as { ok: boolean; data: { plaintext: string } }
    if (!decReply.ok) throw new Error('Wrong password — decryption failed')

    await chrome.storage.session.remove('pendingPull')

    // Replace local vault salt with backup salt so future unlocks/pushes are consistent
    await chrome.storage.local.set({ vaultSalt: salt })

    return finishImport(decReply.data.plaintext)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function finishImport(plaintext: string): Promise<{ ok: boolean; data?: { syncedAt: string; notesUpdated: number; secretsAdded: number }; error?: string }> {
  const { notes, secrets, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks } = JSON.parse(plaintext)
  const importReply = await sendToOffscreen({ type: 'DB_IMPORT', payload: { notes, secrets, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks } }) as { ok: boolean; data: { notesUpdated: number; secretsAdded: number; subsUpdated: number; mapsUpdated: number; todosUpdated: number } }
  if (!importReply.ok) throw new Error('DB import failed')

  const syncedAt = new Date().toISOString()
  await chrome.storage.local.set({ syncedAt })
  return { ok: true, data: { syncedAt, ...importReply.data } }
}
