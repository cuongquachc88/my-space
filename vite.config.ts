import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  define: {
    // Replace the entire `process` global for browser/extension builds.
    // Emscripten-compiled PGlite references process dynamically, so replacing
    // individual properties (process.exitCode) is not enough.
    // Tests use environment: 'node' so they have the real process object.
    'process': JSON.stringify({ exitCode: 0, env: {}, version: '', versions: {} }),
  },
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/offscreen/index.html',
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
