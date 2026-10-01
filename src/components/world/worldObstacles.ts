import { getProjectBySlug } from '../../data/projects'
import { getProjectWorldConfig } from '../../data/projectWorld'
import { LANDMARK, locationToWorld, STUDIO_LOCATIONS, WORLD_LOCATIONS } from '../../data/worldLocations'
import { getWorldScenery, WORLD_POND } from '../../data/worldScenery'
import { ARCHETYPE_FOOTPRINT, worldProjectSlots, type BuildingArchetype } from '../../data/worldLayout'

/** Half the width of her shoulders plus a little air, so she stops short of walls instead of touching them. */
const BODY_RADIUS = 0.3

type Circle = { x: number; z: number; r: number }
type Box = { x: number; z: number; cos: number; sin: number; hw: number; hd: number }

/** Props standing in front of each building type, in the building's local frame (x right, z out of the door). */
const FRONT_PROPS: Record<BuildingArchetype, [number, number, number][]> = {
  kitchen: [
    [-2.1, 1.8 + 1.45, 0.8],
    [1.45, 1.8 + 0.95, 0.35],
  ],
  studio: [[-2.75, 2 + 1.35, 0.68]],
  boutique: [
    [-2.05, 1.7 + 0.4, 0.26],
    [2.05, 1.7 + 0.4, 0.26],
  ],
  pavilion: [[1.4, 1.5 + 0.9, 0.35]],
}

const circles: Circle[] = []
const boxes: Box[] = []
let built = false

function build() {
  built = true
  for (const s of worldProjectSlots) {
    const fp = ARCHETYPE_FOOTPRINT[s.archetype]
    const cos = Math.cos(s.rotation)
    const sin = Math.sin(s.rotation)
    boxes.push({ x: s.position.x, z: s.position.z, cos, sin, hw: fp.width / 2 + 0.12, hd: fp.depth / 2 + 0.12 })
    const project = getProjectBySlug(s.slug)
    const gallery = !!project && getProjectWorldConfig(project).room.displayStyle === 'gallery'
    if (s.archetype === 'pavilion' && gallery) continue
    for (const [lx, lz, r] of FRONT_PROPS[s.archetype]) {
      circles.push({ x: s.position.x + lx * cos + lz * sin, z: s.position.z - lx * sin + lz * cos, r })
    }
  }
  for (const l of STUDIO_LOCATIONS) {
    const fp = l.footprint!
    boxes.push({
      x: l.position.x,
      z: l.position.z,
      cos: Math.cos(l.rotation),
      sin: Math.sin(l.rotation),
      hw: fp.width / 2 + 0.12,
      hd: fp.depth / 2 + 0.12,
    })
  }
  for (const l of WORLD_LOCATIONS) {
    for (const [lx, lz, r] of l.obstacles ?? []) circles.push({ ...locationToWorld(l, lx, lz), r })
  }
  for (const t of getWorldScenery().trees) {
    const r = t.kind === 'cypress' ? 0.32 : t.kind === 'shrub' ? 0.4 : 0.38
    circles.push({ x: t.x, z: t.z, r: r * t.scale })
  }
  circles.push({ x: WORLD_POND.x, z: WORLD_POND.z, r: WORLD_POND.radius * 1.05 })
  circles.push({ x: LANDMARK.position.x, z: LANDMARK.position.z, r: LANDMARK.radius ?? 1.5 })
}

/**
 * Nearest spot she can stand: outside buildings, the props at their doors and tree trunks. Pushing her
 * out along the shallowest side means a walk into a wall slides along it rather than stopping dead.
 */
export function constrainToWorld(x: number, z: number): [number, number] {
  if (!built) build()
  for (const b of boxes) {
    const dx = x - b.x
    const dz = z - b.z
    if (Math.abs(dx) > 6 || Math.abs(dz) > 6) continue
    const lx = dx * b.cos - dz * b.sin
    const lz = dx * b.sin + dz * b.cos
    const ox = b.hw + BODY_RADIUS - Math.abs(lx)
    const oz = b.hd + BODY_RADIUS - Math.abs(lz)
    if (ox <= 0 || oz <= 0) continue
    const nx = ox < oz ? Math.sign(lx) * (b.hw + BODY_RADIUS) : lx
    const nz = ox < oz ? lz : Math.sign(lz) * (b.hd + BODY_RADIUS)
    x = b.x + nx * b.cos + nz * b.sin
    z = b.z - nx * b.sin + nz * b.cos
  }
  for (const c of circles) {
    const dx = x - c.x
    const dz = z - c.z
    const min = c.r + BODY_RADIUS
    const d2 = dx * dx + dz * dz
    if (d2 >= min * min) continue
    const d = Math.sqrt(d2) || 1e-4
    x = c.x + (dx / d) * min
    z = c.z + (dz / d) * min
  }
  return [x, z]
}

/** Whether she could walk the straight line between two points without anything pushing her aside. */
export function isWalkClear(from: { x: number; z: number }, to: { x: number; z: number }): boolean {
  const len = Math.hypot(to.x - from.x, to.z - from.z)
  for (let d = 0.3; d < len; d += 0.25) {
    const x = from.x + ((to.x - from.x) * d) / len
    const z = from.z + ((to.z - from.z) * d) / len
    const [cx, cz] = constrainToWorld(x, z)
    if (Math.abs(cx - x) + Math.abs(cz - z) > 0.02) return false
  }
  return true
}
