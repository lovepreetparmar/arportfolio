import { useEffect } from 'react'
import { useWorldState } from '../context/WorldStateContext'

export function useWorldPointer() {
  const { setPointer } = useWorldState()

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -(e.clientY / window.innerHeight) * 2 + 1
      setPointer({ x: nx, y: ny })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [setPointer])
}
