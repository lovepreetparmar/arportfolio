import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { characterSignals } from '../character/characterSignals'
import { cancelReveal, prepareReveal, startReveal } from './mapNavigation'

/** Covers the preloader's count and fade, so the reveal is never half-hidden behind it. */
const MIN_HOLD_MS = 1350
/** Reveal anyway if her model is slow (or fails) to load. */
const MAX_HOLD_MS = 6000
const LINES = ["Hi, I'm Anushri.", 'Welcome to my little world.']
/** After the veil lifts: [show line 1, hide it, show line 2, hide it, unmount]. */
const CUES = [300, 1500, 1750, 3200, 3700]

/**
 * Opening: a plain veil holds until Anushri is ready, then lifts while the camera eases out from
 * a close shot of her to the world, with two short lines that leave on their own. Reduced motion
 * keeps the camera still and simply fades.
 */
export function WorldIntro() {
  const reduced = useReducedMotion()
  const [lifted, setLifted] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!reduced) prepareReveal()
    const started = performance.now()
    const minHold = reduced ? 300 : MIN_HOLD_MS
    const timers: number[] = []
    const poll = window.setInterval(() => {
      const waited = performance.now() - started
      if (waited < minHold || (!characterSignals.modelReady && waited < MAX_HOLD_MS)) return
      window.clearInterval(poll)
      setLifted(true)
      if (!reduced) startReveal()
      CUES.forEach((ms, i) => timers.push(window.setTimeout(() => setStep(i + 1), ms)))
    }, 100)
    return () => {
      window.clearInterval(poll)
      timers.forEach((t) => window.clearTimeout(t))
      cancelReveal()
    }
  }, [reduced])

  if (step >= CUES.length) return null

  return (
    <>
      <div
        aria-hidden
        className={`fixed inset-0 z-[60] bg-canvas transition-opacity duration-[900ms] ease-out ${
          lifted ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      />
      {/* On narrow screens she fills the frame, so the lines sit low over a soft fade instead of beside her. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[61] h-[34%] bg-gradient-to-t from-canvas/85 via-canvas/45 to-transparent transition-opacity duration-700 md:hidden"
        style={{ opacity: lifted && step < CUES.length - 1 ? 1 : 0 }}
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-[13%] z-[61] flex justify-center px-6 md:bottom-[24%] md:justify-start md:pl-[6%]">
        {LINES.map((text, i) => {
          const shownAt = 1 + i * 2
          const visible = step === shownAt
          const past = step > shownAt
          return (
            <p
              key={text}
              className="absolute text-center font-serif md:text-left text-[clamp(1.9rem,3.6vw,3.2rem)] leading-none text-ink transition-[opacity,transform] duration-700 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: reduced ? undefined : `translateY(${visible ? 0 : past ? -8 : 12}px)`,
                textShadow: '0 1px 22px rgba(247, 245, 241, 0.75)',
              }}
            >
              {text}
            </p>
          )
        })}
      </div>
    </>
  )
}
