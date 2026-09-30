import * as THREE from 'three'
import { dampAngle } from './CharacterAnimations'
import { ARRIVAL_THRESHOLD, travelSpeedForDistance } from '../../navigation/worldNavigation'

export type MovementResult = {
  position: THREE.Vector3
  isWalking: boolean
  bodyYaw: number
  direction: THREE.Vector3
  speed: number
  distance: number
}

export function stepCharacterMovement(
  character: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  bodyYaw: number,
  delta: number,
  stopDistance = ARRIVAL_THRESHOLD,
): MovementResult {
  const pos = new THREE.Vector3(character.x, 0, character.z)
  const tx = target.x
  const tz = target.z
  const dx = tx - character.x
  const dz = tz - character.z
  const dist = Math.hypot(dx, dz)
  const isWalking = dist > stopDistance
  let speed = 0
  const dir = new THREE.Vector3(dx, 0, dz)

  if (isWalking) {
    dir.normalize()
    speed = travelSpeedForDistance(dist)
    const step = Math.min(dist, speed * delta)
    pos.x += dir.x * step
    pos.z += dir.z * step
  }

  let nextYaw = bodyYaw
  if (isWalking) {
    nextYaw = Math.atan2(dir.x, dir.z)
  }

  return {
    position: pos,
    isWalking,
    bodyYaw: dampAngle(bodyYaw, nextYaw, isWalking ? 9 : 5, delta),
    direction: dir,
    speed,
    distance: dist,
  }
}

export function applyKeyboardTarget(
  keys: Set<string>,
  character: { x: number; z: number },
  bodyYaw: number,
  distance = 2.5,
) {
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw)
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw)
  const move = new THREE.Vector3()
  if (keys.has('w') || keys.has('arrowup')) move.add(forward)
  if (keys.has('s') || keys.has('arrowdown')) move.sub(forward)
  if (keys.has('a') || keys.has('arrowleft')) move.sub(right)
  if (keys.has('d') || keys.has('arrowright')) move.add(right)
  if (move.lengthSq() < 0.001) return null
  move.normalize().multiplyScalar(distance)
  return { x: character.x + move.x, y: 0, z: character.z + move.z }
}
