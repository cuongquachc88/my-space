# Notes

Notes is a lightweight Markdown editor for jotting down thoughts, snippets, and reference material. Each note has a title, Markdown body, tags, and optional attached images, all stored locally and encrypted at rest on the Chrome extension side.

## How it works

### Chrome extension

The side panel renders a two-pane layout: a searchable list on the left and an editor on the right. `NotesView` manages the list/editor state and sends all data operations through the message router to the offscreen document.

- **List pane**: notes are grouped by their first tag. A search box filters by query (`NOTES_LIST` with a `query` payload), and tag chips toggle a tag filter. `NoteCard` renders each list entry with a relative timestamp ("just now", "5m ago", "3h ago") computed from `note.updated_at`.
- **Editor pane**: title and content are plain text inputs. Content is written in Markdown. A Preview toggle switches the textarea to a rendered HTML view using `renderMarkdown`. Tags are managed through the reusable `TagInput` component (lowercase, Enter or comma to add, click x to remove).
- **Auto-save**: saves on blur of the title, content, tag, or image fields. There is no explicit save button; the footer shows "Saving..." or "Auto-saved".
- **Images**: picked from the local filesystem via a hidden file input, read as data URLs, and stored in the `image_data` JSON array column. Images display as 64px thumbnails in an image strip with per-image remove buttons.

The Markdown renderer (`renderMarkdown.ts`) is a hand-rolled parser that handles:

- Code blocks (triple backtick), inline code, bold, italic, links (http/https only, `rel="noopener noreferrer"`)
- Headings (h1/h2/h3), horizontal rules, ordered and unordered lists
- XSS protection: strips `<script>` tags and `on*` event handler attributes before rendering

### Android

`NotesScreen` is a single-column list with a search bar and a FAB to create new notes. Tapping a card opens a `NoteEditorSheet` modal bottom sheet (93% height) with title, image picker, and content fields. Key differences from Chrome:

- **No tag support**: the Android `NoteEntity` stores `tags` as a hardcoded `"[]"` string; tags are not surfaced in the UI.
- **No Markdown preview**: the content placeholder says "Markdown supported" but there is no preview toggle; editing is plain text only.
- **Image handling**: images are stored as content URI strings (with persistable URI permission) rather than base64 data URLs. Coil's `AsyncImage` renders them.
- **No grouping**: notes are a flat `LazyColumn` sorted by the DAO, not grouped by tag.
- **Save model**: explicit Save/Cancel buttons in the bottom sheet rather than auto-save on blur.

### Data model

The note record has `id`, `title`, `content`, `tags` (JSON array), `image_data` (JSON array of data URLs or URIs), `created_at`, and `updated_at`. On Chrome, these are stored in PGlite; on Android, in a Room table (`NoteEntity`).

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/sidepanel/views/NotesView.tsx` | Main notes view: list pane, editor pane, search, tag filter, image handling |
| `chrome-extension/src/lib/renderMarkdown.ts` | Hand-rolled Markdown to HTML renderer with XSS sanitization |
| `chrome-extension/src/sidepanel/components/NoteCard.tsx` | List item card with relative timestamp |
| `chrome-extension/src/sidepanel/components/TagInput.tsx` | Reusable tag input chip component |
| `android/app/src/main/java/com/myspace/app/ui/screens/NotesScreen.kt` | Android notes list + editor bottom sheet |

## Cross-links

- [Chrome extension](../applications/chrome-extension.md) - overall extension architecture and message routing
- [Secret vault](./secret-vault.md) - shares the `TagInput` component and tag-grouping UX pattern
- [Google Drive sync](./google-drive-sync.md) - notes are included in encrypted Drive backups
