import { getBenchAnchors, type BenchSpot } from '../../../data/worldBenches'

/**
 * Optional ambient sitting: WALK → ARRIVE → TURN → SIT → SEATED, and STAND before walking away.
 * `amount` is the sit blend (0 standing, 1 seated) that the character pose reads each frame.
 */
export type SitPhase = 'none' | 'approaching' | 'turning' | 'sitting' | 'seated' | 'standing'

type XZ = { x: number; z: number }

export type SittingState = {
  phase: SitPhase
  benchId: string | null
  /** Bench picked while still seated elsewhere; approached once she has stood up. */
  queuedBench: BenchSpot | null
  amount: number
  seat: XZ
  approach: XZ
  facingYaw: number
  /** Written by the character controller so the turn can finish before she sits. */
  bodyYaw: number
  /** The walk target has been requested but not yet committed to world state. */
  awaitingTarget: boolean
  awaitTime: number
}

export const SIT_DURATION = 1.1
export const STAND_DURATION = 0.8
const ARRIVE_RADIUS = 0.08
const TARGET_TOLERANCE = 0.06
const TURN_TOLERANCE = 0.12
const AWAIT_TIMEOUT = 0.5

export function createSittingState(): SittingState {
  return {
    phase: 'none',
    benchId: null,
    queuedBench: null,
    amount: 0,
    seat: { x: 0, z: 0 },
    approach: { x: 0, z: 0 },
    facingYaw: 0,
    bodyYaw: 0,
    awaitingTarget: false,
    awaitTime: 0,
  }
}

/** While true the character stays put: turning, lowering, seated or getting up. */
export function isHoldingPosition(s: SittingState) {
  return s.phase === 'turning' || s.phase === 'sitting' || s.phase === 'seated' || s.phase === 'standing'
}

export function isSeatedOrSitting(s: SittingState) {
  return s.phase === 'sitting' || s.phase === 'seated'
}

export function beginApproach(s: SittingState, bench: BenchSpot) {
  const a = getBenchAnchors(bench)
  s.phase = 'approaching'
  s.benchId = bench.id
  s.queuedBench = null
  s.seat = a.seat
  s.approach = a.approach
  s.facingYaw = a.facingYaw
  s.awaitingTarget = true
  s.awaitTime = 0
}

type StepInputs = {
  character: XZ
  target: XZ
  /** Sitting only happens while freely exploring the world. */
  exploring: boolean
  delta: number
  reduced: boolean
}

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z)

function angleDiff(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

/** Advances the sitting state machine by one frame. */
export function stepSitting(s: SittingState, { character, target, exploring, delta, reduced }: StepInputs) {
  const targetHere = dist(target, s.approach) < TARGET_TOLERANCE
  const sitRate = reduced ? 8 : 1 / SIT_DURATION
  const standRate = reduced ? 8 : 1 / STAND_DURATION

  if (s.awaitingTarget) {
    s.awaitTime += delta
    if (targetHere || s.awaitTime > AWAIT_TIMEOUT) s.awaitingTarget = false
    else return
  }

  switch (s.phase) {
    case 'approaching':
      if (!targetHere || !exploring) {
        s.phase = 'none'
        s.benchId = null
      } else if (dist(character, s.approach) < ARRIVE_RADIUS) {
        s.phase = 'turning'
      }
      break
    case 'turning':
      if (!targetHere || !exploring) {
        s.phase = 'none'
        s.benchId = null
      } else if (reduced || angleDiff(s.bodyYaw, s.facingYaw) < TURN_TOLERANCE) {
        s.phase = 'sitting'
      }
      break
    case 'sitting':
      if (!targetHere) {
        s.phase = 'standing'
        break
      }
      s.amount = Math.min(1, s.amount + delta * sitRate)
      if (s.amount >= 1) s.phase = 'seated'
      break
    case 'seated':
      if (!targetHere) s.phase = 'standing'
      break
    case 'standing':
      s.amount = Math.max(0, s.amount - delta * standRate)
      if (s.amount <= 0) {
        s.phase = 'none'
        s.benchId = null
        const next = s.queuedBench
        if (next) {
          beginApproach(s, next)
          s.awaitingTarget = false
        }
      }
      break
  }
}
