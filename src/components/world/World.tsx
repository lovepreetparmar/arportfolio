import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { projects } from '../../data/projects'
import { Character } from '../character/Character'
import { ProjectCluster3D } from '../projects/ProjectCluster3D'
import { ContactSign } from './ContactSign'
import { WorldCameraRig } from './WorldCameraRig'
import { WorldEnvironment } from './WorldEnvironment'
import { WorldGround } from './WorldGround'
import { DesignFragments } from './DesignFragments'
import { WorldProximity } from './WorldProximity'
import { AboutSign } from './AboutSign'
import { NavigationDebugMarker } from './NavigationDebugMarker'
import { characterSpawn } from '../../data/world3d'

type WorldProps = {
  onSelectProject: (slug: string) => void
  onArrivedAtProject?: (slug: string) => void
}

function WorldScene({ onSelectProject, onArrivedAtProject }: WorldProps) {
  return (
    <>
      <WorldEnvironment />
      <WorldGround />
      <WorldCameraRig />
      <WorldProximity />
      <NavigationDebugMarker />
      <Character onArrivedAtProject={onArrivedAtProject} />
      <AboutSign />
      <ContactSign />
      <DesignFragments />
      {projects.map((p) => (
        <ProjectCluster3D key={p.slug} project={p} onSelect={onSelectProject} />
      ))}
    </>
  )
}

export function World({ onSelectProject, onArrivedAtProject }: WorldProps) {
  return (
    <div className="fixed inset-0 z-0 bg-canvas">
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
          position: [characterSpawn.x, 2.35, characterSpawn.z + 5.8],
          fov: 38,
          near: 0.1,
          far: 70,
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <WorldScene onSelectProject={onSelectProject} onArrivedAtProject={onArrivedAtProject} />
        </Suspense>
      </Canvas>
    </div>
  )
}
