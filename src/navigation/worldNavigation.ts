import type { Project } from '../data/projects'
import { getProjectWorld3 } from '../data/world3d'
import type { Vec3 } from '../context/WorldStateContext'
import { getRegisteredProjectWorldPosition } from './projectWorldRegistry'

export const ARRIVAL_THRESHOLD = 0.15
export const PROJECT_APPROACH_DISTANCE = 2.2
export const MAX_TRAVEL_TIME = 8
export const BASE_WALK_SPEED = 1.0

export function getProjectWorldPosition(project: Project): Vec3 {
  const live = getRegisteredProjectWorldPosition(project.slug)
  if (live) {
    return { x: live.x, y: 0, z: live.z }
  }
  const w = getProjectWorld3(project)
  return { x: w.x, y: 0, z: w.z }
}

/** Stop short of the project so the character faces artwork. */
export function getCharacterDestination(project: Project, from: Vec3): Vec3 {
  const center = getProjectWorldPosition(project)
  const dx = from.x - center.x
  const dz = from.z - center.z
  const len = Math.hypot(dx, dz)
  const nx = len > 0.05 ? dx / len : 0
  const nz = len > 0.05 ? dz / len : 1
  return {
    x: center.x + nx * PROJECT_APPROACH_DISTANCE,
    y: 0,
    z: center.z + nz * PROJECT_APPROACH_DISTANCE,
  }
}

export function horizontalDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

export function travelSpeedForDistance(distance: number): number {
  const minSpeed = BASE_WALK_SPEED
  const maxSpeed = BASE_WALK_SPEED * 2.4
  const t = Math.min(1, distance / (MAX_TRAVEL_TIME * BASE_WALK_SPEED))
  return minSpeed + (maxSpeed - minSpeed) * t
}

export function logNavigationStep(label: string, data: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  console.log(`[Navigation] ${label}`, data)
}
