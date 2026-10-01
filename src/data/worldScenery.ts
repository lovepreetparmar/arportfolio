import { distanceToBenches as distanceToAnyBench, getPathBenches } from './worldBenches'
import { distanceToPaths as distanceToAnyPath, getPathBranches } from './worldPaths'
import { locationToWorld, STUDIO_LOCATIONS, VIEWPOINT, WORLD_LOCATIONS } from './worldLocations'
import { ARCHETYPE_FOOTPRINT, PLAZA_RADIUS, WORLD_HUB, worldProjectSlots } from './worldLayout'

/**
 * The seeded scatter below is laid out against the project paths and benches only, so places added
 * later never reshuffle it; they clear their own ground from the finished layout afterwards.
 */
const distanceToPaths = (p: { x: number; z: number }) => distanceToAnyPath(p, 'project')
const distanceToBenches = (x: number, z: number) => distanceToAnyBench(x, z, getPathBenches())

export type TreeKind = 'round' | 'cypress' | 'shrub'

export type TreeSpot = { x: number; z: number; kind: TreeKind; scale: number; rot: number; tint: number }
export type StoneSpot = { x: number; z: number; scale: number; rot: number }
export type PatchSpot = { x: number; z: number; radius: number; rot: number; seed: number; deep: boolean }
export type SmallSpot = { x: number; z: number; scale: number; tint: number }
export type PropSpot = { x: number; z: number; rot: number }
export type HillSpot = { x: number; z: number; rx: number; ry: number; rz: number; tint: number }

/** A small pond in the open meadow east of the plaza, between two paths. */
export const WORLD_POND = { x: 9.5, z: 1.5, radius: 1.3 }

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Distance outside a building's footprint; the front gets extra room for the entrance area. */
function clearOfBuildings(x: number, z: number, margin: number, frontMargin = margin + 2): boolean {
  for (const s of worldProjectSlots) {
    const fp = ARCHETYPE_FOOTPRINT[s.archetype]
    const dx = x - s.position.x
    const dz = z - s.position.z
    const cos = Math.cos(s.rotation)
    const sin = Math.sin(s.rotation)
    const lx = dx * cos - dz * sin
    const lz = dx * sin + dz * cos
    const front = lz > 0 ? frontMargin : margin
    if (Math.abs(lx) < fp.width / 2 + margin && lz < fp.depth / 2 + front && lz > -fp.depth / 2 - margin) {
      return false
    }
  }
  return true
}

function clearOfPlaza(x: number, z: number, margin: number) {
  return Math.hypot(x - WORLD_HUB.x, z - WORLD_HUB.z) > PLAZA_RADIUS + margin
}

