import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
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
  modelGroundLocal?: RefObject<THREE.Vector3>
}

const BASE_WALK_SPEED = 1.0

function restoreBindPose(model: THREE.Object3D) {
  model.traverse((child) => {
    const skinned = child as THREE.SkinnedMesh
    if (skinned.isSkinnedMesh && skinned.skeleton) {
      skinned.skeleton.pose()
    }
  })
}

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

    mixer.stopAllAction()
    restoreBindPose(model)
    const walk = findAnimationAction(actions.current, [...ANIM.walk])
    onReady(!!walk || clips.some((c) => c.name === 'Idle'))
  }, [clips, mixer, model, onReady])

  useEffect(() => {
    const walk = findAnimationAction(actions.current, [...ANIM.walk])
    const inspect = findAnimationAction(actions.current, [...ANIM.inspect])

    let next: THREE.AnimationAction | null = null
    if (animState === 'walk' && walk) {
      next = walk
    } else if (animState === 'inspect' && inspect) {
      next = inspect
    }

    if (animState === 'walk' && !walk && import.meta.env.DEV) {
      console.warn('[Character] Walk requested but no Walk clip is loaded')
    }

    if (!next) {
      if (current.current) {
        current.current.fadeOut(0.2)
        current.current = null
      }
      mixer.stopAllAction()
      restoreBindPose(model)
      return
    }

    if (next === current.current) {
      if (animState === 'walk') {
        next.timeScale = THREE.MathUtils.clamp(walkSpeed / BASE_WALK_SPEED, 0.85, 1.25)
      }
      return
    }

    current.current?.fadeOut(0.2)
    next.reset().fadeIn(0.2).play()
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
  }, [animState, walkSpeed, onDebug, mixer, model])

  useFrame((_, delta) => {
    if (current.current) {
      mixer.update(delta)
    }
    const ground = modelGroundLocal?.current
    if (ground) {
      model.position.copy(ground)
    }
  }, 0)

  return { mixer, hasClips: clips.length > 0 }
}
