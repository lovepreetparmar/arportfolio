import type { Object3D } from 'three'
import { findBone } from './findBone'
/** Last-resort: pull arms down when no animation clip is available. */
export function applyProceduralRestPose(model: Object3D, strength = 1) {
  const leftArm = findBone(model, ['mixamorigLeftArm', 'LeftArm', 'upperarm_l'])
  const rightArm = findBone(model, ['mixamorigRightArm', 'RightArm', 'upperarm_r'])
  const leftFore = findBone(model, ['mixamorigLeftForeArm', 'LeftForeArm'])
  const rightFore = findBone(model, ['mixamorigRightForeArm', 'RightForeArm'])

  if (leftArm) {
    leftArm.rotation.z = 1.15 * strength
    leftArm.rotation.x = 0.08 * strength
  }
  if (rightArm) {
    rightArm.rotation.z = -1.15 * strength
    rightArm.rotation.x = 0.08 * strength
  }
  if (leftFore) leftFore.rotation.y = 0.25 * strength
  if (rightFore) rightFore.rotation.y = -0.25 * strength
}
