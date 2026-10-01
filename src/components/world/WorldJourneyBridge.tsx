import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { getPlaceEntrance } from '../../data/worldLocations'
import { useWorldState } from '../../context/WorldStateContext'
import { ARRIVAL_THRESHOLD, horizontalDistance } from '../../navigation/worldNavigation'

/** Hands out path waypoints before each is reached so walking stays continuous. */
const WAYPOINT_HANDOFF = 0.45

/** Follows the planned path and detects walk completion at the project entrance (runs inside Canvas). */
export function WorldJourneyBridge() {
  const { character, target, moving, journeyPhase, pendingProjectSlug, onCharacterArrivedAtEntrance, routeRef, advanceRoute } =
    useWorldState()
  const fired = useRef(false)

  useFrame(() => {
    if (routeRef.current.length > 0 && horizontalDistance(character, target) < WAYPOINT_HANDOFF) {
      advanceRoute()
    }

    if (journeyPhase !== 'walking' || !pendingProjectSlug) {
      fired.current = false
      return
    }
    if (fired.current || moving || routeRef.current.length > 0) return

    const entrance = getPlaceEntrance(pendingProjectSlug)
    if (!entrance) return
    const dist = horizontalDistance(character, entrance)
    if (dist <= ARRIVAL_THRESHOLD) {
      fired.current = true
      onCharacterArrivedAtEntrance()
    }
  })

  return null
}
