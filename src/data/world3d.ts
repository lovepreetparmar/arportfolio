import type { Project } from './projects'
import { getWorldSlot, WORLD_SPAWN } from './worldLayout'

export const characterSpawn = WORLD_SPAWN

export function getProjectWorld3(project: Project) {
  const slot = getWorldSlot(project.slug)
  if (slot) return { x: slot.position.x, y: slot.position.y, z: slot.position.z }
  return { x: 0, y: 0, z: -8 }
}
