import { useMemo } from 'react'
import * as THREE from 'three'
import { createCharacterMaterial, PALETTE } from './characterMaterials'

const top = createCharacterMaterial(PALETTE.top, 0.88, 0)
const topShadow = createCharacterMaterial(PALETTE.topShadow, 0.9, 0)

type CharacterClothingProps = {
  segments: number
}

/** Fitted black top tucked into the high-waisted trousers (chest space). */
export function CharacterClothing({ segments }: CharacterClothingProps) {
  const topGeo = useMemo(() => {
    const points = [
      new THREE.Vector2(0, -0.12),
      new THREE.Vector2(0.112, -0.12),
      new THREE.Vector2(0.118, -0.04),
      new THREE.Vector2(0.138, 0.06),
      new THREE.Vector2(0.15, 0.15),
      new THREE.Vector2(0.142, 0.24),
      new THREE.Vector2(0.118, 0.31),
      new THREE.Vector2(0.074, 0.36),
      new THREE.Vector2(0.05, 0.385),
      new THREE.Vector2(0, 0.385),
    ]
    return new THREE.LatheGeometry(points, segments)
  }, [segments])

  return (
    <group>
      <mesh geometry={topGeo} scale={[1, 1, 0.76]} material={top} />
      <mesh position={[0, 0.372, 0.018]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={topShadow}>
        <torusGeometry args={[0.05, 0.006, 6, segments]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.145, 0.315, 0]} scale={[1, 0.75, 0.85]} material={top}>
          <sphereGeometry args={[0.062, segments, segments]} />
        </mesh>
      ))}
    </group>
  )
}
