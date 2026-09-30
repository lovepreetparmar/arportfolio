import * as THREE from 'three'
import { direction, galacticDirection, seeded } from './skyCoordinates'

/**
 * Layers, each with a count (desktop / mobile), CSS-pixel size range and brightness range:
 * a slightly richer scatter low in the distance the default view looks toward, sparse stars
 * across the whole sky, and many faint stars crowding the Milky Way band.
 */
const HORIZON = { count: 56, mobile: 26, size: [1.3, 2.5], bright: [0.45, 1] }
const SKY = { count: 700, mobile: 280, size: [1, 2.4], bright: [0.25, 1] }
const MILKY_WAY = { count: 2400, mobile: 800, size: [1.1, 1.8], bright: [0.35, 0.9] }
/** Share of the brighter stars that shimmer, and how much. */
const TWINKLE_SHARE = 0.2
export const TWINKLE_AMOUNT = 0.22

const TINTS = [new THREE.Color('#cfdcff'), new THREE.Color('#ffffff'), new THREE.Color('#fff1dc')]

const vertexShader = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aBright;
attribute float aFaint;
attribute float aPhase;
uniform float uPixelRatio;
uniform float uTime;
uniform float uTwinkle;
uniform float uStars;
uniform float uGalaxy;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  float twinkle = aPhase < 0.0 ? 1.0 : 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.5 + fract(aPhase * 7.31)) + aPhase));
  vColor = aColor;
  vAlpha = aBright * twinkle * mix(uStars, uGalaxy, aFaint);
}
`

const fragmentShader = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = 1.0 - smoothstep(0.0, 1.0, r);
  gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
`

export type StarFieldUniforms = {
  uPixelRatio: { value: number }
  uTime: { value: number }
  uTwinkle: { value: number }
  uStars: { value: number }
  uGalaxy: { value: number }
  uOpacity: { value: number }
}

const lerp = (range: number[], t: number) => range[0] + (range[1] - range[0]) * t

/** All stars in one draw: fixed pixel size (never grows with zoom), depth-tested, additive. */
export function createStarField(radius: number, mobile: boolean) {
  const rand = seeded(11)
  const counts = [HORIZON, SKY, MILKY_WAY].map((l) => (mobile ? l.mobile : l.count))
  const total = counts.reduce((a, b) => a + b, 0)
  const positions = new Float32Array(total * 3)
  const colors = new Float32Array(total * 3)
  const sizes = new Float32Array(total)
  const brights = new Float32Array(total)
  const faint = new Float32Array(total)
  const phases = new Float32Array(total)
  const dir = new THREE.Vector3()
  const lowSin = Math.sin(THREE.MathUtils.degToRad(-15))
  let i = 0
  const add = (layer: typeof SKY, isFaint: boolean) => {
    // Many dim stars, few bright ones.
    const t = Math.pow(rand(), 2.2)
    const tint = TINTS[Math.floor(rand() * TINTS.length)]
    positions.set([dir.x * radius, dir.y * radius, dir.z * radius], i * 3)
    colors.set([tint.r, tint.g, tint.b], i * 3)
    sizes[i] = lerp(layer.size, t)
    brights[i] = lerp(layer.bright, t)
    faint[i] = isFaint ? 1 : 0
    phases[i] = !isFaint && rand() < TWINKLE_SHARE ? rand() * 100 : -1
    i++
  }

  for (let k = 0; k < counts[0]; k++) {
    direction((rand() * 2 - 1) * 48, THREE.MathUtils.lerp(-15, -2.5, rand()), dir)
    add(HORIZON, false)
  }
  for (let k = 0; k < counts[1]; k++) {
    const el = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.lerp(lowSin, 1, rand())))
    direction(rand() * 360, el, dir)
    add(SKY, false)
  }
  for (let k = 0; k < counts[2]; ) {
    const l = (rand() * 2 - 1) * Math.PI
    const core = Math.exp((Math.cos(l) - 1) * 2.4)
    if (rand() > 0.3 + 0.7 * core) continue
    const width = 0.08 + 0.08 * core
    const gauss = Math.sqrt(-2 * Math.log(rand() + 1e-6)) * Math.cos(2 * Math.PI * rand())
    galacticDirection(l, Math.asin(THREE.MathUtils.clamp(gauss * width, -1, 1)), dir)
    add(MILKY_WAY, true)
    k++
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aBright', new THREE.BufferAttribute(brights, 1))
  geometry.setAttribute('aFaint', new THREE.BufferAttribute(faint, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const uniforms: StarFieldUniforms = {
    uPixelRatio: { value: 1 },
    uTime: { value: 0 },
    uTwinkle: { value: TWINKLE_AMOUNT },
    uStars: { value: 0 },
    uGalaxy: { value: 0 },
    uOpacity: { value: 0.95 },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })
  return { geometry, material, uniforms }
}
