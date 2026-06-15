export type Msg<T extends string, P = undefined> = P extends undefined
  ? { type: T }
  : { type: T; payload: P }

export type Reply<D = undefined> = D extends undefined
  ? { ok: boolean; error?: string }
  : { ok: boolean; data?: D; error?: string }

// Note shape
export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  image_data: string  // JSON array of base64 data URLs
  created_at: string
  updated_at: string
}

// Secret list item (no ciphertext)
export interface SecretMeta {
  id: string
  label: string
  tags: string[]
  updated_at: string
}

// Decrypted secret (only in SECRETS_GET response)
export interface SecretValue {
  id: string
  label: string
  value: string
}

// --- Note messages ---
export type NotesListMsg    = Msg<'NOTES_LIST'>
export type NotesGetMsg     = Msg<'NOTES_GET',    { id: string }>
export type NotesCreateMsg  = Msg<'NOTES_CREATE', { title: string; content: string; tags?: string[]; image_data?: string }>
export type NotesUpdateMsg  = Msg<'NOTES_UPDATE', { id: string; title?: string; content?: string; tags?: string[]; image_data?: string }>
export type NotesDeleteMsg  = Msg<'NOTES_DELETE', { id: string }>

// --- Vault messages ---
export type VaultUnlockMsg  = Msg<'VAULT_UNLOCK', { password: string; salt: number[] }>
export type VaultLockMsg    = Msg<'VAULT_LOCK'>
export type VaultStatusMsg  = Msg<'VAULT_STATUS'>

// --- Secret messages ---
export type SecretsListMsg   = Msg<'SECRETS_LIST'>
export type SecretsGetMsg    = Msg<'SECRETS_GET',    { id: string }>
export type SecretsCreateMsg = Msg<'SECRETS_CREATE', { label: string; value: string; tags?: string[] }>
export type SecretsUpdateMsg = Msg<'SECRETS_UPDATE', { id: string; label?: string; value?: string; tags?: string[] }>
export type SecretsDeleteMsg = Msg<'SECRETS_DELETE', { id: string }>

// --- Sync messages ---
export type SyncPushMsg    = Msg<'SYNC_PUSH'>
export type SyncPullMsg    = Msg<'SYNC_PULL'>
export type SyncStatusMsg  = Msg<'SYNC_STATUS'>
export type SyncEncryptMsg           = Msg<'SYNC_ENCRYPT', { plaintext: string }>
export type SyncDecryptMsg           = Msg<'SYNC_DECRYPT', { ciphertext: string; iv: string }>
export type SyncDecryptWithSaltMsg   = Msg<'SYNC_DECRYPT_WITH_SALT', { ciphertext: string; iv: string; salt: number[]; password: string }>

// --- DB import (service worker → offscreen) ---
export type DbImportMsg = Msg<'DB_IMPORT', { notes: Note[]; secrets: Array<{ id: string; label: string; ciphertext: string; iv: string; updated_at: string }> }>
export type DbExportMsg = Msg<'DB_EXPORT'>

// --- Subscription shape ---
export interface Subscription {
  id: string
  name: string
  amount: string
  currency: string
  cycle: string
  start_date: string
  tags: string[]
  notes: string
  active: boolean
  created_at: string
  updated_at: string
}

// --- Bill shape ---
export interface Bill {
  sub_id: string
  year: number
  month: number   // 1-12
  amount: string  // NUMERIC as string
  currency: string
  notes: string
  updated_at: string
}

// --- Subscription messages ---
export type SubsListMsg   = Msg<'SUBS_LIST'> | Msg<'SUBS_LIST', { query?: string; tag?: string }>
export type SubsGetMsg    = Msg<'SUBS_GET',    { id: string }>
export type SubsCreateMsg = Msg<'SUBS_CREATE', {
  name: string; amount: number; currency: string;
  cycle: string; start_date: string; tags: string[]; notes: string; active?: boolean
}>
export type SubsUpdateMsg = Msg<'SUBS_UPDATE', {
  id: string; name?: string; amount?: number; currency?: string;
  cycle?: string; start_date?: string; tags?: string[]; notes?: string; active?: boolean
}>
export type SubsDeleteMsg = Msg<'SUBS_DELETE', { id: string }>

// --- Bill messages ---
export type BillsListMonthMsg  = Msg<'BILLS_LIST_MONTH',  { year: number; month: number }>
export type BillsListSubMsg    = Msg<'BILLS_LIST_SUB',    { sub_id: string }>
export type BillsUpsertMsg     = Msg<'BILLS_UPSERT', { sub_id: string; year: number; month: number; amount: number; currency: string; notes?: string }>
export type BillsDeleteMsg     = Msg<'BILLS_DELETE',      { sub_id: string; year: number; month: number }>
export type BillsGetAllMsg     = Msg<'BILLS_GET_ALL'>

export type AnyMsg =
  | NotesListMsg | NotesGetMsg | NotesCreateMsg | NotesUpdateMsg | NotesDeleteMsg
  | VaultUnlockMsg | VaultLockMsg | VaultStatusMsg
  | SecretsListMsg | SecretsGetMsg | SecretsCreateMsg | SecretsUpdateMsg | SecretsDeleteMsg
  | SyncPushMsg | SyncPullMsg | SyncStatusMsg | SyncEncryptMsg | SyncDecryptMsg | SyncDecryptWithSaltMsg
  | DbImportMsg | DbExportMsg
  | SubsListMsg | SubsGetMsg | SubsCreateMsg | SubsUpdateMsg | SubsDeleteMsg
  | BillsListMonthMsg | BillsListSubMsg | BillsUpsertMsg | BillsDeleteMsg | BillsGetAllMsg
