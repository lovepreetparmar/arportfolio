import * as THREE from 'three'
import { projects } from './projects'
import { getProjectEntrance } from './projectWorld'
import { getPlaceEntrance, LANDMARK, WORLD_LOCATIONS } from './worldLocations'
import { ENTRANCE_CLEARANCE, WORLD_HUB } from './worldLayout'

type XZ = { x: number; z: number }

/** Hand-placed bends between the plaza and each entrance, chosen to keep paths clear of buildings. */
const VIA: Record<string, [number, number][]> = {
  'food-creatives': [[-1.8, -2.6]],
  'roshan-shah': [[2, -2.8]],
  'brand-identity': [
    [0.3, -4.5],
    [-0.2, -8],
  ],
  'adventure-website': [
    [0.3, -4.5],
    [-2.4, -10.2],
    [-6.4, -14],
  ],
  billboards: [
    [0.3, -4.5],
    [2.4, -10.2],
    [6.6, -14],
  ],
  'brand-with-a-heart': [
    [-3.2, 0.4],
    [-7.5, -1.6],
  ],
  'company-portfolio': [
    [3.2, 0.2],
    [7.8, -1.2],
  ],
  timbs: [
    [-3.2, 0.6],
    [-8, 3.8],
  ],
  'social-media': [
    [3.2, 0.6],
    [8, 4.2],
  ],
  invitation: [
    [-1.8, 3],
    [-4.5, 8],
  ],
  'real-estate': [
    [1.8, 3],
    [4.8, 8.5],
  ],
  'book-cover': [
    [0.2, 4],
    [-0.5, 10],
  ],
}

export type PathBranch = {
  slug: string
  /** Project paths were laid first; the scenery's seeded scatter is planned around those alone. */
  kind: 'project' | 'location'
  /** Dense samples for drawing, extended to the door. */
  render: THREE.Vector3[]
  /** Walk waypoints (~0.8 m apart) ending exactly at the entrance. */
  walk: XZ[]
}

export type PathScope = 'all' | 'project' | 'location'

function buildBranch(slug: string, kind: PathBranch['kind'], via: [number, number][], end: XZ, door: XZ | null): PathBranch {
  const controls = [
    new THREE.Vector3(WORLD_HUB.x, 0, WORLD_HUB.z),
    ...via.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    new THREE.Vector3(end.x, 0, end.z),
  ]
  const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal')
  const length = curve.getLength()
  const render = curve.getSpacedPoints(Math.max(8, Math.ceil(length / 0.25)))
  if (door) render.push(new THREE.Vector3(door.x, 0, door.z))
  const walk = curve
    .getSpacedPoints(Math.max(2, Math.ceil(length / 0.8)))
    .map((p) => ({ x: p.x, z: p.z }))
  walk[walk.length - 1] = { x: end.x, z: end.z }
  return { slug, kind, render, walk }
}

function doorBehind(entrance: { x: number; z: number; doorYaw: number }): XZ {
  return {
    x: entrance.x - Math.sin(entrance.doorYaw) * ENTRANCE_CLEARANCE,
    z: entrance.z - Math.cos(entrance.doorYaw) * ENTRANCE_CLEARANCE,
  }
}

let branches: PathBranch[] | null = null

export function getPathBranches(scope: PathScope = 'all'): PathBranch[] {
  if (!branches) {
    const projectBranches = projects.map((project) => {
      const entrance = getProjectEntrance(project)
      return buildBranch(project.slug, 'project', VIA[project.slug] ?? [], entrance, doorBehind(entrance))
    })
    const locationBranches = WORLD_LOCATIONS.flatMap((l) => {
      const entrance = getPlaceEntrance(l.id)
      if (!l.via || !entrance) return []
      return [buildBranch(l.id, 'location', l.via, entrance, l.footprint ? doorBehind(entrance) : null)]
    })
    branches = [...projectBranches, ...locationBranches]
  }
  return scope === 'all' ? branches : branches.filter((b) => b.kind === scope)
}

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z)

