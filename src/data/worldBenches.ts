import { distanceToPaths, getPathBranches } from './worldPaths'
import { VIEWPOINT } from './worldLocations'
import { ARCHETYPE_FOOTPRINT, PLAZA_RADIUS, WORLD_HUB, worldProjectSlots } from './worldLayout'

export type BenchSpot = {
  id: string
  x: number
  z: number
  /** Yaw of the bench's front (local +z, the side you sit facing). */
  rot: number
  /** Scenic benches get a framing tree behind them. */
  scenic: boolean
}

/** Top of the seat slats (metres). */
export const BENCH_SEAT_HEIGHT = 0.4
/** Where she stands, in front of the seat, before turning to sit. */
export const BENCH_APPROACH_DISTANCE = 0.42
/** Hips sit this far behind the seat's centre line, close to the backrest. */
const SEAT_SETBACK = 0.08
/** Offset from a path's centreline to a roadside bench. */
const ROADSIDE_OFFSET = 1.5

/** Plaza benches, in the gaps between path branches, facing the centre. */
const PLAZA_ANGLES = [-155, 35, 145]

/** Scenic roadside benches: branch, fraction along it, and which side of the path. */
const ROADSIDE: { slug: string; at: number[]; side: 1 | -1 }[] = [
  { slug: 'invitation', at: [0.62, 0.55, 0.7], side: 1 },
  { slug: 'company-portfolio', at: [0.55, 0.48, 0.64], side: -1 },
  { slug: 'timbs', at: [0.58, 0.5, 0.66], side: 1 },
]

function clearOfBuildings(x: number, z: number, margin: number) {
  return worldProjectSlots.every((s) => {
    const fp = ARCHETYPE_FOOTPRINT[s.archetype]
    const dx = x - s.position.x
    const dz = z - s.position.z
    const lx = dx * Math.cos(s.rotation) - dz * Math.sin(s.rotation)
    const lz = dx * Math.sin(s.rotation) + dz * Math.cos(s.rotation)
    return Math.abs(lx) > fp.width / 2 + margin || Math.abs(lz) > fp.depth / 2 + margin + 1.5
  })
}

function build(): BenchSpot[] {
  const benches: BenchSpot[] = PLAZA_ANGLES.map((deg, i) => {
    const a = (deg * Math.PI) / 180
    const x = WORLD_HUB.x + Math.cos(a) * 2.75
    const z = WORLD_HUB.z + Math.sin(a) * 2.75
    return { id: `plaza-${i}`, x, z, rot: Math.atan2(WORLD_HUB.x - x, WORLD_HUB.z - z), scenic: false }
  })

  const branches = getPathBranches('project')
  for (const r of ROADSIDE) {
    const branch = branches.find((b) => b.slug === r.slug)
    if (!branch) continue
    for (const f of r.at) {
      const i = Math.min(branch.render.length - 2, Math.floor(branch.render.length * f))
      const p = branch.render[i]
      const q = branch.render[i + 1]
      const len = Math.hypot(q.x - p.x, q.z - p.z) || 1
      const nx = (-(q.z - p.z) / len) * r.side
      const nz = ((q.x - p.x) / len) * r.side
      const x = p.x + nx * ROADSIDE_OFFSET
      const z = p.z + nz * ROADSIDE_OFFSET
      if (distanceToPaths({ x, z }, 'project') < ROADSIDE_OFFSET - 0.15) continue
      if (Math.hypot(x - WORLD_HUB.x, z - WORLD_HUB.z) < PLAZA_RADIUS + 2) continue
      if (!clearOfBuildings(x, z, 1)) continue
      benches.push({ id: `roadside-${r.slug}`, x, z, rot: Math.atan2(-nx, -nz), scenic: true })
      break
    }
  }
  return benches
}

let pathBenches: BenchSpot[] | null = null
let benches: BenchSpot[] | null = null

/** The plaza and roadside benches, which the seeded scenery scatter was planned around. */
export function getPathBenches(): BenchSpot[] {
  if (!pathBenches) pathBenches = build()
  return pathBenches
}

/** Every sittable bench, including the one at the viewpoint. */
export function getWorldBenches(): BenchSpot[] {
  if (!benches) {
    const { position, rotation } = VIEWPOINT
    benches = [...getPathBenches(), { id: 'viewpoint', x: position.x, z: position.z, rot: rotation, scenic: false }]
  }
  return benches
}

export function getBench(id: string): BenchSpot | undefined {
  return getWorldBenches().find((b) => b.id === id)
}

/** Seat centre and the standing spot in front of it, in world space. */
export function getBenchAnchors(b: BenchSpot) {
  const fx = Math.sin(b.rot)
  const fz = Math.cos(b.rot)
  return {
    seat: { x: b.x - fx * SEAT_SETBACK, z: b.z - fz * SEAT_SETBACK },
    approach: { x: b.x + fx * BENCH_APPROACH_DISTANCE, z: b.z + fz * BENCH_APPROACH_DISTANCE },
    facingYaw: b.rot,
  }
}

/** Distance to the nearest bench, for keeping scenery clear of them. */
export function distanceToBenches(x: number, z: number, list: BenchSpot[] = getWorldBenches()) {
  let best = Infinity
  for (const b of list) best = Math.min(best, Math.hypot(b.x - x, b.z - z))
  return best
}
