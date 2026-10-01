import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OPENING_FOCUS_SLUG, REVEAL } from '../../data/worldLayout'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { constrainToRoom, isInRoomSpace, roomView } from '../project-room/roomSpace'
import { useOptionalSitting } from '../world/benches/SittingContext'
import { isHoldingPosition } from '../world/benches/SittingState'
import { dayNight } from '../world/daynight/DayNightController'
import { constrainToWorld } from '../world/worldObstacles'
import {
  WALK_SPEED,
  damp,
  dampAngle,
  initBlinkState,
  resolveCharacterMotion,
  resolveCharacterState,
  updateBlink,
  walkPhaseAdvance,
  type BlinkState,
  type CharacterMotion,
  type CharacterState,
} from './CharacterAnimations'
import { butterflySignals } from './butterflySignals'
import { characterContext, resolveCharacterContext } from './characterContext'
import { characterSignals } from './characterSignals'
import { applySittingPose } from './sittingPose'
import type { CharacterRigRefs } from './useCharacterRefs'

/** Equivalent of `target` within ±π of `current`, so damped turns take the short way round. */
function nearestAngle(current: number, target: number) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current))
}

const POINT_SLUGS = new Set([OPENING_FOCUS_SLUG, 'brand-identity'])

/** She eases off over this last stretch of a walk (metres) and stops at a stroll rather than mid-stride. */
const ARRIVE_DISTANCE = 0.75
const ARRIVE_MIN_SPEED = 0.36
const ACCELERATION = 5.5
const DECELERATION = 8
/** Fastest she turns on the spot (rad/s): a half turn takes about half a second. */
const MAX_TURN_RATE = 6.5
/** Facing further than this from where she is heading, she turns before stepping off. */
const TURN_FIRST_FROM = 0.65
const TURN_FIRST_TO = 1.9
/** Below this speed the legs are standing, not walking. */
const STEP_SPEED = 0.12
/** Furthest her head turns toward a door or a passing place before the body would have to follow. */
const HEAD_TURN = 0.5
/** At the viewpoint she looks up at the sky once she has been still this long (seconds). */
const GAZE_AFTER = 2.5
const GAZE_PITCH = -0.34

const { smoothstep } = THREE.MathUtils

