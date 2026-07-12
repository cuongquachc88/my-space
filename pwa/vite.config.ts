import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ ones) for use in server-side middleware
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Dev-only middleware: serve oauth-callback.html and proxy /api/token with secret
      {
        name: 'dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/oauth-callback')) {
              const html = fs.readFileSync(path.resolve(__dirname, 'public/oauth-callback.html'), 'utf-8')
              res.setHeader('Content-Type', 'text/html')
              res.end(html)
              return
            }

            // Token exchange proxy — keeps client_secret off the browser bundle
            if (req.url === '/api/token' && req.method === 'POST') {
              const clientId = env.VITE_GOOGLE_CLIENT_ID
              const clientSecret = env.GOOGLE_CLIENT_SECRET
              if (!clientId || !clientSecret) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'server_error', error_description: 'Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local' }))
                return
              }
              const chunks: Buffer[] = []
              req.on('data', (c: Buffer) => chunks.push(c))
              req.on('end', async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString())
                  const params = new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'authorization_code',
                    code: body.code,
                    code_verifier: body.code_verifier,
                    redirect_uri: body.redirect_uri,
                  })
                  const googleRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params,
                  })
                  const data = await googleRes.text()
                  res.statusCode = googleRes.status
                  res.setHeader('Content-Type', 'application/json')
                  res.end(data)
                } catch {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: 'server_error' }))
                }
              })
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
          name: 'My SPACE — Private Encrypted Vault',
          short_name: 'My SPACE',
          description: 'Your private digital space — encrypted password vault, notes, todos, maps, and subscriptions. All data stays on your device. Zero cloud, zero tracking.',
          theme_color: '#7c6af7',
          background_color: '#0f0f1a',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'any',
          scope: '/',
          start_url: '/?source=pwa',
          lang: 'en',
          dir: 'ltr',
          categories: ['productivity', 'utilities', 'lifestyle'],
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Vault', short_name: 'Vault', url: '/?view=vault', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
            { name: 'Notes', short_name: 'Notes', url: '/?view=notes', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
            { name: 'Todo', short_name: 'Todo', url: '/?view=todo', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          // Don't let the SW intercept OAuth callback pages — they must load
          // their own scripts, not get SPA-fallback'd to index.html.
          navigateFallbackDenylist: [/^\/oauth-callback/, /^\/oauth-loading/],
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['@electric-sql/pglite'],
    },
  }
})
