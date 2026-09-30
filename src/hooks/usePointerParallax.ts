import { useEffect, useRef } from 'react'
import { useIsTouchDevice, useReducedMotion } from './useMediaQuery'

export function usePointerParallax() {
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const isTouch = useIsTouchDevice()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (isTouch || reduced) return
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [isTouch, reduced])

  const lerp = (depth: number) => {
    current.current.x += (target.current.x - current.current.x) * 0.08
    current.current.y += (target.current.y - current.current.y) * 0.08
    return {
      x: current.current.x * depth,
      y: current.current.y * depth,
    }
  }

  return { lerp, disabled: isTouch || reduced }
}
