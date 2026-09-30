import { useMemo } from 'react'
import type { Project } from '../../../data/projects'
import type { ProjectWorldConfig } from '../../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT, type PavilionStyle } from '../../../data/worldLayout'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'
import { Door, EaselPoster, EntranceApron, GableRoof, Planter, SignBoard, signName, Window } from './BuildingKit'

const { width: W, depth: D } = ARCHETYPE_FOOTPRINT.pavilion
const H = 2.5
const FZ = D / 2

const STYLES: Record<
  PavilionStyle,
  { wall: string; base: string; roof: string; door: string; frame: string; flat: boolean; pot: string }
> = {
  plaster: {
    wall: '#efe4d3',
    base: '#d9ccb8',
    roof: WORLD_PALETTE.terracottaDeep,
    door: WORLD_PALETTE.sage,
    frame: WORLD_PALETTE.charcoal,
    flat: false,
    pot: WORLD_PALETTE.terracotta,
  },
  wood: {
    wall: '#bf9f7c',
    base: WORLD_PALETTE.stoneDark,
    roof: WORLD_PALETTE.slate,
    door: WORLD_PALETTE.woodDark,
    frame: WORLD_PALETTE.ivory,
    flat: false,
    pot: WORLD_PALETTE.charcoal,
  },
  stone: {
    wall: '#dcd3c4',
    base: '#c9bfae',
    roof: '#e7dfd2',
    door: WORLD_PALETTE.charcoal,
    frame: WORLD_PALETTE.charcoal,
    flat: true,
    pot: WORLD_PALETTE.stoneDark,
  },
}

/** Compact reusable project building; the style varies the palette and roof. */
export function ProjectPavilion({
  project,
  config,
  style = 'plaster',
}: {
  project: Project
  config: ProjectWorldConfig
  style?: PavilionStyle
}) {
  const s = STYLES[style]
  const signStyle = useMemo(
    () => ({
      background: WORLD_PALETTE.ivory,
      color: WORLD_PALETTE.ink,
      subtitle: `${project.number} · ${config.environment.exteriorLabel}`,
      subtitleColor: '#6f6a62',
    }),
    [project.number, config.environment.exteriorLabel],
  )

  return (
    <group>
      <mesh position={[0, H / 2, 0]} material={worldMat(s.wall, 0.92)} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={worldMat(s.base, 0.95)} castShadow receiveShadow>
        <boxGeometry args={[W + 0.06, 0.32, D + 0.06]} />
      </mesh>
      {style === 'wood' &&
        Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[-W / 2 + 0.2 + i * 0.4, H / 2 + 0.16, FZ + 0.006]} material={worldMat('#a98a68', 0.9)}>
            <boxGeometry args={[0.025, H - 0.32, 0.01]} />
          </mesh>
        ))}

      {s.flat ? (
        <>
          <mesh position={[0, H + 0.2, 0]} material={worldMat(s.roof, 0.9)} castShadow>
            <boxGeometry args={[W + 0.2, 0.4, D + 0.2]} />
          </mesh>
          <SignBoard
            text={signName(project.title, config.environment.exteriorLabel)}
            width={2.8}
            height={0.36}
            position={[0, H + 0.2, FZ + 0.12]}
            style={signStyle}
            depth={0.02}
          />
        </>
      ) : (
        <>
          <GableRoof width={W} depth={D} rise={1} baseY={H} roofColor={s.roof} wallColor={s.wall} overhang={0.2} />
          <SignBoard
            text={signName(project.title, config.environment.exteriorLabel)}
            width={1.9}
            height={0.36}
            position={[0, H + 0.3, FZ + 0.04]}
            style={signStyle}
            depth={0.03}
          />
        </>
      )}

      {[-1.18, 1.18].map((x) => (
        <Window
          key={x}
          width={0.7}
          height={0.95}
          position={[x, 1.42, FZ]}
          frameColor={s.frame}
          mullions="cross"
          sill={s.base}
        />
      ))}
      <Door width={0.88} height={2} z={FZ} color={s.door} frameColor={s.frame} />
      <Planter position={[-1.3, 0, FZ + 0.35]} pot={s.pot} kind="bush" scale={0.85} />
      {project.images[0] && <EaselPoster src={project.images[0]} position={[1.4, 0, FZ + 0.9]} rotationY={-0.3} />}
      <EntranceApron width={1.8} z={FZ} depth={1.2} color="#e1d6c4" mat={s.door} />
    </group>
  )
}
