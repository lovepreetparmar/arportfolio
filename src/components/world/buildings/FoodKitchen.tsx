import { useMemo } from 'react'
import type { Project } from '../../../data/projects'
import type { ProjectWorldConfig } from '../../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT } from '../../../data/worldLayout'
import { WindowSpill } from '../daynight/BuildingLighting'
import { createStripeTexture, WORLD_PALETTE, worldMat } from '../worldMaterials'
import { Awning, Door, EaselPoster, EntranceApron, GableRoof, Planter, SignBoard, signName, Window } from './BuildingKit'

const { width: W, depth: D } = ARCHETYPE_FOOTPRINT.kitchen
const H = 2.7
const FZ = D / 2

function BistroSet({ position }: { position: [number, number, number] }) {
  const metal = worldMat(WORLD_PALETTE.charcoal, 0.5, 0.3)
  const top = worldMat(WORLD_PALETTE.ivory, 0.6)
  const wood = worldMat(WORLD_PALETTE.wood, 0.8)
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} material={top} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
      </mesh>
      <mesh position={[0, 0.36, 0]} material={metal} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.72, 8]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={metal}>
        <cylinderGeometry args={[0.18, 0.18, 0.03, 16]} />
      </mesh>
      <mesh position={[0.05, 0.76, 0.05]} material={worldMat(WORLD_PALETTE.flowerTerracotta, 0.8)}>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.55, 0, 0]} rotation={[0, (-s * Math.PI) / 2, 0]}>
          <mesh position={[0, 0.45, 0]} material={wood} castShadow>
            <boxGeometry args={[0.36, 0.04, 0.36]} />
          </mesh>
          <mesh position={[0, 0.72, -0.17]} material={wood} castShadow>
            <boxGeometry args={[0.36, 0.34, 0.03]} />
          </mesh>
          {[-1, 1].flatMap((a) =>
            [-1, 1].map((b) => (
              <mesh key={`${a}${b}`} position={[a * 0.15, 0.22, b * 0.15]} material={metal}>
                <boxGeometry args={[0.025, 0.44, 0.025]} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  )
}

/** Warm plaster kitchen with terracotta tiling, a striped awning and a pitched roof. */
export function FoodKitchen({ project, config }: { project: Project; config: ProjectWorldConfig }) {
  const stripes = useMemo(() => createStripeTexture(WORLD_PALETTE.ivory, WORLD_PALETTE.terracotta, 14), [])
  const signStyle = useMemo(
    () => ({
      background: WORLD_PALETTE.ivory,
      color: WORLD_PALETTE.terracottaDeep,
      subtitle: config.environment.exteriorLabel,
      subtitleColor: WORLD_PALETTE.charcoal,
    }),
    [config.environment.exteriorLabel],
  )

  return (
    <group>
      <mesh position={[0, H / 2, 0]} material={worldMat(WORLD_PALETTE.plaster, 0.95)} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, 0.43, 0]} material={worldMat(WORLD_PALETTE.terracotta, 0.85)} castShadow receiveShadow>
        <boxGeometry args={[W + 0.05, 0.86, D + 0.05]} />
      </mesh>
      <mesh position={[0, 0.88, 0]} material={worldMat(WORLD_PALETTE.ivory, 0.8)}>
        <boxGeometry args={[W + 0.09, 0.05, D + 0.09]} />
      </mesh>

      <GableRoof
        width={W}
        depth={D}
        rise={1.25}
        baseY={H}
        roofColor={WORLD_PALETTE.terracottaDeep}
        wallColor={WORLD_PALETTE.plaster}
        overhang={0.26}
      />
      <group position={[1.35, H + 0.75, -0.7]}>
        <mesh material={worldMat(WORLD_PALETTE.plaster, 0.95)} castShadow>
          <boxGeometry args={[0.42, 1.3, 0.42]} />
        </mesh>
        <mesh position={[0, 0.68, 0]} material={worldMat(WORLD_PALETTE.charcoal, 0.8)} castShadow>
          <boxGeometry args={[0.52, 0.07, 0.52]} />
        </mesh>
      </group>

      {[-1.55, 1.55].map((x) => (
        <Window
          key={x}
          width={1.3}
          height={1.2}
          position={[x, 1.52, FZ]}
          frameColor={WORLD_PALETTE.charcoal}
          mullions="grid"
          sill={WORLD_PALETTE.wood}
          glow={0.34}
        />
      ))}
      {[-1.55, 1.55].map((x) => (
        <WindowSpill key={x} x={x} z={FZ} width={1.3} />
      ))}
      <Door
        width={0.95}
        height={2.08}
        z={FZ}
        color={WORLD_PALETTE.woodDark}
        frameColor={WORLD_PALETTE.charcoal}
        glazed
        entranceLight="pendant"
      />
      <Awning width={W - 0.25} depth={0.95} y={2.5} z={FZ} texture={stripes} valance={WORLD_PALETTE.terracotta} />

      <SignBoard
        text={signName(project.title, config.environment.exteriorLabel)}
        width={2.3}
        height={0.48}
        position={[0, H + 0.42, FZ + 0.05]}
        style={signStyle}
        edgeColor={WORLD_PALETTE.charcoal}
      />

      <Planter position={[-1.55, 0, FZ + 0.28]} pot={WORLD_PALETTE.woodDark} kind="herbs" />
      <BistroSet position={[-2.1, 0, FZ + 1.45]} />
      {project.images[0] && <EaselPoster src={project.images[0]} position={[1.45, 0, FZ + 0.95]} rotationY={-0.25} />}
      <EntranceApron width={2.2} z={FZ} depth={1.3} color="#dccdb6" mat={WORLD_PALETTE.terracottaDeep} />
    </group>
  )
}
