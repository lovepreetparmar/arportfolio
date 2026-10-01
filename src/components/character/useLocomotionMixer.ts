import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { ANIM } from './characterConfig'
import { characterSignals } from './characterSignals'
import { createIdleStance } from './idleStance'
import { loadLocomotionSource, type LocomotionSource } from './loadLocomotionClips'
import { retargetLocomotion, type RetargetedLocomotion } from './locomotionRetarget'

function pickClip(source: THREE.AnimationClip[], keywords: readonly string[], exclude?: string) {
  const byName = new Map(source.map((c) => [c.name.toLowerCase(), c]))
  return (
    keywords.map((k) => byName.get(k.toLowerCase())).find(Boolean) ??
    source.find((c) => {
      const n = c.name.toLowerCase()
      return keywords.some((k) => n.includes(k.toLowerCase())) && (!exclude || !n.includes(exclude))
    })
  )
}

/**
 * One AnimationMixer on her skinned mesh plays the walk; her standing pose (`createIdleStance`) is layered over it by
 * `1 - characterSignals.gait`, so starting and stopping cross-fade between the two. The walk is in place; its playback
 * rate follows her ground speed so the planted foot does not slide.
 */
export function useLocomotionMixer(mesh: THREE.SkinnedMesh | null) {
  const [source, setSource] = useState<LocomotionSource | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    loadLocomotionSource()
      .then((s) => {
        if (!cancelled) setSource(s)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[Character] Locomotion source failed to load; procedural walk stays on', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const baked = useMemo<RetargetedLocomotion | null>(() => {
    if (!mesh || !source) return null
    const walk = pickClip(source.animations, ANIM.walk, 'run')
    if (!walk) {
      if (import.meta.env.DEV) console.warn('[Character] Locomotion source has no walk clip; procedural walk stays on')
      return null
    }
    mesh.skeleton.pose()
    return retargetLocomotion(source.scene, walk, mesh.skeleton.bones)
  }, [mesh, source])

  const stance = useMemo(() => {
    if (!mesh) return null
    mesh.skeleton.pose()
    return createIdleStance(mesh.skeleton.bones)
  }, [mesh])

  const mixer = useMemo(() => (mesh ? new THREE.AnimationMixer(mesh) : null), [mesh])
  const walkAction = useRef<THREE.AnimationAction | null>(null)

  useLayoutEffect(() => {
    if (!mixer || !baked || !mesh) return
    const walk = mixer.clipAction(baked.walk)
    walk.play()
    walkAction.current = walk
    characterSignals.locomotion = 'skeletal'
    characterSignals.walkClipDuration = baked.walk.duration
    characterSignals.walkNaturalSpeed = baked.walkSpeed
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(mesh)
      mesh.skeleton.pose()
      walkAction.current = null
      characterSignals.locomotion = 'procedural'
    }
  }, [mixer, baked, mesh])

  useFrame((_, delta) => {
    const walk = walkAction.current
    if (!mixer || !walk || !baked || !stance) return
    const gait = THREE.MathUtils.clamp(characterSignals.gait, 0, 1)
    walk.timeScale = THREE.MathUtils.clamp(characterSignals.speed / baked.walkSpeed, 0.6, 1.5)

    characterSignals.animPlaybackRate = walk.timeScale
    characterSignals.locMotionState = gait > 0.08 ? 'walk' : 'idle'
    const T = baked.walk.duration
    characterSignals.walkPhase = Math.PI / 2 + (((walk.time - baked.strikeTime) % T) / T) * Math.PI * 2

    mixer.update(delta)
    stance(Math.min(delta, 0.1), 1 - gait, reduced)
  })
}
