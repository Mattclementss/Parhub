import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'

export async function GET() {
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID!,
    redirect_uri: 'http://localhost:3000/api/whoop/callback',
    response_type: 'code',
    scope: 'read:recovery read:sleep read:workout read:profile offline',
    state,
  })

  return NextResponse.redirect(`${WHOOP_AUTH_URL}?${params}`)
}
