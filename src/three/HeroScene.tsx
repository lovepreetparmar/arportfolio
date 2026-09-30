import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { DistortionImage } from './DistortionImage'
import { useMediaQuery } from '../hooks/useMediaQuery'

type HeroSceneProps = {
  imageSrc: string
  hover: number
  mouse: { x: number; y: number }
}

function Scene({ imageSrc, hover, mouse }: HeroSceneProps) {
  return (
    <>
      <ambientLight intensity={1} />
      <DistortionImage src={imageSrc} hover={hover} mouse={mouse} />
    </>
  )
}

export function HeroScene({ imageSrc, hover, mouse }: HeroSceneProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const dpr = useMemo(
    () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, isMobile ? 1.1 : 1.5),
    [isMobile],
  )

  if (isMobile) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] opacity-90">
      <Canvas dpr={dpr} camera={{ position: [0, 0, 3], fov: 40 }} gl={{ alpha: true }}>
        <Suspense fallback={null}>
          <Scene imageSrc={imageSrc} hover={hover} mouse={mouse} />
        </Suspense>
      </Canvas>
    </div>
  )
}
