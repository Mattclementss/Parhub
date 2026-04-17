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
  inSand: boolean | null
}

interface RoundState {
  courseId: string
  courseName: string
  teeBox: string
  transport: 'walking' | 'cart'
  holes: HoleScore[]
}

// ─── Score helpers ──────────────────────────────────────────────────────────

function scoreLabel(score: number | null, par: number): string {
  if (score === null) return ''
  const rel = score - par
  if (rel <= -3) return 'Albatross'
  if (rel === -2) return 'Eagle'
  if (rel === -1) return 'Birdie'
  if (rel === 0) return 'Par'
  if (rel === 1) return 'Bogey'
  if (rel === 2) return 'Double'
  if (rel === 3) return 'Triple'
  return `+${rel}`
}

function scoreRingColor(score: number | null, par: number): string {
  if (score === null) return '#2a3d2c'
  const rel = score - par
  if (rel <= -2) return '#eab308'  // eagle = gold
  if (rel === -1) return '#4ade80'  // birdie = green
  if (rel === 0) return '#4b5563'   // par = gray
  if (rel === 1) return '#f97316'   // bogey = orange
  return '#ef4444'                   // double+ = red
}

function scoreLabelColor(score: number | null, par: number): string {
  if (score === null) return 'text-gray-600'
  const rel = score - par
  if (rel <= -2) return 'text-yellow-400'
  if (rel === -1) return 'text-[#4ade80]'
  if (rel === 0) return 'text-gray-400'
  if (rel === 1) return 'text-orange-400'
  return 'text-red-400'
}

// Mini strip chip colors
function miniChipStyle(score: number | null, par: number): string {
  if (score === null) return 'bg-[#1a2e1d] text-gray-600'
  const rel = score - par
  if (rel <= -2) return 'bg-yellow-400 text-black'
  if (rel === -1) return 'bg-[#4ade80] text-black'
  if (rel === 0) return 'bg-[#2a3d2c] text-gray-300'
  if (rel === 1) return 'bg-orange-500 text-white'
  return 'bg-red-500 text-white'
}

// vs-par display for running total
function relStr(rel: number): string {
  if (rel === 0) return 'E'
  return rel > 0 ? `+${rel}` : `${rel}`
}

