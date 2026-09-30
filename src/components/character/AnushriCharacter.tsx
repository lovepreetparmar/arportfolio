import { ContactShadows, useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { characterSpawn } from '../../data/world3d'
import { CHARACTER_LOCOMOTION_URL, CHARACTER_MODEL_URL, CHARACTER_TARGET_HEIGHT, BONE_NAMES } from './characterConfig'
import { buildCharacterClips } from './buildCharacterClips'
import { findBone } from './findBone'
import { CharacterPlaceholder } from './CharacterPlaceholder'
import { useCharacterAnimator, type AnimPlaybackState } from './CharacterAnimator'
import { CharacterController } from './CharacterController'
import { useCharacterKeyboard } from './useCharacterKeyboard'
import { applyProceduralRestPose } from './proceduralRestPose'
import { applyCharacterSkinTone } from './applyCharacterSkinTone'
type AnushriCharacterProps = {
  onArrivedAtProject?: (slug: string) => void
}

export function AnushriCharacter({ onArrivedAtProject }: AnushriCharacterProps) {
  const group = useRef<THREE.Group>(null)
  const modelGroundLocal = useRef(new THREE.Vector3())
  const [modelReady, setModelReady] = useState(false)
  const [animReady, setAnimReady] = useState(false)
  const [animState, setAnimState] = useState<AnimPlaybackState>('idle')
  const keys = useCharacterKeyboard()

  const gltf = useGLTF(CHARACTER_MODEL_URL)
  const loco = useGLTF(CHARACTER_LOCOMOTION_URL)

  const model = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Group, [gltf.scene])

  const clips = useMemo(
    () => buildCharacterClips(model, gltf.animations, loco.scene, loco.animations),
    [model, gltf.animations, loco.scene, loco.animations],
  )

  const bones = useMemo(
    () => ({
      head: findBone(model, BONE_NAMES.head),
      neck: findBone(model, BONE_NAMES.neck),
      spine: findBone(model, BONE_NAMES.spine),
    }),
    [model],
  )

  useLayoutEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            const id = `${mesh.name}::${m.name}`.toLowerCase()
            const isLikelySkin = ['body', 'skin', 'face', 'ch03'].some((h) => id.includes(h))
            if (!isLikelySkin) {
              m.roughness = Math.min(m.roughness, 0.92)
              m.metalness = Math.min(m.metalness, 0.08)
            }
          }
        })
      }
    })

    applyCharacterSkinTone(model)

    const box = new THREE.Box3().setFromObject(model)
    const height = Math.max(0.0001, box.max.y - box.min.y)
    const scale = CHARACTER_TARGET_HEIGHT / height
    model.scale.setScalar(scale)
    model.position.set(0, -box.min.y * scale, 0)
    modelGroundLocal.current.copy(model.position)
    if (group.current) {
      group.current.position.set(characterSpawn.x, 0, characterSpawn.z)
    }
    setModelReady(true)
  }, [model])

  const onAnimReady = useCallback((ready: boolean) => {
    setAnimReady(ready)
    if (!ready && import.meta.env.DEV) {
      console.warn('[Character] No idle clip — applying procedural rest pose fallback')
      applyProceduralRestPose(model, 1)
    }
  }, [model])

  const { hasClips } = useCharacterAnimator({
    model,
    clips,
    animState,
    walkSpeed: 1.45,
    onReady: onAnimReady,
    modelGroundLocal: modelGroundLocal.current,
  })

  if (!gltf.scene) {
    return <CharacterPlaceholder message="Character model unavailable — add public/models/anushri-character.glb" />
  }

  return (
    <group ref={group}>
        <primitive object={model} />
        {modelReady && (
          <CharacterController
            group={group}
            bones={bones}
            keys={keys}
            allowBoneLookAt={animState === 'inspect'}
            onAnimState={setAnimState}
            onArrivedAtProject={onArrivedAtProject}
          />
        )}
        {!animReady && !hasClips && modelReady && (
          <mesh visible={false} onUpdate={() => applyProceduralRestPose(model, 1)} />
        )}
        <ContactShadows position={[0, 0.002, 0]} opacity={0.22} scale={1.1} blur={2.2} far={1.6} resolution={512} />
    </group>
  )
}

useGLTF.preload(CHARACTER_MODEL_URL)
useGLTF.preload(CHARACTER_LOCOMOTION_URL)
