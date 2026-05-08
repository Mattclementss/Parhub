import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `This is a golf scorecard screenshot. Extract the data and return ONLY valid JSON, no markdown, no explanation.

The scorecard has rows for: hole numbers, par values, and scores shot.
It may show 9 holes (front 9: holes 1-9, or back 9: holes 10-18) or 18 holes.

Return this exact JSON structure:
{
  "courseName": "course name if visible, otherwise null",
  "date": "date if visible in YYYY-MM-DD format, otherwise null",
  "holes": [
    { "hole": 1, "par": 4, "score": 5 },
    ...
  ]
}

Rules:
- hole numbers must be the actual hole numbers (back 9 starts at 10, not 1)
- include only holes that have both a par and a score filled in
- if a score cell is blank or has no number, omit that hole
- par values are typically 3, 4, or 5
- scores are typically 1-10`,
          },
        ],
      },
    ],
  })

  const text = response.content.find(b => b.type === 'text')?.text ?? ''

  let parsed: { courseName: string | null; date: string | null; holes: Array<{ hole: number; par: number; score: number }> }
  try {
    parsed = JSON.parse(text.trim())
  } catch {
    // Try to extract JSON if there's surrounding text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Could not parse scorecard' }, { status: 422 })
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return NextResponse.json({ error: 'Could not parse scorecard' }, { status: 422 })
    }
  }

  if (!parsed.holes || parsed.holes.length === 0) {
    return NextResponse.json({ error: 'No hole data found in image' }, { status: 422 })
  }

  return NextResponse.json(parsed)
}
