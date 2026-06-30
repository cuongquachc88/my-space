# Auto-fill Plan: Key Vault → Web Forms

## Overview

When a user visits a login page, the extension detects `<input>` fields for username/email and password, matches the page URL against Key Vault entries that have a `url` field, and offers to auto-fill the credentials.

## Architecture

```
Content Script (login pages)
    ↕ chrome.runtime.sendMessage
Service Worker
    ↕ chrome.runtime.sendMessage
Offscreen Document (decrypt secret value)
    ↕ response back through chain
Content Script fills the form
```

## Step 1: Content script for login detection

Create `src/content/autofill.ts` — runs on all HTTP(S) pages.

- On page load, scan for `<input type="password">` and nearby text/email inputs
- If a password field is found, the page is a login form candidate
- Extract the page's domain (e.g. `github.com` from `https://github.com/login`)
- Send `{ type: 'AUTOFILL_LOOKUP', payload: { domain } }` to service worker
- If matches found, inject a small floating "My SPACE" badge near the password field
- User clicks the badge → extension sends `AUTOFILL_GET` to decrypt the value → fills the form

### Form detection heuristics

```
1. Find all <input type="password"> elements
2. For each password field, walk up to the nearest <form> or container
3. Within that container, find:
   - <input type="email"> or <input type="text"> nearest above the password field → username
   - The password field itself → password
4. If no <form>, look for inputs within a shared parent div
```

### URL matching logic

- Store the `url` field on secrets as a full URL (e.g. `https://github.com/login`)
- Match by domain: extract hostname from the secret's `url` and compare with the current page's hostname
- If multiple secrets match the same domain, show all matches in a dropdown
- If the secret's `url` path matches the current path, prioritise it over domain-only matches

## Step 2: New message types

Add to `src/shared/messages.ts`:

```typescript
// Content script → service worker: "are there secrets for this domain?"
export type AutofillLookupMsg = Msg<'AUTOFILL_LOOKUP', { domain: string }>

// Service worker → offscreen: "decrypt this secret's value"
export type AutofillGetMsg = Msg<'AUTOFILL_GET', { id: string }>
```

## Step 3: Service worker handler

In `src/service-worker/index.ts`:

- `AUTOFILL_LOOKUP`: Query `SECRETS_LIST` from offscreen, filter by `url` containing the domain, return matching `SecretMeta[]` (label + id only, no values)
- `AUTOFILL_GET`: Forward to offscreen as `SECRETS_GET`, return decrypted value
- Both require vault to be unlocked — if locked, return `{ ok: false, error: 'locked' }` and the content script shows a "Unlock My SPACE" prompt

## Step 4: Content script UI

Inject a small floating badge near detected password fields:

```
┌─────────────────────────┐
│  🔑 My SPACE            │
│  GitHub Token           │
│  Click to auto-fill     │
└─────────────────────────┘
```

- Positioned above or beside the password field
- Shows matching secret labels
- On click: sends `AUTOFILL_GET`, fills username + password fields
- If vault locked: badge says "Unlock My SPACE" and opens side panel on click
- Auto-dismisses after 30 seconds or if the form is submitted

## Step 5: Manifest changes

Add to `manifest.json` content_scripts:

```json
{
  "matches": ["<all_urls>"],
  "js": ["src/content/autofill.ts"],
  "run_at": "document_idle",
  "exclude_matches": [
    "https://www.google.com/maps/*",
    "https://www.openstreetmap.org/*",
    "https://www.bing.com/maps/*",
    "https://maps.apple.com/*"
  ]
}
```

Exclude map pages (already have the pin button content script).

## Step 6: Security considerations

- Never log decrypted values
- Clear decrypted values from memory immediately after filling
- Only fill on user click (never auto-fill without consent)
- Badge auto-hides after 30s
- No values stored in content script memory longer than needed
- Vault must be unlocked — if locked, prompt user to open side panel

## Implementation order

1. Add message types (`AUTOFILL_LOOKUP`, `AUTOFILL_GET`) to `messages.ts`
2. Add handlers in `service-worker/index.ts`
3. Add offscreen routing for `AUTOFILL_GET` (reuse `SECRETS_GET`)
4. Create `src/content/autofill.ts` with form detection + badge UI
5. Update `manifest.json` with content script for all URLs
6. Test on common login pages patterns (GitHub, Gmail, etc.)
7. Add tests for URL domain matching logic
