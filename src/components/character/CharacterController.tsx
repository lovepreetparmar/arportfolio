import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { contactWorld } from '../../data/world3d'
import { getProjectBySlug } from '../../data/projects'
import { getProjectWorldPosition, logNavigationStep, ARRIVAL_THRESHOLD } from '../../navigation/worldNavigation'
import { OPENING_FOCUS_SLUG, REVEAL } from '../../data/worldLayout'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import type { AnimPlaybackState } from './CharacterAnimator'
import { applyLookAt, createLookState } from './CharacterLookAt'
import { nextCharacterState } from './CharacterStateMachine'
import { applyKeyboardTarget, stepCharacterMovement } from './CharacterMovement'
import type { CharacterRigRefs } from './characterControllerTypes'

const POINT_SLUGS = new Set([OPENING_FOCUS_SLUG, 'brand-identity'])

type CharacterControllerProps = {
  group: React.RefObject<THREE.Group | null>
  bones: CharacterRigRefs
  keys: React.RefObject<Set<string>>
  allowBoneLookAt: boolean
  onAnimState: (state: AnimPlaybackState) => void
  onArrivedAtProject?: (slug: string) => void
}

export function CharacterController({
  group,
  bones,
  keys,
  allowBoneLookAt,
  onAnimState,
  onArrivedAtProject,
}: CharacterControllerProps) {
  const {
    characterRef,
    targetRef,
    pointer,
    updateCharacter,
    setMoving,
    lookAt,
    activeTerritory,
    nearProjectSlug,
    setCharacterState,
    setNavigationTarget,
    cancelNavigation,
    pendingProjectSlug,
    navigationMode,
    setLookAt: setLookAtTarget,
    clearPendingProject,
  } = useWorldState()
  const reduced = useReducedMotion()
  const bodyYaw = useRef(0)
  const lookState = useRef(createLookState())
  const stateRef = useRef<import('./CharacterAnimations').CharacterState>('idle')
  const animRef = useRef<AnimPlaybackState>('idle')
  const lastKbTarget = useRef<{ x: number; z: number } | null>(null)
  const arrivedRef = useRef(false)
  const logFrame = useRef(0)
  const uiSync = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return

    const pos = characterRef.current
    const navTarget = targetRef.current

    const kbTarget = applyKeyboardTarget(keys.current, pos, bodyYaw.current)
    if (kbTarget) {
      cancelNavigation()
      const prev = lastKbTarget.current
      if (!prev || Math.hypot(prev.x - kbTarget.x, prev.z - kbTarget.z) > 0.08) {
        lastKbTarget.current = { x: kbTarget.x, z: kbTarget.z }
        setNavigationTarget(kbTarget, 'manual')
      }
    } else {
      lastKbTarget.current = null
    }

    const movement = stepCharacterMovement(pos, navTarget, bodyYaw.current, delta)
    pos.x = movement.position.x
    pos.y = 0
    pos.z = movement.position.z

    bodyYaw.current = movement.bodyYaw
    group.current.position.set(pos.x, 0, pos.z)
    group.current.rotation.y = bodyYaw.current

    uiSync.current += 1
    if (uiSync.current % 4 === 0 || !movement.isWalking) {
      updateCharacter({ x: pos.x, y: 0, z: pos.z })
    }

    setMoving(movement.isWalking)

    logFrame.current += 1
    if (import.meta.env.DEV && logFrame.current % 45 === 0 && movement.isWalking) {
      logNavigationStep('Character position', {
        x: pos.x.toFixed(2),
        y: pos.y,
        z: pos.z.toFixed(2),
        target: { x: navTarget.x.toFixed(2), z: navTarget.z.toFixed(2) },
        distance: movement.distance.toFixed(2),
        state: movement.isWalking ? 'WALKING' : 'IDLE',
      })
    }

    const distToTarget = movement.distance

    if (
      pendingProjectSlug &&
      navigationMode === 'navigating' &&
      distToTarget <= ARRIVAL_THRESHOLD &&
      !arrivedRef.current
    ) {
      arrivedRef.current = true
      const arrivedSlug = pendingProjectSlug
      const project = getProjectBySlug(arrivedSlug)
      if (project) {
        const center = getProjectWorldPosition(project)
        setLookAtTarget({ x: center.x, y: 1.15, z: center.z })
      }
      navTarget.x = pos.x
      navTarget.z = pos.z
      onArrivedAtProject?.(arrivedSlug)
      clearPendingProject()
      window.setTimeout(() => {
        arrivedRef.current = false
      }, 1200)
    }

    if (movement.isWalking) {
      arrivedRef.current = false
    }

    const nearContact = Math.hypot(pos.x - contactWorld.x, pos.z - contactWorld.z) < 10
    const nearProject =
      !!nearProjectSlug &&
      !!lookAt &&
      Math.hypot(pos.x - lookAt.x, pos.z - lookAt.z) < REVEAL.interact + 1.5

    const nextState = nextCharacterState({
      isWalking: movement.isWalking,
      nearProject,
      nearContact,
      territory: activeTerritory,
      pointMoment: !!nearProjectSlug && POINT_SLUGS.has(nearProjectSlug),
    })
    if (nextState !== stateRef.current) {
      stateRef.current = nextState
      setCharacterState(nextState)
    }

    let anim: AnimPlaybackState = 'idle'
    if (movement.isWalking) anim = 'walk'
    else if (nearProject && navigationMode !== 'navigating') anim = 'inspect'
    if (anim !== animRef.current) {
      animRef.current = anim
      onAnimState(anim)
    }

    if (allowBoneLookAt && !movement.isWalking && nearProject && lookAt) {
      const charPos = new THREE.Vector3(pos.x, 0, pos.z)
      applyLookAt(bones, lookState.current, lookAt, bodyYaw.current, pointer, charPos, delta, reduced, true)
    }
  })

  return null
}
