// Env vars used: GOLF_COURSE_API_KEY (server-side only)
import { type NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const apiKey = process.env.GOLF_COURSE_API_KEY

  const res = await fetch(`https://api.golfcourseapi.com/v1/courses/${id}`, {
    headers: { Authorization: `Key ${apiKey}` },
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    return Response.json({ course: null, error: 'API error' }, { status: res.status })
  }

  const data = await res.json()
  return Response.json(data)
}
