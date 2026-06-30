# Import

The import feature lets you bulk-load secrets into the vault from external password manager exports. It supports Bitwarden JSON exports, 1Password CSV exports, and generic CSV files. Import is available in the Settings view and requires the vault to be unlocked.

## How it works

`parseImport.ts` is the core parser. It dispatches on file extension: `.json` files are parsed as Bitwarden exports, everything else is treated as CSV.

### Bitwarden JSON

The Bitwarden export format is a JSON object with `folders` (array of `{id, name}`) and `items` (array of item objects). The parser:

1. Builds a folder ID-to-name map from `folders`.
2. Iterates `items`, keeping only `type === 1` (login items, not secure notes or cards).
3. Extracts `item.name` as the label and `item.login.password` as the value.
4. Maps `item.folderId` to the folder name as a tag (lowercased).
5. Skips items with no password.

### 1Password CSV

1Password CSV exports have headers including `title`, `password`, and `category`. The parser:

1. Reads the header row and locates the `title`, `password`, and `category` column indices.
2. For each data row, extracts the label from `title`, value from `password`, and tag from `category` (lowercased).
3. Skips rows with empty label or value.

### Generic CSV

A simple 3-column format: `label, value, tags`. The third column is optional and can contain comma-separated tags. Rows with empty label or value are skipped.

### CSV parsing

`splitCsvRows` and `parseCsvLine` implement a basic CSV parser that handles quoted fields and escaped double quotes (`""`), but does not handle multi-line quoted fields.

### Settings integration

`SettingsView` provides the import UI within the Settings tab:

1. **File picker**: a hidden file input (`accept=".csv,.json"`) triggered by a "Choose File" button.
2. **Preview**: after parsing, shows a count ("12 secrets ready to import") and a preview list of the first 5 labels with their tags, plus a "+N more" indicator if there are more.
3. **Import execution**: iterates the parsed secrets and calls `SECRETS_CREATE` for each, tracking success/failure counts. Each secret is encrypted with the vault key on creation.
4. **Result message**: shows "Imported N secrets successfully" or "Imported N, failed M" on completion.

The import runs sequentially (not batched), creating one secret at a time through the normal `SECRETS_CREATE` message path, so each value is individually AES-GCM encrypted before storage.

### Android

The import feature is Chrome-extension only. There is no equivalent parser or import UI on Android.

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/lib/parseImport.ts` | Multi-format parser: Bitwarden JSON, 1Password CSV, generic CSV |
| `chrome-extension/src/sidepanel/views/SettingsView.tsx` | Settings UI with file picker, preview, and import execution |

## Cross-links

- [Secret vault](./secret-vault.md) - imported secrets are stored as encrypted vault entries via `SECRETS_CREATE`
- [Password generator](./password-generator.md) - alternative way to create strong passwords for manual vault entry
- [Chrome extension](../applications/chrome-extension.md) - extension architecture and message routing
