import * as THREE from 'three'

export type CharacterState =
  | 'idle'
  | 'walking'
  | 'looking'
  | 'inspecting'
  | 'reading'
  | 'pointing'
  | 'contact'

export const WALK_SPEED = 1.0

export function damp(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta))
}

export function dampAngle(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta))
}
