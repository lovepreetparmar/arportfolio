import { useMemo } from 'react'
import * as THREE from 'three'
import type { Project } from '../../../data/projects'
import type { ProjectWorldConfig } from '../../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT } from '../../../data/worldLayout'
import { InteriorLight, LightPool, WindowSpill } from '../daynight/BuildingLighting'
import { lampGlassMaterial } from '../daynight/nightLighting'
import { glowMat, WORLD_PALETTE, worldMat } from '../worldMaterials'
import { Door, EntranceApron, Planter, ProjectPoster, SignBoard, signName, Window } from './BuildingKit'

const { width: W, depth: D } = ARCHETYPE_FOOTPRINT.boutique
const H = 3
const FZ = D / 2
const STOREFRONT = '#2a5244'

const slateMat = new THREE.MeshStandardMaterial({ color: WORLD_PALETTE.slate, roughness: 0.8, flatShading: true })

/** Ivory boutique with a dark storefront, arched display windows and a mansard roof. */
export function JewelleryBoutique({ project, config }: { project: Project; config: ProjectWorldConfig }) {
  const gold = worldMat(WORLD_PALETTE.gold, 0.32, 0.75)
  const ivory = worldMat(WORLD_PALETTE.ivory, 0.9)
  const trim = worldMat('#e6dccb', 0.9)
  const signStyle = useMemo(
    () => ({
      background: STOREFRONT,
      color: WORLD_PALETTE.gold,
      subtitle: config.environment.exteriorLabel,
      subtitleColor: '#d9c9a0',
      serif: true,
    }),
    [config.environment.exteriorLabel],
  )

  return (
    <group>
      <mesh position={[0, H / 2, 0]} material={ivory} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, 0.18, 0]} material={worldMat('#d8cebd', 0.95)} castShadow receiveShadow>
        <boxGeometry args={[W + 0.08, 0.36, D + 0.08]} />
      </mesh>
      <mesh position={[0, H + 0.08, 0]} material={trim} castShadow>
        <boxGeometry args={[W + 0.28, 0.16, D + 0.28]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.02), H / 2, FZ + 0.02]} material={trim} castShadow>
          <boxGeometry args={[0.16, H, 0.1]} />
        </mesh>
      ))}

      <mesh
        position={[0, H + 0.16 + 0.47, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[(W + 0.1) / Math.SQRT2, 0.95, (D + 0.1) / Math.SQRT2]}
        material={slateMat}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.72, 1, 1, 4, 1]} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, H + 0.58, FZ - 0.17]} rotation={[-0.48, 0, 0]}>
          <mesh position={[0, 0, 0.02]} material={glowMat('#efdcb7', 0.3)}>
            <circleGeometry args={[0.16, 24]} />
          </mesh>
          <mesh position={[0, 0, 0.025]} material={gold}>
            <torusGeometry args={[0.16, 0.022, 6, 28]} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.33, FZ + 0.04]} material={worldMat(STOREFRONT, 0.55, 0.1)} castShadow>
        <boxGeometry args={[3.9, 2.46, 0.08]} />
      </mesh>
      {[-1.28, 1.28].map((x, i) => (
        <group key={x}>
          <Window
            width={0.98}
            height={1.15}
            position={[x, 1.22, FZ + 0.085]}
            frameColor={WORLD_PALETTE.gold}
            mullions="none"
            arch
            glow={0.5}
            glass="#efdcb7"
            nightGlass="#ffa94d"
          />
          <mesh position={[x, 0.8, FZ + 0.16]} material={ivory} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.28, 16]} />
          </mesh>
          {i === 0 ? (
            <mesh position={[x, 1.04, FZ + 0.16]} material={gold} castShadow>
              <torusGeometry args={[0.09, 0.022, 10, 28]} />
            </mesh>
          ) : (
            <group position={[x, 1.02, FZ + 0.16]}>
              <mesh material={gold}>
                <torusGeometry args={[0.13, 0.008, 6, 28, Math.PI]} />
              </mesh>
              <mesh position={[0, -0.13, 0]} material={worldMat(WORLD_PALETTE.flowerCream, 0.25, 0.1)}>
                <sphereGeometry args={[0.035, 12, 10]} />
              </mesh>
            </group>
          )}
        </group>
      ))}
      <Door
        width={0.9}
        height={2.05}
        z={FZ + 0.08}
        color={STOREFRONT}
        frameColor={WORLD_PALETTE.gold}
        glazed
        entranceLight="none"
      />

      <SignBoard
        text={signName(project.title, config.environment.exteriorLabel)}
        width={2.7}
        height={0.44}
        position={[0, 2.8, FZ + 0.1]}
        style={signStyle}
        nightGlow={0.9}
      />

      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.15, 2.1, FZ + 0.12]}>
          <mesh material={gold}>
            <boxGeometry args={[0.04, 0.2, 0.12]} />
          </mesh>
          <mesh position={[0, 0.08, 0.1]} material={lampGlassMaterial('#ffc27a', 1.6, 0.8)}>
            <sphereGeometry args={[0.07, 14, 10]} />
          </mesh>
          <LightPool position={[s * 0.1, 0.03, 0.9]} size={[1.3, 1.5]} color="#ffd6a2" strength={0.3} />
        </group>
      ))}

      {[-1.28, 1.28].map((x) => (
        <WindowSpill key={x} x={x} z={FZ + 0.3} width={1} strength={0.4} />
      ))}
      <LightPool position={[0, 0.03, FZ + 2.3]} size={[4.2, 2.4]} color="#ffcf94" strength={0.24} />
      <InteriorLight position={[0, 1.5, FZ + 0.9]} color="#ffc98a" intensity={4.5} distance={5} />

      <Planter position={[-2.05, 0, FZ + 0.4]} pot={STOREFRONT} kind="topiary" />
      <Planter position={[2.05, 0, FZ + 0.4]} pot={STOREFRONT} kind="topiary" />
      <EntranceApron width={2.1} z={FZ} depth={1.3} color="#e3d7c3" mat={STOREFRONT} />

      {project.images[0] && (
        <ProjectPoster
          src={project.images[0]}
          width={1.3}
          maxHeight={1.7}
          position={[W / 2 + 0.03, 1.65, 0]}
          rotation={[0, Math.PI / 2, 0]}
          frameColor={WORLD_PALETTE.gold}
        />
      )}
    </group>
  )
}
