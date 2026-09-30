import { useMemo } from 'react'
import * as THREE from 'three'
import { createCharacterMaterial, createCheckTexture, createSkinMaterial, PALETTE } from './characterMaterials'

const skin = createSkinMaterial()
const trouser = new THREE.MeshStandardMaterial({ map: createCheckTexture(), roughness: 0.9, metalness: 0 })
const trouserDeep = createCharacterMaterial(PALETTE.trouserDeep, 0.92, 0)
const sleeve = createCharacterMaterial(PALETTE.top, 0.88, 0)
const sleeveCuff = createCharacterMaterial(PALETTE.topShadow, 0.9, 0)
const shoe = createCharacterMaterial(PALETTE.shoe, 0.55, 0.05)
const gold = createCharacterMaterial(PALETTE.gold, 0.35, 0.6)
const watchStrap = createCharacterMaterial(PALETTE.watch, 0.5, 0.1)
const watchFace = createCharacterMaterial(PALETTE.watchFace, 0.3, 0.2)
const redThread = createCharacterMaterial(PALETTE.redThread, 0.7, 0)

type CharacterBodyProps = {
  segments: number
}

/** High-waisted checked trousers from hips to waist (spine space). */
export function CharacterBody({ segments }: CharacterBodyProps) {
  const pelvisGeo = useMemo(() => {
    const points = [
      new THREE.Vector2(0, -0.02),
      new THREE.Vector2(0.14, -0.02),
      new THREE.Vector2(0.155, 0.06),
      new THREE.Vector2(0.146, 0.15),
      new THREE.Vector2(0.122, 0.24),
      new THREE.Vector2(0.112, 0.3),
      new THREE.Vector2(0, 0.3),
    ]
    return new THREE.LatheGeometry(points, segments)
  }, [segments])

  return (
    <group>
      <mesh geometry={pelvisGeo} scale={[1, 1, 0.8]} material={trouser} />
      <mesh position={[0, 0.02, 0]} scale={[1.02, 0.42, 0.78]} material={trouser}>
        <sphereGeometry args={[0.14, segments, segments]} />
      </mesh>
      <mesh position={[0, 0.29, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]} material={trouserDeep}>
        <torusGeometry args={[0.113, 0.012, 8, segments]} />
      </mesh>
      <mesh position={[0, 0.29, 0.092]} material={gold}>
        <boxGeometry args={[0.022, 0.014, 0.006]} />
      </mesh>
    </group>
  )
}

export function LimbUpper({ segments }: { segments: number }) {
  return (
    <mesh position={[0, -0.18, 0]} material={sleeve}>
      <capsuleGeometry args={[0.053, 0.26, 6, segments]} />
    </mesh>
  )
}

/** Forearm: three-quarter sleeve ending just below the elbow, then skin. */
export function LimbLower({ segments }: { segments: number }) {
  return (
    <group position={[0, -0.37, 0]}>
      <mesh material={skin}>
        <capsuleGeometry args={[0.042, 0.26, 6, segments]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={sleeve}>
        <cylinderGeometry args={[0.052, 0.049, 0.13, segments]} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]} material={sleeveCuff}>
        <torusGeometry args={[0.048, 0.006, 6, segments]} />
      </mesh>
    </group>
  )
}

type WristDetail = 'watch' | 'thread'

export function HandMesh({
  segments,
  side,
  wrist,
}: {
  segments: number
  side: -1 | 1
  wrist?: WristDetail
}) {
  return (
    <group>
      {wrist === 'watch' && (
        <group position={[0, -0.525, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={watchStrap}>
            <torusGeometry args={[0.04, 0.008, 6, segments]} />
          </mesh>
          <mesh position={[side * 0.046, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={watchStrap}>
            <cylinderGeometry args={[0.017, 0.017, 0.008, 18]} />
          </mesh>
          <mesh position={[side * 0.0505, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={watchFace}>
            <cylinderGeometry args={[0.013, 0.013, 0.002, 18]} />
          </mesh>
        </group>
      )}
      {wrist === 'thread' && (
        <mesh position={[0, -0.53, 0]} rotation={[Math.PI / 2, 0, 0]} material={redThread}>
          <torusGeometry args={[0.04, 0.0035, 5, segments]} />
        </mesh>
      )}
      <mesh position={[0, -0.59, 0.005]} scale={[0.8, 1.15, 0.55]} material={skin}>
        <sphereGeometry args={[0.043, segments, segments]} />
      </mesh>
      <mesh position={[0, -0.575, 0.03]} rotation={[0.4, 0, 0]} material={skin}>
        <capsuleGeometry args={[0.011, 0.03, 4, 6]} />
      </mesh>
    </group>
  )
}

/** Wide-leg pleated trousers with the shoe toe peeking out; feet rest on the ground. */
export function LegAssembly({ segments }: { segments: number }) {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} material={trouser}>
        <sphereGeometry args={[0.08, segments, 12]} />
      </mesh>
      <mesh position={[0, -0.2, 0]} material={trouser}>
        <cylinderGeometry args={[0.08, 0.071, 0.4, segments]} />
      </mesh>
      <mesh position={[0, -0.6, 0]} material={trouser}>
        <cylinderGeometry args={[0.071, 0.082, 0.42, segments]} />
      </mesh>
      <mesh position={[0, -0.36, 0.076]} rotation={[-0.02, 0, 0]} material={trouserDeep}>
        <boxGeometry args={[0.004, 0.62, 0.004]} />
      </mesh>
      <mesh position={[0, -0.805, 0]} material={trouserDeep}>
        <cylinderGeometry args={[0.083, 0.083, 0.012, segments]} />
      </mesh>
      <mesh position={[0, -0.808, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.75]} material={shoe}>
        <capsuleGeometry args={[0.036, 0.09, 6, 12]} />
      </mesh>
    </group>
  )
}
