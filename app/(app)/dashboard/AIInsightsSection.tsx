'use client'

import { useEffect, useState } from 'react'

interface InsightsData {
  weeklySummary: string
  preRoundPrediction: string
  patternAlert: string | null
  recommendedTeeTime: string | null
  generatedAt: string
  fromCache: boolean
}

type State =
  | { status: 'loading' }
  | { status: 'done'; data: InsightsData }
  | { status: 'error'; message: string }

export default function AIInsightsSection({
  cached,
}: {
  cached: InsightsData | null
}) {
  const [state, setState] = useState<State>(
    cached ? { status: 'done', data: cached } : { status: 'loading' }
  )

  useEffect(() => {
    if (cached) return // already have fresh-enough data from server
    generate()
  }, [cached])

  async function generate() {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/insights/generate', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: InsightsData = await res.json()
      setState({ status: 'done', data })
    } catch {
      setState({ status: 'error', message: 'Could not generate insights. Try again.' })
    }
  }

  const generatedLabel = (state: State) => {
    if (state.status !== 'done') return null
    const d = new Date(state.data.generatedAt)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          AI Insights
        </h3>
        {state.status === 'done' && (
          <button
            onClick={generate}
            className="text-[10px] text-[#4ade80] font-medium hover:text-green-800 transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      {state.status === 'loading' && (
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-8 flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-green-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400">Analyzing your performance data…</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-6 text-center">
          <p className="text-sm text-gray-500">{state.message}</p>
          <button
            onClick={generate}
            className="mt-3 text-xs font-semibold text-[#4ade80] hover:text-green-800 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'done' && (
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
          {/* Weekly summary */}
          <div className="px-4 py-4 flex items-start gap-3">
            <span className="text-lg mt-0.5 shrink-0">📋</span>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                This Week
              </p>
              <p className="text-sm text-white leading-relaxed">
                {state.data.weeklySummary}
              </p>
            </div>
          </div>

          {/* Pre-round prediction */}
          <div className="px-4 py-4 flex items-start gap-3">
            <span className="text-lg mt-0.5 shrink-0">🔮</span>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Next Round
              </p>
              <p className="text-sm text-white leading-relaxed">
                {state.data.preRoundPrediction}
              </p>
            </div>
          </div>

          {/* Pattern alert — only shown if present */}
          {state.data.patternAlert && (
            <div className="px-4 py-4 flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">⚡</span>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Pattern Detected
                </p>
                <p className="text-sm text-white leading-relaxed">
                  {state.data.patternAlert}
                </p>
              </div>
            </div>
          )}

          {/* Tee time recommendation — only shown if present */}
          {state.data.recommendedTeeTime && (
            <div className="px-4 py-4 flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">⛳</span>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Tee Time
                </p>
                <p className="text-sm text-white leading-relaxed">
                  {state.data.recommendedTeeTime}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[#111f13] flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              {state.data.fromCache ? 'Cached · ' : ''}Updated {generatedLabel(state)}
            </p>
            <p className="text-[10px] text-[#2a3d2c]">claude-sonnet-4-6</p>
          </div>
        </div>
      )}
    </section>
  )
}
