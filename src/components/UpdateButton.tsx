import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Program } from '../types'
import { isValidProgram } from '../lib/storage'
import Icon from './Icon'

interface Props {
  onLoaded: (program: Program) => void
}

type Feedback = { kind: 'ok' | 'err'; msg: string } | null

export default function UpdateButton({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function handleFile(file: File | undefined | null) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      setFeedback({ kind: 'err', msg: 'Il faut un fichier .json' })
      return
    }
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!isValidProgram(data)) {
        setFeedback({ kind: 'err', msg: 'JSON invalide (structure du programme)' })
        return
      }
      onLoaded(data)
      setFeedback({ kind: 'ok', msg: 'Programme mis à jour ✓' })
    } catch {
      setFeedback({ kind: 'err', msg: 'Impossible de lire ce fichier' })
    }
  }

  // Drag & drop sur toute la fenêtre.
  useEffect(() => {
    const onOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) setDragging(true)
    }
    const onLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFile(e.dataTransfer?.files?.[0])
    }
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Efface le message après quelques secondes.
  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(t)
  }, [feedback])

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = '' // permet de recharger le même fichier
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="focus-ring glass flex w-full items-center justify-center gap-2 px-4 py-3.5 font-display text-sm font-semibold uppercase tracking-widest text-white/85 transition hover:bg-white/[0.08] active:scale-[0.98]"
      >
        <Icon name="upload" size={20} />
        Mettre à jour le programme
      </button>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`mt-2 rounded-xl px-3 py-2 text-center text-[13px] ${
              feedback.kind === 'ok'
                ? 'bg-emerald-400/15 text-emerald-300'
                : 'bg-red-500/15 text-red-300'
            }`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay drag & drop */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-md"
          >
            <div className="glass mx-6 border-2 border-dashed border-run/60 px-8 py-10 text-center">
              <Icon name="inbox" size={40} className="mx-auto mb-3 text-run" strokeWidth={1.75} />
              <p className="font-display text-lg font-semibold tracking-wide text-white">
                Dépose ton program.json
              </p>
              <p className="mt-1 text-[13px] text-white/65">Il remplacera le programme actuel</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
