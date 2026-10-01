import * as THREE from 'three'
import type { CharacterRigRefs } from './useCharacterRefs'
import { WALK_SPEED } from './CharacterAnimations'

/**
 * World distance (m) for one full left-right step cycle at full speed.
 * Tuned with WALK_SPEED so feet do not skate at gait ≈ 1.
 */
export const WALK_STRIDE_LENGTH = (WALK_SPEED * Math.PI * 2) / 10.78

export type WalkLegAngles = {
  thighX: number
  thighZ: number
  kneeX: number
}

/** One leg; `phase` is shared walk phase, opposite leg uses phase + π. */
export function walkLegAngles(phase: number, gait: number): WalkLegAngles {
  const g = THREE.MathUtils.clamp(gait, 0, 1)
  if (g < 0.001) return { thighX: 0, thighZ: 0, kneeX: 0 }

  const s = Math.sin(phase)
  const c = Math.cos(phase)

  const thighX = s * 0.46 * g
  const thighZ = s * 0.028 * g

  const swingLift = Math.max(0, Math.sin(phase + 0.55))
  const passing = Math.max(0, -c)
  const stanceFlex = 0.1 + 0.14 * passing
  const kneeX = (stanceFlex + 0.5 * swingLift * (0.35 + 0.65 * Math.max(0, s))) * g

  return { thighX, thighZ, kneeX }
}

export function advanceWalkPhase(phase: number, speed: number, delta: number) {
  if (speed < 0.01 || delta <= 0) return phase
  const stride = Math.max(WALK_STRIDE_LENGTH * 0.55, WALK_STRIDE_LENGTH)
  return phase + (speed * delta / stride) * Math.PI * 2
}

/**
 * Procedural relaxed walk layered on the rig. `gait` is 0 (idle) → 1 (full walk).
 */
export function applyWalkPose(refs: CharacterRigRefs, phase: number, gait: number) {
  const g = THREE.MathUtils.clamp(gait, 0, 1)
  const left = walkLegAngles(phase, g)
  const right = walkLegAngles(phase + Math.PI, g)

  if (refs.leftLeg.current) {
    refs.leftLeg.current.rotation.x = left.thighX
    refs.leftLeg.current.rotation.z = left.thighZ
  }
  if (refs.rightLeg.current) {
    refs.rightLeg.current.rotation.x = right.thighX
    refs.rightLeg.current.rotation.z = -right.thighZ
  }
  if (refs.leftKnee.current) refs.leftKnee.current.rotation.x = left.kneeX
  if (refs.rightKnee.current) refs.rightKnee.current.rotation.x = right.kneeX

  const armSwing = Math.sin(phase) * 0.42 * g
  if (refs.leftArm.current) refs.leftArm.current.rotation.x = -armSwing
  if (refs.rightArm.current) refs.rightArm.current.rotation.x = armSwing

  const elbow = (v: number) => (-0.12 - 0.22 * Math.max(0, -v)) * g
  if (refs.leftHand.current) refs.leftHand.current.rotation.x = elbow(armSwing)
  if (refs.rightHand.current) refs.rightHand.current.rotation.x = elbow(-armSwing)

  if (refs.hips.current && g > 0.01) {
    const bounce = Math.abs(Math.sin(phase)) * 0.042 * g
    const twist = Math.sin(phase) * 0.035 * g
    refs.hips.current.position.y = 0.82 + bounce
    refs.hips.current.rotation.x = twist * 0.35
  }

  if (refs.spine.current && g > 0.01) {
    const sway = Math.sin(phase) * 0.028 * g
    refs.spine.current.rotation.x += sway
    refs.spine.current.rotation.y = Math.sin(phase + Math.PI * 0.5) * 0.04 * g
  }

  if (refs.chest.current && g > 0.01) {
    const counter = Math.sin(phase + Math.PI) * 0.032 * g
    refs.chest.current.rotation.y = counter
    refs.chest.current.rotation.x += Math.sin(phase) * 0.018 * g
  }

  if (refs.leftShoulder.current) refs.leftShoulder.current.rotation.z = -0.04 * g - Math.max(0, armSwing) * 0.06
  if (refs.rightShoulder.current) refs.rightShoulder.current.rotation.z = 0.04 * g + Math.max(0, -armSwing) * 0.06
}
