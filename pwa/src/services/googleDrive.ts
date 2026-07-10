import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'myspace-backup.json'

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) throw new Error('VITE_GOOGLE_CLIENT_ID not set')
  return id
}

function getRedirectUri(): string {
  if (Capacitor.isNativePlatform()) return 'com.myspace.app:/oauth-callback'
  return `${location.origin}/oauth-callback`
}

function makeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'token',
    scope: DRIVE_SCOPE,
    state,
  })
  return `https://accounts.google.com/o/oauth2/auth?${params}`
}

function makeState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// ── Token storage ──────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return sessionStorage.getItem('drive_token')
}

export function clearToken(): void {
  sessionStorage.removeItem('drive_token')
  sessionStorage.removeItem('oauth_state')
}

// ── Authorize ──────────────────────────────────────────────────────────────

export async function authorize(): Promise<string> {
  const state = makeState()
  sessionStorage.setItem('oauth_state', state)
  const url = makeAuthUrl(state)

  if (Capacitor.isNativePlatform()) {
    return authorizeNative(url)
  } else {
    return authorizeWeb(url)
  }
}

function authorizeWeb(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'google-auth', 'width=520,height=620,left=200,top=100')
    if (!popup) { reject(new Error('Popup blocked — allow popups for this site')); return }

    const handler = (e: MessageEvent) => {
      if (e.origin !== location.origin) return
      if (e.data?.type === 'OAUTH_TOKEN') {
        window.removeEventListener('message', handler)
        sessionStorage.setItem('drive_token', e.data.token)
        sessionStorage.removeItem('oauth_state')
        resolve(e.data.token)
      } else if (e.data?.type === 'OAUTH_ERROR') {
        window.removeEventListener('message', handler)
        reject(new Error(`OAuth error: ${e.data.error}`))
      }
    }
    window.addEventListener('message', handler)

    // fallback: poll if popup closed without postMessage
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll)
        window.removeEventListener('message', handler)
        const token = sessionStorage.getItem('drive_token')
        if (token) resolve(token)
        else reject(new Error('Authorization cancelled'))
      }
    }, 500)
  })
}

function authorizeNative(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Browser.open({ url, windowName: '_self' })

    const listener = (event: { url: string }) => {
      if (!event.url.startsWith('com.myspace.app:/oauth-callback')) return
      Browser.removeAllListeners()
      const hash = new URLSearchParams(event.url.split('#')[1] ?? '')
      const token = hash.get('access_token')
      const state = hash.get('state')
      const storedState = sessionStorage.getItem('oauth_state')
      if (!token) { reject(new Error('No token in redirect')); return }
      // Fail closed: reject when no active auth flow OR state mismatch
      if (!storedState || storedState !== state) { reject(new Error('State mismatch')); return }
      sessionStorage.setItem('drive_token', token)
      sessionStorage.removeItem('oauth_state')
      resolve(token)
    }

    Browser.addListener('browserFinishedNavigation', listener as never)
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