function build() {
  const rand = mulberry32(20240611)
  const trees: TreeSpot[] = []
  const stones: StoneSpot[] = []
  const patches: PatchSpot[] = []
  const tufts: SmallSpot[] = []
  const flowers: SmallSpot[] = []

  const farEnough = (x: number, z: number, min: number) =>
    trees.every((t) => Math.hypot(t.x - x, t.z - z) > min * (t.kind === 'shrub' ? 0.6 : 1))

  const tryTree = (x: number, z: number, kind: TreeKind, scale: number) => {
    const pathClear = kind === 'shrub' ? 1.05 : 1.7
    if (!clearOfPlaza(x, z, kind === 'shrub' ? 0.4 : 1.2)) return false
    if (!clearOfBuildings(x, z, kind === 'shrub' ? 0.35 : 0.9)) return false
    if (distanceToPaths({ x, z }) < pathClear) return false
    if (distanceToBenches(x, z) < (kind === 'shrub' ? 1.1 : 1.5)) return false
    if (!farEnough(x, z, kind === 'shrub' ? 1.1 : 2.1)) return false
    trees.push({ x, z, kind, scale, rot: rand() * Math.PI * 2, tint: Math.floor(rand() * 3) })
    return true
  }

  // Framing trees behind and beside every building.
  for (const s of worldProjectSlots) {
    const fp = ARCHETYPE_FOOTPRINT[s.archetype]
    const cos = Math.cos(s.rotation)
    const sin = Math.sin(s.rotation)
    const toWorld = (lx: number, lz: number) => ({
      x: s.position.x + lx * cos + lz * sin,
      z: s.position.z - lx * sin + lz * cos,
    })
    const spots: [number, number, TreeKind, number][] = [
      [-fp.width / 2 - 1.2, -fp.depth / 2 - 0.6, 'round', 1.05],
      [fp.width / 2 + 1.3, -fp.depth / 2 - 1.1, 'cypress', 1],
      [fp.width * 0.1, -fp.depth / 2 - 2.2, 'round', 1.2],
      [-fp.width / 2 - 0.7, fp.depth / 2 + 0.3, 'shrub', 0.8],
      [fp.width / 2 + 0.7, fp.depth / 2 + 0.2, 'shrub', 0.7],
    ]
    for (const [lx, lz, kind, sc] of spots) {
      const p = toWorld(lx, lz)
      tryTree(p.x, p.z, kind, sc * (0.9 + rand() * 0.2))
    }
  }

  // A shade tree and a shrub behind each scenic bench.
  for (const b of getPathBenches()) {
    if (!b.scenic) continue
    const fx = Math.sin(b.rot)
    const fz = Math.cos(b.rot)
    tryTree(b.x - fx * 1.7 + fz * 0.5, b.z - fz * 1.7 - fx * 0.5, 'round', 1.15)
    tryTree(b.x - fx * 1.25 - fz * 1.25, b.z - fz * 1.25 + fx * 1.25, 'shrub', 0.75)
  }

  // Foreground framing near the opening camera.
  const foreground: [number, number, TreeKind, number][] = [
    [-5.2, 4.6, 'round', 1.1],
    [5.6, 5.2, 'round', 1],
    [-3.6, 5.6, 'shrub', 0.9],
    [4, 4.2, 'shrub', 0.8],
    [-6.8, 1.4, 'cypress', 0.95],
    [7, 1.8, 'cypress', 1],
  ]
  for (const [x, z, kind, sc] of foreground) tryTree(x, z, kind, sc)

  // Loose scatter across the island, denser toward the edges.
  for (let i = 0; i < 900 && trees.length < 150; i++) {
    const angle = rand() * Math.PI * 2
    const r = 4 + Math.pow(rand(), 0.7) * 30
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r - 1
    const roll = rand()
    const kind: TreeKind = roll < 0.45 ? 'round' : roll < 0.7 ? 'cypress' : 'shrub'
    tryTree(x, z, kind, 0.8 + rand() * 0.45)
  }

  // Grass patches; paths are drawn on top so overlap reads as worn edges.
  for (let i = 0; i < 1400 && patches.length < 120; i++) {
    const angle = rand() * Math.PI * 2
    const r = 3.6 + Math.pow(rand(), 0.8) * 32
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r - 1
    const radius = 1.6 + rand() * 2.8
    if (!clearOfPlaza(x, z, radius * 0.35)) continue
    if (!clearOfBuildings(x, z, 0.1, 1)) continue
    if (patches.some((p) => Math.hypot(p.x - x, p.z - z) < (p.radius + radius) * 0.55)) continue
    patches.push({ x, z, radius, rot: rand() * Math.PI, seed: Math.floor(rand() * 1e6), deep: rand() > 0.6 })
  }

  // Each bed has one accent colour (1–4) mixed with white (0), so colours read as clusters.
  for (const [bed, p] of patches.entries()) {
    const accent = 1 + (bed % 4)
    const count = Math.round(p.radius * 4)
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2
      const rr = Math.sqrt(rand()) * p.radius * 0.75
      const x = p.x + Math.cos(a) * rr
      const z = p.z + Math.sin(a) * rr
      if (distanceToPaths({ x, z }) < 0.85 || distanceToBenches(x, z) < 0.9) continue
      if (rand() < 0.3) flowers.push({ x, z, scale: 0.7 + rand() * 0.6, tint: rand() > 0.4 ? accent : 0 })
      else tufts.push({ x, z, scale: 0.7 + rand() * 0.7, tint: Math.floor(rand() * 2) })
    }
  }

  // Stones: some edging the paths, some resting in the grass.
  for (const b of getPathBranches('project')) {
    for (let i = 6; i < b.render.length - 6; i += 9) {
      if (rand() > 0.42) continue
      const p = b.render[i]
      const q = b.render[i + 1]
      const tx = q.x - p.x
      const tz = q.z - p.z
      const len = Math.hypot(tx, tz) || 1
      const side = rand() > 0.5 ? 1 : -1
      const off = 0.82 + rand() * 0.25
      const x = p.x + (-tz / len) * off * side
      const z = p.z + (tx / len) * off * side
      if (distanceToPaths({ x, z }) < 0.72 || distanceToBenches(x, z) < 1) continue
      if (!clearOfBuildings(x, z, 0.2, 0.6) || !clearOfPlaza(x, z, 0.3)) continue
      stones.push({ x, z, scale: 0.6 + rand() * 0.6, rot: rand() * Math.PI })
    }
  }
  for (let i = 0; i < 300 && stones.length < 90; i++) {
    const angle = rand() * Math.PI * 2
    const r = 4 + rand() * 28
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    if (distanceToPaths({ x, z }) < 1 || distanceToBenches(x, z) < 1) continue
    if (!clearOfBuildings(x, z, 0.3) || !clearOfPlaza(x, z, 0.4)) continue
    stones.push({ x, z, scale: 0.5 + rand() * 1.1, rot: rand() * Math.PI })
  }

  // Distant low hills give the horizon depth.
  const hills: HillSpot[] = []
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2 + rand() * 0.2
    const r = 40 + rand() * 14
    hills.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r - 4,
      rx: 8 + rand() * 9,
      ry: 2 + rand() * 3.5,
      rz: 6 + rand() * 6,
      tint: Math.floor(rand() * 3),
    })
  }

  const lamps: PropSpot[] = []
  const lampsAlong = (scope: 'project' | 'location', clear: (x: number, z: number) => boolean) => {
    for (const b of getPathBranches(scope)) {
      const pts = b.render
      for (let i = 22; i < pts.length - 10; i += 26) {
        const p = pts[i]
        const q = pts[i + 1]
        const tx = q.x - p.x
        const tz = q.z - p.z
        const len = Math.hypot(tx, tz) || 1
        const side = (i / 26) % 2 ? 1 : -1
        const x = p.x + (-tz / len) * 0.95 * side
        const z = p.z + (tx / len) * 0.95 * side
        if (!clear(x, z)) continue
        if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 3)) continue
        lamps.push({ x, z, rot: 0 })
      }
    }
  }
  lampsAlong('project', (x, z) => distanceToPaths({ x, z }) >= 0.8 && distanceToBenches(x, z) >= 1.4 && clearOfBuildings(x, z, 0.3, 0.8))
  const projectLamps = lamps.length
  lampsAlong(
    'location',
    (x, z) =>
      distanceToAnyPath({ x, z }) >= 0.8 &&
      distanceToAnyBench(x, z) >= 1.4 &&
      clearOfBuildings(x, z, 0.3, 0.8) &&
      clearOfLocations(x, z, 0.3, 0.8) &&
      clearOfPlaza(x, z, 0.4),
  )

  // Cleared afterwards rather than during placement, so the rest of the seeded layout is unchanged.
  const offPond = (p: { x: number; z: number }) => Math.hypot(p.x - WORLD_POND.x, p.z - WORLD_POND.z) > WORLD_POND.radius + 0.55
  const clearOf = (pathClear: number, margin: number, front = margin + 1.6) => (p: { x: number; z: number }) =>
    offPond(p) && distanceToAnyPath(p, 'location') >= pathClear && clearOfLocations(p.x, p.z, margin, front)
  // Crowns stand well clear of a studio front, so its facade reads from the path.
  const treeClear = (t: TreeSpot) =>
    t.kind === 'shrub'
      ? clearOf(1.05, 0.9, 3.2)(t)
      : clearOf(1.7, 1.1, 4.2)(t) && viewpointSightline(t)
  return {
    trees: [...trees.filter(treeClear), ...viewpointPlanting()],
    stones: stones.filter(clearOf(0.72, 0.3)),
    patches,
    tufts: tufts.filter(clearOf(0.6, 0.1)),
    flowers: flowers.filter(clearOf(0.6, 0.1)),
    hills,
    lamps: [...lamps.slice(0, projectLamps).filter(clearOf(0.8, 0.3)), ...lamps.slice(projectLamps)],
  }
}

