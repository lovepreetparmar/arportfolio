import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import type { Project } from '../../../data/projects'
import { getProjectWorldConfig } from '../../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT, getWorldSlot, type BuildingArchetype } from '../../../data/worldLayout'
import { useCursor } from '../../../context/CursorContext'
import { useWorldState } from '../../../context/WorldStateContext'
import { damp } from '../../character/CharacterAnimations'
import { wasDrag } from '../mapNavigation'
import { LocationContext } from './BuildingKit'
import { DesignStudio } from './DesignStudio'
import { FoodKitchen } from './FoodKitchen'
import { JewelleryBoutique } from './JewelleryBoutique'
import { ProjectPavilion } from './ProjectPavilion'

const LABEL_HEIGHT: Record<BuildingArchetype, number> = {
  boutique: 4.6,
  kitchen: 4.6,
  studio: 4.6,
  pavilion: 4,
}

type ProjectLocationProps = {
  project: Project
  onSelect: (slug: string) => void
}

/** A project's building in the world: placement, hover label, click-to-visit and door state. */
export function ProjectLocation({ project, onSelect }: ProjectLocationProps) {
  const slot = getWorldSlot(project.slug)
  const config = useMemo(() => getProjectWorldConfig(project), [project])
  const { pendingProjectSlug, doorOpenAmount, journeyPhase, nearProjectSlug } = useWorldState()
  const { setMode } = useCursor()
  const [hovered, setHovered] = useState(false)
  const openRef = useRef(0)
  const ctx = useMemo(() => ({ openRef }), [])
  const isActive = pendingProjectSlug === project.slug

  useFrame((_, delta) => {
    const opening = isActive && (journeyPhase === 'doorOpening' || journeyPhase === 'entering' || journeyPhase === 'inRoom')
    openRef.current = damp(openRef.current, opening ? doorOpenAmount : 0, 12, delta)
  })

  if (!slot) return null
  const fp = ARCHETYPE_FOOTPRINT[slot.archetype]
  const showLabel = (hovered && journeyPhase === 'world') || isActive || (nearProjectSlug === project.slug && journeyPhase === 'world')

  return (
    <LocationContext.Provider value={ctx}>
      <group
        position={[slot.position.x, 0, slot.position.z]}
        rotation={[0, slot.rotation, 0]}
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
          onSelect(project.slug)
        }}
      >
        {slot.archetype === 'boutique' && <JewelleryBoutique project={project} config={config} />}
        {slot.archetype === 'kitchen' && <FoodKitchen project={project} config={config} />}
        {slot.archetype === 'studio' && <DesignStudio project={project} config={config} />}
        {slot.archetype === 'pavilion' && <ProjectPavilion project={project} config={config} style={slot.style} tone={slot.tone} />}

        <Html
          position={[0, LABEL_HEIGHT[slot.archetype], fp.depth / 2]}
          center
          distanceFactor={11}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="min-w-44 whitespace-nowrap bg-canvas/90 px-4 py-3 text-left shadow-[0_10px_30px_rgba(17,17,17,0.08)] backdrop-blur-sm transition-all duration-300"
            style={{
              opacity: showLabel ? 1 : 0,
              transform: `translateY(${showLabel ? 0 : 6}px)`,
            }}
            aria-hidden={!showLabel}
          >
            <p className="text-[9px] tracking-[0.35em] text-muted">{project.number}</p>
            <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">{project.title}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.25em] text-muted">
              {config.environment.exteriorLabel} / {project.category}
            </p>
            <p className="mt-2.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-ink">Enter →</p>
          </div>
        </Html>
      </group>
    </LocationContext.Provider>
  )
}
