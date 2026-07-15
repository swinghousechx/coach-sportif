import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Day, Program, Week } from '../types'
import {
  debriefActivities,
  fetchDebrief,
  loadDebrief,
  planFingerprint,
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
  // Le débrief en cache n'est repris que s'il porte sur la séance actuellement prévue.
  const planKey = planFingerprint(day)
  const [result, setResult] = useState<DebriefResult | null>(() => loadDebrief(day.date, planKey))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false) // replié par défaut (déplié après une génération)

  async function run(force = false) {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchDebrief(day, week, program, force)
      setResult(r)
      // Un débrief sans activité trouvée n'est pas une conclusion : la séance peut
      // encore arriver. On l'affiche sans le figer, pour ne pas le ressortir demain.
      if (debriefActivities(r).length) saveDebrief(day.date, r)
      setOpen(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erreur'
      setError(
        msg === 'not_connected'
          ? 'Strava pas connecté — connecte-le dans l’onglet Coach.'
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
          className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gym px-4 py-2 font-display text-[12px] font-semibold uppercase tracking-widest text-ink transition active:scale-[0.98] disabled:opacity-60"
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
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="focus-ring flex items-center gap-2"
        >
          <Icon
            name="chevron"
            size={16}
            className="text-gym transition-transform duration-300 [transition-timing-function:var(--ease-out-expo)]"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
          <Icon name="activity" size={15} className="text-gym" />
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-gym">
            Débrief du coach
          </span>
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading}
          className="focus-ring text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-white/70 disabled:opacity-50"
        >
          {loading ? '…' : 'Régénérer'}
        </button>
      </div>

      {/* Corps repliable (grid-template-rows 0fr→1fr). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--ease-out-expo)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pt-2.5">
            {debriefActivities(result).map((a, i) => {
              const isMuscu = a.kind === 'muscu'
              // Pour la muscu : pas de distance / D+ / allure (non pertinent).
              // Pour la course : on masque aussi les 0 (sortie plate).
              const stats = [
                !isMuscu && a.distanceKm ? `${a.distanceKm} km` : null,
                !isMuscu && a.elevationM ? `${a.elevationM} m D+` : null,
                a.movingTime,
                a.avgHr != null ? `FC ${a.avgHr}` : null,
                !isMuscu && a.avgPace ? `${a.avgPace}/km` : null
              ].filter(Boolean)
              return (
                <div key={i} className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[12px] text-white/70">
                  {a.kind && (
                    <span className={`font-display text-[11px] font-semibold uppercase tracking-wide ${a.kind === 'muscu' ? 'text-gym' : 'text-run'}`}>
                      {a.kind === 'muscu' ? 'Muscu' : 'Course'}
                    </span>
                  )}
                  {stats.map((s, j) => (
                    <span key={j}>
                      {j > 0 && '· '}
                      {s}
                    </span>
                  ))}
                </div>
              )
            })}

            <Markdown text={result.debrief} />
            {error && <p className="mt-1.5 text-[12px] text-amber-300">{error}</p>}
          </div>
        </div>
      </div>
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
