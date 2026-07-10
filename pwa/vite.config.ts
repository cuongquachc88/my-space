import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Serve oauth-callback.html at /oauth-callback during dev
    {
      name: 'oauth-callback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/oauth-callback')) {
            const html = fs.readFileSync(path.resolve(__dirname, 'public/oauth-callback.html'), 'utf-8')
            res.setHeader('Content-Type', 'text/html')
            res.end(html)
            return
          }
          next()
        })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'My SPACE',
        short_name: 'My SPACE',
        description: 'Your private encrypted vault — notes, secrets, todos, subscriptions',
        theme_color: '#0f2020',
        background_color: '#0f2020',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'oauth-callback': 'public/oauth-callback.html',
      },
    },
  },
})
