import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Project } from '../../data/projects'
import { getProjectWorld3 } from '../../data/world3d'
import { getTierScale, getWorldSlot, REVEAL } from '../../data/worldLayout'
import { registerProjectWorldPosition } from '../../navigation/projectWorldRegistry'
import { ArtworkObject } from './ArtworkObject'
import { ProjectLabel } from './ProjectLabel'

type ProjectCluster3DProps = {
  project: Project
  onSelect: (slug: string) => void
}

export function ProjectCluster3D({ project, onSelect }: ProjectCluster3DProps) {
  const clusterRef = useRef<THREE.Group>(null)
  const labelRef = useRef<THREE.Group>(null)
  const slot = getWorldSlot(project.slug)
  const tier = slot?.tier ?? 'background'
  const tierScale = getTierScale(tier)
  const base = getProjectWorld3(project)
  const worldPos = useMemo(() => new THREE.Vector3(base.x, base.y, base.z), [base.x, base.y, base.z])
  const { camera } = useThree()
  const [labelMode, setLabelMode] = useState<'none' | 'hint' | 'title' | 'full'>('none')
  const labelModeRef = useRef(labelMode)

  const images = useMemo(() => {
    const all = project.mapImages
    if (project.layout === 'poster') return all.slice(0, 1)
    return all
  }, [project])

  useFrame(() => {
    if (clusterRef.current) {
      registerProjectWorldPosition(project.slug, clusterRef.current)
    }

    const camDist = camera.position.distanceTo(worldPos)

    let next: 'none' | 'hint' | 'title' | 'full' = 'none'
    if (camDist > REVEAL.silhouette) next = 'none'
    else if (camDist > REVEAL.title) next = tier === 'background' ? 'none' : 'hint'
    else if (camDist > REVEAL.metadata) next = tier === 'hero' ? 'title' : 'hint'
    else next = tier === 'hero' ? 'full' : 'title'

    if (next !== labelModeRef.current) {
      labelModeRef.current = next
      setLabelMode(next)
    }

    if (labelRef.current) {
      labelRef.current.visible = next !== 'none'
      labelRef.current.position.set(0, 1.8 * tierScale, -0.6)
    }
  })

  const heroIndex = 0

  return (
    <group ref={clusterRef} position={[worldPos.x, 0, worldPos.z]} rotation={[0, slot?.rotation ?? 0, 0]}>
      <group ref={labelRef}>
        <Html center distanceFactor={tier === 'hero' ? 9 : 14} style={{ pointerEvents: 'none' }}>
          <ProjectLabel project={project} tier={tier} mode={labelMode} />
        </Html>
      </group>
      {images.map((img, i) => (
        <ArtworkObject
          key={`${img.src}-${i}`}
          project={project}
          image={img}
          clusterPosition={worldPos}
          index={i}
          tier={tier}
          tierScale={tierScale}
          isHeroImage={i === heroIndex}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
