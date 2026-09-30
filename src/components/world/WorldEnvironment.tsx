import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { dayNight, tickDayNight } from './daynight/DayNightController'
import { applyNightLighting } from './daynight/nightLighting'
import { mapView } from './mapNavigation'

const FOG_NEAR = 24
const FOG_FAR = 68
/** Extra fog distance per unit of zoom-out, roughly the camera-to-focus distance at zoom 1. */
const FOG_ZOOM_RANGE = 17
/**
 * Night haze closes in so the lit village reads against a soft indigo distance; the far edge
 * comes in furthest, opening a band of dissolved horizon where the night sky shows.
 */
const NIGHT_FOG_NEAR_PULL = 7
const NIGHT_FOG_FAR_PULL = 24
const SHADOW_EXTENT = 18
const INITIAL = dayNight.state

export function WorldEnvironment() {
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const shadowExtent = useRef(SHADOW_EXTENT)
  const scene = useThree((s) => s.scene)

  useFrame((_, delta) => {
    tickDayNight(Math.min(delta, 0.1))
    const a = dayNight.state
    applyNightLighting(a)

    const zoomOut = Math.max(0, mapView.zoom - 1)
    if (scene.background instanceof THREE.Color) scene.background.copy(a.fog)
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(a.fog)
      scene.fog.near = FOG_NEAR + zoomOut * FOG_ZOOM_RANGE - a.darkness * NIGHT_FOG_NEAR_PULL
      scene.fog.far = FOG_FAR + zoomOut * FOG_ZOOM_RANGE - a.darkness * NIGHT_FOG_FAR_PULL
    }
    if (hemi.current) {
      hemi.current.color.copy(a.hemiSky)
      hemi.current.groundColor.copy(a.hemiGround)
      hemi.current.intensity = a.hemiIntensity
    }
    if (fill.current) {
      fill.current.color.copy(a.fillColor)
      fill.current.intensity = a.fillIntensity
    }

    const light = sun.current
    if (!light) return
    light.color.copy(a.sunColor)
    light.intensity = a.sunIntensity
    light.position.set(mapView.focusX + a.sunOffset.x, a.sunOffset.y, mapView.focusZ + a.sunOffset.z)
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
      <color attach="background" args={[INITIAL.fog]} />
      <fog attach="fog" args={[INITIAL.fog, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight ref={hemi} args={[INITIAL.hemiSky, INITIAL.hemiGround, INITIAL.hemiIntensity]} />
      <directionalLight
        ref={sun}
        intensity={INITIAL.sunIntensity}
        color={INITIAL.sunColor}
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
      <directionalLight ref={fill} position={[-6, 6, -4]} intensity={INITIAL.fillIntensity} color={INITIAL.fillColor} />
    </>
  )
}
