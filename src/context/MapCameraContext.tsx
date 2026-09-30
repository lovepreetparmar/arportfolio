import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { initialCamera } from '../data/mapLayout'
import { gsap } from '../utils/animations'

export type Camera = { x: number; y: number; zoom: number }

type SavedCamera = Camera & { at: number }

type MapCameraContextValue = {
  camera: Camera
  setCamera: (c: Partial<Camera>) => void
  animateTo: (target: Camera, duration?: number) => Promise<void>
  saveCamera: () => void
  peekSavedCamera: () => Camera | null
  clearSavedCamera: () => void
  panBy: (dx: number, dy: number) => void
  zoomAt: (delta: number, px: number, py: number) => void
}

const MapCameraContext = createContext<MapCameraContextValue | null>(null)

const STORAGE_KEY = 'anushri-map-camera'

export function MapCameraProvider({ children }: { children: ReactNode }) {
  const [camera, setCameraState] = useState<Camera>(initialCamera)
  const animRef = useRef<gsap.core.Tween | null>(null)

  const setCamera = useCallback((partial: Partial<Camera>) => {
    setCameraState((c) => ({ ...c, ...partial }))
  }, [])

  const cameraRef = useRef(camera)
  cameraRef.current = camera

  const animateTo = useCallback((target: Camera, duration = 0.85) => {
    return new Promise<void>((resolve) => {
      animRef.current?.kill()
      const state = { ...cameraRef.current }
      animRef.current = gsap.to(state, {
        x: target.x,
        y: target.y,
        zoom: target.zoom,
        duration,
        ease: 'power3.inOut',
        onUpdate: () => setCameraState({ ...state }),
        onComplete: () => resolve(),
      })
    })
  }, [])

  const saveCamera = useCallback(() => {
    const payload: SavedCamera = { ...camera, at: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [camera])

  const peekSavedCamera = useCallback((): Camera | null => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      const saved = JSON.parse(raw) as SavedCamera
      return { x: saved.x, y: saved.y, zoom: saved.zoom }
    } catch {
      return null
    }
  }, [])

  const clearSavedCamera = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const panBy = useCallback((dx: number, dy: number) => {
    setCameraState((c) => ({ ...c, x: c.x - dx / c.zoom, y: c.y - dy / c.zoom }))
  }, [])

  const zoomAt = useCallback((delta: number, px: number, py: number) => {
    setCameraState((c) => {
      const nextZoom = Math.min(1.4, Math.max(0.22, c.zoom + delta))
      const wx = c.x + px / c.zoom
      const wy = c.y + py / c.zoom
      const nx = wx - px / nextZoom
      const ny = wy - py / nextZoom
      return { x: nx, y: ny, zoom: nextZoom }
    })
  }, [])

  const value = useMemo(
    () => ({
      camera,
      setCamera,
      animateTo,
      saveCamera,
      peekSavedCamera,
      clearSavedCamera,
      panBy,
      zoomAt,
    }),
    [camera, setCamera, animateTo, saveCamera, peekSavedCamera, clearSavedCamera, panBy, zoomAt],
  )

  return <MapCameraContext.Provider value={value}>{children}</MapCameraContext.Provider>
}

export function useMapCamera() {
  const ctx = useContext(MapCameraContext)
  if (!ctx) throw new Error('useMapCamera requires MapCameraProvider')
  return ctx
}
