# Testing

The Chrome extension has a real Vitest suite; the Android app does not yet. This page covers what is tested, how to run it, and how to add to it.

## Running the tests

```bash
cd chrome-extension
npm test
```

This runs `vitest run`, which executes every `*.test.ts` file in `chrome-extension/tests/` once and exits. There is no watch mode wired into the npm script; if you want one, run `npx vitest` directly.

The Vitest config lives in `chrome-extension/vite.config.ts`, which doubles as the Vitest config via `defineConfig` from `vitest/config`:

```ts
test: {
  environment: 'node',
  globals: true,
}
```

Tests run in a Node environment with `globals: true`, so `describe`, `it`, `expect`, and friends are available without imports. The Node environment is deliberate: the tests exercise pure logic and PGlite, not the DOM, and several specs rely on a real `process` object (the `define` block that replaces `process` for the browser build is skipped for tests because `environment: 'node'`).

## What is tested

There are 12 spec files in `chrome-extension/tests/`:

| Spec file | What it covers |
|---|---|
| `crypto.test.ts` | AES-256-GCM encrypt/decrypt round trip, PBKDF2 key derivation, base64 handling |
| `currency.test.ts` | Currency conversion logic extracted into a shared lib (17 unit tests) |
| `db.test.ts` | PGlite database CRUD for notes, secrets, subs, maps, todos |
| `generatePassword.test.ts` | Password generator character set, length, and randomness |
| `handler.test.ts` | The offscreen message handler: notes/vault/secrets/subs/export-import (expanded to 140 cases) |
| `mapPins.db.test.ts` | Map Pins table CRUD |
| `mapPins.handler.test.ts` | Map Pins handler branches |
| `nextBilling.test.ts` | Next-billing-date calculation for subscriptions |
| `parseImport.test.ts` | Import parsing for the export/import feature |
| `renderMarkdown.test.ts` | Markdown rendering for notes |
| `shareLink.test.ts` | Share-link generation/parsing |
| `todo.test.ts` | To-Do task CRUD and handler |

## How the tests are structured

Most specs follow one of two shapes:

- **Pure-function specs** (`renderMarkdown.test.ts`, `generatePassword.test.ts`, `nextBilling.test.ts`, `currency.test.ts`, `parseImport.test.ts`, `shareLink.test.ts`) import a function from `src/` and assert on its output directly. These are fast and have no dependencies.
- **Handler and DB specs** (`handler.test.ts`, `db.test.ts`, `mapPins.db.test.ts`, `mapPins.handler.test.ts`, `todo.test.ts`) stand up an in-memory PGlite instance, drive it through the handler or DB module, and assert on the resulting rows. `db.test.ts` and `handler.test.ts` are the largest specs (14 KB and 13 KB respectively) and are the best templates for a new data-layer feature.

`crypto.test.ts` is its own category: it must exercise the full encrypt-then-decrypt round trip and is the only spec that touches Web Crypto. Never ship a change to `src/offscreen/crypto.ts` without extending this spec.

## Adding a new test

1. Decide which shape your test is. If you added a pure function, write a pure-function spec. If you added a table or handler branch, write both a `<feature>.db.test.ts` and a `<feature>.handler.test.ts` (see `mapPins.*` for the pattern).
2. Put the file in `chrome-extension/tests/`.
3. Use `globals: true` style: `describe('feature', () => { it('does x', () => { ... }) })` with no imports for the test globals.
4. For DB/handler tests, spin up PGlite the same way `db.test.ts` does.
5. Run `npm test` and confirm it passes.

## Testing expectations

Per [Contributing](./index.md): every new data-layer function must have a test, pure functions must be unit-tested directly, and crypto changes must extend `crypto.test.ts`. The 12 existing specs are the floor.

## Related pages

- [Contributing](./index.md) - the PR process and testing expectations
- [Development workflow](./development-workflow.md) - where `npm test` fits in the loop
- [Tooling](./tooling.md) - the Vitest config in `vite.config.ts`
- [Debugging](./debugging.md) - when tests pass but the extension misbehaves
