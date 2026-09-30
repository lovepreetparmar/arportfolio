import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useIsTouchDevice, useReducedMotion } from '../../../hooks/useMediaQuery'
import { dayNight } from './DayNightController'
import { updateSkyAtmosphere } from './skyAtmosphere'
import { SKY_RADIUS, direction } from './skyCoordinates'
import { createSkyDome } from './skyDome'
import { TWINKLE_AMOUNT, createStarField } from './starField'
import './skyHorizon'

/**
 * The sky: atmosphere, clouds, sun glow and Milky Way on a dome, stars, and the moon, all on a shell that
 * travels with the camera. Orbiting turns the view across a fixed sky; zooming or walking never
 * brings any of it closer or makes it bigger. Everything is depth-tested and drawn after the
 * world, so every building, tree and hill in front of the sky hides it. It shows in open sky and
 * where the world has dissolved into the distance haze (see skyHorizon).
 */
const DOME_RADIUS = SKY_RADIUS + 6
/** The Milky Way lags the first stars: absent at sunset, faint at dusk, full only at night. */
const GALAXY_CURVE = 1.8
/** Moon direction (degrees right of north, and above the horizon) and angular size. */
const MOON_AZIMUTH = 20
const MOON_ELEVATION = 16
const MOON_DIAMETER_DEG = 0.95
const MOON_OPACITY = 0.9

/** Moon disc with a faint halo; the disc fills the middle third of the texture. */
function moonTexture() {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = s
  const ctx = canvas.getContext('2d')!
  const c = s / 2
  const halo = ctx.createRadialGradient(c, c, s / 6, c, c, c)
  halo.addColorStop(0, 'rgba(226,224,214,0.22)')
  halo.addColorStop(0.4, 'rgba(180,192,226,0.07)')
  halo.addColorStop(1, 'rgba(180,192,226,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, s, s)
  const disc = ctx.createRadialGradient(c - s * 0.05, c - s * 0.05, 0, c, c, s / 6)
  disc.addColorStop(0, '#f7f2e6')
  disc.addColorStop(0.7, '#e4dcc8')
  disc.addColorStop(1, '#cfc6b0')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(c, c, s / 6, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function NightSky() {
  const touch = useIsTouchDevice()
  const reduced = useReducedMotion()
  const camera = useThree((s) => s.camera)
  const dpr = useThree((s) => s.viewport.dpr)
  const shell = useRef<THREE.Group>(null)
  const starPoints = useRef<THREE.Points>(null)
  const moonMesh = useRef<THREE.Mesh>(null)

  const dome = useMemo(() => createSkyDome(DOME_RADIUS), [])
  const stars = useMemo(() => createStarField(SKY_RADIUS, touch), [touch])

  const moon = useMemo(() => {
    const disc = SKY_RADIUS * Math.tan(THREE.MathUtils.degToRad(MOON_DIAMETER_DEG / 2)) * 2
    const geometry = new THREE.PlaneGeometry(disc * 3, disc * 3)
    const material = new THREE.MeshBasicMaterial({
      map: moonTexture(),
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
    const position = direction(MOON_AZIMUTH, MOON_ELEVATION).multiplyScalar(SKY_RADIUS)
    return { geometry, material, position }
  }, [])

  useEffect(
    () => () => {
      dome.geometry.dispose()
      dome.material.dispose()
    },
    [dome],
  )
  useEffect(
    () => () => {
      stars.geometry.dispose()
      stars.material.dispose()
    },
    [stars],
  )
  useEffect(
    () => () => {
      moon.geometry.dispose()
      moon.material.map?.dispose()
      moon.material.dispose()
    },
    [moon],
  )

  useFrame((state, delta) => {
    const g = shell.current
    if (!g) return
    g.position.copy(camera.position)
    const a = dayNight.state
    const galaxy = Math.pow(a.stars, GALAXY_CURVE)
    updateSkyAtmosphere(a, Math.min(delta, 0.1), reduced)

    const du = dome.uniforms
    du.uHorizon.value.copy(a.fog)
    du.uSunDir.value.copy(a.sunOffset).normalize()
    du.uSunColor.value.copy(a.sunColor)
    du.uSun.value = 1 - a.darkness
    du.uGalaxy.value = galaxy

    const su = stars.uniforms
    su.uStars.value = a.stars
    su.uGalaxy.value = galaxy
    su.uPixelRatio.value = dpr
    su.uTime.value = state.clock.elapsedTime
    su.uTwinkle.value = reduced ? 0 : TWINKLE_AMOUNT

    moon.material.opacity = a.moon * MOON_OPACITY
    if (starPoints.current) starPoints.current.visible = a.stars > 0.002
    if (moonMesh.current) moonMesh.current.visible = a.moon > 0.002
  })

  return (
    <group ref={shell}>
      <mesh geometry={dome.geometry} material={dome.material} frustumCulled={false} renderOrder={-3} />
      <points
        ref={starPoints}
        geometry={stars.geometry}
        material={stars.material}
        frustumCulled={false}
        renderOrder={-2}
        visible={false}
      />
      <mesh
        ref={moonMesh}
        visible={false}
        geometry={moon.geometry}
        material={moon.material}
        position={moon.position}
        frustumCulled={false}
        renderOrder={-1}
        onUpdate={(m) => m.lookAt(0, 0, 0)}
      />
    </group>
  )
}
