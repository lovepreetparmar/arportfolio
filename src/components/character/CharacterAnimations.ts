import * as THREE from 'three'

export type CharacterState =
  | 'idle'
  | 'walking'
  | 'looking'
  | 'inspecting'
  | 'reading'
  | 'pointing'
  | 'contact'

export const WALK_SPEED = 2.72

/** Locomotion layer the controller runs, independent of the expressive `CharacterState`. */
export type CharacterMotion = 'idle' | 'walking' | 'sitting' | 'standing' | 'enteringProject'

export function resolveCharacterMotion(
  isWalking: boolean,
  sitPhase: string,
  journeyPhase: string,
): CharacterMotion {
  if (sitPhase === 'sitting' || sitPhase === 'seated') return 'sitting'
  if (sitPhase === 'standing') return 'standing'
  if (journeyPhase !== 'world' && journeyPhase !== 'exiting') return 'enteringProject'
  return isWalking ? 'walking' : 'idle'
}

export function damp(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta))
}

export function dampAngle(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta))
}

export function walkPhaseAdvance(phase: number, delta: number, speed = 10.78) {
  return phase + delta * speed
}

export type BlinkState = {
  nextBlink: number
  closing: boolean
  closeUntil: number
  doublePending: boolean
}

export function initBlinkState(now: number): BlinkState {
  return {
    nextBlink: now + 2.5 + Math.random() * 3.5,
    closing: false,
    closeUntil: 0,
    doublePending: false,
  }
}

export function updateBlink(state: BlinkState, now: number): number {
  if (!state.closing && now >= state.nextBlink) {
    state.closing = true
    state.closeUntil = now + 0.09
    if (!state.doublePending && Math.random() < 0.18) {
      state.doublePending = true
    }
  }
  if (state.closing && now >= state.closeUntil) {
    state.closing = false
    if (state.doublePending) {
      state.doublePending = false
      state.nextBlink = now + 0.14
    } else {
      state.nextBlink = now + 2.5 + Math.random() * 3.5
    }
  }
  return state.closing ? 0.08 : 1
}

export function resolveCharacterState(
  isWalking: boolean,
  nearProject: boolean,
  territory: string,
  nearContact: boolean,
  pointMoment: boolean,
): CharacterState {
  if (nearContact) return 'contact'
  if (isWalking) return 'walking'
  if (nearProject && territory === 'editorial') return 'reading'
  if (nearProject && pointMoment) return 'pointing'
  if (nearProject) return 'inspecting'
  return 'idle'
}
