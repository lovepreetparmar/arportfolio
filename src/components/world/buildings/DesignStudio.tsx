import { useMemo } from 'react'
import * as THREE from 'three'
import type { Project } from '../../../data/projects'
import type { ProjectWorldConfig } from '../../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT } from '../../../data/worldLayout'
import { WindowSpill } from '../daynight/BuildingLighting'
import { glowMat, WORLD_PALETTE, worldMat } from '../worldMaterials'
import { Door, EntranceApron, ProjectPoster, SignBoard, signName, Window } from './BuildingKit'

const { width: W, depth: D } = ARCHETYPE_FOOTPRINT.studio
const H = 3.2
const FZ = D / 2
const TEETH = 3
const TOOTH_RISE = 0.75

/** Sculpture of stacked primitives beside the entrance. */
function PrimitiveSculpture({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} material={worldMat(WORLD_PALETTE.stone, 0.95)} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.16, 32]} />
      </mesh>
      <mesh position={[-0.12, 0.44, 0]} rotation={[0, 0.5, 0]} material={worldMat(WORLD_PALETTE.charcoal, 0.7)} castShadow>
        <boxGeometry args={[0.56, 0.56, 0.56]} />
      </mesh>
      <mesh position={[-0.12, 1.04, 0]} material={worldMat(WORLD_PALETTE.mutedRed, 0.6)} castShadow>
        <sphereGeometry args={[0.32, 32, 24]} />
      </mesh>
      <mesh position={[0.38, 0.5, 0.22]} material={worldMat(WORLD_PALETTE.ochre, 0.7)} castShadow>
        <coneGeometry args={[0.2, 0.68, 32]} />
      </mesh>
    </group>
  )
}

/** Bright modern studio: sawtooth skylights, one big glazed opening and the project on the facade. */
export function DesignStudio({ project, config }: { project: Project; config: ProjectWorldConfig }) {
  const tooth = useMemo(() => {
    const tw = W / TEETH
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(tw, 0)
    shape.lineTo(tw, TOOTH_RISE)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: D + 0.1, bevelEnabled: false })
    g.translate(-W / 2, 0, -(D + 0.1) / 2)
    return g
  }, [])
  const signStyle = useMemo(
    () => ({ background: WORLD_PALETTE.whiteWall, color: WORLD_PALETTE.ink, subtitle: config.environment.exteriorLabel }),
    [config.environment.exteriorLabel],
  )
  const tw = W / TEETH

  return (
    <group>
      <mesh position={[0, H / 2, 0]} material={worldMat(WORLD_PALETTE.whiteWall, 0.9)} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={worldMat(WORLD_PALETTE.charcoal, 0.8)} receiveShadow>
        <boxGeometry args={[W + 0.04, 0.14, D + 0.04]} />
      </mesh>
      <mesh position={[0, H + 0.04, 0]} material={worldMat(WORLD_PALETTE.charcoal, 0.8)} castShadow>
        <boxGeometry args={[W + 0.1, 0.08, D + 0.1]} />
      </mesh>
      {Array.from({ length: TEETH }, (_, i) => (
        <group key={i} position={[i * tw, H + 0.08, 0]}>
          <mesh geometry={tooth} material={worldMat(WORLD_PALETTE.slate, 0.8)} castShadow receiveShadow />
          <mesh
            position={[-W / 2 + tw + 0.006, TOOTH_RISE / 2, 0]}
            rotation={[0, Math.PI / 2, 0]}
            material={glowMat('#e8dcc4', 0.35)}
          >
            <planeGeometry args={[D - 0.2, TOOTH_RISE - 0.12]} />
          </mesh>
        </group>
      ))}

      <Window
        width={1.62}
        height={2.25}
        position={[-1.42, 1.37, FZ]}
        frameColor={WORLD_PALETTE.ink}
        mullions="vertical"
        glow={0.3}
      />
      <Door
        width={0.9}
        height={2.15}
        z={FZ}
        color={WORLD_PALETTE.ink}
        frameColor={WORLD_PALETTE.ink}
        handleColor="#d8d2c6"
        glazed
        entranceLight="bar"
      />
      <WindowSpill x={-1.42} z={FZ} width={1.62} strength={0.24} />
      {project.images[0] && (
        <ProjectPoster
          src={project.images[0]}
          width={1.05}
          maxHeight={1.55}
          position={[1.5, 1.45, FZ + 0.03]}
          frameColor={WORLD_PALETTE.ink}
        />
      )}
      <SignBoard
        text={signName(project.title, config.environment.exteriorLabel)}
        width={2.5}
        height={0.42}
        position={[0, 2.78, FZ + 0.04]}
        style={signStyle}
        edgeColor={WORLD_PALETTE.ink}
        depth={0.04}
      />
      <mesh position={[W / 2 + 0.005, 1.7, -0.3]} rotation={[0, Math.PI / 2, 0]} material={worldMat(WORLD_PALETTE.mutedRed, 0.7)}>
        <circleGeometry args={[0.85, 48]} />
      </mesh>

      <PrimitiveSculpture position={[-W / 2 - 0.35, 0, FZ + 1.35]} />
      <EntranceApron width={2} z={FZ} depth={1.3} color="#e4ddd0" mat={WORLD_PALETTE.ink} />
    </group>
  )
}
