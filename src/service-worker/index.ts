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
    'DB_EXPORT','DB_IMPORT',
  ]
  if (offscreenTypes.includes(msg.type)) {
    sendToOffscreen(msg).then(sendResponse).catch(e =>
      sendResponse({ ok: false, error: String(e) })
    )
    return true
  }

  if (msg.type === 'SYNC_STATUS') {
    chrome.storage.local.get(['driveConnected', 'syncedAt']).then(res => {
      sendResponse({ ok: true, data: { connected: !!res.driveConnected, lastSync: res.syncedAt ?? null } })
    })
    return true
  }

  if (msg.type === 'SYNC_CONNECT') {
    handleConnect(msg.payload as { clientId: string; clientSecret?: string })
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
})

// --- OAuth helpers ---

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'
const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`

async function handleConnect({ clientId, clientSecret }: { clientId: string; clientSecret?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('prompt', 'consent')

    if (clientSecret) {
      // Authorization code flow (Desktop app client) — returns refresh token
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('access_type', 'offline')
    } else {
      // Implicit flow (Chrome Extension client) — returns access token directly
      authUrl.searchParams.set('response_type', 'token')
    }

    const redirectUrl: string = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, url => {
        if (chrome.runtime.lastError || !url) reject(new Error(chrome.runtime.lastError?.message ?? 'Auth cancelled'))
        else resolve(url)
      })
    })

    if (clientSecret) {
      // Code flow: exchange code for tokens
      const code = new URL(redirectUrl).searchParams.get('code')
      if (!code) throw new Error('No authorization code received')

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
      })
      if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`)
      const tokens = await tokenRes.json() as { refresh_token?: string; access_token?: string }
      if (!tokens.refresh_token) throw new Error('No refresh token — try revoking access at myaccount.google.com and reconnecting')

      await chrome.storage.local.set({ driveClientId: clientId, driveClientSecret: clientSecret, driveRefreshToken: tokens.refresh_token, driveConnected: true })
      if (tokens.access_token) await chrome.storage.session.set({ driveAccessToken: tokens.access_token })
    } else {
      // Implicit flow: token is in URL fragment
      const fragment = new URLSearchParams(new URL(redirectUrl).hash.slice(1))
      const accessToken = fragment.get('access_token')
      if (!accessToken) throw new Error('No access token in response')

      await chrome.storage.local.set({ driveClientId: clientId, driveConnected: true })
      await chrome.storage.session.set({ driveAccessToken: accessToken })
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function getAccessToken(): Promise<string> {
  const session = await chrome.storage.session.get('driveAccessToken')
  if (session.driveAccessToken) return session.driveAccessToken as string

  const local = await chrome.storage.local.get(['driveClientId', 'driveClientSecret', 'driveRefreshToken', 'driveConnected'])
  if (!local.driveConnected) throw new Error('Not connected to Google Drive — set up sync first')

  if (local.driveRefreshToken) {
    // Code flow: use refresh token
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: local.driveClientId as string,
        client_secret: local.driveClientSecret as string,
        refresh_token: local.driveRefreshToken as string,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
    const data = await res.json() as { access_token?: string }
    if (!data.access_token) throw new Error('Token refresh returned no access token')
    await chrome.storage.session.set({ driveAccessToken: data.access_token })
    return data.access_token
  }

  // Implicit flow: silent re-auth
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', local.driveClientId as string)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'token')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('prompt', 'none')

  const redirectUrl: string = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: false }, url => {
      if (chrome.runtime.lastError || !url) reject(new Error(chrome.runtime.lastError?.message ?? 'Silent auth failed — please reconnect'))
      else resolve(url)
    })
  })

  const fragment = new URLSearchParams(new URL(redirectUrl).hash.slice(1))
  const accessToken = fragment.get('access_token')
  if (!accessToken) throw new Error('Silent token refresh failed — please reconnect')
  await chrome.storage.session.set({ driveAccessToken: accessToken })
  return accessToken
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

async function handlePush(): Promise<{ ok: boolean; data?: { syncedAt: string }; error?: string }> {
  try {
    const exportReply = await sendToOffscreen({ type: 'DB_EXPORT' }) as { ok: boolean; data: unknown }
    if (!exportReply.ok) throw new Error('DB export failed')

    const keyReply = await sendToOffscreen({ type: 'VAULT_STATUS' }) as { ok: boolean; data: { locked: boolean } }
    if (keyReply.data.locked) throw new Error('Vault is locked — unlock before syncing')

    const plaintext = JSON.stringify(exportReply.data)
    const encReply = await sendToOffscreen({ type: 'SYNC_ENCRYPT', payload: { plaintext } }) as { ok: boolean; data: { ciphertext: string; iv: string } }
    if (!encReply.ok) throw new Error('Encryption failed')

    const body = JSON.stringify({ ciphertext: encReply.data.ciphertext, iv: encReply.data.iv })
    const local = await chrome.storage.local.get('driveFileId')
    let fileId: string = local.driveFileId as string

    if (fileId) {
      await driveRequest(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
    } else {
      const metaRes = await driveRequest('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'keyvault-backup.json', parents: ['appDataFolder'] }),
      })
      const meta = await metaRes.json() as { id?: string }
      if (!meta.id) throw new Error('Drive file creation returned no id')
      fileId = meta.id
      await driveRequest(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
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
    const local = await chrome.storage.local.get('driveFileId')
    if (!local.driveFileId) throw new Error('No Drive file found — push first')

    const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${local.driveFileId}?alt=media`, {
      headers: {},
    })
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
