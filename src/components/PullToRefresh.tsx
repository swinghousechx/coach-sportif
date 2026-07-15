import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

// Tirer vers le bas depuis le haut de la page pour rafraîchir (geste mobile standard).
//
// Le listener touchmove est non-passif : il faut pouvoir couper le scroll natif
// pendant le tirage, sinon iOS fait rebondir la page et le geste part en vrille.
// On ne s'active qu'en tout haut (scrollY <= 0) et sur un vrai tirage vers le bas :
// dans tous les autres cas on rend la main au scroll natif immédiatement.

const THRESHOLD = 72 // px tirés avant déclenchement
const MAX_PULL = 110 // butée haute
const RESISTANCE = 0.5 // le contenu suit le doigt à moitié — sensation d'élastique

export default function PullToRefresh({
  onRefresh,
  children
}: {
  onRefresh: () => void
  children: React.ReactNode
}) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [animating, setAnimating] = useState(false) // retour élastique après lâcher

  const startY = useRef(0)
  const tracking = useRef(false)
  const pullRef = useRef(0) // touchend lit une ref : le state serait périmé dans la closure
  const refreshingRef = useRef(false)

  useEffect(() => {
    function setPullBoth(v: number) {
      pullRef.current = v
      setPull(v)
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current || e.touches.length > 1 || window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      tracking.current = true
      setAnimating(false)
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current) return

      const dy = e.touches[0].clientY - startY.current
      // Vers le haut, ou la page a repris son scroll : ce n'est pas notre geste.
      if (dy <= 0 || window.scrollY > 0) {
        tracking.current = false
        if (pullRef.current) setPullBoth(0)
        return
      }

      e.preventDefault() // coupe le scroll/bounce natif pendant le tirage
      setPullBoth(Math.min(MAX_PULL, dy * RESISTANCE))
    }

    function onTouchEnd() {
      if (!tracking.current) return
      tracking.current = false

      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        setAnimating(true)
        setPullBoth(THRESHOLD) // le contenu reste calé pendant le rechargement
        onRefresh()
        return
      }
      setAnimating(true)
      setPullBoth(0)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [onRefresh])

  const ready = pull >= THRESHOLD
  const progress = Math.min(1, pull / THRESHOLD)

  return (
    <>
      {/* Indicateur : suit le doigt, se remplit, puis tourne pendant le rechargement. */}
      <div
        aria-hidden={!refreshing}
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
        style={{
          transform: `translateY(${pull - 34}px)`,
          opacity: progress,
          transition: animating ? 'transform 0.3s var(--ease-out-expo), opacity 0.3s' : 'none'
        }}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl ${
            ready || refreshing ? 'border-gym/40 bg-gym/15 text-gym' : 'border-white/15 bg-white/10 text-white/50'
          }`}
        >
          <Icon
            name="refresh"
            size={17}
            className={refreshing ? 'animate-spin' : ''}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </span>
      </div>

      <div
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: animating ? 'transform 0.3s var(--ease-out-expo)' : 'none'
        }}
      >
        {children}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {refreshing ? 'Rafraîchissement en cours' : ''}
      </span>
    </>
  )
}
