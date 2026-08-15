// Isolated so tests/setup.ts can swap this for a Node fs-based loader —
// the browser `?url` import only resolves correctly against a real dev
// server / build output, not under Vitest's Node runtime.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { SqlJsConfig } from 'sql.js'

export function getSqlJsConfig(): SqlJsConfig {
  return { locateFile: () => sqlWasmUrl }
}
