'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

// ─── Score helpers ──────────────────────────────────────────────────────────

function relToPar(score: number | null, par: number): number | null {
  return score !== null ? score - par : null
}

function scoreLabel(score: number | null, par: number): string {
  if (score === null) return ''
  const rel = score - par
  if (rel <= -3) return 'Albatross'
  if (rel === -2) return 'Eagle'
  if (rel === -1) return 'Birdie'
  if (rel === 0) return 'Par'
  if (rel === 1) return 'Bogey'
  if (rel === 2) return 'Double Bogey'
  if (rel === 3) return 'Triple Bogey'
  return `+${rel}`
}

function scoreBg(score: number | null, par: number): string {
  if (score === null) return 'bg-gray-100 text-gray-400'
  const rel = score - par
  if (rel <= -2) return 'bg-yellow-400 text-yellow-900'
  if (rel === -1) return 'bg-green-500 text-white'
  if (rel === 0) return 'bg-white text-gray-900 border-2 border-gray-200'
  if (rel === 1) return 'bg-orange-400 text-white'
  return 'bg-red-500 text-white'
}

// Mini chip (used in the strip at the bottom)
function miniScoreBg(score: number | null, par: number): string {
  if (score === null) return 'bg-gray-100 text-gray-300'
  const rel = score - par
  if (rel <= -2) return 'bg-yellow-400 text-yellow-900'
  if (rel === -1) return 'bg-green-500 text-white'
  if (rel === 0) return 'bg-white text-gray-700 border border-gray-300'
  if (rel === 1) return 'bg-orange-400 text-white'
  return 'bg-red-500 text-white'
}

// ─── Toggle button ───────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  yes = 'Yes',
  no = 'No',
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  yes?: string
  no?: string
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => onChange(true)}
        className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
          value === true
            ? 'bg-green-600 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        {yes}
      </button>
      <button
        onClick={() => onChange(false)}
        className={`flex-1 py-2.5 text-sm font-semibold border-l border-gray-200 transition-colors ${
          value === false
            ? 'bg-red-500 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        {no}
      </button>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ScorecardPage() {
  const router = useRouter()
  const [round, setRound] = useState<RoundState | null>(null)
  const [currentHole, setCurrentHole] = useState(0) // 0-indexed
  const stripRef = useRef<HTMLDivElement>(null)

  // Load round from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('parhub_round')
    if (!raw) { router.replace('/log-round'); return }
    try {
      setRound(JSON.parse(raw))
    } catch {
      router.replace('/log-round')
    }
  }, [router])

  // Persist to sessionStorage on every change
  useEffect(() => {
    if (round) sessionStorage.setItem('parhub_round', JSON.stringify(round))
  }, [round])

  // Auto-scroll the strip to keep current hole visible
  useEffect(() => {
    if (!stripRef.current) return
    const el = stripRef.current.children[currentHole] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentHole])

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

  const hole = round.holes[currentHole]
  const isLastHole = currentHole === round.holes.length - 1
  const isPar3 = hole.par === 3

  function updateHole(updates: Partial<HoleScore>) {
    setRound((prev) => {
      if (!prev) return prev
      const holes = prev.holes.map((h, i) =>
        i === currentHole ? { ...h, ...updates } : h
      )
      return { ...prev, holes }
    })
  }

  function incrementScore() {
    const next = (hole.score ?? hole.par) + 1
    updateHole({ score: Math.min(next, hole.par + 8) })
  }

  function decrementScore() {
    const next = (hole.score ?? hole.par) - 1
    updateHole({ score: Math.max(next, 1) })
  }

  // Default score to par if unset when navigating away
  function navigate(direction: 'prev' | 'next') {
    if (hole.score === null) updateHole({ score: hole.par })
    if (direction === 'next') setCurrentHole((h) => Math.min(h + 1, (round?.holes.length ?? 18) - 1))
    else setCurrentHole((h) => Math.max(h - 1, 0))
  }

  function handleFinish() {
    if (hole.score === null) updateHole({ score: hole.par })
    // Small delay to let state flush before navigating
    setTimeout(() => router.push('/log-round/summary'), 50)
  }

  const displayScore = hole.score ?? hole.par
  const label = scoreLabel(displayScore, hole.par)
  const bgClass = scoreBg(hole.score, hole.par)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-green-800 px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <Link href="/log-round" className="text-green-200 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="text-center">
            <p className="text-white font-semibold text-sm leading-tight">{round.courseName}</p>
            <p className="text-green-300 text-xs">{round.teeBox} tees</p>
          </div>
          <div className="w-5" /> {/* spacer */}
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-lg flex flex-col pb-4">
        {/* Hole info */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between">
          <div>
            <p className="text-3xl font-black text-gray-900 leading-none">
              Hole {hole.hole}
            </p>
            <p className="text-sm text-gray-400 mt-1">Par {hole.par}{hole.yardage > 0 ? ` · ${hole.yardage} yd` : ''}</p>
          </div>
          <p className="text-sm font-medium text-gray-400">
            {currentHole + 1} / {round.holes.length}
          </p>
        </div>

        {/* Score section */}
        <div className="px-4 pb-5">
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Score</p>
            <div className="flex items-center justify-between gap-4">
              {/* Decrement */}
              <button
                onClick={decrementScore}
                className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-gray-700"
              >
                −
              </button>

              {/* Score display */}
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black ${bgClass}`}>
                  {displayScore}
                </span>
                {label && (
                  <span className="text-sm font-semibold text-gray-500">{label}</span>
                )}
              </div>

              {/* Increment */}
              <button
                onClick={incrementScore}
                className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-gray-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Putts */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Putts</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => updateHole({ putts: hole.putts === n ? null : n })}
                  className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${
                    hole.putts === n
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fairway Hit (par 4/5 only) */}
        {!isPar3 && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Fairway Hit
              </p>
              <Toggle
                value={hole.fairwayHit}
                onChange={(v) => updateHole({ fairwayHit: v })}
                yes="Hit ✓"
                no="Miss ✗"
              />
            </div>
          </div>
        )}

        {/* GIR */}
        <div className="px-4 pb-5">
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Green in Regulation
            </p>
            <Toggle
              value={hole.gir}
              onChange={(v) => updateHole({ gir: v })}
              yes="Yes ✓"
              no="No ✗"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 pb-4 mt-auto">
          {isLastHole ? (
            <button
              onClick={handleFinish}
              className="w-full rounded-2xl bg-green-700 px-6 py-4 text-base font-bold text-white shadow-md shadow-green-700/25 hover:bg-green-800 active:scale-[0.98] transition-all"
            >
              Finish Round →
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => navigate('prev')}
                disabled={currentHole === 0}
                className="flex-1 rounded-2xl border-2 border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => navigate('next')}
                className="flex-[2] rounded-2xl bg-green-700 py-3.5 text-sm font-bold text-white hover:bg-green-800 active:scale-[0.98] transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Mini scorecard strip */}
        <div className="px-4">
          <div
            ref={stripRef}
            className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {round.holes.map((h, i) => (
              <button
                key={h.hole}
                onClick={() => setCurrentHole(i)}
                className={`shrink-0 flex flex-col items-center rounded-lg px-1.5 py-1 transition-all ${
                  i === currentHole
                    ? 'ring-2 ring-green-600 ring-offset-1'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <span className="text-[9px] text-gray-400 font-medium mb-0.5">{h.hole}</span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${miniScoreBg(h.score, h.par)}`}
                >
                  {h.score ?? '·'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
