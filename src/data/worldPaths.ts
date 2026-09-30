import * as THREE from 'three'
import { projects } from './projects'
import { getProjectEntrance } from './projectWorld'
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
  /** Dense samples for drawing, extended to the door. */
  render: THREE.Vector3[]
  /** Walk waypoints (~0.8 m apart) ending exactly at the entrance. */
  walk: XZ[]
}

let branches: PathBranch[] | null = null

export function getPathBranches(): PathBranch[] {
  if (branches) return branches
  branches = projects.map((project) => {
    const entrance = getProjectEntrance(project)
    const facing = { x: Math.sin(entrance.doorYaw), z: Math.cos(entrance.doorYaw) }
    const door = {
      x: entrance.x - facing.x * ENTRANCE_CLEARANCE,
      z: entrance.z - facing.z * ENTRANCE_CLEARANCE,
    }
    const controls = [
      new THREE.Vector3(WORLD_HUB.x, 0, WORLD_HUB.z),
      ...(VIA[project.slug] ?? []).map(([x, z]) => new THREE.Vector3(x, 0, z)),
      new THREE.Vector3(entrance.x, 0, entrance.z),
    ]
    const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal')
    const length = curve.getLength()
    const render = curve.getSpacedPoints(Math.max(8, Math.ceil(length / 0.25)))
    render.push(new THREE.Vector3(door.x, 0, door.z))
    const walk = curve
      .getSpacedPoints(Math.max(2, Math.ceil(length / 0.8)))
      .map((p) => ({ x: p.x, z: p.z }))
    walk[walk.length - 1] = { x: entrance.x, z: entrance.z }
    return { slug: project.slug, render, walk }
  })
  return branches
}

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z)

/** Distance from a point to the nearest drawn path sample. */
export function distanceToPaths(p: XZ): number {
  let best = Infinity
  for (const b of getPathBranches()) {
    for (const s of b.render) {
      const d = Math.hypot(p.x - s.x, p.z - s.z)
      if (d < best) best = d
    }
  }
  return best
}

/**
 * Waypoints that follow the path network from `from` to the project's entrance:
 * join the nearest path, walk it back toward the plaza, then out along the target branch,
 * shortcutting wherever the two share a trunk.
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
  if (route.length > 1 && dist(from, route[0]) < 0.5) route = route.slice(1)
  return route.map((p) => ({ x: p.x, y: 0, z: p.z }))
}
