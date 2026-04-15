import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/profile?error=whoop_auth_failed', request.url))
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('whoop_oauth_state')?.value
  cookieStore.delete('whoop_oauth_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/profile?error=whoop_state_mismatch', request.url))
  }

  // Exchange code for tokens
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/api/whoop/callback',
      client_id: process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL('/profile?error=whoop_token_failed', request.url))
  }

  const tokens = await res.json()

  // Store tokens in Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error: upsertError } = await supabase.from('whoop_tokens').upsert(
    {
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    },
    { onConflict: 'user_id' }
  )

  if (upsertError) {
    return NextResponse.redirect(new URL('/profile?error=whoop_save_failed', request.url))
  }

  return NextResponse.redirect(new URL('/profile?connected=true', request.url))
}
