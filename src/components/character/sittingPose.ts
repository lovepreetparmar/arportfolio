import * as THREE from 'three'
import type { CharacterRigRefs } from './useCharacterRefs'

/**
 * Relaxed seated pose in rig space (the rig is scaled 0.86, so the 0.4 m bench seat is ~0.465 here).
 * Thighs slope gently to the knees, shins drop with feet flat, forearms rest on the lap.
 */
const SEATED = {
  hipsY: 0.5,
  spineLean: -0.07,
  thigh: -1.3,
  thighSplay: 0.05,
  knee: 1.2,
  upperArm: -0.32,
  upperArmIn: 0.1,
  elbow: -0.62,
  headTilt: 0.06,
}

const { lerp, smoothstep } = THREE.MathUtils

function smootherstep(x: number) {
  const t = THREE.MathUtils.clamp(x, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Blends the standing/idle pose the controller already applied toward the seated pose.
 * `amount` is the raw sit progress (0 standing → 1 seated); `seatedIdle` fades in the settled micro-motion.
 */
export function applySittingPose(refs: CharacterRigRefs, amount: number, t: number, seatedIdle: number) {
  if (amount <= 0) {
    if (refs.leftKnee.current) refs.leftKnee.current.rotation.x = 0
    if (refs.rightKnee.current) refs.rightKnee.current.rotation.x = 0
    if (refs.leftHand.current) refs.leftHand.current.rotation.x = 0
    if (refs.rightHand.current) refs.rightHand.current.rotation.x = 0
    return
  }

  const body = smootherstep(amount)
  const arms = smoothstep(amount, 0.15, 1)
  // People fold forward over their knees on the way down and back up.
  const fold = Math.sin(Math.PI * body) * 0.32

  const shift = Math.sin(t * 0.31) * seatedIdle
  const glance = Math.sin(t * 0.17) * Math.max(0, Math.sin(t * 0.43)) * seatedIdle
  const settle = Math.sin(t * 0.27) * seatedIdle

  if (refs.hips.current) refs.hips.current.position.y = lerp(refs.hips.current.position.y, SEATED.hipsY, body)
  if (refs.spine.current) {
    refs.spine.current.rotation.x = lerp(refs.spine.current.rotation.x, SEATED.spineLean, body) + fold
    refs.spine.current.rotation.z = shift * 0.022
  }

  const legs: [CharacterRigRefs['leftLeg'], CharacterRigRefs['leftKnee'], number][] = [
    [refs.leftLeg, refs.leftKnee, -1],
    [refs.rightLeg, refs.rightKnee, 1],
  ]
  for (const [leg, knee, side] of legs) {
    if (leg.current) {
      leg.current.rotation.x = lerp(leg.current.rotation.x, SEATED.thigh + settle * side * 0.025, body)
      leg.current.rotation.z = SEATED.thighSplay * side * body
    }
    if (knee.current) knee.current.rotation.x = (SEATED.knee - settle * side * 0.03) * body
  }

  const armsSet: [CharacterRigRefs['leftArm'], CharacterRigRefs['leftHand'], number][] = [
    [refs.leftArm, refs.leftHand, -1],
    [refs.rightArm, refs.rightHand, 1],
  ]
  for (const [arm, hand, side] of armsSet) {
    if (arm.current) {
      arm.current.rotation.x = lerp(arm.current.rotation.x, SEATED.upperArm, arms)
      arm.current.rotation.z = -side * SEATED.upperArmIn * arms
    }
    if (hand.current) hand.current.rotation.x = (SEATED.elbow + shift * side * 0.04) * arms
  }

  if (refs.head.current) {
    refs.head.current.rotation.x += SEATED.headTilt * body
    refs.head.current.rotation.y += glance * 0.22
  }
}
