import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { ABOUT_POSITION } from '../../data/worldLayout'
import { site } from '../../data/site'
import { useWorldState } from '../../context/WorldStateContext'

export function AboutSign() {
  const group = useRef<THREE.Group>(null)
  const { character } = useWorldState()

  useFrame(() => {
    if (!group.current) return
    const d = Math.hypot(character.x - ABOUT_POSITION.x, character.z - ABOUT_POSITION.z)
    group.current.visible = d < 12
  })

  return (
    <group ref={group} position={[ABOUT_POSITION.x, 0, ABOUT_POSITION.z]} visible={false}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.6, 2, 0.04]} />
        <meshStandardMaterial color="#f7f3ec" roughness={0.95} />
      </mesh>
      <Html center position={[0, 1.2, 0.05]} distanceFactor={8}>
        <div className="w-44 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase">{site.name}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-ink/60">{site.role}</p>
        </div>
      </Html>
    </group>
  )
}
