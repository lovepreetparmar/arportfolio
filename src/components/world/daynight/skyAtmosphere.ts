import * as THREE from 'three'
import type { DayNightState } from './DayNightController'

/**
 * The daytime atmosphere shared by the sky dome and the distance haze: a gradient from the haze
 * colour up to the sky colour, and a few soft stylised clouds painted on a map fixed to the sky.
 * The dome draws it where sky is visible; the fog blends distant geometry into exactly the same
 * colour for its direction, so where the world dissolves into the sky there is never a seam.
 */

/** Elevation band (degrees) covered by the cloud map; its edge rows stay empty. */
const CLOUD_EL_MIN = -16
const CLOUD_EL_MAX = 64
const MAP_W = 2048
const MAP_H = 512
/** Turns of the sky per second the clouds drift: about a degree every 11 seconds. */
const DRIFT_SPEED = 0.00025
/** Gradient span (sky direction y) by day and by night. Low daytime start lets the dissolved distance of the default view pick up the blue. */
const DAY_GRADIENT: [number, number] = [-0.3, 0.55]
const NIGHT_GRADIENT: [number, number] = [-0.02, 0.8]

/** [azimuth°, elevation°, width°, height°] of each cloud; a sparse, hand-placed sky. */
const CLOUDS: [number, number, number, number][] = [
  [-16, -9.5, 13, 3],
  [17, -10.5, 9, 2.2],
  [-14, 13, 16, 4],
  [26, 24, 12, 3.2],
  [-40, 8, 22, 5.5],
  [48, 14, 20, 5],
  [110, 6, 24, 5.5],
  [165, 18, 26, 6.5],
  [215, 4, 20, 4.5],
  [265, 22, 24, 6.5],
  [305, 10, 18, 4.5],
  [-20, 34, 26, 7.5],
  [80, 40, 22, 6.5],
  [200, 46, 20, 6],
]

const DEG = Math.PI / 180
const smoothstep = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

type Puff = { x: number; y: number; r: number }

/** A tight row of overlapping puffs on a common flat base, largest mid-way, with a few smaller ones on top. */
function makePuffs(w: number, h: number, rand: () => number): { puffs: Puff[]; base: number } {
  const base = -h * 0.4
  const puffs: Puff[] = []
  const n = Math.max(4, Math.round(w / (h * 0.42)))
  const end = h * 0.3
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const r = h * (0.4 + 0.14 * rand()) * (1 - Math.pow(2 * t - 1, 2) * 0.45)
    puffs.push({ x: (t - 0.5) * (w - end * 2), y: base + r * 0.5, r })
  }
  const tops = Math.max(1, Math.round(n * 0.35))
  for (let i = 0; i < tops; i++) {
    const t = tops === 1 ? 0.5 : i / (tops - 1)
    const r = h * (0.4 + 0.16 * rand())
    puffs.push({ x: (t - 0.5) * w * 0.42 + (rand() - 0.5) * h * 0.3, y: base + h * 0.45 + rand() * h * 0.12, r })
  }
  return { puffs, base }
}

