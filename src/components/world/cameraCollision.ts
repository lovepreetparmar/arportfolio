import * as THREE from 'three'
import { ARCHETYPE_FOOTPRINT, worldProjectSlots, type BuildingArchetype } from '../../data/worldLayout'
import { STUDIO_LOCATIONS } from '../../data/worldLocations'
import { getWorldScenery } from '../../data/worldScenery'

/** Roof ridge heights, slightly generous so the camera never grazes the eaves. */
const ROOF_HEIGHT: Record<BuildingArchetype, number> = {
  boutique: 4.5,
  kitchen: 4.5,
  studio: 4.6,
  pavilion: 3.9,
}
/** Clearance kept between the camera and any surface. */
const CAMERA_RADIUS = 0.45
const MIN_GROUND_CLEARANCE = 0.5
/** The camera is never pulled closer than this to the pivot. */
export const MIN_COLLISION_DISTANCE = 1.6

type Box = { x: number; z: number; cos: number; sin: number; hw: number; hd: number; h: number }

const box = (s: (typeof worldProjectSlots)[number], pad: number): Box => {
  const fp = ARCHETYPE_FOOTPRINT[s.archetype]
  return {
    x: s.position.x,
    z: s.position.z,
    cos: Math.cos(s.rotation),
    sin: Math.sin(s.rotation),
    hw: fp.width / 2 + pad,
    hd: fp.depth / 2 + pad,
    h: ROOF_HEIGHT[s.archetype] + pad,
  }
}
const studioBox = (l: (typeof STUDIO_LOCATIONS)[number], pad: number): Box => ({
  x: l.position.x,
  z: l.position.z,
  cos: Math.cos(l.rotation),
  sin: Math.sin(l.rotation),
  hw: l.footprint!.width / 2 + pad,
  hd: l.footprint!.depth / 2 + pad,
  h: l.footprint!.height + pad,
})
/** The buildings themselves, for whether they hide her; and with clearance, for where the camera may sit. */
const WALLS: Box[] = [...worldProjectSlots.map((s) => box(s, 0)), ...STUDIO_LOCATIONS.map((l) => studioBox(l, 0))]
const BOXES: Box[] = [
  ...worldProjectSlots.map((s) => box(s, CAMERA_RADIUS)),
  ...STUDIO_LOCATIONS.map((l) => studioBox(l, CAMERA_RADIUS)),
]

/** Tree canopies as ellipsoids (centre height and radii), inflated by the camera radius. */
type Canopy = { x: number; y: number; z: number; r: number; ry: number }

const CANOPIES: Canopy[] = getWorldScenery().trees.flatMap((t): Canopy[] => {
  const s = t.scale
  if (t.kind === 'round') return [{ x: t.x, y: 1.85 * s, z: t.z, r: 1.15 * s + CAMERA_RADIUS, ry: 0.95 * s + CAMERA_RADIUS }]
  if (t.kind === 'cypress') return [{ x: t.x, y: 1.55 * s, z: t.z, r: 0.5 * s + CAMERA_RADIUS, ry: 1.35 * s + CAMERA_RADIUS }]
  return []
})

/** Entry parameter (0–1) of segment a→b into the canopy, or null if it misses or starts inside. */
function canopyEntry(c: Canopy, a: THREE.Vector3, b: THREE.Vector3): number | null {
  const ox = (a.x - c.x) / c.r
  const oy = (a.y - c.y) / c.ry
  const oz = (a.z - c.z) / c.r
  const dx = (b.x - a.x) / c.r
  const dy = (b.y - a.y) / c.ry
  const dz = (b.z - a.z) / c.r
  const A = dx * dx + dy * dy + dz * dz
  const B = 2 * (ox * dx + oy * dy + oz * dz)
  const C = ox * ox + oy * oy + oz * oz - 1
  if (C < 0) return null
  const disc = B * B - 4 * A * C
  if (disc < 0) return null
  const t = (-B - Math.sqrt(disc)) / (2 * A)
  return t >= 0 && t <= 1 ? t : null
}

function insideCanopy(c: Canopy, p: THREE.Vector3) {
  const nx = (p.x - c.x) / c.r
  const ny = (p.y - c.y) / c.ry
  const nz = (p.z - c.z) / c.r
  return nx * nx + ny * ny + nz * nz < 1
}

/** Entry parameter (0–1) of segment a→b into the box, or null if it misses or starts inside. */
function segmentEntry(box: Box, a: THREE.Vector3, b: THREE.Vector3): number | null {
  const ax = a.x - box.x
  const az = a.z - box.z
  const bx = b.x - box.x
  const bz = b.z - box.z
  const o = [ax * box.cos - az * box.sin, a.y, ax * box.sin + az * box.cos]
  const e = [bx * box.cos - bz * box.sin, b.y, bx * box.sin + bz * box.cos]
  const min = [-box.hw, 0, -box.hd]
  const max = [box.hw, box.h, box.hd]
  let t0 = 0
  let t1 = 1
  let startsInside = true
  for (let i = 0; i < 3; i++) {
    const d = e[i] - o[i]
    if (o[i] < min[i] || o[i] > max[i]) startsInside = false
    if (Math.abs(d) < 1e-6) {
      if (o[i] < min[i] || o[i] > max[i]) return null
      continue
    }
    let near = (min[i] - o[i]) / d
    let far = (max[i] - o[i]) / d
    if (near > far) [near, far] = [far, near]
    t0 = Math.max(t0, near)
    t1 = Math.min(t1, far)
    if (t0 > t1) return null
  }
  return startsInside ? null : t0
}

function insideBox(b: Box, p: THREE.Vector3) {
  const dx = p.x - b.x
  const dz = p.z - b.z
  return (
    Math.abs(dx * b.cos - dz * b.sin) < b.hw && Math.abs(dx * b.sin + dz * b.cos) < b.hd && p.y >= 0 && p.y < b.h
  )
}

/**
 * Longest unobstructed pivot-to-camera distance along the desired camera ray. A building that
 * actually hides her pulls the camera in front of it; one the ray merely grazes only does so
 * when the camera itself would sit within its clearance. Trees likewise only act when the camera
 * would otherwise sit inside a canopy, so passing foliage and corners never yank the view.
 */
export function collisionDistance(pivot: THREE.Vector3, desired: THREE.Vector3): number {
  const len = pivot.distanceTo(desired)
  let t = 1
  for (let i = 0; i < WALLS.length; i++) {
    const hit = segmentEntry(WALLS[i], pivot, desired)
    if (hit !== null && hit < t) t = hit
    if (insideBox(BOXES[i], desired)) {
      const near = segmentEntry(BOXES[i], pivot, desired)
      if (near !== null && near < t) t = near
    }
  }
  for (const canopy of CANOPIES) {
    if (!insideCanopy(canopy, desired)) continue
    const hit = canopyEntry(canopy, pivot, desired)
    if (hit !== null && hit < t) t = hit
  }
  if (t >= 1) return len
  return Math.max(MIN_COLLISION_DISTANCE, t * len - CAMERA_RADIUS)
}

/** Lowest height the camera may sit at (x, z): above the ground and over the distant hills. */
export function minCameraHeight(x: number, z: number) {
  let y = MIN_GROUND_CLEARANCE
  for (const h of getWorldScenery().hills) {
    const nx = (x - h.x) / h.rx
    const nz = (z - h.z) / h.rz
    const k = 1 - nx * nx - nz * nz
    if (k > 0) y = Math.max(y, h.ry * Math.sqrt(k) - 0.05 + MIN_GROUND_CLEARANCE)
  }
  return y
}
