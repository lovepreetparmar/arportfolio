import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useWorldState } from '../../context/WorldStateContext'
import {
  DRAG_THRESHOLD,
  ORBIT_SPEED,
  ORBIT_SPEED_VERTICAL,
  PAN_SPEED,
  PINCH_SPEED,
  ZOOM_SPEED,
  clampPan,
  clampPolar,
  clampZoom,
  mapView,
} from './mapNavigation'

/** Screen-space perspective: vertical drags cover more ground than horizontal ones. */
const VERTICAL_PAN_BOOST = 1.45

type DragKind = 'orbit' | 'pan'

/**
 * Pointer input on the world canvas (runs inside Canvas). Drag orbits the camera around
 * Anushri, Shift + drag pans the view, the wheel and pinch zoom. A press that stays under the
 * drag threshold is left alone so it still reaches click-to-walk and project selection.
 */
export function WorldMapControls() {
  const { gl } = useThree()
  const { journeyPhase } = useWorldState()
  const phaseRef = useRef(journeyPhase)
  phaseRef.current = journeyPhase

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'none'

    const pointers = new Map<number, { x: number; y: number }>()
    let press: { id: number; x: number; y: number; pan: boolean } | null = null
    let drag: DragKind | null = null
    let last = { x: 0, y: 0 }
    let pinchDist = 0

    const canNavigate = () => phaseRef.current === 'world' || phaseRef.current === 'walking' || phaseRef.current === 'inRoom'
    const canPan = () => phaseRef.current !== 'inRoom'

    const onWheel = (e: WheelEvent) => {
      if (!canNavigate()) return
      e.preventDefault()
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      const step = Math.max(-240, Math.min(240, px))
      mapView.targetZoom = clampZoom(mapView.targetZoom * Math.exp(step * ZOOM_SPEED))
    }

    const endDrag = () => {
      drag = null
      el.style.cursor = ''
      mapView.dragging = false
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        press = { id: e.pointerId, x: e.clientX, y: e.clientY, pan: e.shiftKey }
        last = { x: e.clientX, y: e.clientY }
        mapView.gestured = false
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
        drag = null
        mapView.dragging = true
        mapView.gestured = true
      }
    }

    const orbit = (dx: number, dy: number) => {
      mapView.targetAzimuth -= dx * ORBIT_SPEED
      mapView.targetPolar = clampPolar(mapView.targetPolar - dy * ORBIT_SPEED_VERTICAL)
    }

    const pan = (dx: number, dy: number) => {
      const speed = PAN_SPEED * mapView.zoom
      const s = Math.sin(mapView.azimuth)
      const c = Math.cos(mapView.azimuth)
      const right = dx * speed
      const ahead = dy * speed * VERTICAL_PAN_BOOST
      const [x, z] = clampPan(mapView.targetPanX - c * right - s * ahead, mapView.targetPanZ + s * right - c * ahead)
      mapView.targetPanX = x
      mapView.targetPanZ = z
    }

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (!canNavigate()) return

      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist > 0 && dist > 0) {
          mapView.targetZoom = clampZoom(mapView.targetZoom * Math.pow(pinchDist / dist, PINCH_SPEED))
        }
        pinchDist = dist
        return
      }

      if (!press || press.id !== e.pointerId) return
      if (!drag) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD) return
        drag = press.pan && e.pointerType === 'mouse' && canPan() ? 'pan' : 'orbit'
        mapView.dragging = true
        mapView.gestured = true
        last = { x: e.clientX, y: e.clientY }
        el.style.cursor = drag === 'pan' ? 'move' : 'grabbing'
        return
      }

      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
      if (drag === 'pan') pan(dx, dy)
      else orbit(dx, dy)
    }

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size === 0) {
        press = null
        pinchDist = 0
        endDrag()
      } else if (pointers.size === 1) {
        const [id, p] = [...pointers.entries()][0]
        press = { id, x: p.x, y: p.y, pan: false }
        last = { x: p.x, y: p.y }
        pinchDist = 0
        drag = 'orbit'
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      mapView.dragging = false
    }
  }, [gl])

  return null
}
