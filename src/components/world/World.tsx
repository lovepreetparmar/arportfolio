import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { projects } from '../../data/projects'
import { Character } from '../character/Character'
import { ContactSign } from './ContactSign'
import { WorldCameraRig } from './WorldCameraRig'
import { WorldEnvironment } from './WorldEnvironment'
import { WorldGround } from './WorldGround'
import { WorldProximity } from './WorldProximity'
import { AboutSign } from './AboutSign'
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

type WorldProps = {
  onSelectProject: (slug: string) => void
  dimmed?: boolean
}

function WorldScene({ onSelectProject }: WorldProps) {
  const { journeyPhase } = useWorldState()
  const hideCharacter = journeyPhase === 'inRoom' || journeyPhase === 'exiting'

  return (
    <>
      <WorldEnvironment />
      <WorldGround />
      <WorldTerrain />
      <WorldPaths />
      <WorldScenery />
      <WorldCameraRig />
      <WorldMapControls />
      <WorldJourneyBridge />
      <WorldKeyboardControls />
      <WorldProximity />
      <SittingDirector />
      <WorldBenches />
      {!hideCharacter && <Character />}
      <CharacterNightLight />
      <AudioSceneBridge />
      <AboutSign />
      <ContactSign />
      {projects.map((p) => (
        <ProjectLocation key={p.slug} project={p} onSelect={onSelectProject} />
      ))}
    </>
  )
}

export function World({ onSelectProject, dimmed }: WorldProps) {
  return (
    <div
      className={`fixed inset-0 z-0 bg-canvas transition-opacity duration-500 ${dimmed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04] mix-blend-multiply"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
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
      >
        <Suspense fallback={null}>
          <SittingProvider>
            <WorldScene onSelectProject={onSelectProject} />
          </SittingProvider>
        </Suspense>
      </Canvas>
      <NightSky />
    </div>
  )
}
