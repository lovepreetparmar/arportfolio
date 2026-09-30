import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { contactWorld } from '../../data/world3d'
import { site } from '../../data/site'
import { useWorldState } from '../../context/WorldStateContext'

export function ContactSign() {
  const group = useRef<THREE.Group>(null)
  const { character } = useWorldState()

  useFrame(() => {
    if (!group.current) return
    const d = Math.hypot(character.x - contactWorld.x, character.z - contactWorld.z)
    const visible = d < 14
    group.current.visible = visible
    const opacity = THREE.MathUtils.clamp(1 - (d - 4) / 10, 0, 1)
    group.current.children.forEach((child) => {
      if ((child as THREE.Mesh).material) {
        const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        if (m.transparent !== undefined) m.opacity = opacity
      }
    })
  })

  return (
    <group ref={group} position={[contactWorld.x, 0, contactWorld.z]} visible={false}>
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[2.2, 2.2, 0.05]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.96} transparent opacity={1} />
      </mesh>
      <Html center position={[0, 1.35, 0.04]} distanceFactor={7}>
        <div className="w-40 text-center text-lg font-semibold leading-tight tracking-tight">
          <p>LET&apos;S</p>
          <p>MAKE</p>
          <p>SOMETHING</p>
        </div>
      </Html>
      {site.email ? (
        <Html position={[0, 0.35, 0.15]} center distanceFactor={11}>
          <div className="text-center text-[10px] tracking-[0.2em] uppercase opacity-70">
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </div>
        </Html>
      ) : null}
    </group>
  )
}
