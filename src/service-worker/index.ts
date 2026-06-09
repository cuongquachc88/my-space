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
  return chrome.runtime.sendMessage(msg)
}

// Open side panel on extension icon click
chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.sidePanel.open({ tabId: tab.id })
})

// Relay note/secret/vault messages from side panel to offscreen
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const noteOrVaultTypes = [
    'NOTES_LIST','NOTES_GET','NOTES_CREATE','NOTES_UPDATE','NOTES_DELETE',
    'VAULT_UNLOCK','VAULT_LOCK','VAULT_STATUS',
    'SECRETS_LIST','SECRETS_GET','SECRETS_CREATE','SECRETS_UPDATE','SECRETS_DELETE',
    'DB_EXPORT','DB_IMPORT',
  ]
  if (noteOrVaultTypes.includes(msg.type)) {
    sendToOffscreen(msg).then(sendResponse).catch(e =>
      sendResponse({ ok: false, error: String(e) })
    )
    return true
  }

  if (msg.type === 'SYNC_STATUS') {
    chrome.storage.session.get(['googleToken'], sessionResult => {
      chrome.storage.local.get(['syncedAt'], localResult => {
        sendResponse({
          ok: true,
          data: {
            connected: !!sessionResult.googleToken,
            lastSync: localResult.syncedAt ?? null,
          }
        })
      })
    })
    return true
  }

  if (msg.type === 'SYNC_PUSH') {
    handlePush().then(sendResponse).catch(e =>
      sendResponse({ ok: false, error: String(e) })
    )
    return true
  }

  if (msg.type === 'SYNC_PULL') {
    handlePull().then(sendResponse).catch(e =>
      sendResponse({ ok: false, error: String(e) })
    )
    return true
  }
})

// --- Drive helpers ---

async function getToken(): Promise<string> {
  const stored = await chrome.storage.session.get('googleToken')
  if (stored.googleToken) return stored.googleToken as string
  const token = await chrome.identity.getAuthToken({ interactive: true })
  if (!token) throw new Error('Failed to obtain auth token')
  await chrome.storage.session.set({ googleToken: token })
  return token as string
}

async function driveRequest(url: string, options: RequestInit, token: string): Promise<Response> {
  const res = await fetch(url, options)
  if (res.status === 401) {
    chrome.identity.removeCachedAuthToken({ token })
    await chrome.storage.session.remove('googleToken')
    throw new Error('Google auth token expired — please try again')
  }
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${res.statusText}`)
  return res
}

async function handlePush(): Promise<{ ok: boolean; data?: { syncedAt: string }; error?: string }> {
  try {
    const token = await getToken()
    const exportReply = await sendToOffscreen({ type: 'DB_EXPORT' }) as { ok: boolean; data: unknown }
    if (!exportReply.ok) throw new Error('DB export failed')

    const keyReply = await sendToOffscreen({ type: 'VAULT_STATUS' }) as { ok: boolean; data: { locked: boolean } }
    if (keyReply.data.locked) throw new Error('Vault is locked — unlock before syncing')

    const plaintext = JSON.stringify(exportReply.data)
    const encReply = await sendToOffscreen({ type: 'SYNC_ENCRYPT', payload: { plaintext } }) as { ok: boolean; data: { ciphertext: string; iv: string } }
    if (!encReply.ok) throw new Error('Encryption failed')

    const body = JSON.stringify({ ciphertext: encReply.data.ciphertext, iv: encReply.data.iv })

    const stored = await chrome.storage.local.get('driveFileId')
    let fileId: string = stored.driveFileId as string

    if (fileId) {
      await driveRequest(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
      }, token)
    } else {
      const metaRes = await driveRequest('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'keyvault-backup.json', parents: ['appDataFolder'] }),
      }, token)
      const meta = await metaRes.json() as { id?: string }
      if (!meta.id) throw new Error('Drive file creation returned no id')
      fileId = meta.id
      await driveRequest(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
      }, token)
    }

    const syncedAt = new Date().toISOString()
    await chrome.storage.local.set({ syncedAt, driveFileId: fileId })
    return { ok: true, data: { syncedAt } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function handlePull(): Promise<{ ok: boolean; data?: { syncedAt: string; notesUpdated: number; secretsAdded: number }; error?: string }> {
  try {
    const token = await getToken()
    const stored = await chrome.storage.local.get('driveFileId')
    if (!stored.driveFileId) throw new Error('No Drive file found — push first')

    const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${stored.driveFileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    }, token)
    const { ciphertext, iv } = await res.json()

    const decReply = await sendToOffscreen({ type: 'SYNC_DECRYPT', payload: { ciphertext, iv } }) as { ok: boolean; data: { plaintext: string } }
    if (!decReply.ok) throw new Error('Decryption failed — wrong key or corrupted file')

    const { notes, secrets } = JSON.parse(decReply.data.plaintext)
    const importReply = await sendToOffscreen({ type: 'DB_IMPORT', payload: { notes, secrets } }) as { ok: boolean; data: { notesUpdated: number; secretsAdded: number } }
    if (!importReply.ok) throw new Error('DB import failed')

    const syncedAt = new Date().toISOString()
    await chrome.storage.local.set({ syncedAt })
    return { ok: true, data: { syncedAt, ...importReply.data } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
