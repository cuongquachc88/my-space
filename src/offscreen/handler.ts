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
        const p = (msg as { payload?: { query?: string; tag?: string } }).payload
        return { ok: true, data: await db.listNotes(p?.query, p?.tag) }
      }
      case 'NOTES_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        return { ok: true, data: await db.getNote(id) }
      }
      case 'NOTES_CREATE': {
        const { title, content, tags } = (msg as { payload: { title: string; content: string; tags?: string[] } }).payload
        return { ok: true, data: await db.createNote(title, content, tags) }
      }
      case 'NOTES_UPDATE': {
        const { id, title, content, tags } = (msg as { payload: { id: string; title?: string; content?: string; tags?: string[] } }).payload
        return { ok: true, data: await db.updateNote(id, { title, content, tags }) }
      }
      case 'NOTES_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.getNote(id)
        await db.deleteNote(id)
        return { ok: true }
      }

      case 'VAULT_UNLOCK': {
        const { password, salt } = (msg as { payload: { password: string; salt: number[] } }).payload
        await initVault(password, new Uint8Array(salt), LOCK_TIMEOUT_MS)
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
        const p = (msg as { payload?: { query?: string; tag?: string } }).payload
        return { ok: true, data: await db.listSecretMeta(p?.query, p?.tag) }
      }
      case 'SECRETS_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        const row = await db.getSecretRow(id)
        const value = await decrypt(getKey(), row.ciphertext, row.iv)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: { id: row.id, label: row.label, value } }
      }
      case 'SECRETS_CREATE': {
        const { label, value, tags } = (msg as { payload: { label: string; value: string; tags?: string[] } }).payload
        const { ciphertext, iv } = await encrypt(getKey(), value)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: await db.createSecretRow(label, ciphertext, iv, tags) }
      }
      case 'SECRETS_UPDATE': {
        const { id, label, value, tags } = (msg as { payload: { id: string; label?: string; value?: string; tags?: string[] } }).payload
        const fields: { label?: string; ciphertext?: string; iv?: string; tags?: string[] } = {}
        if (label !== undefined) fields.label = label
        if (tags  !== undefined) fields.tags  = tags
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
        const { notes, secrets, subscriptions } = (msg as unknown as { payload: { notes: Note[]; secrets: db.SecretRow[]; subscriptions?: db.Subscription[] } }).payload
        return { ok: true, data: await db.importRows(notes, secrets, subscriptions) }
      }

      case 'SYNC_ENCRYPT': {
        const { plaintext } = (msg as { payload: { plaintext: string } }).payload
        return { ok: true, data: await encrypt(getKey(), plaintext) }
      }
      case 'SYNC_DECRYPT': {
        const { ciphertext, iv } = (msg as { payload: { ciphertext: string; iv: string } }).payload
        return { ok: true, data: { plaintext: await decrypt(getKey(), ciphertext, iv) } }
      }
      case 'SYNC_PUSH':
      case 'SYNC_PULL':
      case 'SYNC_STATUS':
        return { ok: false, error: `${msg.type} not handled in offscreen` }

      case 'SUBS_LIST': {
        const p = (msg as { payload?: { query?: string; tag?: string } }).payload
        return { ok: true, data: await db.listSubscriptions(p?.query, p?.tag) }
      }
      case 'SUBS_GET': {
        const { id } = (msg as { payload: { id: string } }).payload
        return { ok: true, data: await db.getSubscription(id) }
      }
      case 'SUBS_CREATE': {
        const p = (msg as { payload: { name: string; amount: number; currency: string; cycle: string; start_date: string; tags: string[]; notes: string } }).payload
        return { ok: true, data: await db.createSubscription(p) }
      }
      case 'SUBS_UPDATE': {
        const { id, ...fields } = (msg as { payload: { id: string; name?: string; amount?: number; currency?: string; cycle?: string; start_date?: string; tags?: string[]; notes?: string } }).payload
        return { ok: true, data: await db.updateSubscription(id, fields) }
      }
      case 'SUBS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteSubscription(id)
        return { ok: true }
      }

      default:
        return { ok: false, error: `Unknown message type: ${(msg as { type: string }).type}` }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
