'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveRound } from '@/app/actions/rounds'

interface HoleScore {
  hole: number
  par: number
  yardage: number
  score: number | null
  putts: number | null
  fairwayHit: boolean | null
  gir: boolean | null
}

interface RoundState {
  courseId: string
  courseName: string
  teeBox: string
  transport: 'walking' | 'cart'
  holes: HoleScore[]
}

function relDisplay(rel: number): string {
  if (rel === 0) return 'E'
  return rel > 0 ? `+${rel}` : `${rel}`
}

function relColor(rel: number): string {
  if (rel <= -2) return 'text-yellow-500'
  if (rel === -1) return 'text-green-600'
  if (rel === 0) return 'text-gray-900'
  if (rel === 1) return 'text-orange-500'
  return 'text-red-500'
}

function holeScoreStyle(score: number | null, par: number): string {
  if (score === null) return 'text-gray-300'
  const rel = score - par
  if (rel <= -2) return 'bg-yellow-400 text-yellow-900 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
  if (rel === -1) return 'bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
  if (rel === 0) return 'text-gray-700 text-sm text-center block'
  if (rel === 1) return 'bg-orange-400 text-white rounded w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
  return 'bg-red-500 text-white rounded w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
}

export default function SummaryPage() {
  const router = useRouter()
  const [round, setRound] = useState<RoundState | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('parhub_round')
    if (!raw) { router.replace('/log-round'); return }
    try {
      setRound(JSON.parse(raw))
    } catch {
      router.replace('/log-round')
    }
  }, [router])

  if (!round) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  const scoredHoles = round.holes.filter((h) => h.score !== null)
  const totalScore = scoredHoles.reduce((sum, h) => sum + (h.score ?? 0), 0)
  const totalPar = scoredHoles.reduce((sum, h) => sum + h.par, 0)
  const scoreVsPar = totalScore - totalPar
  const totalPutts = scoredHoles.reduce((sum, h) => sum + (h.putts ?? 0), 0)
  const parHoles = round.holes.filter((h) => h.par === 4 || h.par === 5)
  const fairwaysHit = parHoles.filter((h) => h.fairwayHit === true).length
  const fairwaysPossible = parHoles.length
  const girCount = scoredHoles.filter((h) => h.gir === true).length

  async function handleSave() {
    if (!round) return
    setSaving(true)
    setError(null)
    try {
      await saveRound({ ...round, notes })
      sessionStorage.removeItem('parhub_round')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save round')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-green-800 px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{round.courseName}</p>
            <p className="text-green-300 text-xs">
              {round.teeBox} tees · {round.transport}
            </p>
          </div>
          <p className="text-green-200 text-sm">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 space-y-5">
        {/* Score hero */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Final Score</p>
            <p className="text-6xl font-black text-gray-900 leading-none mt-1">{totalScore || '—'}</p>
          </div>
          {totalScore > 0 && (
            <div className="text-right">
              <p className={`text-4xl font-black leading-none ${relColor(scoreVsPar)}`}>
                {relDisplay(scoreVsPar)}
              </p>
              <p className="text-xs text-gray-400 mt-1">vs par {totalPar}</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Putts" value={totalPutts || '—'} />
          <StatCard
            label="Fairways"
            value={fairwaysPossible > 0 ? `${fairwaysHit}/${fairwaysPossible}` : '—'}
          />
          <StatCard label="GIR" value={`${girCount}/18`} />
        </div>

        {/* Hole-by-hole table */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Scorecard
          </h3>
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-6 gap-0 border-b border-gray-100 bg-gray-50 px-3 py-2">
              {['Hole', 'Par', 'Yds', 'Score', 'Putts', 'GIR'].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-gray-400 text-center">{h}</span>
              ))}
            </div>
            {/* Hole rows */}
            <div className="divide-y divide-gray-50">
              {round.holes.map((h) => (
                <div key={h.hole} className="grid grid-cols-6 gap-0 px-3 py-2 items-center">
                  <span className="text-xs font-medium text-gray-500 text-center">{h.hole}</span>
                  <span className="text-xs text-gray-400 text-center">{h.par}</span>
                  <span className="text-xs text-gray-400 text-center">{h.yardage || '—'}</span>
                  <div className="flex justify-center">
                    <span className={holeScoreStyle(h.score, h.par)}>
                      {h.score ?? '—'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 text-center">{h.putts ?? '—'}</span>
                  <span className="text-center">
                    {h.gir === true ? (
                      <span className="text-green-500 text-xs">✓</span>
                    ) : h.gir === false ? (
                      <span className="text-gray-300 text-xs">✗</span>
                    ) : (
                      <span className="text-gray-200 text-xs">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {/* Totals row */}
            <div className="grid grid-cols-6 gap-0 border-t border-gray-200 bg-gray-50 px-3 py-2 items-center">
              <span className="text-xs font-bold text-gray-600 text-center col-span-2">Total</span>
              <span className="text-xs text-gray-400 text-center" />
              <span className="text-xs font-bold text-gray-900 text-center">{totalScore || '—'}</span>
              <span className="text-xs font-bold text-gray-900 text-center">{totalPutts || '—'}</span>
              <span className="text-xs font-bold text-gray-900 text-center">{girCount}</span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go? Any standout holes?"
            rows={3}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
          />
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-green-700 px-6 py-4 text-base font-bold text-white shadow-md shadow-green-700/25 hover:bg-green-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving…
            </span>
          ) : (
            'Save Round'
          )}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
        >
          ← Back to scorecard
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-3 py-3 text-center">
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
