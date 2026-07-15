import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Adaptation, Day, Program, Week } from '../types'
import { fetchBriefing, loadBriefing, saveBriefing, type BriefingResult } from '../lib/coach'
import { applyCarnetOps } from '../lib/carnet'
import Icon from './Icon'
import Proposal from './Proposal'
import { IconBadge } from './ui'

interface Props {
  day: Day
  week: Week
  program: Program
  isToday: boolean
  onApply: (a: Adaptation) => void
  onCarnet: () => void
}

/**
 * Le brief d'avant-séance. Remplace l'ancien « Analyser ma séance du jour », qui
 * reformatait program.json derrière un faux délai de 650 ms : aucun appel réseau,
 * aucune donnée réelle. Celui-ci passe par le coach, avec le carnet, le profil,
 * la charge et l'état du jour — et peut proposer d'alléger si l'état l'impose.
 */
export default function BriefingCard({ day, week, program, isToday, onApply, onCarnet }: Props) {
  const [result, setResult] = useState<BriefingResult | null>(() => loadBriefing(day))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decision, setDecision] = useState<'applied' | 'ignored' | undefined>()

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchBriefing(day, week, program)
      setResult(r)
      saveBriefing(day.date, r)
      if (r.carnet) {
        applyCarnetOps(r.carnet, day.date)
        onCarnet()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erreur'
      setError(
        msg === 'not_connected'
          ? 'Strava pas connecté — le brief sera plus juste une fois branché.'
          : 'Brief indisponible, réessaie.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <IconBadge name="trending-up" size={34} tone="gym" />
          <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
            {isToday ? 'Le brief du jour' : 'Le brief'}
          </span>
        </div>
        {result && (
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="focus-ring text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-white/90 disabled:opacity-50"
          >
            {loading ? '…' : 'Régénérer'}
          </button>
        )}
      </div>

      {!result ? (
        <>
          <p className="text-pretty text-[13px] leading-snug text-white/60">
            Avant de partir : comment aborder {isToday ? 'ta séance du jour' : 'cette séance'} compte
            tenu de ton carnet, de ta charge récente et de ton état. Pas une redite du plan.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="focus-ring mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gym px-4 py-2 font-display text-[13px] font-semibold uppercase tracking-widest text-ink transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                Le coach réfléchit…
              </>
            ) : (
              <>
                <Icon name="trending-up" size={18} strokeWidth={2.5} />
                Demander le brief
              </>
            )}
          </button>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3"
        >
          <div className="rounded-2xl rounded-tl-md border border-gym/25 bg-gym/[0.07] px-3.5 py-3">
            <Markdown text={result.briefing} />
          </div>

          {result.adaptation && (
            <Proposal
              adaptation={result.adaptation}
              decision={decision}
              onDecide={(d) => {
                if (d === 'applied' && result.adaptation) onApply(result.adaptation)
                setDecision(d)
              }}
            />
          )}
        </motion.div>
      )}

      {error && <p className="mt-2 text-[12px] text-amber-300">{error}</p>}
    </div>
  )
}

// **gras** + retours à la ligne : le coach répond en conversation, pas en rapport.
function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5 text-[13.5px] leading-snug text-white/85">
      {text.split('\n').filter((l) => l.trim()).map((line, i) => (
        <p key={i} className="text-pretty">
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </div>
  )
}
