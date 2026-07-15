import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Adaptation, Day, Program, Week } from '../types'
import { chatCoach, clearChat, loadChat, saveChat, type ChatMessage } from '../lib/coach'
import { applyCarnetOps } from '../lib/carnet'
import Proposal from './Proposal'
import Icon from './Icon'
import { IconBadge } from './ui'

interface Props {
  day: Day
  week: Week
  program: Program
  tomorrow?: Day
  today: string
  /** Applique une adaptation validée par l'athlète (remonte jusqu'à App). */
  onApply: (a: Adaptation) => void
  /** Le coach vient d'écrire à son carnet — prévient App pour rafraîchir l'affichage. */
  onCarnet: () => void
}

// Amorces : les 3 cas réels (douleur / fatigue / adaptation).
const SUGGESTIONS = ['J’ai mal quelque part', 'Je suis cuit aujourd’hui', 'Je peux décaler ma séance ?']

// Conversation avec le coach : il connaît le plan, la séance du jour,
// l'état du jour et les 10 derniers jours de Strava (ajoutés côté backend).
export default function ChatCoach({ day, week, program, tomorrow, today, onApply, onCarnet }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return

    const next = [...messages, { role: 'user' as const, content, date: today }]
    setMessages(next)
    saveChat(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const { reply, adaptation, carnet } = await chatCoach(next, { day, week, program, tomorrow, today })
      // La mémoire du coach s'écrit tout de suite : elle vaut pour le message suivant.
      if (carnet) {
        applyCarnetOps(carnet, today)
        onCarnet()
      }
      const withReply: ChatMessage[] = [
        ...next,
        { role: 'assistant', content: reply, date: today, adaptation }
      ]
      setMessages(withReply)
      saveChat(withReply)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erreur'
      setError(msg === 'unauthorized' ? 'Accès refusé par le backend.' : 'Le coach n’a pas répondu, réessaie.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    clearChat()
    setMessages([])
    setError(null)
  }

  // L'athlète tranche sur une proposition. Rien n'a bougé dans le plan avant ce clic.
  function decide(index: number, decision: 'applied' | 'ignored') {
    const target = messages[index]
    if (!target?.adaptation) return
    if (decision === 'applied') onApply(target.adaptation)
    const next = messages.map((m, i) => (i === index ? { ...m, decision } : m))
    setMessages(next)
    saveChat(next)
  }

  return (
    <div className="glass flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <IconBadge name="message" size={34} tone="gym" />
          <span className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-white/85">
            Parler au coach
          </span>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="focus-ring text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-white/70"
          >
            Effacer
          </button>
        )}
      </div>

      {messages.length === 0 && !loading ? (
        <p className="text-pretty text-[13px] leading-snug text-white/60">
          Dis-lui ce que tu as dans les jambes. Il connaît ton plan, ta séance du jour, ton état et tes
          10 derniers jours sur Strava — il adapte en conséquence.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-2'}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug',
                    m.role === 'user'
                      ? 'rounded-br-md bg-white/[0.09] text-white/90'
                      : 'rounded-bl-md border border-gym/25 bg-gym/[0.07] text-white/85'
                  ].join(' ')}
                >
                  <Bubble text={m.content} />
                </div>

                {m.adaptation && (
                  <Proposal
                    adaptation={m.adaptation}
                    decision={m.decision}
                    onDecide={(d) => decide(i, d)}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-gym/25 bg-gym/[0.07] px-3.5 py-3">
                <Dots />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-amber-300">{error}</p>}

      {/* Amorces (uniquement au démarrage) */}
      {messages.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className="focus-ring min-h-[44px] rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] text-white/60 transition-colors hover:text-white/90 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          placeholder="Aujourd’hui j’ai mal au genou…"
          className="focus-ring max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[13.5px] leading-snug text-white placeholder:text-white/60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Envoyer au coach"
          className="focus-ring flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-gym text-ink transition active:scale-[0.96] disabled:opacity-40"
        >
          <Icon name="send" size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}

// Rendu léger : **gras** + retours à la ligne (le coach répond en conversation).
function Bubble({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className={i ? 'mt-1.5 text-pretty' : 'text-pretty'}>
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
    </>
  )
}

function Dots() {
  return (
    <span className="flex gap-1" aria-label="Le coach écrit">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gym"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
