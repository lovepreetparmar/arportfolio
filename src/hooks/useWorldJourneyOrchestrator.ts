import { useEffect, useRef } from 'react'
import { ROOM_DOORSTEP } from '../components/project-room/roomSpace'
import { useWorldState } from '../context/WorldStateContext'
import { useReducedMotion } from './useMediaQuery'

/** Longest she is given to reach the room door before the exit goes ahead anyway. */
const EXIT_WALK_LIMIT_MS = 3500

/**
 * Timed doorway sequences. On the way in: door opens, she walks into the doorway, a short veil,
 * then the room. On the way out: the room door opens, she walks to it, a short veil, then she
 * steps out of the building's open door, which closes behind her.
 */
export function useWorldJourneyOrchestrator() {
  const reduced = useReducedMotion()
  const state = useWorldState()
  const { journeyPhase, pendingProjectSlug } = state
  const latest = useRef(state)
  latest.current = state
  const timers = useRef<number[]>([])
  const frames = useRef<number[]>([])

  const cancel = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    frames.current.forEach((f) => cancelAnimationFrame(f))
    timers.current = []
    frames.current = []
  }

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const animateDoor = (from: number, to: number, ms: number, done?: () => void) => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = ms <= 0 ? 1 : Math.min(1, (now - start) / ms)
      latest.current.setDoorOpenAmount(from + (to - from) * p)
      if (p < 1) frames.current.push(requestAnimationFrame(tick))
      else done?.()
    }
    frames.current.push(requestAnimationFrame(tick))
  }

  // The sequence advances the phase itself, so it must not be torn down by those phase changes.
  useEffect(() => {
    if (journeyPhase !== 'arrived' || !pendingProjectSlug) return
    cancel()
    const s = () => latest.current
    const pause = reduced ? 80 : 420
    const doorMs = reduced ? 100 : 850
    const inside = pause + doorMs

    later(pause, () => {
      s().advanceJourneyTo('doorOpening')
      animateDoor(0, 1, doorMs)
    })
    later(inside, () => {
      s().advanceJourneyTo('entering')
      s().stepThroughDoor()
    })
    later(inside + (reduced ? 0 : 300), () => s().setVeil(true))
    later(inside + (reduced ? 140 : 680), () => s().beginProjectReveal())
    later(inside + (reduced ? 200 : 820), () => s().setVeil(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyPhase, pendingProjectSlug, reduced])

  useEffect(() => {
    if (journeyPhase !== 'exiting') return
    cancel()
    const s = () => latest.current
    const start = performance.now()
    animateDoor(0, 1, reduced ? 0 : 600)

    const leave = () => {
      s().setVeil(true)
      later(reduced ? 120 : 320, () => {
        s().leaveRoomToEntrance()
        later(reduced ? 40 : 120, () => s().setVeil(false))
        later(reduced ? 100 : 750, () => animateDoor(1, 0, reduced ? 0 : 520, () => s().finishRoomExit()))
      })
    }

    const waitForDoorstep = (now: number) => {
      const c = s().characterRef.current
      const atDoor = Math.hypot(c.x - ROOM_DOORSTEP.x, c.z - ROOM_DOORSTEP.z) < 0.15
      const elapsed = now - start
      if (reduced || (atDoor && elapsed > 600) || elapsed > EXIT_WALK_LIMIT_MS) leave()
      else frames.current.push(requestAnimationFrame(waitForDoorstep))
    }
    frames.current.push(requestAnimationFrame(waitForDoorstep))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyPhase, reduced])

  useEffect(() => cancel, [])
}
