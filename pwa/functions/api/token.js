/**
 * Cloudflare Pages Function — Google OAuth token exchange proxy.
 * Holds client_secret server-side so it never appears in the browser bundle.
 *
 * Set these secrets in Cloudflare dashboard (Settings → Environment variables → Secret):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token'])

export async function onRequestPost(context) {
  const { request, env } = context

  // CORS — only allow requests from the same origin (Pages site)
  const origin = request.headers.get('Origin') ?? ''
  const host = new URL(request.url).host
  const allowedOrigins = [
    `https://${host}`,
    'http://localhost:5173',
    'http://localhost:4173',
  ]
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_request', error_description: 'Body must be JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const { code, code_verifier, redirect_uri, grant_type = 'authorization_code' } = body

  if (!ALLOWED_GRANT_TYPES.has(grant_type)) {
    return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  if (grant_type === 'authorization_code' && (!code || !code_verifier || !redirect_uri)) {
    return new Response(JSON.stringify({ error: 'invalid_request', error_description: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'server_error', error_description: 'OAuth credentials not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
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

  const data = await googleRes.json()
  return new Response(JSON.stringify(data), {
    status: googleRes.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// Preflight
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
