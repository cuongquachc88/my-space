# Contributing

How work happens on My SPACE. This is a small, solo-origin project, so the process is lightweight but real: there is a build, there are tests, and there is a release script, and a contribution that skips any of them will not land.

If you are looking for the mechanics of building and running things locally, go straight to [Development workflow](./development-workflow.md). For the test suite specifically, see [Testing](./testing.md).

## Picking up work

There is no issue tracker wired into this guide. Work is driven by the feature roadmap visible in the git history and the [Lore](../lore.md) page: each era (notes/vault/generator/subs, sync, import, Map Pins/To-Do, Android, Reports & Bills) suggests the next natural step. If you have a concrete change in mind, the expectation is that you can describe it in one sentence and point at the file(s) it touches.

When in doubt, pick something that already has test coverage in `chrome-extension/tests/` and extend it, because the test suite is the de facto spec for what the extension does.

## Pull request process

1. Branch off `main`. Name the branch after the change, e.g. `feat/map-pin-share` or `fix/sync-401`.
2. Make the change. Keep commits focused; the existing history uses `feat:`, `fix:`, `chore:`, `docs:`, and `test:` prefixes, and so should you.
3. Run the tests: `npm test` inside `chrome-extension/`. See [Testing](./testing.md) for what is covered.
4. Build the extension: `npm run build` inside `chrome-extension/`. The build must succeed with no Vite errors.
5. If you changed the extension, load `chrome-extension/dist/` in Chrome via `chrome://extensions` (developer mode) and click through the affected view. See [Debugging](./debugging.md).
6. If you changed the Android app, open `android/` in Android Studio and build it. See [Development workflow](./development-workflow.md).
7. Open the PR against `main`. Describe the change, link any context, and note which views/screens you exercised manually.

There is no CI configured in this repository, so the build and test step in the PR is the contract: a green `npm run build` and a green `npm test` are required.

## Adding a new view or feature

The extension and the app follow the same pattern: a feature is a view plus the data layer that backs it. To add a new feature end to end:

### Chrome extension

1. **Data layer.** Add a table and CRUD helpers to the PGlite module at `chrome-extension/src/offscreen/db.ts`. Mirror the schema style of the existing `notes`, `secrets`, `subs`, `maps`, and `todos` tables.
2. **Message types.** Add request/response types to `chrome-extension/src/shared/messages.ts` and a handler branch in `chrome-extension/src/offscreen/handler.ts`.
3. **View.** Add a React component under `chrome-extension/src/sidepanel/views/` and wire it into the navigation in `chrome-extension/src/sidepanel/App.tsx`.
4. **Tests.** Add a `chrome-extension/tests/<feature>.test.ts` (and a `<feature>.db.test.ts` if the data layer is non-trivial). Follow the shape of `todo.test.ts` and `mapPins.db.test.ts`.
5. **Sync.** If the feature should sync to Drive, extend `handlePush` and `handlePull` in `chrome-extension/src/service-worker/index.ts` and include the new counts in the sync response.

### Android app

1. **Data layer.** Add a Room entity and DAO in `android/app/src/main/java/com/myspace/app/data/`, and register it in `AppDatabase.kt`.
2. **Screen.** Add a Compose screen under `android/app/src/main/java/com/myspace/app/ui/screens/` and add a route to it in `MySpaceApp.kt`.
3. **Sync.** If the feature syncs from the extension's Drive backup, extend `DriveRepository.kt` to parse the new fields and persist them via the DAO.

## Testing expectations

- Every new data-layer function in the Chrome extension must have a Vitest test. The existing 12 spec files are the floor, not the ceiling.
- Pure functions (markdown rendering, password generation, billing-date math, currency conversion, import parsing) must be unit-tested directly, not only through the handler.
- Crypto changes must extend `crypto.test.ts`; never ship a crypto change without a test that exercises the round trip.
- The Android app has no unit-test module yet. If you add one, put it under `android/app/src/test/` and wire JUnit.

See [Testing](./testing.md) for how to run the suite and what each spec covers.

## Related pages

- [Development workflow](./development-workflow.md) - branch, build, run, pack
- [Testing](./testing.md) - the Vitest suite in detail
- [Debugging](./debugging.md) - Chrome devtools and Android logcat
- [Tooling](./tooling.md) - Vite, crxjs, Tailwind, the bump script
