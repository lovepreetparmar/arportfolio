import * as THREE from 'three'
import { damp } from './CharacterAnimations'

export type LookBones = {
  head?: THREE.Object3D | null
  neck?: THREE.Object3D | null
  spine?: THREE.Object3D | null
}

export type LookState = {
  headX: number
  headY: number
  neckY: number
  spineY: number
  eyeX: number
  eyeY: number
}

export function createLookState(): LookState {
  return { headX: 0, headY: 0, neckY: 0, spineY: 0, eyeX: 0, eyeY: 0 }
}

export function applyLookAt(
  bones: LookBones,
  state: LookState,
  target: { x: number; y: number; z: number } | null,
  bodyYaw: number,
  pointer: { x: number; y: number },
  characterPos: THREE.Vector3,
  delta: number,
  reduced: boolean,
  priorityArtwork: boolean,
) {
  let headY = 0
  let headX = 0
  let neckY = 0
  let spineY = 0
  let eyeX = 0
  let eyeY = 0

  if (priorityArtwork && target) {
    const dx = target.x - characterPos.x
    const dz = target.z - characterPos.z
    const yaw = Math.atan2(dx, dz) - bodyYaw
    headY = THREE.MathUtils.clamp(yaw, -0.35, 0.35)
    neckY = headY * 0.45
    spineY = headY * 0.15
    headX = 0.06
  } else if (!reduced) {
    headY = THREE.MathUtils.clamp(pointer.x * 0.12, -0.12, 0.12)
    headX = THREE.MathUtils.clamp(-pointer.y * 0.07, -0.06, 0.06)
    eyeX = pointer.x * 0.018
    eyeY = pointer.y * 0.012
  }

  state.headY = damp(state.headY, headY, 7, delta)
  state.headX = damp(state.headX, headX, 7, delta)
  state.neckY = damp(state.neckY, neckY, 6, delta)
  state.spineY = damp(state.spineY, spineY, 5, delta)
  state.eyeX = damp(state.eyeX, eyeX, 10, delta)
  state.eyeY = damp(state.eyeY, eyeY, 10, delta)

  if (bones.head) {
    bones.head.rotation.y = state.headY
    bones.head.rotation.x = state.headX
  }
  if (bones.neck) bones.neck.rotation.y = state.neckY
  if (bones.spine) bones.spine.rotation.y = state.spineY
}
