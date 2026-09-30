import * as THREE from 'three'
import type { AnimationClip, Object3D } from 'three'

const ROOT_BONE_HINTS = ['hips', 'root', 'pelvis', 'mixamorighips', 'armature']

function isRootMotionTrack(trackName: string): boolean {
  if (!trackName.endsWith('.position')) return false
  const bone = trackName.split('.')[0]?.toLowerCase() ?? ''
  return ROOT_BONE_HINTS.some((h) => bone.includes(h))
}

/** Keep limb animation; remove hip/root translation so world movement stays on the character group. */
export function stripRootMotionFromClip(clip: AnimationClip): AnimationClip {
  const cloned = clip.clone()
  cloned.tracks = cloned.tracks.filter((track) => !isRootMotionTrack(track.name))
  return cloned
}

export function stripRootMotionFromClips(clips: AnimationClip[]): AnimationClip[] {
  return clips.map(stripRootMotionFromClip)
}

export function logRootBones(model: Object3D) {
  if (!import.meta.env.DEV) return
  const bones: string[] = []
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.push(o.name)
  })
  console.log('[Character] Skeleton bones (sample):', bones.slice(0, 12))
}
