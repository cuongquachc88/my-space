// Must be the first module imported in the offscreen entry point.
// PGlite's Emscripten runtime references `process` (a Node.js global)
// which does not exist in Chrome extension offscreen document contexts.
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { exitCode: 0, env: {}, version: '', versions: {} }
}
