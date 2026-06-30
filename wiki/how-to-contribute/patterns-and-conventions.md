# Patterns and conventions

The conventions that show up again and again across both platforms. Follow these when adding a feature or touching existing code so the result stays consistent.

## Message protocol pattern (Chrome)

All cross-context communication in the extension goes through `chrome.runtime.sendMessage` with a typed envelope. Types live in `chrome-extension/src/shared/messages.ts`.

```ts
// chrome-extension/src/shared/messages.ts
export type Msg<T extends string, P = undefined> = P extends undefined
  ? { type: T }
  : { type: T; payload: P }

export type Reply<D = undefined> = D extends undefined
  ? { ok: boolean; error?: string }
  : { ok: boolean; data?: D; error?: string }
```

Every message is a `Msg<'TYPE', payload?>`. Every reply is `{ ok, data?, error? }`. Individual message types are unioned into `AnyMsg`.

Adding a new operation:

1. Add `Msg<'MY_TYPE', PayloadType>` to `chrome-extension/src/shared/messages.ts` and include it in `AnyMsg`.
2. Handle it in `chrome-extension/src/offscreen/handler.ts` (DB/crypto) or `chrome-extension/src/service-worker/index.ts` (OAuth/sync/other).
3. Call it from a view via the `sendMsg` prop:

```tsx
// inside a view component
const res = await sendMsg('MY_TYPE', { foo: 'bar' })
if (res.ok) console.log(res.data)
else console.error(res.error)
```

Never bypass the protocol with shared globals or direct calls. The three-context split is load-bearing: the side panel cannot run WASM, the service worker cannot run WASM, and the offscreen document cannot do OAuth.

## Dark glass-card UI design system

Both platforms use the same dark, translucent card aesthetic. The extension defines it as CSS variables in `chrome-extension/src/sidepanel/index.css`; the Android theme mirrors the palette in `android/app/src/main/java/com/myspace/app/ui/theme/Theme.kt`.

```css
--bg-base:      #0d1117
--glass-bg:     rgba(255,255,255,0.06)
--glass-border: rgba(255,255,255,0.08)
```

- Use the `glass-card` class for card surfaces in the extension.
- Tailwind v4 is available for layout and spacing; reach for the design tokens before introducing new colours.
- On Android, use the Material3 dark colour scheme from `Theme.kt` and the typography scale from `Typography.kt`. Do not hardcode hex values in composables.

## Per-feature accent colours

Each feature owns an accent colour used in its icon, glows, highlights, and active states. This is how users navigate visually. Defined as CSS variables in the extension and mirrored as Compose colours on Android.

| Feature | Variable | Hex |
|---|---|---|
| Notes | `--accent-notes` | `#6366f1` indigo |
| Vault | `--accent-vault` | `#f59e0b` amber |
| Sync | `--accent-sync` | `#3b82f6` blue |
| Generator | `--accent-gen` | `#a78bfa` violet |
| Subscriptions | `--accent-subs` | `#34d399` emerald |
| Reports | `--accent-reports` | `#f472b6` pink |
| To-Do | `--accent-todo` | `#38bdf8` sky |
| Maps | `--accent-maps` | `#fb923c` orange |

When adding a new view, pick a new accent from this family rather than reusing one. Keep the extension CSS variable and the Android Compose colour in sync.

## Auto-save pattern

Views do not have a Save button. Edits flow back through `sendMsg` on change (or on blur, depending on the field), and the offscreen document writes immediately. The UI stays optimistic: the local state already reflects the edit, and the message just persists it. If `res.ok` is false, surface the error inline rather than reverting silently.

Concretely, in a view:

```tsx
async function handleFieldChange(next: string) {
  setLocal(next)                      // optimistic
  const res = await sendMsg('NOTES_UPDATE', { id, content: next })
  if (!res.ok) setError(res.error)    // do not silently revert
}
```

## Tag-based grouping

Notes, secrets, subscriptions, and other collections are grouped by tags, not by folders. Tags are a string array column (`tags text[]` in PGlite, a serialised field in Room). The UI filters by tapping a tag chip; multi-tag filtering is AND logic.

- Use the `TagInput` component (`chrome-extension/src/sidepanel/components/TagInput.tsx`) for entering tags.
- Keep tags lowercase-normalised on display but store them verbatim.
- Do not introduce a hierarchy; if you need grouping, add a tag, not a parent pointer.

## Upsert-by-updated-at sync resolution

The merge rule on import is deterministic and timestamp-driven. Implemented in `chrome-extension/src/offscreen/db.ts` (`importRows()`) and mirrored in the Android sync import.

```mermaid
flowchart TD
    A[Backup row] --> B{Local row exists?}
    B -- no --> C[INSERT]
    B -- yes --> D{Entity type?}
    D -- "notes, secrets,<br/>subscriptions, tasks" --> E{"backup.updated_at<br/>> local.updated_at?"}
    E -- yes --> F[UPDATE (last-write-wins)]
    E -- no --> G[keep local]
    D -- "stacks, pins" --> H[keep local (first-write-wins)]
```

Rules:

- **Last-write-wins** for `notes`, `secrets`, `subscriptions`, and `todo_tasks`: compare `updated_at`; the newer one wins.
- **First-write-wins** for `map_stacks` and `map_pins`: the local definition is preserved, so a stale backup does not clobber a user's reorganised stacks.
- Rows that exist only in the backup are always inserted.
- Rows that exist only locally are never deleted by import. Deletion is a local action, not a sync action.

When you add a new syncable entity, decide which side of this split it belongs to and document it in the entity's DAO/table comment.

## Crypto conventions

- Never log the master password, derived key material, or plaintext secrets.
- The vault key lives only in memory (offscreen document on Chrome, Keystore-backed on Android). Never persist it.
- Generate a fresh 12-byte IV per encryption. Store it next to the ciphertext. Never reuse an IV with the same key.
- The vault salt is the only crypto material that is persisted (`chrome.storage.local` `vaultSalt`, and inside the backup payload for cross-device decrypt).
- Use `SYNC_DECRYPT_WITH_SALT` for cross-device pull. Do not mutate the local vault key during a pull.

## Adding a new view (extension)

1. Create `chrome-extension/src/sidepanel/views/MyView.tsx` accepting `{ sendMsg }` as props.
2. Add an SVG icon to `chrome-extension/src/sidepanel/components/icons/index.tsx`.
3. Add the view name to the `View` type in `App.tsx` and add it to the icon rail in `IconRail.tsx`.
4. Render it in `App.tsx`; add it to `GATED_VIEWS` if it requires vault unlock.
5. Add message types to `chrome-extension/src/shared/messages.ts` and handle them in `handler.ts` or the service worker.
6. Pick a new per-feature accent colour and add it to both `index.css` and the Android theme.

## File reference conventions

- Use full repo-root paths in backticks when referencing source: `chrome-extension/src/offscreen/db.ts`, not `src/offscreen/db.ts`.
- Keep version numbers in `chrome-extension/package.json` and `chrome-extension/manifest.json` in sync via `npm run release:*` (which calls `scripts/bump.js`), not by hand.
- The `"key"` field in `manifest.json` is for local dev only (stable extension id); the pack script strips it from build output. Do not commit a build that still contains it.
