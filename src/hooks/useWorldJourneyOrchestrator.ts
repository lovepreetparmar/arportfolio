import { useEffect, useRef } from 'react'
import { useWorldState } from '../context/WorldStateContext'
import { useReducedMotion } from './useMediaQuery'

/** Timed door → enter → room sequence after character arrives. */
export function useWorldJourneyOrchestrator() {
  const reduced = useReducedMotion()
  const {
    journeyPhase,
    pendingProjectSlug,
    advanceJourneyTo,
    beginProjectReveal,
    setDoorOpenAmount,
  } = useWorldState()
  const timers = useRef<number[]>([])
  const doorAnim = useRef<number | null>(null)

  const cancel = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    if (doorAnim.current) cancelAnimationFrame(doorAnim.current)
    doorAnim.current = null
  }

  // The sequence advances the phase itself, so it must not be torn down by those phase changes.
  useEffect(() => {
    if (journeyPhase !== 'arrived' || !pendingProjectSlug) return
    cancel()

    const pause = reduced ? 80 : 420
    const doorMs = reduced ? 100 : 850
    const enterMs = reduced ? 80 : 550

    timers.current.push(
      window.setTimeout(() => {
        advanceJourneyTo('doorOpening')
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / doorMs)
          setDoorOpenAmount(p)
          doorAnim.current = p < 1 ? requestAnimationFrame(tick) : null
        }
        doorAnim.current = requestAnimationFrame(tick)
      }, pause),
      window.setTimeout(() => advanceJourneyTo('entering'), pause + doorMs),
      window.setTimeout(() => beginProjectReveal(), pause + doorMs + enterMs),
    )
  }, [journeyPhase, pendingProjectSlug, advanceJourneyTo, beginProjectReveal, setDoorOpenAmount, reduced])

  useEffect(() => {
    if (!pendingProjectSlug) cancel()
  }, [pendingProjectSlug])

  useEffect(() => cancel, [])
}
