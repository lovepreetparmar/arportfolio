import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CHARACTER_LOCOMOTION_URL } from './characterConfig'

export type LocomotionSource = { scene: THREE.Object3D; animations: THREE.AnimationClip[] }

let pending: Promise<LocomotionSource> | null = null

/** Loads the locomotion rig and clips without React Suspense, so the world never waits on this file. */
export function loadLocomotionSource(): Promise<LocomotionSource> {
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      CHARACTER_LOCOMOTION_URL,
      (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations }),
      undefined,
      (err) => {
        pending = null
        reject(err)
      },
    )
  })
  return pending
}