function angleBetween(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

export function CharacterController({ refs }: { refs: CharacterRigRefs }) {
  const {
    character,
    target,
    pointer,
    updateCharacter,
    setTarget,
    setMoving,
    lookAt,
    activeTerritory,
    nearProjectSlug,
    setCharacterState,
    journeyPhase,
    routeRef,
    pendingProjectSlug,
  } = useWorldState()
  const sittingRef = useOptionalSitting()
  const seatedIdle = useRef(0)
  const reduced = useReducedMotion()
  const walkPhase = useRef(0)
  const idlePhase = useRef(Math.random() * 10)
  const bodyYaw = useRef(0)
  const blink = useRef<BlinkState | null>(null)
  const stateRef = useRef<CharacterState>('idle')
  const headLook = useRef({ x: 0, y: 0 })
  const eyeLook = useRef({ x: 0, y: 0 })
  const speed = useRef(0)
  /** 0 standing → 1 full walk cycle; legs, arms and bounce blend with it. */
  const gait = useRef(0)
  /** Now and then, standing still, she glances somewhere and back. */
  const glance = useRef({
    yaw: 0,
    pitch: 0,
    point: null as { x: number; z: number } | null,
    next: 4 + Math.random() * 4,
    until: 0,
  })
  const pointing = useRef(0)
  const stillFor = useRef(0)
  const gaze = useRef(0)

  useEffect(
    () => () => {
      characterSignals.present = false
      characterSignals.walking = false
    },
    [],
  )

  useFrame((state, delta) => {
    if (!refs.root.current || !refs.hips.current || !refs.chest.current) return
    if (!blink.current) blink.current = initBlinkState(state.clock.elapsedTime)

    const sit = sittingRef?.current ?? null
    const holding = !!sit && isHoldingPosition(sit)
    const dx = target.x - character.x
    const dz = target.z - character.z
    const dist = Math.hypot(dx, dz)
    const heading = !holding && dist > 0.055
    const inRoom = isInRoomSpace(character.x, character.z)
    const exploring = journeyPhase === 'world'
    const outdoors = !inRoom && (exploring || journeyPhase === 'walking')

    let desiredSpeed = 0
    if (heading) {
      const align = reduced ? 1 : 1 - smoothstep(angleBetween(Math.atan2(dx, dz), bodyYaw.current), TURN_FIRST_FROM, TURN_FIRST_TO)
      const lastLeg = routeRef.current.length === 0
      const arrive = lastLeg ? THREE.MathUtils.clamp(dist / ARRIVE_DISTANCE, ARRIVE_MIN_SPEED, 1) : 1
      desiredSpeed = WALK_SPEED * arrive * align
    }
    if (reduced) speed.current = desiredSpeed
    else speed.current = damp(speed.current, desiredSpeed, desiredSpeed > speed.current ? ACCELERATION : DECELERATION, delta)

    const isWalking = heading && speed.current > STEP_SPEED
    if (heading && speed.current > 0.01) {
      const step = Math.min(dist, speed.current * delta)
      let nx = character.x + (dx / dist) * step
      let nz = character.z + (dz / dist) * step
      if (inRoom) [nx, nz] = constrainToRoom(nx, nz)
      else if (outdoors) [nx, nz] = constrainToWorld(nx, nz)
      // Walking straight into a prop or a wall: stop rather than tread on the spot.
      if ((inRoom || exploring) && Math.hypot(nx - character.x, nz - character.z) < step * 0.15) {
        setTarget({ x: character.x, y: 0, z: character.z })
      }
      updateCharacter({ x: nx, y: 0, z: nz })
    }
    if (heading) setMoving(true)
    else setMoving(false)

    const stride = speed.current / WALK_SPEED
    gait.current = reduced ? (isWalking ? 1 : 0) : damp(gait.current, isWalking ? Math.max(stride, 0.45) : 0, 9, delta)
    if (gait.current > 0.01) walkPhase.current = walkPhaseAdvance(walkPhase.current, delta * (0.5 + 0.5 * stride))

    const motion: CharacterMotion = resolveCharacterMotion(isWalking, sit?.phase ?? 'none', journeyPhase)
    const sitAmount = sit?.amount ?? 0
    const seatWeight = sitAmount > 0 && sit ? THREE.MathUtils.smootherstep(sitAmount, 0, 1) : 0
    const rootX = sit ? character.x + (sit.seat.x - sit.approach.x) * seatWeight : character.x
    const rootZ = sit ? character.z + (sit.seat.z - sit.approach.z) * seatWeight : character.z
    refs.root.current.position.set(rootX, 0, rootZ)
    characterSignals.present = true
    characterSignals.walking = isWalking
    characterSignals.walkPhase = walkPhase.current
    characterSignals.x = rootX
    characterSignals.z = rootZ

    const ctx = resolveCharacterContext({
      x: character.x,
      z: character.z,
      walking: isWalking,
      inRoom,
      journeyPhase,
      pendingSlug: pendingProjectSlug,
    })
    characterContext.state = ctx.state
    characterContext.focus = ctx.focus
    characterContext.glance = ctx.glance
    const facingDoor = !!ctx.focus && (ctx.state === 'approaching' || ctx.state === 'enteringRoom')
    stillFor.current = heading || isWalking ? 0 : stillFor.current + delta

    const nearProject =
      !!nearProjectSlug &&
      !!lookAt &&
      Math.hypot(character.x - lookAt.x, character.z - lookAt.z) < REVEAL.interact + 1.5

    const nextState = resolveCharacterState(
      isWalking,
      nearProject,
      activeTerritory,
      ctx.state === 'atContact',
      !!nearProjectSlug && POINT_SLUGS.has(nearProjectSlug),
    )
    if (nextState !== stateRef.current) {
      stateRef.current = nextState
      setCharacterState(nextState)
    }

    let targetYaw = bodyYaw.current
    let turnRate = heading ? 9 : 5
    if (holding && sit) {
      targetYaw = nearestAngle(bodyYaw.current, sit.facingYaw)
      turnRate = 7
    } else if (heading) {
      targetYaw = nearestAngle(bodyYaw.current, Math.atan2(dx, dz))
    } else if (lookAt && nearProject) {
      targetYaw = nearestAngle(bodyYaw.current, Math.atan2(lookAt.x - character.x, lookAt.z - character.z))
    } else if (facingDoor && ctx.focus) {
      targetYaw = nearestAngle(bodyYaw.current, Math.atan2(ctx.focus.x - character.x, ctx.focus.z - character.z))
    } else if (inRoom && roomView.faceYaw !== null) {
      targetYaw = nearestAngle(bodyYaw.current, roomView.faceYaw)
    }
    const turned = dampAngle(bodyYaw.current, targetYaw, reduced && holding ? 30 : turnRate, delta)
    const maxTurn = reduced ? Infinity : MAX_TURN_RATE * delta
    bodyYaw.current += THREE.MathUtils.clamp(turned - bodyYaw.current, -maxTurn, maxTurn)
    refs.hips.current.rotation.y = bodyYaw.current
    if (sit) sit.bodyYaw = bodyYaw.current

    const t = state.clock.elapsedTime + idlePhase.current
    const g = gait.current
    const still = (1 - g) * (reduced ? 0 : 1)
    const breathe = Math.sin(t * 1.05) * 0.014
    const sway = Math.sin(t * 0.55) * 0.012
    // Standing, her weight drifts from one leg to the other: hips tilt, shoulders counter.
    const weightShift = (Math.sin(t * 0.29) + 0.45 * Math.sin(t * 0.71 + 1.3)) * 0.011 * still
    refs.chest.current.position.y = 0.38 + breathe
    refs.chest.current.rotation.z = sway * 0.35 - weightShift * 0.7
    refs.spine.current!.rotation.x = breathe * 0.35
    refs.hips.current.rotation.z = weightShift

    const swing = Math.sin(walkPhase.current) * 0.55 * g
    const bounce = Math.abs(Math.sin(walkPhase.current)) * 0.045 * g
    refs.hips.current.position.y = 0.82 + bounce

    if (refs.leftLeg.current) refs.leftLeg.current.rotation.x = swing
    if (refs.rightLeg.current) refs.rightLeg.current.rotation.x = -swing
    if (refs.leftArm.current) refs.leftArm.current.rotation.x = -swing * 0.55
    if (refs.rightArm.current) refs.rightArm.current.rotation.x = swing * 0.55

    pointing.current = damp(pointing.current, stateRef.current === 'pointing' ? 1 : 0, reduced ? 30 : 5, delta)
    if (refs.rightArm.current) {
      refs.rightArm.current.rotation.x = THREE.MathUtils.lerp(refs.rightArm.current.rotation.x, -0.85, pointing.current)
      refs.rightArm.current.rotation.z = 0.15 * pointing.current
    }
    if (stateRef.current === 'reading' && refs.head.current) {
      refs.head.current.rotation.x = damp(refs.head.current.rotation.x, 0.22, 6, delta)
    }
    if (stateRef.current === 'inspecting' && refs.head.current) {
      refs.head.current.rotation.z = damp(refs.head.current.rotation.z, 0.08, 5, delta)
    }

    // Seated or standing at the viewpoint, left alone for a moment, she tips her head back to the sky.
    const gazing = ctx.state === 'atSkyViewpoint' && stillFor.current > GAZE_AFTER && !reduced
    gaze.current = damp(gaze.current, gazing ? 1 : 0, gazing ? 0.9 : 3, delta)

    if (refs.head.current) {
      /** Head yaw toward a point, relative to where her body faces. */
      const turnTo = (p: { x: number; z: number }) => {
        const a = Math.atan2(p.x - rootX, p.z - rootZ) - bodyYaw.current
        return Math.atan2(Math.sin(a), Math.cos(a))
      }
      let targetHeadY = 0
      let targetHeadX = 0
      if (lookAt && nearProject && !isWalking) {
        const lx = lookAt.x - character.x
        const lz = lookAt.z - character.z
        targetHeadY = THREE.MathUtils.clamp(Math.atan2(lx, lz) - bodyYaw.current, -0.12, 0.12)
        targetHeadX = 0.04
      } else if (facingDoor && ctx.focus) {
        targetHeadY = THREE.MathUtils.clamp(turnTo(ctx.focus), -HEAD_TURN, HEAD_TURN)
        targetHeadX = -0.02
      } else if (!reduced) {
        const up = gaze.current
        targetHeadY = THREE.MathUtils.clamp(pointer.x * 0.1, -0.1, 0.1) * (1 - up)
        targetHeadX =
          THREE.MathUtils.clamp(-pointer.y * 0.06, -0.05, 0.05) * (1 - up) + GAZE_PITCH * (0.75 + 0.25 * dayNight.state.darkness) * up
        // Small, slow drift so standing still never looks frozen.
        targetHeadY += (Math.sin(t * 0.37) * 0.022 + Math.sin(t * 0.13 + 2) * 0.018) * still
        targetHeadX += Math.sin(t * 0.29 + 1) * 0.012 * still
        const gl = glance.current
        const now = state.clock.elapsedTime
        const idle = !heading && !holding && !nearProject && !inRoom && up < 0.2
        const strolling = isWalking && exploring && !!ctx.glance
        if (!idle && !strolling) {
          gl.next = Math.max(gl.next, now + 3)
          gl.until = 0
        } else if (now >= gl.next) {
          const rel = ctx.glance ? Math.abs(turnTo(ctx.glance)) : Infinity
          if (strolling) {
            // Walking past a place, she turns her head to it once, then not again for a while.
            if (rel > 0.35 && rel < 1.5) {
              gl.point = ctx.glance
              gl.pitch = 0
              gl.until = now + 1 + Math.random() * 0.5
              gl.next = gl.until + 8 + Math.random() * 5
            }
          } else {
            gl.point = rel < 1.6 && Math.random() < 0.65 ? ctx.glance : null
            const side = Math.random() < 0.5 ? -1 : 1
            gl.yaw = side * (0.22 + Math.random() * 0.2)
            gl.pitch = (Math.random() - 0.6) * 0.1
            gl.until = now + 1.2 + Math.random() * 1.2
            gl.next = gl.until + 4 + Math.random() * 6
          }
        }
        if (now < gl.until) {
          targetHeadY += gl.point ? THREE.MathUtils.clamp(turnTo(gl.point), -HEAD_TURN, HEAD_TURN) : gl.yaw
          targetHeadX += gl.pitch
        }
        if (butterflySignals.active && idle && up < 0.15) {
          const bx = butterflySignals.x - rootX
          const bz = butterflySignals.z - rootZ
          const by = butterflySignals.y - (refs.chest.current?.position.y ?? 0.38)
          targetHeadY += THREE.MathUtils.clamp(Math.atan2(bx, bz) - bodyYaw.current, -0.14, 0.14) * 0.55
          targetHeadX += THREE.MathUtils.clamp(Math.atan2(by, Math.hypot(bx, bz)), -0.08, 0.1) * 0.45
        }
      }
      const headRate = glance.current.until > state.clock.elapsedTime ? 3.2 : 4.5
      headLook.current.x = damp(headLook.current.x, targetHeadX, headRate, delta)
      headLook.current.y = damp(headLook.current.y, targetHeadY, headRate, delta)
      refs.head.current.rotation.y = headLook.current.y
      refs.head.current.rotation.x = headLook.current.x
    }

    if (refs.eyes.current) {
      const eyeScaleY = updateBlink(blink.current!, state.clock.elapsedTime)
      refs.eyes.current.scale.y = THREE.MathUtils.lerp(refs.eyes.current.scale.y, eyeScaleY, 0.4)
      if (!reduced && !nearProject) {
        eyeLook.current.x = damp(eyeLook.current.x, pointer.x * 0.015, 10, delta)
        eyeLook.current.y = damp(eyeLook.current.y, pointer.y * 0.01, 10, delta)
        refs.eyes.current.position.x = eyeLook.current.x
        refs.eyes.current.position.y = eyeLook.current.y
      }
    }

    if (refs.hair.current) {
      const lag = isWalking ? -0.04 : Math.sin(t * 0.85) * 0.015
      const sideSway = isWalking ? Math.sin(walkPhase.current) * 0.03 : sway * 0.35
      refs.hair.current.rotation.x = damp(refs.hair.current.rotation.x, lag, 6, delta)
      refs.hair.current.rotation.z = damp(refs.hair.current.rotation.z, sideSway, 5, delta)
    }
    if (refs.hairBack.current) {
      const backLag = isWalking ? 0.12 + Math.sin(walkPhase.current) * 0.04 : 0.01 + Math.sin(t * 0.7) * 0.012
      refs.hairBack.current.rotation.x = damp(refs.hairBack.current.rotation.x, backLag, 5, delta)
      refs.hairBack.current.rotation.z = damp(
        refs.hairBack.current.rotation.z,
        isWalking ? Math.sin(walkPhase.current) * 0.035 : 0,
        4,
        delta,
      )
    }
    if (refs.blazer.current) {
      refs.blazer.current.rotation.z = sway * 0.25
    }

    seatedIdle.current = damp(seatedIdle.current, motion === 'sitting' && sitAmount >= 1 && !reduced ? 1 : 0, 1.5, delta)
    applySittingPose(refs, sitAmount, t, seatedIdle.current)

    if (refs.shadow.current) {
      const stretch = 1 + g * 0.18 + seatWeight * 0.25
      refs.shadow.current.scale.set(stretch, stretch * 0.88, 1)
      const sm = refs.shadow.current.material as THREE.MeshBasicMaterial
      sm.opacity = 0.17 - g * 0.04 - seatWeight * 0.07
    }
  })

  return null
}
