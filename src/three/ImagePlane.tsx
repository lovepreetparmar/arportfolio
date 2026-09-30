import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import * as THREE from 'three'

type ImagePlaneProps = {
  src: string
  parallax: { x: number; y: number }
}

export function ImagePlane({ src, parallax }: ImagePlaneProps) {
  const meshRef = useRef<Mesh>(null)
  const texture = useTexture(src)

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])

  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height
    : 1.2

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.y = parallax.x * 0.04
    meshRef.current.rotation.x = -parallax.y * 0.03
    meshRef.current.position.x = parallax.x * 0.15
    meshRef.current.position.y = parallax.y * 0.1
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2.8 * aspect, 2.8]} />
      <meshStandardMaterial map={texture} roughness={0.9} metalness={0.02} />
    </mesh>
  )
}
