import { useMemo } from 'react'
import type { WorldLocation } from '../../../data/worldLocations'
import { site } from '../../../data/site'
import { WindowSpill } from '../daynight/BuildingLighting'
import { Door, EntranceApron, GableRoof, Planter, SignBoard, Window } from '../buildings/BuildingKit'
import { FLOWER_COLORS, glowMat, WORLD_PALETTE, worldMat } from '../worldMaterials'

const H = 3
const ROOF_RISE = 1.35
const PLASTER = '#f1e4cf'
const TIMBER = '#5b4535'
const ROOF = '#5f7356'
const DOOR = '#3f5a4c'

/** Flower box under a window: a few heads in the studio's warm colours. */
function WindowBox({ x, z, width }: { x: number; z: number; width: number }) {
  const heads = [FLOWER_COLORS[0], FLOWER_COLORS[4], FLOWER_COLORS[1], FLOWER_COLORS[0], FLOWER_COLORS[2]]
  return (
    <group position={[x, 0.62, z + 0.13]}>
      <mesh material={worldMat(TIMBER, 0.85)} castShadow>
        <boxGeometry args={[width, 0.18, 0.22]} />
      </mesh>
      {heads.map((c, i) => (
        <group key={i} position={[-width / 2 + 0.16 + (i * (width - 0.32)) / (heads.length - 1), 0.12, 0]}>
          <mesh scale={[1, 0.8, 1]} material={worldMat(WORLD_PALETTE.leafDeep, 0.9)}>
            <sphereGeometry args={[0.1, 10, 8]} />
          </mesh>
          <mesh position={[0, 0.08, 0.04]} material={worldMat(c, 0.7)}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A climbing plant on a timber trellis up the sunny side wall. */
function Trellis({ x, depth }: { x: number; depth: number }) {
  const wood = worldMat(TIMBER, 0.85)
  const leaves = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = Math.sin(i * 12.9898) * 43758.5453
        const r = a - Math.floor(a)
        return {
          z: -depth / 2 + 0.35 + ((i * 0.37) % 1) * (depth - 0.7),
          y: 0.3 + (i / 16) * 2.3 + r * 0.25,
          s: 0.14 + r * 0.08,
          c: i % 3 === 0 ? WORLD_PALETTE.leafLight : i % 2 ? WORLD_PALETTE.leaf : WORLD_PALETTE.leafDeep,
        }
      }),
    [depth],
  )
  return (
    <group position={[x, 0, 0]}>
      {[-0.9, 0, 0.9].map((z) => (
        <mesh key={z} position={[0.03, 1.35, z]} material={wood}>
          <boxGeometry args={[0.04, 2.7, 0.04]} />
        </mesh>
      ))}
      {[0.7, 1.4, 2.1].map((y) => (
        <mesh key={y} position={[0.05, y, 0]} material={wood}>
          <boxGeometry args={[0.03, 0.04, 2]} />
        </mesh>
      ))}
      {leaves.map((l, i) => (
        <mesh key={i} position={[0.1, l.y, l.z]} scale={[0.6, 1, 1]} material={worldMat(l.c, 0.9)} castShadow>
          <sphereGeometry args={[l.s, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Anushri's own studio: a small plastered atelier with a sage roof, warm windows with flower
 * boxes, a climbing plant and her name over the door. After dark the windows and lantern glow.
 */
export function AboutStudio({ location }: { location: WorldLocation }) {
  const { width: W, depth: D } = location.footprint!
  const FZ = D / 2
  const signStyle = useMemo(
    () => ({ background: '#f7efe0', color: WORLD_PALETTE.ink, subtitle: 'Studio', serif: true, border: '#c9b48f' }),
    [],
  )
  const timber = worldMat(TIMBER, 0.85)

  return (
    <group>
      <mesh position={[0, H / 2, 0]} material={worldMat(PLASTER, 0.92)} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={worldMat(WORLD_PALETTE.stoneDark, 0.95)} receiveShadow>
        <boxGeometry args={[W + 0.06, 0.4, D + 0.06]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * W) / 2, H / 2, (sz * D) / 2]} material={timber} castShadow>
            <boxGeometry args={[0.12, H, 0.12]} />
          </mesh>
        )),
      )}
      <mesh position={[0, H - 0.06, FZ + 0.03]} material={timber}>
        <boxGeometry args={[W + 0.1, 0.12, 0.08]} />
      </mesh>
      <GableRoof width={W} depth={D} rise={ROOF_RISE} baseY={H} roofColor={ROOF} wallColor={PLASTER} overhang={0.28} />
      <group position={[0, H + 0.55, FZ + 0.006]}>
        <mesh material={glowMat(WORLD_PALETTE.glassDay, 0.28, '#ffd49a', 0.28)}>
          <circleGeometry args={[0.32, 28]} />
        </mesh>
        <mesh material={timber}>
          <torusGeometry args={[0.33, 0.035, 6, 28]} />
        </mesh>
      </group>

      <Door width={1} height={2.2} z={FZ} color={DOOR} frameColor={TIMBER} glazed entranceLight="lantern" />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Window
            width={1.2}
            height={1.4}
            position={[s * 1.65, 1.55, FZ]}
            frameColor={TIMBER}
            mullions="grid"
            sill={TIMBER}
            nightGlass="#ffd6a0"
          />
          {s < 0 && <WindowBox x={s * 1.65} z={FZ} width={1.3} />}
          <WindowSpill x={s * 1.65} z={FZ} width={1.2} strength={0.26} />
        </group>
      ))}
      <SignBoard
        text={site.name}
        width={2.1}
        height={0.4}
        position={[0, 2.8, FZ + 0.04]}
        style={signStyle}
        edgeColor={TIMBER}
        depth={0.04}
        nightGlow={0.55}
      />
      {/* A cup of coffee left to go cold on the sill. */}
      <group position={[1.98, 0.875, FZ + 0.08]}>
        <mesh material={worldMat('#f4efe6', 0.5)}>
          <cylinderGeometry args={[0.04, 0.034, 0.08, 12]} />
        </mesh>
        <mesh position={[0, 0.036, 0]} material={worldMat('#4a2f22', 0.4)}>
          <cylinderGeometry args={[0.034, 0.034, 0.005, 12]} />
        </mesh>
      </group>

      <Trellis x={W / 2} depth={D} />
      <Planter position={[-2, 0, FZ + 0.55]} pot={WORLD_PALETTE.terracotta} kind="bush" scale={1.1} />
      <Planter position={[2.05, 0, FZ + 0.5]} pot={WORLD_PALETTE.terracotta} kind="topiary" />
      <EntranceApron width={1.9} z={FZ} depth={1.3} color="#e9dcc4" mat={TIMBER} />
    </group>
  )
}
