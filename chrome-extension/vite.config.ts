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
    rolldownOptions: {
      input: {
        offscreen: 'src/offscreen/index.html',
        // savePrompt.js is dynamically registered via chrome.scripting at
        // runtime after the user enables the Save Password feature in Settings.
        // Give it a stable filename so the registration code can reference it
        // without depending on the build hash.
        savePrompt: 'src/content/savePrompt.ts',
      },
      output: {
        entryFileNames: (chunk) => chunk.name === 'savePrompt' ? 'savePrompt.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