/** Distance from a point to the nearest drawn path sample. */
export function distanceToPaths(p: XZ, scope: PathScope = 'all'): number {
  let best = Infinity
  for (const b of getPathBranches(scope)) {
    for (const s of b.render) {
      const d = Math.hypot(p.x - s.x, p.z - s.z)
      if (d < best) best = d
    }
  }
  return best
}

/** Walking ring around the landmark: clear of its rim, inside the plaza benches. */
const DETOUR_RADIUS = (LANDMARK.radius ?? 1.5) + 0.55
const ARC_STEP = 0.7

function segmentDistance(c: XZ, a: XZ, b: XZ) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len2 = dx * dx + dz * dz
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((c.x - a.x) * dx + (c.z - a.z) * dz) / len2)) : 0
  return Math.hypot(a.x + dx * t - c.x, a.z + dz * t - c.z)
}

/** Every path meets at the plaza centre, where the landmark stands: walk round it instead of through. */
function detourLandmark(from: XZ, route: XZ[]): XZ[] {
  const c = LANDMARK.position
  const pts = [from, ...route.filter((p, i) => i === route.length - 1 || dist(p, c) >= DETOUR_RADIUS)]
  const out: XZ[] = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (segmentDistance(c, a, b) < DETOUR_RADIUS - 0.05) {
      const a0 = Math.atan2(a.z - c.z, a.x - c.x)
      const a1 = Math.atan2(b.z - c.z, b.x - c.x)
      const sweep = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))
      const steps = Math.max(1, Math.ceil((Math.abs(sweep) * DETOUR_RADIUS) / ARC_STEP))
      for (let k = 0; k <= steps; k++) {
        const t = a0 + (sweep * k) / steps
        out.push({ x: c.x + Math.cos(t) * DETOUR_RADIUS, z: c.z + Math.sin(t) * DETOUR_RADIUS })
      }
    }
    out.push(b)
  }
  return out
}

/** Waypoints for a free walk to `to`: round the landmark, and never into its pool. */
export function walkAround(from: XZ, to: XZ): { x: number; y: number; z: number }[] {
  const c = LANDMARK.position
  const keep = (LANDMARK.radius ?? 1.5) + 0.3
  const d = dist(to, c)
  let end = to
  if (d < keep) {
    const a = d > 1e-3 ? Math.atan2(to.z - c.z, to.x - c.x) : Math.atan2(from.z - c.z, from.x - c.x)
    end = { x: c.x + Math.cos(a) * keep, z: c.z + Math.sin(a) * keep }
  }
  return detourLandmark(from, [end]).map((p) => ({ x: p.x, y: 0, z: p.z }))
}

/**
 * Waypoints that follow the path network from `from` to a place's entrance:
 * join the nearest path, walk it back toward the plaza, then out along the target branch,
 * shortcutting wherever the two share a trunk, and round the landmark rather than through it.
 */
export function planRoute(from: XZ, slug: string): { x: number; y: number; z: number }[] {
  const all = getPathBranches()
  const target = all.find((b) => b.slug === slug)
  if (!target) return []

  let nearBranch = target
  let nearIndex = 0
  let nearDist = Infinity
  for (const b of all) {
    b.walk.forEach((p, i) => {
      const d = dist(from, p)
      if (d < nearDist) {
        nearDist = d
        nearBranch = b
        nearIndex = i
      }
    })
  }

  let route: XZ[]
  if (nearBranch === target) {
    route = target.walk.slice(nearIndex)
  } else {
    const back = nearBranch.walk.slice(0, nearIndex + 1).reverse()
    const out = target.walk.slice(1)
    route = [...back, ...out]
    outer: for (let j = 0; j < back.length; j++) {
      for (let k = out.length - 1; k >= 0; k--) {
        if (dist(back[j], out[k]) < 0.9) {
          route = [...back.slice(0, j + 1), ...out.slice(k + 1)]
          break outer
        }
      }
    }
  }

  const entrance = target.walk[target.walk.length - 1]
  if (route.length === 0 || route[route.length - 1] !== entrance) route.push(entrance)
  route = detourLandmark(from, route)
  if (route.length > 1 && dist(from, route[0]) < 0.5) route = route.slice(1)
  return route.map((p) => ({ x: p.x, y: 0, z: p.z }))
}
