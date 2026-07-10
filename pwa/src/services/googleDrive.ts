import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'myspace-backup.json'

// On web: proxy endpoint keeps client_secret server-side (Cloudflare Pages Function).
// On native (Capacitor): call Google directly — mobile OAuth clients are public clients.
function getTokenEndpoint(): string {
  if (Capacitor.isNativePlatform()) return 'https://oauth2.googleapis.com/token'
  return `${location.origin}/api/token`
}

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) throw new Error('VITE_GOOGLE_CLIENT_ID not set')
  return id
}

function getRedirectUri(): string {
  if (Capacitor.isNativePlatform()) return 'com.myspace.app:/oauth-callback'
  return `${location.origin}/oauth-callback`
}

// ── PKCE helpers ──────────────────────────────────────────────────────────

function makeState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function makeCodeVerifier(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(48))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeCodeChallenge(verifier: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function makeAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function exchangeCode(code: string): Promise<string> {
  const verifier = localStorage.getItem('oauth_verifier')
  if (!verifier) throw new Error('Missing code verifier')
  const endpoint = getTokenEndpoint()
  const redirectUri = getRedirectUri()

  let res: Response
  if (Capacitor.isNativePlatform()) {
    // Native: public client — no secret needed, send as form-encoded
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: getClientId(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
      }),
    })
  } else {
    // Web: proxy endpoint holds client_secret server-side — send as JSON
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
    })
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} — ${text}`)
  }
  const data = await res.json() as { access_token: string }
  return data.access_token
}

// ── Token storage ──────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem('drive_token')
}

export function clearToken(): void {
  localStorage.removeItem('drive_token')
  localStorage.removeItem('oauth_state')
  localStorage.removeItem('oauth_verifier')
}

// ── Authorize ──────────────────────────────────────────────────────────────

export async function authorize(): Promise<string> {
  const state = makeState()
  const verifier = await makeCodeVerifier()
  const challenge = await makeCodeChallenge(verifier)
  localStorage.setItem('oauth_state', state)
  localStorage.setItem('oauth_verifier', verifier)
  const url = makeAuthUrl(state, challenge)

  if (Capacitor.isNativePlatform()) {
    return authorizeNative(url)
  } else {
    return authorizeWeb(url)
  }
}

function authorizeWeb(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const storedState = localStorage.getItem('oauth_state')

    const popup = window.open(url, 'google-auth', 'width=520,height=620,left=200,top=100')
    if (!popup) { reject(new Error('Popup blocked — allow popups for this site')); return }

    const handler = async (e: MessageEvent) => {
      if (e.origin !== location.origin) return
      if (e.data?.type === 'OAUTH_CODE') {
        clearInterval(poll)
        window.removeEventListener('message', handler)
        if (!storedState || storedState !== e.data.state) { reject(new Error('State mismatch')); return }
        try {
          const token = await exchangeCode(e.data.code)
          localStorage.setItem('drive_token', token)
          localStorage.removeItem('oauth_state')
          localStorage.removeItem('oauth_verifier')
          resolve(token)
        } catch (err) { reject(err) }
      } else if (e.data?.type === 'OAUTH_ERROR') {
        clearInterval(poll)
        window.removeEventListener('message', handler)
        reject(new Error(`OAuth error: ${e.data.error}`))
      }
    }
    window.addEventListener('message', handler)

    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll)
        window.removeEventListener('message', handler)
        reject(new Error('Authorization cancelled'))
      }
    }, 500)
  })
}

function authorizeNative(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    App.addListener('appUrlOpen', async (event: { url: string }) => {
      if (!event.url.startsWith('com.myspace.app:/oauth-callback')) return
      App.removeAllListeners()
      Browser.close()
      const params = new URLSearchParams(event.url.split('?')[1] ?? '')
      const code = params.get('code')
      const state = params.get('state')
      const storedState = localStorage.getItem('oauth_state')
      if (!code) { reject(new Error('No code in redirect')); return }
      if (!storedState || storedState !== state) { reject(new Error('State mismatch')); return }
      try {
        const token = await exchangeCode(code)
        localStorage.setItem('drive_token', token)
        localStorage.removeItem('oauth_state')
        localStorage.removeItem('oauth_verifier')
        resolve(token)
      } catch (err) { reject(err) }
    })
    Browser.open({ url })
  })
}

// ── Drive API helpers ──────────────────────────────────────────────────────

async function driveRequest(path: string, token: string, opts: RequestInit = {}): Promise<Response> {
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  })
  if (res.status === 401) { clearToken(); throw new Error('Token expired — please re-authorize') }
  if (!res.ok) throw new Error(`Drive API error ${res.status}: ${await res.text()}`)
  return res
}

export async function findFile(token: string): Promise<string | null> {
  const res = await driveRequest(`/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`, token)
  const data = await res.json() as { files?: { id: string }[] }
  return data.files?.[0]?.id ?? null
}

export async function uploadFile(token: string, payload: string, existingId?: string | null): Promise<void> {
  const meta = JSON.stringify({ name: FILE_NAME, ...(!existingId && { parents: ['appDataFolder'] }) })
  const form = new FormData()
  form.append('metadata', new Blob([meta], { type: 'application/json' }))
  form.append('file', new Blob([payload], { type: 'application/json' }))
  const path = existingId
    ? `/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : '/upload/drive/v3/files?uploadType=multipart'
  await driveRequest(path, token, { method: existingId ? 'PATCH' : 'POST', body: form })
}

export async function downloadFile(token: string, fileId: string): Promise<string> {
  const res = await driveRequest(`/drive/v3/files/${fileId}?alt=media`, token)
  return res.text()
}
