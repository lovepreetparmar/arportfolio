import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

export type InstanceItem = {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number] | number
  color?: string
}

type InstancedPartsProps = {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: InstanceItem[]
  castShadow?: boolean
  receiveShadow?: boolean
}

const m4 = new THREE.Matrix4()
const pos = new THREE.Vector3()
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()
const scl = new THREE.Vector3()
const col = new THREE.Color()

/** One draw call for many copies of a mesh; per-instance colour multiplies a white material. */
export function InstancedParts({ geometry, material, items, castShadow, receiveShadow }: InstancedPartsProps) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((it, i) => {
      pos.set(...it.position)
      euler.set(...(it.rotation ?? [0, 0, 0]))
      quat.setFromEuler(euler)
      if (typeof it.scale === 'number' || it.scale === undefined) scl.setScalar(it.scale ?? 1)
      else scl.set(...it.scale)
      m4.compose(pos, quat, scl)
      mesh.setMatrixAt(i, m4)
      if (it.color) mesh.setColorAt(i, col.set(it.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  if (items.length === 0) return null
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}
