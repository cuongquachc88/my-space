# Reference

The reference section holds the detailed, look-it-up material for My SPACE: the data model, the dependency inventory, and every configuration surface in the two projects.

## Pages

- [Data models](./data-models.md) - the PGlite schema (Chrome extension) and the Room entities (Android), and how they map to each other across the Drive sync.
- [Dependencies](./dependencies.md) - every runtime and build dependency in `chrome-extension/package.json` and `android/gradle/libs.versions.toml`, with the purpose of each.
- [Configuration](./configuration.md) - the `manifest.json` fields, `chrome.storage.local` keys, Android `SharedPreferences`, and the shared OAuth scopes.

## Where to go instead

- For "how do I build this?" go to [Development workflow](../how-to-contribute/development-workflow.md).
- For "how do I debug this?" go to [Debugging](../how-to-contribute/debugging.md).
- For "what is the build toolchain?" go to [Tooling](../how-to-contribute/tooling.md).
- For "how did this project evolve?" go to [Lore](../lore.md) and [By the numbers](../by-the-numbers.md).
