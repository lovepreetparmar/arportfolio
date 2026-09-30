import type { Project } from './projects'
import { CONTACT_POSITION, getWorldSlot, WORLD_SPAWN } from './worldLayout'

export const characterSpawn = WORLD_SPAWN

export const contactWorld = CONTACT_POSITION

export const territoryMood: Record<string, { fog: string; ambient: number }> = {
  branding: { fog: '#efe8dc', ambient: 0.95 },
  editorial: { fog: '#eee7db', ambient: 0.93 },
  digital: { fog: '#ede7dc', ambient: 0.92 },
  print: { fog: '#efe8dd', ambient: 0.94 },
  experiments: { fog: '#efe7da', ambient: 0.93 },
}

export function getProjectWorld3(project: Project) {
  const slot = getWorldSlot(project.slug)
  if (slot) return { x: slot.position.x, y: slot.position.y, z: slot.position.z }
  return { x: 0, y: 0, z: -8 }
}
