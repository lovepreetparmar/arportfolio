import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { projects } from '../../data/projects'
import { getWorldSlot, REVEAL } from '../../data/worldLayout'
import { useWorldState } from '../../context/WorldStateContext'

/** Single pass: nearest project drives territory, accent, and character look-at. */
export function WorldProximity() {
  const { character, setActiveTerritory, setNearProjectSlug, setAccentColor, setLookAt } = useWorldState()
  const prev = useRef({ slug: '', territory: '', accent: '', lookKey: '' })

  useFrame(() => {
    let bestSlug: string | null = null
    let bestDist = Infinity
    let bestTerritory = 'experiments'
    let bestAccent = '#c8c4bc'
    let bestPos = { x: 0, y: 1.15, z: -10 }

    for (const project of projects) {
      const slot = getWorldSlot(project.slug)
      if (!slot) continue
      const d = Math.hypot(character.x - slot.position.x, character.z - slot.position.z)
      if (d < bestDist) {
        bestDist = d
        bestSlug = project.slug
        bestTerritory = project.territory
        bestAccent = project.accent ?? '#c8c4bc'
        bestPos = { x: slot.position.x, y: 1.15, z: slot.position.z }
      }
    }

    if (bestDist < REVEAL.metadata + 3 && bestTerritory !== prev.current.territory) {
      prev.current.territory = bestTerritory
      setActiveTerritory(bestTerritory)
    }

    const lookKey = `${bestPos.x},${bestPos.z}`
    if (bestDist < REVEAL.interact + 1.2 && bestSlug) {
      if (bestSlug !== prev.current.slug) {
        prev.current.slug = bestSlug
        setNearProjectSlug(bestSlug)
      }
      if (bestAccent !== prev.current.accent) {
        prev.current.accent = bestAccent
        setAccentColor(bestAccent)
      }
      if (lookKey !== prev.current.lookKey) {
        prev.current.lookKey = lookKey
        setLookAt(bestPos)
      }
    } else {
      if (prev.current.slug) {
        prev.current.slug = ''
        setNearProjectSlug(null)
      }
      if (prev.current.lookKey) {
        prev.current.lookKey = ''
        setLookAt(null)
      }
    }
  })

  return null
}
