import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useIsTouchDevice, useReducedMotion } from '../../../hooks/useMediaQuery'
import { characterSignals } from '../../character/characterSignals'
import { isInRoomSpace } from '../../project-room/roomSpace'
import { dayNight } from '../daynight/DayNightController'

/** Side of the square of air around her that holds the motes (metres); they wrap at its edges. */
const BOX = 16
const COUNT = 64
const TOUCH_COUNT = 34

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec3 uCenter;
uniform float uPixelRatio;
uniform float uDay;
uniform float uNight;
attribute vec4 aSeed;
varying float vAlpha;
varying float vFirefly;

void main() {
  // Each mote meanders on its own slow loop while the whole cloud drifts downwind.
  vec3 p = position;
  p.x += sin(uTime * (0.11 + 0.08 * aSeed.x) + aSeed.y * 6.283) * 0.7 + uTime * 0.09;
  p.z += cos(uTime * (0.09 + 0.07 * aSeed.y) + aSeed.z * 6.283) * 0.7 + uTime * 0.035;
  vec2 rel = mod(p.xz - uCenter.xz + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};

  // Half of them are fireflies after dark: low over the grass, blinking slowly.
  float firefly = step(0.5, aSeed.w) * uNight;
  float dustY = 0.4 + position.y + sin(uTime * 0.17 + aSeed.x * 6.283) * 0.3;
  float flyY = 0.35 + position.y * 0.35 + sin(uTime * 0.6 + aSeed.z * 6.283) * 0.18;
  vec3 world = vec3(uCenter.x + rel.x, mix(dustY, flyY, step(0.5, aSeed.w) * step(0.01, uNight)), uCenter.z + rel.y);

  float edge = 1.0 - smoothstep(${(BOX * 0.32).toFixed(2)}, ${(BOX * 0.5).toFixed(2)}, max(abs(rel.x), abs(rel.y)));
  float blink = pow(max(0.0, sin(uTime * (0.55 + 0.4 * aSeed.x) + aSeed.y * 40.0)), 4.0);
  float shimmer = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.z) + aSeed.x * 20.0);
  vAlpha = edge * mix(uDay * shimmer * 0.42, blink, firefly);
  vFirefly = firefly;

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(2.2 + aSeed.z * 1.6, 4.5 + aSeed.x * 2.0, firefly);
  gl_PointSize = size * uPixelRatio * clamp(14.0 / -mv.z, 0.6, 2.2);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uDustColor;
uniform vec3 uFlyColor;
varying float vAlpha;
varying float vFirefly;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float glow = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.22, 0.0, d);
  float a = vAlpha * mix(glow * glow, glow * 0.55 + core, vFirefly);
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uDustColor, uFlyColor, vFirefly), a);
}
`

/**
 * A few motes of pollen and dust drifting in the sunlight around her, and after dark a handful of
 * fireflies over the grass. One draw call; all movement happens on the GPU around her position.
 */
export function AmbientMotes() {
  const touch = useIsTouchDevice()
  const reduced = useReducedMotion()
  const dpr = useThree((s) => s.viewport.dpr)
  const points = useRef<THREE.Points>(null)

  const { geometry, material } = useMemo(() => {
    const count = touch ? TOUCH_COUNT : COUNT
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    let seed = 3
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < count; i++) {
      positions.set([rand() * BOX, rand() * 2.2, rand() * BOX], i * 3)
      seeds.set([rand(), rand(), rand(), rand()], i * 4)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uPixelRatio: { value: 1 },
        uDay: { value: 1 },
        uNight: { value: 0 },
        uDustColor: { value: new THREE.Color('#fff4dc') },
        uFlyColor: { value: new THREE.Color('#e6ff9a') },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [touch])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state) => {
    const p = points.current
    if (!p) return
    const a = dayNight.state
    const indoors = !characterSignals.present || isInRoomSpace(characterSignals.x, characterSignals.z)
    // Dust only shows in direct sun; fireflies come out once it is properly dark.
    const day = (1 - a.darkness) * Math.min(1, a.sunIntensity / 1.4)
    const night = THREE.MathUtils.smoothstep(a.darkness, 0.6, 0.95)
    p.visible = !reduced && !indoors && (day > 0.05 || night > 0.02)
    if (!p.visible) return
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uCenter.value.set(characterSignals.x, 0, characterSignals.z)
    u.uPixelRatio.value = dpr
    u.uDay.value = day
    u.uNight.value = night
    u.uDustColor.value.copy(a.sunColor).lerp(WHITE, 0.35)
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} visible={false} />
}

const WHITE = new THREE.Color('#ffffff')
