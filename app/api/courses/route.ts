import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return Response.json({ courses: [] })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOLF_COURSE_API_KEY
  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(q)}`,
    {
      headers: { Authorization: `Key ${apiKey}` },
      next: { revalidate: 3600 },
    }
  )

  if (!res.ok) {
    return Response.json({ courses: [], error: 'API error' }, { status: res.status })
  }

  const data = await res.json()
  return Response.json(data)
}
