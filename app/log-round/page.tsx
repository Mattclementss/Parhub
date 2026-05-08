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
  const [holesCount, setHolesCount] = useState<'18' | 'front9' | 'back9'>('18')
  const [datePlayed, setDatePlayed] = useState<string>(new Date().toISOString().split('T')[0])
  const [starting, setStarting] = useState(false)
  const [step, setStep] = useState<'search' | 'setup' | 'upload' | 'upload-confirm'>('search')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedRound, setUploadedRound] = useState<{ courseName: string; holes: Array<{ hole: number; par: number; score: number }> } | null>(null)
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      const allHoles = selectedTee?.holes?.length === 18
        ? selectedTee.holes.map((h, i) => ({
            hole: i + 1,
            par: h.par,
            yardage: h.yardage ?? 0,
            score: null,
            putts: null,
            fairwayHit: null,
            gir: null,
          }))
        : buildFallbackHoles()

      const holes = holesCount === 'front9'
        ? allHoles.slice(0, 9)
        : holesCount === 'back9'
        ? allHoles.slice(9, 18)
        : allHoles

      sessionStorage.setItem(
        'parhub_round',
        JSON.stringify({
          courseId: String(selectedCourse.id),
          courseName: selectedCourse.club_name,
          teeBox,
          transport,
          holes,
          datePlayed,
        })
      )
      router.push('/log-round/scorecard')
    } catch {
      const fallback = buildFallbackHoles()
      const fallbackHoles = holesCount === 'front9'
        ? fallback.slice(0, 9)
        : holesCount === 'back9'
        ? fallback.slice(9, 18)
        : fallback
      sessionStorage.setItem(
        'parhub_round',
        JSON.stringify({
          courseId: String(selectedCourse.id),
          courseName: selectedCourse.club_name,
          teeBox,
          transport,
          holes: fallbackHoles,
          datePlayed,
        })
      )
      router.push('/log-round/scorecard')
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/scorecard/parse', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Could not read scorecard')
        setUploading(false)
        return
      }

      const holes = data.holes as Array<{ hole: number; par: number; score: number }>
      setUploadedRound({ courseName: data.courseName ?? 'Unknown Course', holes })
      if (data.date) setUploadDate(data.date)
      setUploading(false)
      setStep('upload-confirm')
    } catch {
      setUploadError('Something went wrong. Please try again.')
      setUploading(false)
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
            {step === 'search' ? 'Find a Course' : step === 'upload' || step === 'upload-confirm' ? 'Upload Scorecard' : 'Round Setup'}
          </h1>
        </div>
      </header>

      {step === 'search' && (
        <div className="flex-1 mx-auto w-full max-w-lg px-4 pt-5 space-y-4">
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
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a2a2a] shadow-sm">
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
            <p className="mt-2 text-center text-sm text-gray-400">No courses found for "{query}"</p>
          )}

          {query.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-400">Type at least 2 characters to search</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-[#2a3d2c]" />
            <span className="text-xs text-gray-600 font-medium">or</span>
            <div className="flex-1 h-px bg-[#2a3d2c]" />
          </div>

          {/* Upload scorecard */}
          <button
            onClick={() => setStep('upload')}
            className="w-full rounded-2xl border-2 border-dashed border-[#2a3d2c] bg-[#1a2e1d] px-4 py-5 flex flex-col items-center gap-2 hover:border-[#4ade80]/40 hover:bg-[#1e3220] transition-all"
          >
            <svg className="w-7 h-7 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-bold text-white">Upload Golf Canada Scorecard</p>
            <p className="text-xs text-gray-500">Screenshot → AI reads your scores automatically</p>
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div className="flex-1 mx-auto w-full max-w-lg px-4 pt-5 space-y-4 pb-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />

          {uploading ? (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-12 flex flex-col items-center gap-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#4ade80] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-white">Reading your scorecard…</p>
              <p className="text-xs text-gray-500">This takes a few seconds</p>
            </div>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-[#2a3d2c] bg-[#1a2e1d] px-4 py-10 flex flex-col items-center gap-3 hover:border-[#4ade80]/40 hover:bg-[#1e3220] transition-all active:scale-[0.98]"
              >
                <svg className="w-10 h-10 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 3h16.5A.75.75 0 0121 3.75v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 17.25V3.75A.75.75 0 013.75 3z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Tap to choose screenshot</p>
                  <p className="text-xs text-gray-500 mt-1">Golf Canada scorecard screenshot</p>
                </div>
              </button>

              {uploadError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {uploadError}
                </div>
              )}

              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-400">How it works</p>
                <p className="text-xs text-gray-600">1. Take a screenshot of your Golf Canada scorecard</p>
                <p className="text-xs text-gray-600">2. Upload it here — AI reads hole-by-hole scores automatically</p>
                <p className="text-xs text-gray-600">3. Review and save — add putts, GIR & fairways if you want</p>
              </div>

              <button
                onClick={() => { setStep('search'); setUploadError(null) }}
                className="w-full text-sm text-gray-400 hover:text-gray-300 py-1"
              >
                ← Search for a course instead
              </button>
            </>
          )}
        </div>
      )}

      {step === 'upload-confirm' && uploadedRound && (
        <div className="flex-1 mx-auto w-full max-w-lg px-4 pt-5 space-y-4 pb-8">
          {/* Parsed result */}
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4ade80] mb-1">Scorecard Read</p>
            <p className="text-sm font-bold text-white">{uploadedRound.courseName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{uploadedRound.holes.length} holes detected</p>
          </div>

          {/* Date picker */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Date Played
            </h2>
            <input
              type="date"
              value={uploadDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setUploadDate(e.target.value)}
              className="w-full rounded-2xl border border-[#2a3d2c] bg-[#1a2e1d] px-4 py-3.5 text-sm text-white focus:border-[#4ade80]/50 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30 [color-scheme:dark]"
            />
          </section>

          <button
            onClick={() => {
              const holes = uploadedRound.holes.map((h) => ({
                hole: h.hole,
                par: h.par,
                yardage: 0,
                score: h.score,
                putts: null,
                fairwayHit: null,
                gir: null,
              }))
              sessionStorage.setItem('parhub_round', JSON.stringify({
                courseId: '',
                courseName: uploadedRound.courseName,
                teeBox: 'White',
                transport: 'walking',
                holes,
                datePlayed: uploadDate,
              }))
              router.push('/log-round/summary')
            }}
            className="w-full rounded-2xl bg-[#4ade80] px-6 py-4 text-base font-black text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all"
          >
            Continue to Summary
          </button>

          <button
            onClick={() => { setStep('upload'); setUploadedRound(null) }}
            className="w-full text-sm text-gray-400 hover:text-gray-300 py-1"
          >
            ← Upload a different screenshot
          </button>
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

          {/* Holes */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Holes
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {([['18', '18 Holes'], ['front9', 'Front 9'], ['back9', 'Back 9']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setHolesCount(val)}
                  className={`rounded-2xl border-2 px-2 py-3 text-sm font-semibold transition-all ${
                    holesCount === val
                      ? 'border-[#4ade80] bg-[#4ade80]/10 text-[#4ade80]'
                      : 'border-[#2a3d2c] bg-[#1a2e1d] text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Tee box */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Tee Box
            </h2>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a2a2a]">
              {displayTees.map((tee) => {
                const isStandard = (TEE_COLORS as readonly string[]).includes(tee)
                const dotClass = isStandard ? TEE_DOT[tee as TeeColor] : 'bg-gray-400'
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

          {/* Date */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Date Played
            </h2>
            <input
              type="date"
              value={datePlayed}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDatePlayed(e.target.value)}
              className="w-full rounded-2xl border border-[#2a3d2c] bg-[#1a2e1d] px-4 py-3.5 text-sm text-white focus:border-[#4ade80]/50 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30 [color-scheme:dark]"
            />
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
