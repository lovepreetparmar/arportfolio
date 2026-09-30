import { useEffect, useRef } from 'react'
import { useMapCamera } from '../context/MapCameraContext'
import { useReducedMotion } from './useMediaQuery'

export function usePanZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const { panBy, zoomAt } = useMapCamera()
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onDown = (e: PointerEvent) => {
      dragging.current = true
      last.current = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
      panBy(dx, dy)
    }
    const onUp = (e: PointerEvent) => {
      dragging.current = false
      el.releasePointerCapture(e.pointerId)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.04 : 0.04
      zoomAt(reduced ? delta * 0.5 : delta, e.clientX, e.clientY)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [containerRef, panBy, zoomAt, reduced])
}
