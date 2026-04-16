'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Course {
  id: number
  club_name: string
  course_name?: string
  location: { city: string; state: string; country: string }
}

interface ApiTeeHole {
  hole_number: number
  par: number
  yardage: number
}

interface ApiTee {
  tee_name: string
  par_total: number
  yardage_total: number
  holes: ApiTeeHole[]
}

const TEE_COLORS = ['Black', 'Blue', 'White', 'Gold', 'Red'] as const
type TeeColor = (typeof TEE_COLORS)[number]

const TEE_DOT: Record<TeeColor, string> = {
  Black: 'bg-gray-900',
  Blue: 'bg-blue-600',
  White: 'bg-white border border-gray-300',
  Gold: 'bg-yellow-400',
  Red: 'bg-red-500',
}

function buildFallbackHoles() {
  return Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1,
    par: 4,
    yardage: 0,
    score: null,
    putts: null,
    fairwayHit: null,
    gir: null,
  }))
}

export default function CourseSearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Course[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [availableTees, setAvailableTees] = useState<string[]>([])
  const [teeBox, setTeeBox] = useState<string>('White')
  const [transport, setTransport] = useState<'walking' | 'cart'>('walking')
  const [starting, setStarting] = useState(false)
  const [step, setStep] = useState<'search' | 'setup'>('search')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/courses?q=${encodeURIComponent(value)}`)
        const data = await res.json()
        setResults(data.courses ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  async function handleSelectCourse(course: Course) {
    setSelectedCourse(course)
    setStep('setup')
    // Fetch available tees for this course
    try {
      const res = await fetch(`/api/courses/${course.id}`)
      const data = await res.json()
      const apiTees: ApiTee[] = [
        ...(data.course?.tees?.male ?? []),
        ...(data.course?.tees?.female ?? []),
      ]
      const names = [...new Set(apiTees.map((t) => t.tee_name))]
      if (names.length > 0) {
        setAvailableTees(names)
        setTeeBox(names[0])
      } else {
        setAvailableTees([])
        setTeeBox('White')
      }
    } catch {
      setAvailableTees([])
    }
  }

  async function handleStartRound() {
    if (!selectedCourse) return
    setStarting(true)
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`)
      const data = await res.json()
      const apiTees: ApiTee[] = [
        ...(data.course?.tees?.male ?? []),
        ...(data.course?.tees?.female ?? []),
      ]
      const selectedTee =
        apiTees.find((t) => t.tee_name.toLowerCase() === teeBox.toLowerCase()) ?? apiTees[0]

      const holes =
        selectedTee?.holes?.length === 18
          ? selectedTee.holes.map((h) => ({
              hole: h.hole_number,
              par: h.par,
              yardage: h.yardage ?? 0,
              score: null,
              putts: null,
              fairwayHit: null,
              gir: null,
            }))
          : buildFallbackHoles()

      sessionStorage.setItem(
        'parhub_round',
        JSON.stringify({
          courseId: String(selectedCourse.id),
          courseName: selectedCourse.club_name,
          teeBox,
          transport,
          holes,
        })
      )
      router.push('/log-round/scorecard')
    } catch {
      // Fallback: navigate with generic par-4 holes
      sessionStorage.setItem(
        'parhub_round',
        JSON.stringify({
          courseId: String(selectedCourse.id),
          courseName: selectedCourse.club_name,
          teeBox,
          transport,
          holes: buildFallbackHoles(),
        })
      )
      router.push('/log-round/scorecard')
    }
  }

  const displayTees = availableTees.length > 0 ? availableTees : [...TEE_COLORS]

  return (
    <div className="min-h-screen bg-[#0d1a0f] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#1e1e1e] px-4">
        <div className="mx-auto max-w-lg flex items-center gap-3 h-14">
          <Link href="/" className="text-green-200 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-white">
            {step === 'search' ? 'Find a Course' : 'Round Setup'}
          </h1>
        </div>
      </header>

      {step === 'search' && (
        <div className="flex-1 mx-auto w-full max-w-lg px-4 pt-5">
          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search golf courses…"
              className="w-full rounded-2xl border border-[#2a3d2c] bg-[#1a2e1d] pl-10 pr-4 py-3.5 text-sm text-white placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-3 rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a2a2a] shadow-sm">
              {results.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className="w-full text-left px-4 py-3.5 hover:bg-[#1e3220] active:bg-[#223527] transition-colors"
                >
                  <p className="text-sm font-medium text-white">{course.club_name}</p>
                  {course.location && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[course.location.city, course.location.state, course.location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="mt-6 text-center text-sm text-gray-400">No courses found for "{query}"</p>
          )}

          {query.length === 0 && (
            <p className="mt-8 text-center text-sm text-gray-400">Type at least 2 characters to search</p>
          )}
        </div>
      )}

      {step === 'setup' && selectedCourse && (
        <div className="flex-1 mx-auto w-full max-w-lg px-4 pt-5 space-y-5 pb-8">
          {/* Selected course */}
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-3.5">
            <p className="font-semibold text-white">{selectedCourse.club_name}</p>
            {selectedCourse.location && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[selectedCourse.location.city, selectedCourse.location.state]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>

          {/* Tee box */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Tee Box
            </h2>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a2a2a]">
              {displayTees.map((tee) => {
                const isStandard = (TEE_COLORS as readonly string[]).includes(tee)
                const dotClass = isStandard
                  ? TEE_DOT[tee as TeeColor]
                  : 'bg-gray-400'
                return (
                  <button
                    key={tee}
                    onClick={() => setTeeBox(tee)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1e3220] active:bg-[#223527] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${dotClass}`} />
                      <span className="text-sm font-medium text-white">{tee}</span>
                    </div>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      teeBox === tee ? 'border-green-600 bg-green-600' : 'border-gray-300'
                    }`}>
                      {teeBox === tee && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Transport */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              How are you getting around?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(['walking', 'cart'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTransport(t)}
                  className={`rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition-all ${
                    transport === t
                      ? 'border-[#4ade80] bg-[#4ade80]/10 text-[#4ade80]'
                      : 'border-[#2a3d2c] bg-[#1a2e1d] text-gray-400'
                  }`}
                >
                  <span className="text-2xl block mb-1">{t === 'walking' ? '🚶' : '🚗'}</span>
                  {t === 'walking' ? 'Walking' : 'Cart'}
                </button>
              ))}
            </div>
          </section>

          {/* Start button */}
          <button
            onClick={handleStartRound}
            disabled={starting}
            className="w-full rounded-2xl bg-[#4ade80] px-6 py-4 text-base font-black text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading course data…
              </span>
            ) : (
              'Start Round'
            )}
          </button>

          <button
            onClick={() => { setStep('search'); setSelectedCourse(null) }}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
          >
            ← Choose a different course
          </button>
        </div>
      )}
    </div>
  )
}
