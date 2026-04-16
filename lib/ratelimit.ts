/**
 * Simple in-memory sliding-window rate limiter.
 * Resets on cold start — acceptable for Vercel serverless.
 * Swap the store for an Upstash Redis client for multi-instance durability.
 */

interface Bucket {
  timestamps: number[]
}

const store = new Map<string, Bucket>()

/**
 * Check whether a key (e.g. "ip:connect") is within its rate limit.
 * @param key      Unique identifier (IP + route combo)
 * @param limit    Max requests allowed per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const bucket = store.get(key) ?? { timestamps: [] }

  // Evict timestamps outside the current window
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)

  if (bucket.timestamps.length >= limit) {
    store.set(key, bucket)
    const oldest = bucket.timestamps[0]
    return { success: false, remaining: 0, resetMs: oldest + windowMs - now }
  }

  bucket.timestamps.push(now)
  store.set(key, bucket)

  return {
    success: true,
    remaining: limit - bucket.timestamps.length,
    resetMs: 0,
  }
}

/**
 * Extract the real client IP, accounting for Vercel / reverse-proxy headers.
 */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}

/** Convenience: 5 req / 60 s per IP on a given route slug */
export function checkRateLimit(
  request: Request,
  route: string
): { success: boolean; response?: Response } {
  const ip = getClientIp(request)
  const result = rateLimit(`${ip}:${route}`, 5, 60_000)

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(result.resetMs / 1000)),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    }
  }

  return { success: true }
}
