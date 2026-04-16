import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhoopData, WhoopDebugLog } from '@/lib/whoop/client'

const WHOOP_V2 = 'https://api.prod.whoop.com/developer/v2'

async function probeEndpoint(url: string, accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  console.log(`[WHOOP DEBUG] probing ${url}`)
  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    const text = await res.text()
    let body: unknown
    try { body = JSON.parse(text) } catch { body = text }
    return { status: res.status, ok: res.ok, body }
  } catch (err) {
    return { status: null, ok: false, body: String(err) }
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at, created_at')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) {
    return NextResponse.json({
      error: 'No WHOOP token found in database',
      tokenError: tokenError?.message,
    })
  }

  const token = tokenRow.access_token

  // Probe multiple endpoints in parallel to diagnose what's working
  const [profile, cycle, recovery, sleep] = await Promise.all([
    probeEndpoint(`${WHOOP_V2}/user/profile/basic`, token),
    probeEndpoint(`${WHOOP_V2}/cycle?limit=1`, token),
    probeEndpoint(`${WHOOP_V2}/recovery?limit=1`, token),
    probeEndpoint(`${WHOOP_V2}/activity/sleep?limit=3`, token),
  ])

  // Now run the full getWhoopData with debug log
  const log: WhoopDebugLog = {
    timestamp: new Date().toISOString(),
    tokenRow: { found: false },
    recovery: { url: '' },
    sleep: { url: '' },
  }
  const whoopResult = await getWhoopData(user.id, log)

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    userId: user.id,
    tokenInfo: {
      found: true,
      expiresAt: tokenRow.expires_at,
      createdAt: tokenRow.created_at,
      isExpired: new Date(tokenRow.expires_at) < new Date(),
      accessTokenPrefix: token.slice(0, 24) + '...',
      refreshTokenPrefix: tokenRow.refresh_token?.slice(0, 24) + '...',
    },
    endpointProbes: {
      'v2/user/profile/basic': profile,
      'v2/cycle?limit=1': cycle,
      'v2/recovery?limit=1': recovery,
      'v2/activity/sleep?limit=3': sleep,
    },
    debugLog: log,
    finalResult: whoopResult,
  })
}