/** Outside the studios (with extra room at their fronts) and the viewpoint clearing. */
function clearOfLocations(x: number, z: number, margin: number, frontMargin = margin + 2): boolean {
  for (const l of STUDIO_LOCATIONS) {
    const fp = l.footprint!
    const dx = x - l.position.x
    const dz = z - l.position.z
    const cos = Math.cos(l.rotation)
    const sin = Math.sin(l.rotation)
    const lx = dx * cos - dz * sin
    const lz = dx * sin + dz * cos
    const front = lz > 0 ? frontMargin : margin
    if (Math.abs(lx) < fp.width / 2 + margin && lz < fp.depth / 2 + front && lz > -fp.depth / 2 - margin) return false
  }
  for (const l of WORLD_LOCATIONS) {
    if (l.type === 'viewpoint' && Math.hypot(x - l.position.x, z - l.position.z) < (l.radius ?? 0) + margin) return false
  }
  return true
}

/** Trees never stand in the view from the viewpoint bench back over the town. */
function viewpointSightline(p: { x: number; z: number }) {
  const dx = p.x - VIEWPOINT.position.x
  const dz = p.z - VIEWPOINT.position.z
  const d = Math.hypot(dx, dz)
  if (d > 11) return true
  const ahead = (dx * Math.sin(VIEWPOINT.rotation) + dz * Math.cos(VIEWPOINT.rotation)) / (d || 1)
  return ahead < Math.cos(0.75)
}

/** Low planting around the viewpoint bench; nothing tall behind it, so the sky overhead stays open. */
function viewpointPlanting(): TreeSpot[] {
  const at = (lx: number, lz: number) => locationToWorld(VIEWPOINT, lx, lz)
  const spots: [number, number, TreeKind, number, number][] = [
    [-1.1, -1.5, 'shrub', 0.65, 1],
    [1.6, -1.1, 'shrub', 0.85, 0],
    [-1.75, -0.35, 'shrub', 0.7, 2],
    [-3.1, 0.7, 'cypress', 1.05, 1],
  ]
  return spots.map(([lx, lz, kind, scale, tint], i) => ({ ...at(lx, lz), kind, scale, rot: i * 1.7, tint }))
}

let scenery: ReturnType<typeof build> | null = null

export function getWorldScenery() {
  if (!scenery) scenery = build()
  return scenery
}