/** Cloud map: R = density, G = how sunlit (tops) vs shaded (undersides). Row 0 is CLOUD_EL_MIN. */
function paintClouds() {
  const data = new Uint8Array(MAP_W * MAP_H * 4)
  let seed = 11
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const pxX = MAP_W / 360
  const pxY = MAP_H / (CLOUD_EL_MAX - CLOUD_EL_MIN)

  for (const [az, el, w, h] of CLOUDS) {
    const { puffs, base } = makePuffs(w, h, rand)
    const halfW = (w * 0.6) / Math.cos(el * DEG)
    const x0 = Math.floor((az - halfW) * pxX)
    const x1 = Math.ceil((az + halfW) * pxX)
    const y0 = Math.max(1, Math.floor((el - h - CLOUD_EL_MIN) * pxY))
    const y1 = Math.min(MAP_H - 2, Math.ceil((el + h * 1.3 - CLOUD_EL_MIN) * pxY))
    for (let py = y0; py <= y1; py++) {
      const pel = CLOUD_EL_MIN + (py + 0.5) / pxY
      const dy = pel - el
      const cosEl = Math.cos(pel * DEG)
      const flat = smoothstep(dy, base - h * 0.04, base + h * 0.16)
      if (flat <= 0) continue
      const litV = Math.min(1, Math.max(0, (dy - base) / (h * 1.1)))
      for (let px = x0; px <= x1; px++) {
        const dx = ((px + 0.5) / pxX - az) * cosEl
        let density = 0
        let best = 0
        let litP = 0.5
        for (const p of puffs) {
          const q = Math.hypot(dx - p.x, dy - p.y) / p.r
          if (q >= 1) continue
          const f = 1 - smoothstep(q, 0.45, 1)
          density += f
          if (f > best) {
            best = f
            litP = 0.5 + 0.5 * ((dy - p.y) / p.r)
          }
        }
        density = Math.min(1, density) * flat
        if (density <= 0) continue
        const i = (py * MAP_W + (((px % MAP_W) + MAP_W) % MAP_W)) * 4
        if (density * 255 <= data[i]) continue
        data[i] = Math.round(density * 255)
        data[i + 1] = Math.round(Math.min(1, Math.max(0, 0.2 + 0.65 * litV + 0.3 * (litP - 0.5))) * 255)
        data[i + 3] = 255
      }
    }
  }

  const tex = new THREE.DataTexture(data, MAP_W, MAP_H, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

type Vec4Value = { x: number; y: number; z: number; w: number }
const vec4 = (): Vec4Value => ({ x: 0, y: 0, z: 0, w: 0 })

/**
 * Uniforms added to every built-in material (and the sky dome). The vec4 values are plain objects,
 * which three.js shares by reference instead of cloning, so one update per frame reaches them all.
 */
export const skyAtmosphereUniforms = {
  /** rgb: upper-sky colour, w: gradient start (direction y). */
  skyAtmoZenith: { value: vec4() },
  /** x: gradient end, y: cloud strength, z: cloud drift (turns). */
  skyAtmoParams: { value: vec4() },
  skyAtmoCloudLit: { value: vec4() },
  skyAtmoCloudShade: { value: vec4() },
  skyAtmoClouds: { value: paintClouds() },
}

export const SKY_ATMOSPHERE_GLSL = /* glsl */ `
uniform vec4 skyAtmoZenith;
uniform vec4 skyAtmoParams;
uniform vec4 skyAtmoCloudLit;
uniform vec4 skyAtmoCloudShade;
uniform sampler2D skyAtmoClouds;

vec3 skyAtmoGradient(vec3 d, vec3 horizon) {
  float up = smoothstep(skyAtmoZenith.w, skyAtmoParams.x, d.y);
  return mix(horizon, skyAtmoZenith.rgb, pow(up, 0.75));
}

vec3 skyAtmoWithClouds(vec3 d, vec3 sky) {
  if (skyAtmoParams.y < 0.002) return sky;
  float v = (degrees(asin(clamp(d.y, -1.0, 1.0))) - ${CLOUD_EL_MIN.toFixed(1)}) / ${(CLOUD_EL_MAX - CLOUD_EL_MIN).toFixed(1)};
  if (v <= 0.0 || v >= 1.0) return sky;
  float u = atan(d.x, -d.z) * 0.15915494 + skyAtmoParams.z;
  vec2 c = texture2D(skyAtmoClouds, vec2(u, v)).rg;
  float density = smoothstep(0.2, 0.62, c.r) * skyAtmoParams.y * mix(0.45, 1.0, smoothstep(-0.22, 0.3, d.y));
  vec3 tint = mix(skyAtmoCloudShade.rgb, skyAtmoCloudLit.rgb, smoothstep(0.1, 0.8, c.g));
  return mix(sky, tint, density);
}
`

/** Follows the day/night state; called once per frame by the sky. */
export function updateSkyAtmosphere(a: DayNightState, delta: number, reduced: boolean) {
  const u = skyAtmosphereUniforms
  const k = a.darkness
  const zenith = u.skyAtmoZenith.value
  zenith.x = a.sky.r
  zenith.y = a.sky.g
  zenith.z = a.sky.b
  zenith.w = THREE.MathUtils.lerp(DAY_GRADIENT[0], NIGHT_GRADIENT[0], k)
  const params = u.skyAtmoParams.value
  params.x = THREE.MathUtils.lerp(DAY_GRADIENT[1], NIGHT_GRADIENT[1], k)
  params.y = a.clouds
  if (!reduced) params.z = (params.z + delta * DRIFT_SPEED) % 1
  const lit = u.skyAtmoCloudLit.value
  lit.x = a.cloudLit.r
  lit.y = a.cloudLit.g
  lit.z = a.cloudLit.b
  const shade = u.skyAtmoCloudShade.value
  shade.x = a.cloudShade.r
  shade.y = a.cloudShade.g
  shade.z = a.cloudShade.b
}
