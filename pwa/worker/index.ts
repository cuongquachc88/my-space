/**
 * Cloudflare Worker entry — serves static assets (SPA) and handles the
 * Google OAuth token-exchange proxy at POST /api/token.
 *
 * Why a Worker route (not a Pages Function): this project deploys as a
 * Cloudflare Worker (`wrangler deploy`), which does NOT auto-route the
 * `functions/` directory the way Pages does. `wrangler.jsonc` sets
 * `assets.run_worker_first: ["/api/*"]` so this handler runs first for
 * /api/*, while every other request falls through to the static assets
 * binding (SPA). Without this, /api/token was swallowed by the SPA
 * fallback (405 on POST) and OAuth login failed on all web platforms.
 *
 * The token proxy keeps client_secret server-side so it never ships in
 * the browser bundle. Env vars (Cloudflare dashboard → Variables/Secrets):
 *   VITE_GOOGLE_CLIENT_ID   — Google OAuth web client id
 *   GOOGLE_CLIENT_SECRET    — Google OAuth web client secret (store as Secret)
 */

interface Env {
  VITE_GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token'])

function corsHeadersFor(request: Request): Record<string, string> {
  // Only reflect same-origin (Pages/Worker site) or local dev origins.
  const origin = request.headers.get('Origin') ?? ''
  const host = new URL(request.url).host
  const allowedOrigins = [
    `https://${host}`,
    'http://localhost:5173',
    'http://localhost:4173',
  ]
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

async function handleToken(request: Request, env: Env): Promise<Response> {
  const cors = corsHeadersFor(request)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors)
  }

  let body: { code?: string; code_verifier?: string; redirect_uri?: string; grant_type?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_request', error_description: 'Body must be JSON' }, 400, cors)
  }

  const { code, code_verifier, redirect_uri, grant_type = 'authorization_code' } = body

  if (!ALLOWED_GRANT_TYPES.has(grant_type)) {
    return json({ error: 'unsupported_grant_type' }, 400, cors)
  }

  if (grant_type === 'authorization_code' && (!code || !code_verifier || !redirect_uri)) {
    return json({ error: 'invalid_request', error_description: 'Missing required fields' }, 400, cors)
  }

  const clientId = env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return json({ error: 'server_error', error_description: 'OAuth credentials not configured' }, 500, cors)
  }

  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type })
  if (grant_type === 'authorization_code') {
    params.set('code', code!)
    params.set('code_verifier', code_verifier!)
    params.set('redirect_uri', redirect_uri!)
  }

  const googleRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await googleRes.text()
  return new Response(data, {
    status: googleRes.status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/token') {
      return handleToken(request, env)
    }

    // Temporary debug endpoint — remove after confirming env vars are bound
    if (url.pathname === '/api/debug-env') {
      return json({
        has_client_id: !!env.VITE_GOOGLE_CLIENT_ID,
        has_client_secret: !!env.GOOGLE_CLIENT_SECRET,
        client_id_prefix: env.VITE_GOOGLE_CLIENT_ID?.slice(0, 12) ?? null,
      }, 200)
    }

    // Any other /api/* path: explicit 404 so it never falls into the SPA shell.
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'not_found' }, 404)
    }

    // Everything else → static assets binding (SPA fallback handled by config).
    return env.ASSETS.fetch(request)
  },
}
