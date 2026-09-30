import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { MapImage, Project } from '../../data/projects'
import { REVEAL } from '../../data/worldLayout'
import type { WorldTier } from '../../data/worldLayout'
import { useWorldState } from '../../context/WorldStateContext'

type ArtworkObjectProps = {
  project: Project
  image: MapImage
  clusterPosition: THREE.Vector3
  index: number
  tier: WorldTier
  tierScale: number
  isHeroImage: boolean
  onSelect: (slug: string) => void
}

export function ArtworkObject({
  project,
  image,
  clusterPosition,
  index,
  tier,
  tierScale,
  isHeroImage,
  onSelect,
}: ArtworkObjectProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const texture = useTexture(image.src)
  const { character } = useWorldState()
  const { camera } = useThree()

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])

  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height
    : 1.2
  const baseW = (isHeroImage ? image.w * 1.15 : image.w) / 900
  const w = baseW * tierScale
  const h = w / aspect
  const localX = (image.x / 900) * tierScale
  const localZ = (image.y / 900) * tierScale
  const depth = ((index % 3) - 1) * 0.12 * tierScale

  useFrame((state) => {
    if (!mesh.current) return
    const worldX = clusterPosition.x + localX
    const worldZ = clusterPosition.z + localZ
    const camDist = camera.position.distanceTo(new THREE.Vector3(worldX, h / 2, worldZ))
    const charDist = Math.hypot(character.x - worldX, character.z - worldZ)

    let maxImages = 1
    if (camDist < REVEAL.fullGallery) maxImages = tier === 'hero' ? 6 : 4
    else if (camDist < REVEAL.title) maxImages = tier === 'hero' ? 2 : 1
    else maxImages = 1

    if (index >= maxImages) {
      mesh.current.visible = false
      return
    }

    mesh.current.visible = true
    let opacity = THREE.MathUtils.clamp(1.1 - camDist / REVEAL.silhouette, 0, 1)
    if (tier === 'background' && camDist > REVEAL.title) opacity *= 0.35
    if (tier === 'support' && camDist > REVEAL.metadata) opacity *= 0.55
    opacity = THREE.MathUtils.clamp(opacity, 0.08, 1)

    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.opacity = opacity
    mat.transparent = true

    const idle = Math.sin(state.clock.elapsedTime * 0.6 + index) * 0.015
    const baseRot = (image.rotate ?? 0) * (Math.PI / 180) + idle
    mesh.current.rotation.y = baseRot
    if (hovered && charDist < REVEAL.interact) {
      mesh.current.rotation.y += 0.04
      mesh.current.scale.setScalar(1.03)
    } else {
      mesh.current.scale.setScalar(1)
    }
  })

  return (
    <mesh
      ref={mesh}
      position={[localX, h / 2, localZ + depth]}
      castShadow
      onPointerOver={(e) => {
        e.stopPropagation()
        const worldX = clusterPosition.x + localX
        const worldZ = clusterPosition.z + localZ
        const charDist = Math.hypot(character.x - worldX, character.z - worldZ)
        if (charDist > REVEAL.interact) return
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        const worldX = clusterPosition.x + localX
        const worldZ = clusterPosition.z + localZ
        const charDist = Math.hypot(character.x - worldX, character.z - worldZ)
        if (charDist > REVEAL.interact) return
        onSelect(project.slug)
      }}
    >
      <boxGeometry args={[w, h, 0.028]} />
      <meshStandardMaterial map={texture} roughness={0.94} metalness={0} />
    </mesh>
  )
}
