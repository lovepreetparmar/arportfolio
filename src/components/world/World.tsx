import { Canvas } from '@react-three/fiber'
import { memo, Suspense } from 'react'
import * as THREE from 'three'
import { projects } from '../../data/projects'
import { Character } from '../character/Character'
import { CharacterLocomotionDebug } from '../character/CharacterLocomotionDebug'
import { WorldCameraRig } from './WorldCameraRig'
import { WorldEnvironment } from './WorldEnvironment'
import { WorldGround } from './WorldGround'
import { WorldProximity } from './WorldProximity'
import { WorldLocations } from './locations/WorldLocations'
import { characterSpawn } from '../../data/world3d'
import { WorldJourneyBridge } from './WorldJourneyBridge'
import { WorldKeyboardControls } from './WorldKeyboardControls'
import { WorldMapControls } from './WorldMapControls'
import { WorldTerrain } from './environment/WorldTerrain'
import { WorldPaths } from './environment/WorldPaths'
import { WorldScenery } from './environment/WorldScenery'
import { ProjectLocation } from './buildings/ProjectLocation'
import { SittingDirector, WorldBenches } from './benches/BenchInteraction'
import { SittingProvider } from './benches/SittingContext'
import { useWorldState } from '../../context/WorldStateContext'
import { AudioSceneBridge } from '../../audio/AudioSceneBridge'
import { CharacterNightLight } from './daynight/CharacterNightLight'
import { NightSky } from './daynight/NightSky'
import { ProjectRoom } from '../project-room/ProjectRoom'
import { AboutRoom } from '../project-room/studio/AboutRoom'
import { ContactRoom } from '../project-room/studio/ContactRoom'
import { RoomLights } from '../project-room/RoomLights'

type WorldProps = {
  onSelectProject: (slug: string) => void
}

/*
 * World state changes on every step she takes, so anything that does not read it sits behind a
 * memo boundary and is not re-rendered while she walks.
 */
const Sky = memo(function Sky() {
  return (
    <>
      <WorldEnvironment />
      <NightSky />
    </>
  )
})

const Landscape = memo(function Landscape() {
  return (
    <>
      <WorldTerrain />
      <WorldPaths />
      <WorldScenery />
    </>
  )
})

const Ambience = memo(function Ambience() {
  return (
    <>
      <CharacterNightLight />
      <AudioSceneBridge />
    </>
  )
})

function WorldScene({ onSelectProject }: WorldProps) {
  const { insideRoom, roomProjectSlug } = useWorldState()

  return (
    <>
      <Sky />
      <WorldGround />
      <Landscape />
      <WorldCameraRig />
      <WorldMapControls />
      <WorldJourneyBridge />
      <WorldKeyboardControls />
      <WorldProximity />
      <SittingDirector />
      <WorldBenches />
      <Suspense fallback={null}>
        <Character />
      </Suspense>
      <Ambience />
      <WorldLocations onSelect={onSelectProject} />
      {projects.map((p) => (
        <ProjectLocation key={p.slug} project={p} onSelect={onSelectProject} />
      ))}
      <RoomLights />
      {insideRoom && roomProjectSlug && <PlaceRoom key={roomProjectSlug} id={roomProjectSlug} />}
    </>
  )
}

/** The interior for a project or a studio, built in the shared room space. */
function PlaceRoom({ id }: { id: string }) {
  if (id === 'about') return <AboutRoom />
  if (id === 'contact') return <ContactRoom />
  return <ProjectRoom slug={id} />
}

export function World({ onSelectProject }: WorldProps) {
  return (
    <div className="fixed inset-0 z-0 bg-canvas">
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04] mix-blend-multiply"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <CharacterLocomotionDebug />
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: [characterSpawn.x, 7.4, characterSpawn.z + 11],
          fov: 38,
          near: 0.1,
          far: 140,
        }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <SittingProvider>
          <WorldScene onSelectProject={onSelectProject} />
        </SittingProvider>
      </Canvas>
    </div>
  )
}
