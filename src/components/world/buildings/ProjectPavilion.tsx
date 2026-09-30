import { useMemo } from 'react'
import type { Project } from '../../../data/projects'
import type { ProjectWorldConfig } from '../../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT, type PavilionStyle, type PavilionTone } from '../../../data/worldLayout'
import { WindowSpill } from '../daynight/BuildingLighting'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'
import { Door, EaselPoster, EntranceApron, GableRoof, Planter, SignBoard, signName, Window } from './BuildingKit'

const { width: W, depth: D } = ARCHETYPE_FOOTPRINT.pavilion
const H = 2.5
const FZ = D / 2

type Tone = {
  wall: string
  base: string
  /** Pitched roof, or the parapet cap on flat-roofed stone pavilions. */
  roof: string
  door: string
  frame: string
  pot: string
  /** Board battens on timber pavilions. */
  slat?: string
}

const TRIM = '#f5ecdc'

/** Curated colourways: muted, painted and harmonious, each wall paired with its roof. */
const TONES: Record<PavilionTone, Tone> = {
  cream: { wall: '#f3e5cc', base: '#d9c3a0', roof: '#b0573a', door: '#6f8f62', frame: WORLD_PALETTE.charcoal, pot: WORLD_PALETTE.terracotta },
  sage: { wall: '#b7c9a0', base: '#95a881', roof: '#6a4631', door: '#6a4631', frame: TRIM, pot: '#eadcc4' },
  coral: { wall: '#e8ad99', base: '#cf907c', roof: '#7c706b', door: '#46657a', frame: TRIM, pot: '#eadcc4' },
  yellow: { wall: '#f0cd7f', base: '#d3ad62', roof: '#56392a', door: '#56392a', frame: TRIM, pot: '#56392a' },
  honey: { wall: '#c9955f', base: WORLD_PALETTE.stoneDark, roof: '#4e6179', door: WORLD_PALETTE.woodDark, frame: TRIM, pot: WORLD_PALETTE.charcoal, slat: '#b07c4a' },
  walnut: { wall: '#8e6143', base: '#9c8d7c', roof: '#a2473a', door: '#3b281d', frame: '#f2e3c8', pot: '#a2473a', slat: '#77502f' },
  blue: { wall: '#a8c0d2', base: '#8ca5b8', roof: '#f3ebdd', door: '#2e3e52', frame: '#f3ebdd', pot: '#f3ebdd' },
  lavender: { wall: '#c6badb', base: '#a99cc0', roof: '#f4eef3', door: '#4b4064', frame: '#f4eef3', pot: '#f4eef3' },
  sand: { wall: '#e5d3b5', base: '#c9b391', roof: '#f6efe2', door: '#9a4634', frame: WORLD_PALETTE.charcoal, pot: '#9a4634' },
}

const DEFAULT_TONE: Record<PavilionStyle, PavilionTone> = { plaster: 'cream', wood: 'honey', stone: 'sand' }

/** Compact reusable project building; the style sets its construction, the tone its colours. */
export function ProjectPavilion({
  project,
  config,
  style = 'plaster',
  tone,
}: {
  project: Project
  config: ProjectWorldConfig
  style?: PavilionStyle
  tone?: PavilionTone
}) {
  const s = TONES[tone ?? DEFAULT_TONE[style]]
  const flat = style === 'stone'
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
          <mesh key={i} position={[-W / 2 + 0.2 + i * 0.4, H / 2 + 0.16, FZ + 0.006]} material={worldMat(s.slat ?? s.base, 0.9)}>
            <boxGeometry args={[0.025, H - 0.32, 0.01]} />
          </mesh>
        ))}

      {flat ? (
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
      {[-1.18, 1.18].map((x) => (
        <WindowSpill key={x} x={x} z={FZ} width={0.7} strength={0.22} />
      ))}
      <Door width={0.88} height={2} z={FZ} color={s.door} frameColor={s.frame} />
      <Planter position={[-1.3, 0, FZ + 0.35]} pot={s.pot} kind="bush" scale={0.85} />
      {project.images[0] && <EaselPoster src={project.images[0]} position={[1.4, 0, FZ + 0.9]} rotationY={-0.3} />}
      <EntranceApron width={1.8} z={FZ} depth={1.2} color="#e1d6c4" mat={s.door} />
    </group>
  )
}
