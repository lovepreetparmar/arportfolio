export const CHARACTER_MODEL_URL = '/models/anushri-character.glb'
export const CHARACTER_LOCOMOTION_URL = '/models/locomotion-source.glb'

/** Target height in world units (~1.65m). */
export const CHARACTER_TARGET_HEIGHT = 1.62

export const ANIM = {
  idle: ['Idle', 'idle', 'standing', 'stand', 'samba', 'dance', 'layer0'],
  walk: ['Walk', 'walk', 'walking'],
  point: ['agree', 'Point', 'point'],
  read: ['sad_pose', 'Read', 'read'],
  inspect: ['headShake', 'Inspect', 'inspect'],
} as const

export const BONE_NAMES = {
  head: ['mixamorigHead', 'Head', 'head'],
  neck: ['mixamorigNeck', 'Neck', 'neck'],
  spine: ['mixamorigSpine2', 'mixamorigSpine1', 'Spine2', 'spine'],
  hips: ['mixamorigHips', 'Hips', 'hips'],
  leftHand: ['mixamorigLeftHand', 'LeftHand'],
  rightHand: ['mixamorigRightHand', 'RightHand'],
}
