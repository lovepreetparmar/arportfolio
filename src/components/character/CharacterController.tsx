import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { contactWorld } from '../../data/world3d'
import { OPENING_FOCUS_SLUG, REVEAL } from '../../data/worldLayout'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import {
  WALK_SPEED,
  damp,
  dampAngle,
  initBlinkState,
  resolveCharacterState,
  updateBlink,
  walkPhaseAdvance,
  type BlinkState,
  type CharacterState,
} from './CharacterAnimations'
import type { CharacterRigRefs } from './useCharacterRefs'

const POINT_SLUGS = new Set([OPENING_FOCUS_SLUG, 'brand-identity'])

export function CharacterController({ refs }: { refs: CharacterRigRefs }) {
  const {
    character,
    target,
    pointer,
    updateCharacter,
    setMoving,
    lookAt,
    activeTerritory,
    nearProjectSlug,
    setCharacterState,
  } = useWorldState()
  const reduced = useReducedMotion()
  const walkPhase = useRef(0)
  const idlePhase = useRef(Math.random() * 10)
  const bodyYaw = useRef(0)
  const blink = useRef<BlinkState | null>(null)
  const stateRef = useRef<CharacterState>('idle')
  const headLook = useRef({ x: 0, y: 0 })
  const eyeLook = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    if (!refs.root.current || !refs.hips.current || !refs.chest.current) return
    if (!blink.current) blink.current = initBlinkState(state.clock.elapsedTime)

    const dx = target.x - character.x
    const dz = target.z - character.z
    const dist = Math.hypot(dx, dz)
    const isWalking = dist > 0.055

    if (isWalking) {
      const step = Math.min(dist, WALK_SPEED * delta)
      updateCharacter({ x: character.x + (dx / dist) * step, y: 0, z: character.z + (dz / dist) * step })
      walkPhase.current = walkPhaseAdvance(walkPhase.current, delta)
      setMoving(true)
    } else {
      setMoving(false)
    }

    refs.root.current.position.set(character.x, 0, character.z)

    const nearContact = Math.hypot(character.x - contactWorld.x, character.z - contactWorld.z) < 10
    const nearProject =
      !!nearProjectSlug &&
      !!lookAt &&
      Math.hypot(character.x - lookAt.x, character.z - lookAt.z) < REVEAL.interact + 1.5

    const nextState = resolveCharacterState(
      isWalking,
      nearProject,
      activeTerritory,
      nearContact,
      !!nearProjectSlug && POINT_SLUGS.has(nearProjectSlug),
    )
    if (nextState !== stateRef.current) {
      stateRef.current = nextState
      setCharacterState(nextState)
    }

    let targetYaw = bodyYaw.current
    if (isWalking) {
      targetYaw = Math.atan2(dx, dz)
    } else if (lookAt && nearProject) {
      targetYaw = Math.atan2(lookAt.x - character.x, lookAt.z - character.z)
    }
    bodyYaw.current = dampAngle(bodyYaw.current, targetYaw, isWalking ? 9 : 5, delta)
    refs.hips.current.rotation.y = bodyYaw.current

    const t = state.clock.elapsedTime + idlePhase.current
    const breathe = Math.sin(t * 1.05) * 0.014
    const sway = Math.sin(t * 0.55) * 0.012
    refs.chest.current.position.y = 0.38 + breathe
    refs.chest.current.rotation.z = sway * 0.35
    refs.spine.current!.rotation.x = breathe * 0.35

    const swing = Math.sin(walkPhase.current) * 0.55
    const bounce = isWalking ? Math.abs(Math.sin(walkPhase.current)) * 0.045 : 0
    refs.hips.current.position.y = 0.82 + bounce

    if (refs.leftLeg.current) refs.leftLeg.current.rotation.x = isWalking ? swing : damp(refs.leftLeg.current.rotation.x, 0, 8, delta)
    if (refs.rightLeg.current) refs.rightLeg.current.rotation.x = isWalking ? -swing : damp(refs.rightLeg.current.rotation.x, 0, 8, delta)
    if (refs.leftArm.current) refs.leftArm.current.rotation.x = isWalking ? -swing * 0.55 : 0
    if (refs.rightArm.current) refs.rightArm.current.rotation.x = isWalking ? swing * 0.55 : 0

    if (stateRef.current === 'pointing' && refs.rightArm.current) {
      refs.rightArm.current.rotation.x = -0.85
      refs.rightArm.current.rotation.z = 0.15
    }
    if (stateRef.current === 'reading' && refs.head.current) {
      refs.head.current.rotation.x = damp(refs.head.current.rotation.x, 0.22, 6, delta)
    }
    if (stateRef.current === 'inspecting' && refs.head.current) {
      refs.head.current.rotation.z = damp(refs.head.current.rotation.z, 0.08, 5, delta)
    }

    if (refs.head.current) {
      let targetHeadY = 0
      let targetHeadX = 0
      if (lookAt && nearProject && !isWalking) {
        const lx = lookAt.x - character.x
        const lz = lookAt.z - character.z
        targetHeadY = THREE.MathUtils.clamp(Math.atan2(lx, lz) - bodyYaw.current, -0.12, 0.12)
        targetHeadX = 0.04
      } else if (!reduced) {
        targetHeadY = THREE.MathUtils.clamp(pointer.x * 0.1, -0.1, 0.1)
        targetHeadX = THREE.MathUtils.clamp(-pointer.y * 0.06, -0.05, 0.05)
      }
      headLook.current.x = damp(headLook.current.x, targetHeadX, 8, delta)
      headLook.current.y = damp(headLook.current.y, targetHeadY, 8, delta)
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

    if (refs.shadow.current) {
      const stretch = isWalking ? 1.18 : 1
      refs.shadow.current.scale.set(stretch, stretch * 0.88, 1)
      const sm = refs.shadow.current.material as THREE.MeshBasicMaterial
      sm.opacity = isWalking ? 0.13 : 0.17
    }
  })

  return null
}
