import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

// ─── Allowed CORS origins ─────────────────────────────────────────────────────
const allowedOrigins = [
  'https://parhub.vercel.app', // update with your production domain
  'http://localhost:3000',
]

// ─── Content Security Policy ──────────────────────────────────────────────────
// In development Next.js (Turbopack) injects inline scripts — 'unsafe-inline'
// and 'unsafe-eval' are needed. Strip them in production.
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Tailwind injects inline styles
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Supabase + WHOOP API calls
  "connect-src 'self' https://api.prod.whoop.com https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// ─── Security headers applied to every route ─────────────────────────────────
const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy',   value: csp },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Security headers on every route
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // CORS for API routes — restrict to known origins
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            // In production only allow the deployed origin; fall back to localhost in dev
            value: isDev ? 'http://localhost:3000' : 'https://parhub.vercel.app',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age',        value: '86400' },
        ],
      },
    ]
  },
}

export default nextConfig
