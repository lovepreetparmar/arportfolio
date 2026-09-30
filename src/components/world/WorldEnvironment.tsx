import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'
import { territoryMood } from '../../data/world3d'
import { mapView } from './mapNavigation'

const SUN_OFFSET = new THREE.Vector3(9, 15, 7)
const FOG_NEAR = 24
const FOG_FAR = 68
/** Extra fog distance per unit of zoom-out, roughly the camera-to-focus distance at zoom 1. */
const FOG_ZOOM_RANGE = 17
const SHADOW_EXTENT = 18

export function WorldEnvironment() {
  const { activeTerritory } = useWorldState()
  const mood = territoryMood[activeTerritory] ?? territoryMood.branding
  const sun = useRef<THREE.DirectionalLight>(null)
  const shadowExtent = useRef(SHADOW_EXTENT)
  const scene = useThree((s) => s.scene)

  useFrame(() => {
    const zoomOut = Math.max(0, mapView.zoom - 1)
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = FOG_NEAR + zoomOut * FOG_ZOOM_RANGE
      scene.fog.far = FOG_FAR + zoomOut * FOG_ZOOM_RANGE
    }

    const light = sun.current
    if (!light) return
    light.position.set(mapView.focusX + SUN_OFFSET.x, SUN_OFFSET.y, mapView.focusZ + SUN_OFFSET.z)
    light.target.position.set(mapView.focusX, 0, mapView.focusZ)
    light.target.updateMatrixWorld()

    const extent = SHADOW_EXTENT * (1 + zoomOut * 0.8)
    if (Math.abs(extent - shadowExtent.current) > 0.5) {
      shadowExtent.current = extent
      const cam = light.shadow.camera
      cam.left = -extent
      cam.right = extent
      cam.top = extent
      cam.bottom = -extent
      cam.updateProjectionMatrix()
    }
  })

  return (
    <>
      <color attach="background" args={[mood.fog]} />
      <fog attach="fog" args={[mood.fog, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight args={['#fff8ec', '#d9ccb4', mood.ambient]} />
      <directionalLight
        ref={sun}
        intensity={1.55}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-6, 6, -4]} intensity={0.22} color="#e9eef2" />
    </>
  )
}
