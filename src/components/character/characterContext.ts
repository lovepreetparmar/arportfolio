import { getPlaceEntrance, LANDMARK, locationToWorld, STUDIO_LOCATIONS, VIEWPOINT, type WorldLocation } from '../../data/worldLocations'

/**
 * Where she is in the journey, from her point of view. The controller resolves it every frame and
 * uses it to aim her body and head; it is published here for anything else that wants to know.
 */
export type CharacterContextState =
  | 'idle'
  | 'walking'
  | 'approaching'
  | 'atAbout'
  | 'atContact'
  | 'atLandmark'
  | 'atSkyViewpoint'
  | 'enteringRoom'
  | 'exitingRoom'

type Point = { x: number; y: number; z: number }

export type CharacterContext = {
  state: CharacterContextState
  /** What she attends to: the door she is heading for, or the place she is standing at. */
  focus: Point | null
  /** A place nearby worth a glance in passing. */
  glance: Point | null
}

export const characterContext: CharacterContext = { state: 'idle', focus: null, glance: null }

/** Within this distance of an entrance the walk becomes an approach and she looks at the door. */
const APPROACH_RADIUS = 4
const STUDIO_RADIUS = 4.5
const LANDMARK_REACH = 2.6
const VIEWPOINT_REACH = 1.2
const GLANCE_RADIUS = 7.5

const DOOR_HEIGHT = 1.45

function doorOf(l: WorldLocation): Point {
  const p = locationToWorld(l, 0, (l.footprint?.depth ?? 0) / 2)
  return { x: p.x, y: DOOR_HEIGHT, z: p.z }
}

const STUDIOS = STUDIO_LOCATIONS.map((l) => ({ id: l.id, type: l.type, door: doorOf(l), entrance: getPlaceEntrance(l.id)! }))
const LANDMARK_FOCUS: Point = { x: LANDMARK.position.x, y: 0.72, z: LANDMARK.position.z }
const GLANCEABLE = [...STUDIOS.map((s) => s.door), LANDMARK_FOCUS]

/** The door of a place she is walking to: a little in from its entrance, toward the building. */
function placeDoor(slug: string): Point | null {
  const studio = STUDIOS.find((s) => s.id === slug)
  if (studio) return studio.door
  const e = getPlaceEntrance(slug)
  if (!e) return null
  const dx = e.buildingX - e.x
  const dz = e.buildingZ - e.z
  const d = Math.hypot(dx, dz) || 1
  return { x: e.x + (dx / d) * 0.9, y: DOOR_HEIGHT, z: e.z + (dz / d) * 0.9 }
}

type Inputs = {
  x: number
  z: number
  walking: boolean
  inRoom: boolean
  journeyPhase: string
  pendingSlug: string | null
}

const dist = (x: number, z: number, p: { x: number; z: number }) => Math.hypot(x - p.x, z - p.z)

export function resolveCharacterContext({ x, z, walking, inRoom, journeyPhase, pendingSlug }: Inputs): CharacterContext {
  if (journeyPhase === 'exiting') return { state: 'exitingRoom', focus: null, glance: null }
  if (inRoom) return { state: 'idle', focus: null, glance: null }

  const going = journeyPhase === 'walking' || journeyPhase === 'arrived' || journeyPhase === 'doorOpening' || journeyPhase === 'entering'
  if (going && pendingSlug) {
    const door = placeDoor(pendingSlug)
    if (journeyPhase === 'doorOpening' || journeyPhase === 'entering') return { state: 'enteringRoom', focus: door, glance: null }
    const entrance = getPlaceEntrance(pendingSlug)
    if (journeyPhase === 'arrived' || (entrance && dist(x, z, entrance) < APPROACH_RADIUS)) {
      return { state: 'approaching', focus: door, glance: null }
    }
  }

  let glance: Point | null = null
  let nearest = GLANCE_RADIUS
  for (const p of GLANCEABLE) {
    const d = dist(x, z, p)
    if (d < nearest) {
      nearest = d
      glance = p
    }
  }

  if (walking || going) return { state: 'walking', focus: null, glance }

  for (const s of STUDIOS) {
    if (dist(x, z, s.entrance) < STUDIO_RADIUS) {
      return { state: s.type === 'contact' ? 'atContact' : 'atAbout', focus: s.door, glance: s.door }
    }
  }
  if (dist(x, z, VIEWPOINT.position) < (VIEWPOINT.radius ?? 2.4) + VIEWPOINT_REACH) {
    return { state: 'atSkyViewpoint', focus: null, glance: null }
  }
  if (dist(x, z, LANDMARK.position) < (LANDMARK.radius ?? 1.5) + LANDMARK_REACH) {
    return { state: 'atLandmark', focus: LANDMARK_FOCUS, glance: LANDMARK_FOCUS }
  }
  return { state: 'idle', focus: null, glance }
}
