import type { AnyMsg, Reply, Note } from '../shared/messages'
import * as db from './db'
import {
  initVault, lockVault, getVaultStatus, getKey,
  encrypt, decrypt, deriveKey, resetLockTimer
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
        const { title, content, tags, image_data } = (msg as { payload: { title: string; content: string; tags?: string[]; image_data?: string } }).payload
        return { ok: true, data: await db.createNote(title, content, tags, image_data) }
      }
      case 'NOTES_UPDATE': {
        const { id, title, content, tags, image_data } = (msg as { payload: { id: string; title?: string; content?: string; tags?: string[]; image_data?: string } }).payload
        return { ok: true, data: await db.updateNote(id, { title, content, tags, image_data }) }
      }
      case 'NOTES_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.getNote(id)
        await db.deleteNote(id)
        return { ok: true }
      }
      case 'NOTES_TAGS': {
        return { ok: true, data: await db.listNoteTags() }
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
        const { label, value, tags, url, description } = (msg as { payload: { label: string; value: string; tags?: string[]; url?: string; description?: string } }).payload
        const { ciphertext, iv } = await encrypt(getKey(), value)
        resetLockTimer(LOCK_TIMEOUT_MS)
        return { ok: true, data: await db.createSecretRow(label, ciphertext, iv, tags, url, description) }
      }
      case 'SECRETS_UPDATE': {
        const { id, label, value, tags, url, description } = (msg as { payload: { id: string; label?: string; value?: string; tags?: string[]; url?: string; description?: string } }).payload
        const fields: { label?: string; ciphertext?: string; iv?: string; tags?: string[]; url?: string; description?: string } = {}
        if (label       !== undefined) fields.label = label
        if (tags        !== undefined) fields.tags  = tags
        if (url         !== undefined) fields.url  = url
        if (description !== undefined) fields.description = description
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
      case 'SECRETS_TAGS': {
        return { ok: true, data: await db.listSecretTags() }
      }

      case 'DB_EXPORT': {
        return { ok: true, data: await db.exportAllRows() }
      }
      case 'DB_IMPORT': {
        const { notes, secrets, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks } = (msg as unknown as { payload: { notes: Note[]; secrets: db.SecretRow[]; subscriptions?: db.Subscription[]; bills?: db.Bill[]; mapStacks?: db.MapStack[]; mapPins?: db.MapPin[]; todoLists?: db.TodoList[]; todoTasks?: db.TodoTask[] } }).payload
        return { ok: true, data: await db.importRows(notes, secrets, subscriptions, bills, mapStacks, mapPins, todoLists, todoTasks) }
      }

      case 'SYNC_ENCRYPT': {
        const { plaintext } = (msg as { payload: { plaintext: string } }).payload
        return { ok: true, data: await encrypt(getKey(), plaintext) }
      }
      case 'SYNC_DECRYPT': {
        const { ciphertext, iv } = (msg as { payload: { ciphertext: string; iv: string } }).payload
        return { ok: true, data: { plaintext: await decrypt(getKey(), ciphertext, iv) } }
      }
      case 'SYNC_DECRYPT_WITH_SALT': {
        // Re-derive key using the backup's salt + provided password — never cached
        const { ciphertext, iv, salt, password } = (msg as { payload: { ciphertext: string; iv: string; salt: number[]; password: string } }).payload
        const tempKey = await deriveKey(password, new Uint8Array(salt))
        return { ok: true, data: { plaintext: await decrypt(tempKey, ciphertext, iv) } }
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
        const p = (msg as { payload: { name: string; amount: number; currency: string; cycle: string; start_date: string; tags: string[]; notes: string; active?: boolean } }).payload
        return { ok: true, data: await db.createSubscription(p) }
      }
      case 'SUBS_UPDATE': {
        const { id, ...fields } = (msg as { payload: { id: string; name?: string; amount?: number; currency?: string; cycle?: string; start_date?: string; tags?: string[]; notes?: string; active?: boolean } }).payload
        return { ok: true, data: await db.updateSubscription(id, fields) }
      }
      case 'SUBS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteSubscription(id)
        return { ok: true }
      }

      case 'BILLS_LIST_MONTH': {
        const { year, month } = (msg as { payload: { year: number; month: number } }).payload
        return { ok: true, data: await db.listBillsForMonth(year, month) }
      }
      case 'BILLS_LIST_SUB': {
        const { sub_id } = (msg as { payload: { sub_id: string } }).payload
        return { ok: true, data: await db.listBillsForSub(sub_id) }
      }
      case 'BILLS_UPSERT': {
        const { sub_id, year, month, amount, currency, notes } = (msg as { payload: { sub_id: string; year: number; month: number; amount: number; currency: string; notes?: string } }).payload
        return { ok: true, data: await db.upsertBill(sub_id, year, month, amount, currency, notes) }
      }
      case 'BILLS_DELETE': {
        const { sub_id, year, month } = (msg as { payload: { sub_id: string; year: number; month: number } }).payload
        await db.deleteBill(sub_id, year, month)
        return { ok: true }
      }
      case 'BILLS_GET_ALL': {
        return { ok: true, data: await db.getAllBills() }
      }

      case 'TODO_LISTS_LIST': {
        return { ok: true, data: await db.listTodoLists() }
      }
      case 'TODO_LISTS_CREATE': {
        const { name, color, icon } = (msg as { payload: { name: string; color: string; icon?: string } }).payload
        return { ok: true, data: await db.createTodoList(name, color, icon) }
      }
      case 'TODO_LISTS_UPDATE': {
        const { id, name, color, icon } = (msg as { payload: { id: string; name?: string; color?: string; icon?: string } }).payload
        return { ok: true, data: await db.updateTodoList(id, { name, color, icon }) }
      }
      case 'TODO_LISTS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteTodoList(id)
        return { ok: true }
      }
      case 'TODO_TASKS_LIST': {
        const { list_id } = (msg as { payload: { list_id: string } }).payload
        return { ok: true, data: await db.listTodoTasks(list_id) }
      }
      case 'TODO_TASKS_CREATE': {
        const { list_id, title, note, priority, due_date, recurrence } = (msg as { payload: { list_id: string; title: string; note: string; priority: string; due_date: string | null; recurrence: string } }).payload
        return { ok: true, data: await db.createTodoTask(list_id, title, note, priority, due_date, recurrence) }
      }
      case 'TODO_TASKS_UPDATE': {
        const { id, ...fields } = (msg as { payload: { id: string; title?: string; note?: string; priority?: string; due_date?: string | null; recurrence?: string; done?: boolean } }).payload
        return { ok: true, data: await db.updateTodoTask(id, fields) }
      }
      case 'TODO_TASKS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteTodoTask(id)
        return { ok: true }
      }

      case 'STACKS_LIST': {
        return { ok: true, data: await db.listMapStacks() }
      }
      case 'STACKS_CREATE': {
        const { name, color, icon } = (msg as { payload: { name: string; color: string; icon?: string } }).payload
        return { ok: true, data: await db.createMapStack(name, color, icon) }
      }
      case 'STACKS_UPDATE': {
        const { id, name, color, icon } = (msg as { payload: { id: string; name?: string; color?: string; icon?: string } }).payload
        return { ok: true, data: await db.updateMapStack(id, { name, color, icon }) }
      }
      case 'STACKS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteMapStack(id)
        return { ok: true }
      }

      case 'PINS_LIST': {
        const { stack_id } = (msg as { payload: { stack_id: string } }).payload
        return { ok: true, data: await db.listMapPins(stack_id) }
      }
      case 'PINS_CREATE': {
        const { stack_id, label, lat, lng, url, note, priority, category, rating, review_note } = (msg as { payload: { stack_id: string; label: string; lat: number; lng: number; url: string; note: string; priority?: string; category?: string; rating?: number; review_note?: string } }).payload
        return { ok: true, data: await db.createMapPin(stack_id, label, lat, lng, url, note, priority, category, rating, review_note) }
      }
      case 'PINS_UPDATE': {
        const { id, label, note, priority, category, rating, review_note } = (msg as { payload: { id: string; label?: string; note?: string; priority?: string; category?: string; rating?: number; review_note?: string } }).payload
        return { ok: true, data: await db.updateMapPin(id, { label, note, priority, category, rating, review_note }) }
      }
      case 'PINS_DELETE': {
        const { id } = (msg as { payload: { id: string } }).payload
        await db.deleteMapPin(id)
        return { ok: true }
      }

      default:
        return { ok: false, error: `Unknown message type: ${(msg as { type: string }).type}` }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
