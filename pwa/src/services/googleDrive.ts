import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'

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
  return localStorage.getItem('drive_token')
}

export function clearToken(): void {
  localStorage.removeItem('drive_token')
  localStorage.removeItem('oauth_state')
  localStorage.removeItem('oauth_pending')
}

// ── Authorize ──────────────────────────────────────────────────────────────

export async function authorize(): Promise<string> {
  const state = makeState()
  localStorage.setItem('oauth_state', state)
  const url = makeAuthUrl(state)

  if (Capacitor.isNativePlatform()) {
    return authorizeNative(url)
  } else {
    return authorizeWeb(url)
  }
}

function authorizeWeb(url: string): Promise<string> {
  // Full redirect flow — simpler and more reliable than popup
  window.location.href = url
  // Promise never resolves here; app reloads after redirect
  return new Promise(() => {})
}
}

function authorizeNative(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // App.addListener('appUrlOpen') catches the deep link when Google redirects to com.myspace.app:/oauth-callback
    App.addListener('appUrlOpen', (event: { url: string }) => {
      if (!event.url.startsWith('com.myspace.app:/oauth-callback')) return
      App.removeAllListeners()
      Browser.close()
      const hash = new URLSearchParams(event.url.split('#')[1] ?? '')
      const token = hash.get('access_token')
      const state = hash.get('state')
      const storedState = localStorage.getItem('oauth_state')
      if (!token) { reject(new Error('No token in redirect')); return }
      // Fail closed: reject when no active auth flow OR state mismatch
      if (!storedState || storedState !== state) { reject(new Error('State mismatch')); return }
      localStorage.setItem('drive_token', token)
      localStorage.removeItem('oauth_state')
      resolve(token)
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