// ─── Toggle button ───────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  yes = 'Hit',
  no = 'Miss',
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  yes?: string
  no?: string
}) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-[#2a3d2c]">
      <button
        onClick={() => onChange(true)}
        className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
          value === true
            ? 'bg-[#4ade80] text-black'
            : 'bg-[#1a2e1d] text-gray-500 hover:text-gray-300'
        }`}
      >
        {yes}
      </button>
      <button
        onClick={() => onChange(false)}
        className={`flex-1 py-2.5 text-sm font-bold border-l border-[#2a3d2c] transition-colors ${
          value === false
            ? 'bg-red-500 text-white'
            : 'bg-[#1a2e1d] text-gray-500 hover:text-gray-300'
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
  const [currentHole, setCurrentHole] = useState(0)
  const [todayRecovery, setTodayRecovery] = useState<number | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('parhub_round')
    if (!raw) { router.replace('/log-round'); return }
    try { setRound(JSON.parse(raw)) } catch { router.replace('/log-round') }
  }, [router])

  useEffect(() => {
    if (round) sessionStorage.setItem('parhub_round', JSON.stringify(round))
  }, [round])

  // Fetch today's WHOOP recovery for the badge
  useEffect(() => {
    fetch('/api/whoop/today')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.recoveryScore != null) setTodayRecovery(d.recoveryScore)
      })
      .catch(() => {})
  }, [])

  // Scroll hole tab into view
  useEffect(() => {
    if (!tabsRef.current) return
    const el = tabsRef.current.children[currentHole] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentHole])

  // Scroll mini strip into view
  useEffect(() => {
    if (!stripRef.current) return
    const el = stripRef.current.children[currentHole] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentHole])

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

  const hole = round.holes[currentHole]
  const isLastHole = currentHole === round.holes.length - 1
  const isPar3 = hole.par === 3
  const isBack9 = hole.hole > 9
  const displayScore = hole.score ?? hole.par

  // Running totals
  const completedHoles = round.holes.filter((h) => h.score !== null)
  const runningScore = completedHoles.reduce((s, h) => s + (h.score ?? 0), 0)
  const runningPar = completedHoles.reduce((s, h) => s + h.par, 0)
  const runningVsPar = runningScore - runningPar

  // Recovery badge
  const recoveryBadge =
    todayRecovery !== null
      ? todayRecovery >= 67
        ? { dot: 'bg-[#4ade80]', label: `${Math.round(todayRecovery)}% GREEN`, color: 'text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20' }
        : todayRecovery >= 34
        ? { dot: 'bg-[#fbbf24]', label: `${Math.round(todayRecovery)}% YELLOW`, color: 'text-[#fbbf24] bg-[#fbbf24]/10 border border-[#fbbf24]/20' }
        : { dot: 'bg-[#f87171]', label: `${Math.round(todayRecovery)}% RED`, color: 'text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20' }
      : null

  function updateHole(updates: Partial<HoleScore>) {
    setRound((prev) => {
      if (!prev) return prev
      const holes = prev.holes.map((h, i) => (i === currentHole ? { ...h, ...updates } : h))
      return { ...prev, holes }
    })
  }

  function navigate(direction: 'prev' | 'next') {
    if (hole.score === null) updateHole({ score: hole.par })
    if (direction === 'next') setCurrentHole((h) => Math.min(h + 1, (round?.holes.length ?? 18) - 1))
    else setCurrentHole((h) => Math.max(h - 1, 0))
  }

  function handleFinish() {
    // Write directly to sessionStorage — don't rely on useEffect timing
    const finalHoles = round.holes.map((h, i) =>
      i === currentHole && h.score === null ? { ...h, score: h.par } : h
    )
    const finalRound = { ...round, holes: finalHoles }
    sessionStorage.setItem('parhub_round', JSON.stringify(finalRound))
    router.push('/log-round/summary')
  }

  const ringColor = scoreRingColor(hole.score, hole.par)
  const labelColor = scoreLabelColor(hole.score, hole.par)
  const label = scoreLabel(displayScore, hole.par)

  return (
    <div className="min-h-screen bg-[#0d1a0f] flex flex-col">
      {/* ── Header ── */}
      <header className="bg-[#0d1a0f] border-b border-[#1a2e1d] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <Link href="/log-round" className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>

          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#4ade80]">In Progress</p>
            <p className="text-white font-bold text-sm leading-tight">{round.courseName}</p>
          </div>

          {recoveryBadge ? (
            <span className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${recoveryBadge.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${recoveryBadge.dot}`} />
              {recoveryBadge.label}
            </span>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      {/* ── Running totals strip ── */}
      <div className="bg-[#111f13] border-b border-[#1a2e1d] px-4 py-2">
        <div className="mx-auto max-w-lg flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Score</p>
            <p className="text-lg font-black text-white leading-tight">
              {completedHoles.length > 0 ? runningScore : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">vs Par</p>
            <p className={`text-lg font-black leading-tight ${
              runningVsPar < 0 ? 'text-[#4ade80]' : runningVsPar > 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {completedHoles.length > 0 ? relStr(runningVsPar) : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Holes</p>
            <p className="text-lg font-black text-white leading-tight">
              {completedHoles.length}/{round.holes.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Hole tabs ── */}
      <div className="bg-[#0d1a0f] px-2 py-2.5 border-b border-[#1a2e1d]">
        <div
          ref={tabsRef}
          className="mx-auto max-w-lg flex gap-1.5 overflow-x-auto scrollbar-none px-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {round.holes.map((h, i) => {
            const isActive = i === currentHole
            const scored = h.score !== null
            const chip = scored ? miniChipStyle(h.score!, h.par) : ''

            return (
              <button
                key={h.hole}
                onClick={() => setCurrentHole(i)}
                className={`shrink-0 min-w-[2rem] h-8 rounded-lg px-1.5 flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-black'
                    : scored
                    ? chip
                    : 'bg-[#1a2e1d] text-[#555]'
                }`}
              >
                {scored ? h.score : h.hole}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-lg flex flex-col pb-4">
        {/* ── Hole info ── */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555]">
              Hole {hole.hole}
            </p>
            <p className="text-3xl font-black text-white leading-none mt-0.5">
              Par {hole.par}
              {hole.yardage > 0 && (
                <span className="text-lg font-bold text-[#555] ml-2">{hole.yardage} yds</span>
              )}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-[1.5px] rounded-full px-3 py-1 border ${
            isBack9
              ? 'text-blue-400 border-blue-400/30 bg-blue-400/10'
              : 'text-[#555] border-[#2a3d2c] bg-[#111f13]'
          }`}>
            {isBack9 ? 'Back' : 'Front'}
          </span>
        </div>

        {/* ── Score input ── */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: −2 and −1 */}
            <div className="flex gap-2">
              <button
                onClick={() => updateHole({ score: Math.max((hole.score ?? hole.par) - 2, 1) })}
                className="w-14 h-14 rounded-full bg-[#1a2e1d] border border-[#2a3d2c] flex items-center justify-center text-white font-bold text-sm hover:bg-[#1e3220] active:scale-95 transition-all"
              >
                −2
              </button>
              <button
                onClick={() => updateHole({ score: Math.max((hole.score ?? hole.par) - 1, 1) })}
                className="w-14 h-14 rounded-full bg-[#1a2e1d] border border-[#2a3d2c] flex items-center justify-center text-white font-bold text-xl hover:bg-[#1e3220] active:scale-95 transition-all"
              >
                −
              </button>
            </div>

            {/* Center: score display */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-5xl font-black text-white border-4 transition-all"
                style={{ borderColor: ringColor, boxShadow: `0 0 20px ${ringColor}30` }}
              >
                {displayScore}
              </div>
              {label && (
                <span className={`text-xs font-bold tracking-wide ${labelColor}`}>{label}</span>
              )}
            </div>

            {/* Right: +1 */}
            <button
              onClick={() => updateHole({ score: Math.min((hole.score ?? hole.par) + 1, hole.par + 8) })}
              className="w-14 h-14 rounded-full bg-[#4ade80] flex items-center justify-center text-black font-bold text-2xl hover:bg-[#22c55e] active:scale-95 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* ── Putts ── */}
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600 mb-2">Putts</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => updateHole({ putts: hole.putts === n ? null : n })}
                className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${
                  hole.putts === n
                    ? 'bg-[#4ade80] text-black'
                    : 'bg-[#1a2e1d] border border-[#2a3d2c] text-gray-400 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat toggles: FAIRWAY / GIR / SAND ── */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {/* Fairway (par 4/5 only) */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-600 mb-1.5 text-center">
              Fairway
            </p>
            {!isPar3 ? (
              <div className="flex rounded-xl overflow-hidden border border-[#2a3d2c]">
                <button
                  onClick={() => updateHole({ fairwayHit: hole.fairwayHit === true ? null : true })}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                    hole.fairwayHit === true ? 'bg-[#4ade80] text-black' : 'bg-[#1a2e1d] text-gray-500'
                  }`}
                >
                  ✓
                </button>
                <button
                  onClick={() => updateHole({ fairwayHit: hole.fairwayHit === false ? null : false })}
                  className={`flex-1 py-2.5 text-xs font-bold border-l border-[#2a3d2c] transition-colors ${
                    hole.fairwayHit === false ? 'bg-red-500 text-white' : 'bg-[#1a2e1d] text-gray-500'
                  }`}
                >
                  ✗
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-[#111f13] border border-[#2a3d2c] py-2.5 text-center">
                <span className="text-[10px] text-gray-700">N/A</span>
              </div>
            )}
          </div>

          {/* GIR */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-600 mb-1.5 text-center">
              GIR
            </p>
            <div className="flex rounded-xl overflow-hidden border border-[#2a3d2c]">
              <button
                onClick={() => updateHole({ gir: hole.gir === true ? null : true })}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  hole.gir === true ? 'bg-[#4ade80] text-black' : 'bg-[#1a2e1d] text-gray-500'
                }`}
              >
                ✓
              </button>
              <button
                onClick={() => updateHole({ gir: hole.gir === false ? null : false })}
                className={`flex-1 py-2.5 text-xs font-bold border-l border-[#2a3d2c] transition-colors ${
                  hole.gir === false ? 'bg-red-500 text-white' : 'bg-[#1a2e1d] text-gray-500'
                }`}
              >
                ✗
              </button>
            </div>
          </div>

          {/* Sand */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-600 mb-1.5 text-center">
              Sand
            </p>
            <div className="flex rounded-xl overflow-hidden border border-[#2a3d2c]">
              <button
                onClick={() => updateHole({ inSand: hole.inSand === true ? null : true })}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  hole.inSand === true ? 'bg-yellow-500 text-black' : 'bg-[#1a2e1d] text-gray-500'
                }`}
              >
                ✓
              </button>
              <button
                onClick={() => updateHole({ inSand: hole.inSand === false ? null : false })}
                className={`flex-1 py-2.5 text-xs font-bold border-l border-[#2a3d2c] transition-colors ${
                  hole.inSand === false ? 'bg-[#1a2e1d] text-gray-400' : 'bg-[#1a2e1d] text-gray-500'
                }`}
              >
                —
              </button>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <div className="px-4 pb-4 mt-auto">
          {isLastHole ? (
            <button
              onClick={handleFinish}
              className="w-full rounded-2xl bg-[#4ade80] px-6 py-4 text-base font-black text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all"
            >
              Finish Round →
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => navigate('prev')}
                disabled={currentHole === 0}
                className="flex-1 rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] py-3.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-[#1e3220] active:scale-[0.98] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              >
                ← Prev Hole
              </button>
              <button
                onClick={() => navigate('next')}
                className="flex-[2] rounded-2xl bg-[#4ade80] py-3.5 text-sm font-black text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all"
              >
                Next Hole →
              </button>
            </div>
          )}
        </div>

        {/* ── Mini scorecard strip ── */}
        <div className="px-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-700 mb-1.5">
            Scorecard
          </p>
          <div
            ref={stripRef}
            className="flex gap-1 overflow-x-auto scrollbar-none pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {round.holes.map((h, i) => (
              <button
                key={h.hole}
                onClick={() => setCurrentHole(i)}
                className={`shrink-0 flex flex-col items-center transition-all ${
                  i === currentHole ? 'opacity-100' : 'opacity-50 hover:opacity-80'
                }`}
              >
                <span className="text-[8px] text-gray-600 font-medium mb-0.5">{h.hole}</span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${miniChipStyle(h.score, h.par)}`}
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
