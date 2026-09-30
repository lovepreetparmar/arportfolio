import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { displacementFragment, displacementVertex } from './shaders/displacement'

type DistortionImageProps = {
  src: string
  hover: number
  mouse: { x: number; y: number }
}

export function DistortionImage({ src, hover, mouse }: DistortionImageProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const texture = useTexture(src)

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    [texture],
  )

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])

  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height
    : 1.2

  useFrame(() => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uHover.value = hover
    materialRef.current.uniforms.uMouse.value.set(
      (mouse.x + 1) * 0.5,
      1 - (mouse.y + 1) * 0.5,
    )
  })

  return (
    <mesh>
      <planeGeometry args={[2.6 * aspect, 2.6]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={displacementVertex}
        fragmentShader={displacementFragment}
        uniforms={uniforms}
      />
    </mesh>
  )
}
