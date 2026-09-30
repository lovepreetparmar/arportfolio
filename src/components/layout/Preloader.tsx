import { useEffect, useState } from 'react'
import { gsap } from '../../utils/animations'
import { useReducedMotion } from '../../hooks/useMediaQuery'

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [pct, setPct] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      onComplete()
      return
    }
    const start = performance.now()
    const duration = 800
    const tick = (now: number) => {
      const p = Math.min(100, Math.round(((now - start) / duration) * 100))
      setPct(p)
      if (now - start < duration) requestAnimationFrame(tick)
      else {
        gsap.to('.preload', {
          opacity: 0,
          duration: 0.5,
          onComplete,
        })
      }
    }
    requestAnimationFrame(tick)
  }, [onComplete, reduced])

  if (reduced) return null

  return (
    <div className="preload fixed inset-0 z-[10000] flex items-end bg-canvas p-8">
      <p className="text-xs tracking-[0.35em] text-muted uppercase">{pct}%</p>
    </div>
  )
}
