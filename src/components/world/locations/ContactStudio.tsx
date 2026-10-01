import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { WorldLocation } from '../../../data/worldLocations'
import { WindowSpill } from '../daynight/BuildingLighting'
import { Door, EntranceApron, Planter, SignBoard, Window } from '../buildings/BuildingKit'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'

/** Eaves height at the front and back: the roof falls away from the door. */
const FRONT_H = 3.45
const BACK_H = 2.85
const BOARDS = '#4f6d61'
const TRIM = '#efe6d4'
const ROOF = '#2f3533'
const DOOR = '#a0714b'

/** Post-mounted letterbox beside the path. */
function Mailbox({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const body = worldMat('#3f5a4c', 0.6, 0.2)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]} material={worldMat(WORLD_PALETTE.woodDark, 0.85)} castShadow>
        <boxGeometry args={[0.08, 1, 0.08]} />
      </mesh>
      <mesh position={[0, 1.08, 0]} material={body} castShadow>
        <boxGeometry args={[0.26, 0.2, 0.42]} />
      </mesh>
      <mesh position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={body} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.42, 14, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh position={[0, 1.12, 0.212]} material={worldMat(TRIM, 0.7)}>
        <boxGeometry args={[0.2, 0.04, 0.005]} />
      </mesh>
      <group position={[0.14, 1.12, -0.08]}>
        <mesh position={[0, 0.12, 0]} material={worldMat('#2a2a2a', 0.5, 0.4)}>
          <boxGeometry args={[0.015, 0.24, 0.015]} />
        </mesh>
        <mesh position={[0, 0.2, 0.05]} material={worldMat(WORLD_PALETTE.mutedRed, 0.6)}>
          <boxGeometry args={[0.015, 0.08, 0.1]} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * The contact studio: a small sage-boarded workroom with a roof that falls to the back, a warm
 * door and window, a letterbox by the path and a quiet sign. It is a soft glow among the trees
 * after dark.
 */
export function ContactStudio({ location }: { location: WorldLocation }) {
  const { width: W, depth: D } = location.footprint!
  const FZ = D / 2
  const body = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-D / 2, 0)
    shape.lineTo(D / 2, 0)
    shape.lineTo(D / 2, BACK_H)
    shape.lineTo(-D / 2, FRONT_H)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false })
    g.rotateY(Math.PI / 2)
    g.translate(-W / 2, 0, 0)
    return g
  }, [W, D])
  useEffect(() => () => body.dispose(), [body])
  const slope = Math.atan2(FRONT_H - BACK_H, D)
  const roofLen = Math.hypot(D, FRONT_H - BACK_H) + 0.5
  const signStyle = useMemo(() => ({ background: TRIM, color: WORLD_PALETTE.ink, serif: true }), [])
  const trim = worldMat(TRIM, 0.75)

  return (
    <group>
      <mesh geometry={body} material={worldMat(BOARDS, 0.85)} castShadow receiveShadow />
      {Array.from({ length: Math.floor(W / 0.35) }, (_, i) => (
        <mesh key={i} position={[-W / 2 + 0.35 * (i + 0.5), 1.45, FZ + 0.004]} material={worldMat('#486357', 0.85)}>
          <boxGeometry args={[0.012, 2.9, 0.008]} />
        </mesh>
      ))}
      <mesh position={[0, 0.15, 0]} material={worldMat(WORLD_PALETTE.stoneDark, 0.95)} receiveShadow>
        <boxGeometry args={[W + 0.06, 0.3, D + 0.06]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, FRONT_H / 2, FZ]} material={trim} castShadow>
          <boxGeometry args={[0.1, FRONT_H, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, (FRONT_H + BACK_H) / 2 + 0.06, 0]} rotation={[-slope, 0, 0]} material={worldMat(ROOF, 0.8)} castShadow receiveShadow>
        <boxGeometry args={[W + 0.4, 0.1, roofLen]} />
      </mesh>
      <mesh position={[0, FRONT_H + 0.02, FZ + 0.24]} rotation={[-slope, 0, 0]} material={trim}>
        <boxGeometry args={[W + 0.42, 0.14, 0.04]} />
      </mesh>

      <Door width={0.95} height={2.15} z={FZ} color={DOOR} frameColor={TRIM} handleColor="#2a2a2a" glazed entranceLight="pendant" />
      <Window width={0.95} height={1.15} position={[1.35, 1.5, FZ]} frameColor={TRIM} mullions="cross" sill={TRIM} nightGlass="#ffd49a" />
      <WindowSpill x={1.35} z={FZ} width={0.95} strength={0.24} />
      <Window width={0.5} height={1.15} position={[-1.4, 1.5, FZ]} frameColor={TRIM} mullions="none" sill={TRIM} nightGlass="#ffd49a" />
      <SignBoard
        text="Contact"
        width={1.3}
        height={0.3}
        position={[0, 2.78, FZ + 0.04]}
        style={signStyle}
        edgeColor={TRIM}
        depth={0.035}
        nightGlow={0.6}
      />

      <Mailbox position={[-1.55, 0, FZ + 0.75]} rotationY={0.25} />
      <Planter position={[1.5, 0, FZ + 0.5]} pot={WORLD_PALETTE.terracotta} kind="bush" />
      <EntranceApron width={1.7} z={FZ} depth={1.2} color="#e3dccd" mat={WORLD_PALETTE.woodDark} />
    </group>
  )
}
