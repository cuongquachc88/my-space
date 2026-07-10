import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock Capacitor ──────────────────────────────────────────────────────────
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn(), close: vi.fn() } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), removeAllListeners: vi.fn() } }))

// ── Mock import.meta.env ────────────────────────────────────────────────────
vi.stubGlobal('import.meta', { env: { VITE_GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com' } })

import { getStoredToken, clearToken, findFile, uploadFile, downloadFile } from '../../src/services/googleDrive'

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(responses: Array<{ ok: boolean; status?: number; body?: unknown }>) {
  let call = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const r = responses[call++] ?? { ok: true, body: {} }
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    } as Response
  })
}

// ── Token storage ─────────────────────────────────────────────────────────

describe('getStoredToken / clearToken', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => sessionStorage.clear())

  it('returns null when no token stored', () => {
    expect(getStoredToken()).toBeNull()
  })

  it('returns token after setting it', () => {
    sessionStorage.setItem('drive_token', 'test-token-123')
    expect(getStoredToken()).toBe('test-token-123')
  })

  it('clearToken removes token and state', () => {
    sessionStorage.setItem('drive_token', 'tok')
    sessionStorage.setItem('oauth_state', 'state123')
    clearToken()
    expect(getStoredToken()).toBeNull()
    expect(sessionStorage.getItem('oauth_state')).toBeNull()
  })
})

// ── findFile ──────────────────────────────────────────────────────────────

describe('findFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns file id when backup exists', async () => {
    mockFetch([{ ok: true, body: { files: [{ id: 'file-abc-123' }] } }])
    const id = await findFile('my-token')
    expect(id).toBe('file-abc-123')
  })

  it('returns null when no backup found', async () => {
    mockFetch([{ ok: true, body: { files: [] } }])
    const id = await findFile('my-token')
    expect(id).toBeNull()
  })

  it('returns null when files key missing', async () => {
    mockFetch([{ ok: true, body: {} }])
    const id = await findFile('my-token')
    expect(id).toBeNull()
  })

  it('throws on Drive API error', async () => {
    mockFetch([{ ok: false, status: 403, body: 'Forbidden' }])
    await expect(findFile('bad-token')).rejects.toThrow('Drive API error 403')
  })

  it('clears token and throws on 401', async () => {
    sessionStorage.setItem('drive_token', 'expired-token')
    mockFetch([{ ok: false, status: 401, body: 'Unauthorized' }])
    await expect(findFile('expired-token')).rejects.toThrow('Token expired')
    expect(getStoredToken()).toBeNull()
  })

  it('sends Authorization header', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ files: [] }),
      text: async () => '{"files":[]}',
    } as Response)
    await findFile('bearer-token-xyz')
    expect(spy.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer bearer-token-xyz' })
  })
})

// ── uploadFile ────────────────────────────────────────────────────────────

describe('uploadFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs when no existingId', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({}), text: async () => '{}',
    } as Response)
    await uploadFile('tok', '{"data":"payload"}', null)
    expect(spy.mock.calls[0][0]).toContain('/upload/drive/v3/files?uploadType=multipart')
    expect(spy.mock.calls[0][1]?.method).toBe('POST')
  })

  it('PATCHes when existingId provided', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({}), text: async () => '{}',
    } as Response)
    await uploadFile('tok', '{"data":"payload"}', 'existing-file-id')
    expect(spy.mock.calls[0][0]).toContain('/upload/drive/v3/files/existing-file-id')
    expect(spy.mock.calls[0][1]?.method).toBe('PATCH')
  })

  it('throws on upload failure', async () => {
    mockFetch([{ ok: false, status: 500, body: 'Server error' }])
    await expect(uploadFile('tok', '{}', null)).rejects.toThrow('Drive API error 500')
  })
})

// ── downloadFile ──────────────────────────────────────────────────────────

describe('downloadFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns file content as string', async () => {
    const payload = JSON.stringify({ ciphertext: 'abc', iv: 'def', salt: [1, 2, 3], v: 1 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200,
      json: async () => JSON.parse(payload),
      text: async () => payload,
    } as Response)
    const result = await downloadFile('tok', 'file-id-xyz')
    expect(result).toBe(payload)
  })

  it('requests with alt=media param', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({}),
      text: async () => '{}',
    } as Response)
    await downloadFile('tok', 'file-99')
    expect(spy.mock.calls[0][0]).toContain('/drive/v3/files/file-99?alt=media')
  })

  it('throws on download failure', async () => {
    mockFetch([{ ok: false, status: 404, body: 'Not found' }])
    await expect(downloadFile('tok', 'missing-id')).rejects.toThrow('Drive API error 404')
  })
})

// ── OAuth state validation (oauth-callback logic) ────────────────────────

describe('OAuth state validation', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => sessionStorage.clear())

  it('fails closed: no stored state means no active auth flow', () => {
    // Simulate the fail-closed check from oauth-callback.html
    const storedState = sessionStorage.getItem('oauth_state')
    const incomingState = 'any-state'
    const isValid = !!(storedState && storedState === incomingState)
    expect(isValid).toBe(false)
  })

  it('fails closed: state mismatch rejected', () => {
    sessionStorage.setItem('oauth_state', 'expected-state')
    const storedState = sessionStorage.getItem('oauth_state')
    const incomingState = 'different-state'
    const isValid = !!(storedState && storedState === incomingState)
    expect(isValid).toBe(false)
  })

  it('passes: matching state accepted', () => {
    sessionStorage.setItem('oauth_state', 'correct-state-abc')
    const storedState = sessionStorage.getItem('oauth_state')
    const incomingState = 'correct-state-abc'
    const isValid = !!(storedState && storedState === incomingState)
    expect(isValid).toBe(true)
  })
})
