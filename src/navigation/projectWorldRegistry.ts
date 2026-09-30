import * as THREE from 'three'

const positions = new Map<string, THREE.Vector3>()

export function registerProjectWorldPosition(slug: string, object: THREE.Object3D) {
  const v = new THREE.Vector3()
  object.getWorldPosition(v)
  positions.set(slug, v)
}

export function getRegisteredProjectWorldPosition(slug: string): THREE.Vector3 | null {
  return positions.get(slug) ?? null
}

export function clearProjectWorldRegistry() {
  positions.clear()
}
