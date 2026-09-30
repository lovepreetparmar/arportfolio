import type { Vec3 } from '../context/WorldStateContext'

export const ARRIVAL_THRESHOLD = 0.38

export function horizontalDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function travelSpeedForDistance(dist: number): number {
  if (dist > 12) return 1.15
  if (dist > 6) return 1
  return 0.85
}
