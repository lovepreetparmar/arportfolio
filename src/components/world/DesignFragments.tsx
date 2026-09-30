import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'

const fragments = [
  { t: '—', pos: [1.2, 0.4, -2.2], r: 0.1 },
  { t: '01', pos: [-1.5, 0.25, -1.8], r: -0.08 },
  { t: '+', pos: [2, 0.35, -3], r: 0.05 },
]

export function DesignFragments() {
  const group = useRef<THREE.Group>(null)
  const { character } = useWorldState()
  const { camera } = useThree()
  const items = useMemo(() => fragments, [])

  useFrame((state) => {
    if (!group.current) return
    const nearCam = camera.position.distanceTo(new THREE.Vector3(character.x, 0, character.z))
    group.current.visible = nearCam < 14
    group.current.position.set(character.x, 0, character.z)
    group.current.children.forEach((child, i) => {
      const base = items[i]
      child.position.y = base.pos[1] + Math.sin(state.clock.elapsedTime * 0.35 + i) * 0.02
      child.rotation.z = base.r + Math.sin(state.clock.elapsedTime * 0.25 + i) * 0.015
    })
  })

  return (
    <group ref={group}>
      {items.map((f) => (
        <mesh key={f.t} position={f.pos as [number, number, number]} rotation={[0, 0, f.r]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial color="#1a1a1a" transparent opacity={0.07} />
        </mesh>
      ))}
    </group>
  )
}
