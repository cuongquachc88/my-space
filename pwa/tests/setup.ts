import { vi } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
console.log('[tests/setup] resolved sql.js wasm path:', wasmPath)

// db/wasmLoader's real implementation resolves the sql.js wasm file via a
// Vite `?url` import, which only resolves against a real dev server / build
// output — not under Vitest's Node runtime. Swap it for a plain Node fs read.
vi.mock('../src/db/wasmLoader', () => ({
  getSqlJsConfig: () => ({ wasmBinary: readFileSync(wasmPath) }),
}))
