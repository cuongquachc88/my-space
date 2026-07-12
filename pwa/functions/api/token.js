// Cloudflare Pages Function — POST /api/token
// Proxies Google OAuth token exchange keeping client_secret server-side.
// Env vars set in Pages project Settings → Variables and Secrets:
//   VITE_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token'])

function corsHeaders(origin, allowedOrigins) {
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url)
  const host = url.host
  const origin = request.headers.get('Origin') ?? ''
  const allowedOrigins = [`https://${host}`, 'http://localhost:5173', 'http://localhost:4173']
  const cors = corsHeaders(origin, allowedOrigins)

  let body
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
    params.set('code', code)
    params.set('code_verifier', code_verifier)
    params.set('redirect_uri', redirect_uri)
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
