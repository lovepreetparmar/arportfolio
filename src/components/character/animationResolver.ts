import type { AnimationAction, AnimationClip } from 'three'

const BLOCKED = ['tpose', 't-pose', 'bind', 'rest', 'samba', 'dance', 'layer0']

export function isBlockedClipName(name: string) {
  const n = name.toLowerCase()
  return BLOCKED.some((b) => n.includes(b))
}

export function findAnimationAction(
  actions: Record<string, AnimationAction | null | undefined>,
  keywords: string[],
): AnimationAction | null {
  const entries = Object.entries(actions).filter(([, a]) => a)
  for (const keyword of keywords) {
    const k = keyword.toLowerCase()
    const hit = entries.find(([name]) => name.toLowerCase().includes(k) && !isBlockedClipName(name))
    if (hit) return hit[1]!
  }
  return null
}

export function logCharacterAnimationsOnce(clips: AnimationClip[], label: string) {
  if (!import.meta.env.DEV) return
  const key = `__logged_${label}`
  const g = globalThis as unknown as Record<string, boolean>
  if (g[key]) return
  g[key] = true
  console.log(`[Character] ${label} — animation count:`, clips.length)
  clips.forEach((clip) => {
    console.log(`  • ${clip.name} (${clip.duration.toFixed(2)}s, ${clip.tracks.length} tracks)`)
  })
}
