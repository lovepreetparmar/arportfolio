import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { findAnimationAction, logCharacterAnimationsOnce } from './animationResolver'
import { ANIM } from './characterConfig'

export type AnimPlaybackState = 'idle' | 'walk' | 'inspect'

type CharacterAnimatorProps = {
  model: THREE.Object3D
  clips: THREE.AnimationClip[]
  animState: AnimPlaybackState
  walkSpeed: number
  onReady: (ready: boolean) => void
  onDebug?: (info: { playing: string; available: string[] }) => void
  /** Local offset after scale — re-applied each frame so clips cannot translate the root mesh. */
  modelGroundLocal?: THREE.Vector3
}

const BASE_WALK_SPEED = 1.0

export function useCharacterAnimator({
  model,
  clips,
  animState,
  walkSpeed,
  onReady,
  onDebug,
  modelGroundLocal,
}: CharacterAnimatorProps) {
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const actions = useRef<Record<string, THREE.AnimationAction>>({})
  const current = useRef<THREE.AnimationAction | null>(null)
  const logged = useRef(false)
  const lastDebugPlaying = useRef('')

  useLayoutEffect(() => {
    logCharacterAnimationsOnce(clips, 'clips')
    actions.current = {}
    clips.forEach((clip) => {
      const action = mixer.clipAction(clip)
      action.enabled = true
      actions.current[clip.name] = action
    })

    if (!logged.current && import.meta.env.DEV) {
      logged.current = true
      const skinned: string[] = []
      model.traverse((o) => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o.name)
      })
      console.log('[Character] Skinned meshes:', skinned)
    }

    const idle = findAnimationAction(actions.current, [...ANIM.idle])
    if (idle) {
      idle.setLoop(THREE.LoopRepeat, Infinity)
      idle.reset().fadeIn(0.3).play()
      current.current = idle
      onReady(true)
    } else {
      onReady(false)
    }
  }, [clips, mixer, model, onReady])

  useEffect(() => {
    const idle = findAnimationAction(actions.current, [...ANIM.idle])
    const walk = findAnimationAction(actions.current, [...ANIM.walk])
    const inspect = findAnimationAction(actions.current, [...ANIM.inspect])

    let next: THREE.AnimationAction | null = null
    if (animState === 'walk' && walk) next = walk
    else if (animState === 'inspect' && inspect) next = inspect
    else next = idle

    if (!next || next === current.current) {
      if (next && animState === 'walk') {
        next.timeScale = THREE.MathUtils.clamp(walkSpeed / BASE_WALK_SPEED, 0.85, 1.25)
      }
      const playing = current.current?.getClip().name ?? 'none'
      if (onDebug && playing !== lastDebugPlaying.current) {
        lastDebugPlaying.current = playing
        onDebug({ playing, available: Object.keys(actions.current) })
      }
      return
    }

    current.current?.fadeOut(0.25)
    next.reset().fadeIn(0.25).play()
    if (animState === 'walk') {
      next.setLoop(THREE.LoopRepeat, Infinity)
      next.timeScale = THREE.MathUtils.clamp(walkSpeed / BASE_WALK_SPEED, 0.85, 1.25)
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity)
      next.timeScale = animState === 'inspect' ? 0.95 : 1
    }
    current.current = next

    const playing = next.getClip().name
    lastDebugPlaying.current = playing
    onDebug?.({ playing, available: Object.keys(actions.current) })
  }, [animState, walkSpeed, onDebug])

  useFrame((_, delta) => {
    mixer.update(delta)
    if (modelGroundLocal) {
      model.position.copy(modelGroundLocal)
    }
  })

  return { mixer, hasClips: clips.length > 0 }
}
