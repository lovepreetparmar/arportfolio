import type { AnimationClip, Object3D } from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { isBlockedClipName } from './animationResolver'
import { stripRootMotionFromClip } from './stripRootMotion'

export function buildCharacterClips(
  model: Object3D,
  characterAnims: AnimationClip[],
  locoScene: Object3D,
  locoAnims: AnimationClip[],
): AnimationClip[] {
  const list: AnimationClip[] = []
  const add = (clip: AnimationClip, preferredName?: string, stripRoot = false) => {
    let c = clip.clone()
    if (stripRoot) c = stripRootMotionFromClip(c)
    if (preferredName) c.name = preferredName
    if (isBlockedClipName(c.name)) return
    if (list.some((x) => x.name === c.name)) return
    list.push(c)
  }

  for (const clip of characterAnims) {
    const n = clip.name.toLowerCase()
    if (n.includes('idle') && !isBlockedClipName(clip.name)) add(clip, 'Idle')
    if (n.includes('walk') && !n.includes('back')) add(clip, 'Walk', true)
  }

  try {
    model.updateMatrixWorld(true)
    const idle = locoAnims.find((a) => a.name === 'Idle')
    const walk = locoAnims.find((a) => a.name === 'Walk')
    if (idle && !list.some((c) => c.name === 'Idle')) {
      add(SkeletonUtils.retargetClip(model, locoScene, idle), 'Idle', true)
    }
    if (walk && !list.some((c) => c.name === 'Walk')) {
      add(SkeletonUtils.retargetClip(model, locoScene, walk), 'Walk', true)
    }
  } catch (e) {
    console.warn('[Character] Locomotion retarget failed:', e)
  }

  if (!list.some((c) => c.name === 'Idle')) {
    const dance = characterAnims.find((a) => {
      const n = a.name.toLowerCase()
      return n.includes('samba') || n.includes('dance') || n.includes('layer0')
    })
    if (dance) {
      const c = dance.clone()
      c.name = 'Idle'
      list.push(c)
    }
  }

  return list
}
