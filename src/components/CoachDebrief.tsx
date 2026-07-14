import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Day, Program, Week } from '../types'
import {
  fetchDebrief,
  loadDebrief,
  saveDebrief,
  type DebriefResult
} from '../lib/coach'
import Icon from './Icon'

interface Props {
  day: Day
  week: Week
  program: Program
}

// Bouton "Débrief du coach" + rendu du débrief IA (données Strava réelles).
export default function CoachDebrief({ day, week, program }: Props) {
  const [result, setResult] = useState<DebriefResult | null>(() => loadDebrief(day.date))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(force = false) {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchDebrief(day, week, program, force)
      setResult(r)
      saveDebrief(day.date, r)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erreur'
      setError(
        msg === 'not_connected'
          ? 'Strava pas connecté — connecte-le dans l’onglet Reco.'
          : 'Débrief indisponible, réessaie.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={loading}
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-gym px-3.5 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-ink transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              Le coach analyse…
            </>
          ) : (
            <>
              <Icon name="activity" size={16} strokeWidth={2.5} />
              Débrief du coach
            </>
          )}
        </button>
        {error && <p className="mt-1.5 text-[12px] text-amber-300">{error}</p>}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mt-3 rounded-2xl border border-gym/25 bg-gym/[0.06] p-3.5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Icon name="activity" size={15} className="text-gym" />
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-gym">
            Débrief du coach
          </span>
        </span>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading}
          className="focus-ring text-[11px] font-semibold uppercase tracking-widest text-white/40 transition-colors hover:text-white/70 disabled:opacity-50"
        >
          {loading ? '…' : 'Régénérer'}
        </button>
      </div>

      {result.activity && (
        <div className="mb-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/70">
          {result.activity.distanceKm != null && <span>{result.activity.distanceKm} km</span>}
          {result.activity.elevationM != null && <span>· {result.activity.elevationM} m D+</span>}
          {result.activity.movingTime && <span>· {result.activity.movingTime}</span>}
          {result.activity.avgHr != null && <span>· FC {result.activity.avgHr}</span>}
          {result.activity.avgPace && <span>· {result.activity.avgPace}/km</span>}
        </div>
      )}

      <Markdown text={result.debrief} />
      {error && <p className="mt-1.5 text-[12px] text-amber-300">{error}</p>}
    </motion.div>
  )
}

// Mini-rendu markdown : **gras**, puces "-", lignes vides.
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="flex flex-col gap-1 text-[13px] leading-snug text-white/85">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <span key={i} className="h-1" />
        if (t.startsWith('- ') || t.startsWith('• ')) {
          return (
            <span key={i} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gym/70" />
              <span>{inline(t.slice(2))}</span>
            </span>
          )
        }
        return <p key={i} className="text-pretty">{inline(t)}</p>
      })}
    </div>
  )
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}
