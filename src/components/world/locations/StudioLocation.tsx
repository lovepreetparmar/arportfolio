import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useCursor } from '../../../context/CursorContext'
import { useWorldState } from '../../../context/WorldStateContext'
import type { WorldLocation } from '../../../data/worldLocations'
import { damp } from '../../character/CharacterAnimations'
import { characterSignals } from '../../character/characterSignals'
import { LocationContext } from '../buildings/BuildingKit'
import { wasDrag } from '../mapNavigation'

/** Within this distance of the door the quiet label shows, as it does for the project buildings. */
const NEAR = 3.4

type StudioLocationProps = {
  location: WorldLocation
  onSelect: (id: string) => void
  children: ReactNode
}

/** A studio in the world: placement, a small label on hover or close by, click-to-visit and door state. */
export function StudioLocation({ location, onSelect, children }: StudioLocationProps) {
  const { pendingProjectSlug, roomProjectSlug, doorOpenAmount, journeyPhase } = useWorldState()
  const { setMode } = useCursor()
  const [hovered, setHovered] = useState(false)
  const [near, setNear] = useState(false)
  const openRef = useRef(0)
  const ctx = useMemo(() => ({ openRef }), [])
  const isActive = pendingProjectSlug === location.id
  const doorOwner = isActive || roomProjectSlug === location.id
  const fp = location.footprint!
  const door = useMemo(() => {
    const e = location.entrance ?? { offsetX: 0, offsetZ: fp.depth / 2 }
    const c = Math.cos(location.rotation)
    const s = Math.sin(location.rotation)
    return { x: location.position.x + e.offsetX * c + e.offsetZ * s, z: location.position.z - e.offsetX * s + e.offsetZ * c }
  }, [location, fp.depth])

  useFrame((_, delta) => {
    openRef.current = damp(openRef.current, doorOwner ? doorOpenAmount : 0, 12, delta)
    const close = Math.hypot(characterSignals.x - door.x, characterSignals.z - door.z) < NEAR
    if (close !== near) setNear(close)
  })

  const showLabel = journeyPhase === 'world' ? hovered || near : isActive && journeyPhase === 'walking'

  return (
    <LocationContext.Provider value={ctx}>
      <group
        position={[location.position.x, 0, location.position.z]}
        rotation={[0, location.rotation, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          setMode('project', 'Enter')
        }}
        onPointerOut={() => {
          setHovered(false)
          setMode('default')
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (wasDrag(e)) return
          setHovered(false)
          setMode('default')
          onSelect(location.id)
        }}
      >
        {children}
        <Html
          position={[0, fp.height + 0.3, fp.depth / 2]}
          center
          distanceFactor={11}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="whitespace-nowrap bg-canvas/90 px-4 py-2.5 text-left shadow-[0_10px_30px_rgba(17,17,17,0.08)] backdrop-blur-sm transition-all duration-300"
            style={{ opacity: showLabel ? 1 : 0, transform: `translateY(${showLabel ? 0 : 6}px)` }}
            aria-hidden={!showLabel}
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-ink">{location.title}</p>
            <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-muted">Enter →</p>
          </div>
        </Html>
      </group>
    </LocationContext.Provider>
  )
}
