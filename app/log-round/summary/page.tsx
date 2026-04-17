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
  inSand?: boolean | null
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
  if (rel <= -2) return 'text-yellow-400'
  if (rel === -1) return 'text-[#4ade80]'
  if (rel === 0) return 'text-gray-400'
  if (rel === 1) return 'text-orange-400'
  return 'text-red-400'
}

function holeScoreBg(score: number | null, par: number): string {
  if (score === null) return 'text-gray-700'
  const rel = score - par
  if (rel <= -2) return 'bg-yellow-400 text-black rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
  if (rel === -1) return 'bg-[#4ade80] text-black rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
  if (rel === 0) return 'text-gray-400 text-sm text-center block'
  if (rel === 1) return 'bg-orange-500 text-white rounded w-7 h-7 flex items-center justify-center text-xs font-bold mx-auto'
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
    try { setRound(JSON.parse(raw)) } catch { router.replace('/log-round') }
  }, [router])

  if (!round) {
    return (
      <div className="min-h-screen bg-[#0d1a0f] flex items-center justify-center">
        <svg className="w-8 h-8 text-[#4ade80] animate-spin" fill="none" viewBox="0 0 24 24">
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
    const result = await saveRound({ ...round, notes })
    if (result?.error) {
      setError(result.error)
      setSaving(false)
      return
    }
    sessionStorage.removeItem('parhub_round')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#0d1a0f] pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#111f13] border-b border-[#1e1e1e] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#4ade80]">Round Summary</p>
            <p className="text-white font-bold text-sm leading-tight">{round.courseName}</p>
          </div>
          <p className="text-gray-500 text-xs">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 space-y-4">
        {/* Score hero */}
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">Final Score</p>
            <p className="text-6xl font-black text-white leading-none">{totalScore || '—'}</p>
          </div>
          {totalScore > 0 && (
            <div className="text-right">
              <p className={`text-4xl font-black leading-none ${relColor(scoreVsPar)}`}>
                {relDisplay(scoreVsPar)}
              </p>
              <p className="text-xs text-gray-600 mt-1">vs par {totalPar}</p>
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
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2 px-1">
            Scorecard
          </h3>
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden">
            <div className="grid grid-cols-6 gap-0 border-b border-[#2a3d2c] bg-[#111] px-3 py-2">
              {['Hole', 'Par', 'Yds', 'Score', 'Putts', 'GIR'].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-gray-600 text-center">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[#2a3d2c]">
              {round.holes.map((h) => (
                <div key={h.hole} className="grid grid-cols-6 gap-0 px-3 py-2 items-center">
                  <span className="text-xs font-bold text-gray-400 text-center">{h.hole}</span>
                  <span className="text-xs text-gray-600 text-center">{h.par}</span>
                  <span className="text-xs text-gray-600 text-center">{h.yardage || '—'}</span>
                  <div className="flex justify-center">
                    <span className={holeScoreBg(h.score, h.par)}>
                      {h.score ?? '—'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 text-center">{h.putts ?? '—'}</span>
                  <span className="text-center">
                    {h.gir === true ? (
                      <span className="text-[#4ade80] text-xs">✓</span>
                    ) : h.gir === false ? (
                      <span className="text-gray-700 text-xs">✗</span>
                    ) : (
                      <span className="text-gray-700 text-xs">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-0 border-t border-[#2a3d2c] bg-[#111] px-3 py-2 items-center">
              <span className="text-xs font-bold text-gray-400 text-center col-span-2">Total</span>
              <span />
              <span className="text-xs font-bold text-white text-center">{totalScore || '—'}</span>
              <span className="text-xs font-bold text-white text-center">{totalPutts || '—'}</span>
              <span className="text-xs font-bold text-white text-center">{girCount}</span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2 px-1">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go? Any standout holes?"
            rows={3}
            className="w-full rounded-2xl border border-[#2a3d2c] bg-[#1a2e1d] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#4ade80]/50 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30 resize-none"
          />
        </section>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-[#4ade80] px-6 py-4 text-base font-black text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

        <button onClick={() => router.back()} className="w-full text-sm text-gray-600 hover:text-gray-400 py-1">
          ← Back to scorecard
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-3 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
