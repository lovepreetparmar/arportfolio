import { getProjectBySlug } from './projects'
import {
  getProjectEntrance,
  getProjectWorldConfig,
  hasProjectInteriorRoom,
  type EntranceWorld,
  type ProjectRoomTheme,
} from './projectWorld'
import { site } from './site'
import { ENTRANCE_CLEARANCE, WORLD_HUB } from './worldLayout'

/**
 * The places in the world that are not project buildings: the landmark at the heart of the plaza,
 * Anushri's own studio (About), the contact studio beyond it, and the quiet viewpoint at the
 * southern edge. Projects are places too; `getPlaceEntrance` and friends answer for either.
 */
export type WorldLocationType = 'project' | 'about' | 'contact' | 'landmark' | 'viewpoint'

export type WorldInteraction = 'enter' | 'links' | 'sit' | 'gaze' | 'orient'

type XZ = { x: number; z: number }

export type WorldLocation = {
  id: string
  type: WorldLocationType
  position: XZ
  /** Yaw in radians; the front (local +z) faces this way. */
  rotation: number
  title: string
  description?: string
  /** Walls of an enterable building in metres; `height` is the top of the roof. */
  footprint?: { width: number; depth: number; height: number }
  /** Where she stops at the door (or where the path ends), in the local frame. */
  entrance?: { offsetX: number; offsetZ: number }
  /** Props standing outside, as local circles [x, z, radius], that she walks around. */
  obstacles?: [number, number, number][]
  /** Footprint of a landmark or the clearing around a viewpoint. */
  radius?: number
  /** Walk-in interior, dressed with this palette, built in the shared room space. */
  interior: { room: ProjectRoomTheme } | null
  interactions: WorldInteraction[]
  /** Hand-placed bends of the path from the plaza to the entrance. */
  via?: [number, number][]
}

const facing = (from: XZ, to: XZ) => Math.atan2(to.x - from.x, to.z - from.z)

const ABOUT_AT = { x: -21.5, z: 0.8 }
const CONTACT_AT = { x: -24, z: -8.5 }
/** The bench at the viewpoint; she sits looking back over the town toward the galactic core. */
const VIEWPOINT_AT = { x: 5.2, z: 25 }

const ABOUT_FOOTPRINT = { width: 5.2, depth: 4, height: 4.5 }
const CONTACT_FOOTPRINT = { width: 4.2, depth: 3.4, height: 3.9 }

/** The about path; the contact path follows it as far as the fork just short of the studio. */
const ABOUT_VIA: [number, number][] = [
  [-3.2, 0.4],
  [-6.5, 0.1],
  [-11, -0.1],
  [-15, 0.5],
]

export const ABOUT_ROOM: ProjectRoomTheme = {
  displayStyle: 'studio',
  wallColor: '#efe6d8',
  floorColor: '#b48a60',
  floorType: 'wood',
  ceilingColor: '#f6f0e6',
  accentColor: '#c4643e',
  lightColor: '#ffeacc',
  frameColor: '#2b2622',
}

export const CONTACT_ROOM: ProjectRoomTheme = {
  displayStyle: 'studio',
  wallColor: '#e9e1d2',
  floorColor: '#94704f',
  floorType: 'wood',
  ceilingColor: '#f3eee5',
  accentColor: '#3f6b5c',
  lightColor: '#ffe3bf',
  frameColor: '#2a2926',
}

export const WORLD_LOCATIONS: WorldLocation[] = [
  {
    id: 'landmark',
    type: 'landmark',
    position: { x: WORLD_HUB.x, z: WORLD_HUB.z },
    rotation: 0,
    title: 'Garden pool',
    /** Walk/collision radius at the outer stone step (~56% of the original garden pool). */
    radius: 0.91,
    interior: null,
    interactions: ['orient'],
  },
  {
    id: 'about',
    type: 'about',
    position: ABOUT_AT,
    rotation: facing(ABOUT_AT, WORLD_HUB),
    title: 'About',
    description: site.name,
    footprint: ABOUT_FOOTPRINT,
    entrance: { offsetX: 0, offsetZ: ABOUT_FOOTPRINT.depth / 2 + ENTRANCE_CLEARANCE },
    obstacles: [
      [-2, 2.55, 0.36],
      [2.05, 2.5, 0.28],
    ],
    interior: { room: ABOUT_ROOM },
    interactions: ['enter'],
    via: ABOUT_VIA,
  },
  {
    id: 'contact',
    type: 'contact',
    position: CONTACT_AT,
    rotation: facing(CONTACT_AT, { x: -18, z: -2 }),
    title: 'Contact',
    footprint: CONTACT_FOOTPRINT,
    entrance: { offsetX: 0, offsetZ: CONTACT_FOOTPRINT.depth / 2 + ENTRANCE_CLEARANCE },
    obstacles: [
      [-1.55, 2.45, 0.22],
      [1.5, 2.2, 0.3],
    ],
    interior: { room: CONTACT_ROOM },
    interactions: ['enter', 'links'],
    via: [...ABOUT_VIA, [-18, -2], [-20.4, -4.6]],
  },
  {
    id: 'viewpoint',
    type: 'viewpoint',
    position: VIEWPOINT_AT,
    rotation: facing(VIEWPOINT_AT, WORLD_HUB),
    title: 'Viewpoint',
    entrance: { offsetX: 0, offsetZ: 1.3 },
    radius: 2.4,
    /** The lantern beside the bench. */
    obstacles: [[0.95, -0.12, 0.14]],
    interior: null,
    interactions: ['sit', 'gaze'],
    via: [
      [0.2, 4],
      [-0.5, 10],
      [2.6, 14.4],
      [4.4, 19.8],
    ],
  },
]

const byId = new Map(WORLD_LOCATIONS.map((l) => [l.id, l]))

export function getWorldLocation(id: string): WorldLocation | undefined {
  return byId.get(id)
}

export const LANDMARK = byId.get('landmark')!
export const VIEWPOINT = byId.get('viewpoint')!

/** Local (building-frame) point to world space. */
export function locationToWorld(l: WorldLocation, lx: number, lz: number): XZ {
  const cos = Math.cos(l.rotation)
  const sin = Math.sin(l.rotation)
  return { x: l.position.x + lx * cos + lz * sin, z: l.position.z - lx * sin + lz * cos }
}

function locationEntrance(l: WorldLocation): EntranceWorld | null {
  if (!l.entrance) return null
  const p = locationToWorld(l, l.entrance.offsetX, l.entrance.offsetZ)
  return { x: p.x, y: 0, z: p.z, buildingX: l.position.x, buildingZ: l.position.z, doorYaw: l.rotation }
}

/** A project slug or a location id: anything she can be sent to. */
export function isPlace(id: string): boolean {
  return !!getProjectBySlug(id) || !!byId.get(id)?.entrance
}

export function getPlaceEntrance(id: string): EntranceWorld | null {
  const project = getProjectBySlug(id)
  if (project) return getProjectEntrance(project)
  const l = byId.get(id)
  return l ? locationEntrance(l) : null
}

export function hasPlaceInterior(id: string): boolean {
  return getProjectBySlug(id) ? hasProjectInteriorRoom(id) : !!byId.get(id)?.interior
}

export function getPlaceRoomTheme(id: string | null): ProjectRoomTheme | null {
  if (!id) return null
  const project = getProjectBySlug(id)
  if (project) return getProjectWorldConfig(project).room
  return byId.get(id)?.interior?.room ?? null
}

/** Enterable non-project buildings (the studios). */
export const STUDIO_LOCATIONS = WORLD_LOCATIONS.filter((l) => l.footprint)
