import type { Project } from './projects'
import { CONTACT_POSITION, getWorldSlot, WORLD_SPAWN } from './worldLayout'

export const characterSpawn = WORLD_SPAWN

export const contactWorld = CONTACT_POSITION

export const territoryMood: Record<string, { fog: string; ambient: number }> = {
  branding: { fog: '#f2efe9', ambient: 0.82 },
  editorial: { fog: '#f0ece6', ambient: 0.8 },
  digital: { fog: '#eeebe5', ambient: 0.78 },
  print: { fog: '#f1ede8', ambient: 0.81 },
  experiments: { fog: '#efebe4', ambient: 0.79 },
}

export function getProjectWorld3(project: Project) {
  const slot = getWorldSlot(project.slug)
  if (slot) return { x: slot.position.x, y: slot.position.y, z: slot.position.z }
  return { x: 0, y: 0, z: -8 }
}
