import type { AnyMsg, Reply, Note } from '../shared/messages'
import * as db from './db'
import {
  initVault, lockVault, getVaultStatus, getKey,
  encrypt, decrypt, resetLockTimer
} from './crypto'

const LOCK_TIMEOUT_MS = 15 * 60 * 1000

export async function dispatch(msg: AnyMsg & { payload?: Record<string, unknown> }): Promise<Reply<unknown>> {
  try {
    switch (msg.type) {
      case 'NOTES_LIST': {
        const q = (msg as { payload?: { query?: string } }).payload?.query
        return { ok: true, data: await db.listNotes(q) }
      }
      case 'NOTES_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        return { ok: true, data: await db.getNote(id) }
      }
      case 'NOTES_CREATE': {
        const { title, content } = (msg as { payload: { title: string; content: string } }).payload
        return { ok: true, data: await db.createNote(title, content) }
      }
      case 'NOTES_UPDATE': {
        const { id, title, content } = (msg as { payload: { id: string; title?: string; content?: string } }).payload
        return { ok: true, data: await db.updateNote(id, { title, content }) }
      }
      case 'NOTES_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        // getNote throws "not found" → caught below; deleteNote silently no-ops on missing rows
        await db.getNote(id)
        await db.deleteNote(id)
        return { ok: true }
      }

      case 'VAULT_UNLOCK': {
        const { password, salt } = (msg as { payload: { password: string; salt: number[] } }).payload
        const saltBytes = new Uint8Array(salt)
        await initVault(password, saltBytes, LOCK_TIMEOUT_MS)
        return { ok: true }
      }
      case 'VAULT_LOCK': {
        lockVault()
        return { ok: true }
      }
      case 'VAULT_STATUS': {
        return { ok: true, data: getVaultStatus() }
      }

      case 'SECRETS_LIST': {
        const q = (msg as { payload?: { query?: string } }).payload?.query
        return { ok: true, data: await db.listSecretMeta(q) }
      }
      case 'SECRETS_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        const row = await db.getSecretRow(id)
        const value = await decrypt(getKey(), row.ciphertext, row.iv)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: { id: row.id, label: row.label, value } }
      }
      case 'SECRETS_CREATE': {
        const { label, value } = (msg as { payload: { label: string; value: string } }).payload
        const { ciphertext, iv } = await encrypt(getKey(), value)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: await db.createSecretRow(label, ciphertext, iv) }
      }
      case 'SECRETS_UPDATE': {
        const { id, label, value } = (msg as { payload: { id: string; label?: string; value?: string } }).payload
        const fields: { label?: string; ciphertext?: string; iv?: string } = {}
        if (label !== undefined) fields.label = label
        if (value !== undefined) {
          const enc = await encrypt(getKey(), value)
          fields.ciphertext = enc.ciphertext
          fields.iv = enc.iv
        }
        const result = await db.updateSecretRow(id, fields)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: result }
      }
      case 'SECRETS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteSecretRow(id)
        return { ok: true }
      }

      case 'DB_EXPORT': {
        return { ok: true, data: await db.exportAllRows() }
      }
      case 'DB_IMPORT': {
        const { notes, secrets } = (msg as unknown as { payload: { notes: Note[]; secrets: db.SecretRow[] } }).payload
        const summary = await db.importRows(notes, secrets)
        return { ok: true, data: summary }
      }

      case 'SYNC_ENCRYPT': {
        const { plaintext } = (msg as { payload: { plaintext: string } }).payload
        const result = await encrypt(getKey(), plaintext)
        return { ok: true, data: result }
      }
      case 'SYNC_DECRYPT': {
        const { ciphertext, iv } = (msg as { payload: { ciphertext: string; iv: string } }).payload
        const plaintext = await decrypt(getKey(), ciphertext, iv)
        return { ok: true, data: { plaintext } }
      }
      case 'SYNC_PUSH':
      case 'SYNC_PULL':
      case 'SYNC_STATUS':
        return { ok: false, error: `Sync message type not handled in offscreen: ${msg.type}` }

      default:
        return { ok: false, error: `Unknown message type: ${(msg as { type: string }).type}` }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
