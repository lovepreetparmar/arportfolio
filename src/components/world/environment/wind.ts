import * as THREE from 'three'

/**
 * One breeze for all foliage, applied in the vertex shader so swaying costs nothing on the CPU.
 * Each plant takes its phase from where it stands, so neighbours move a little out of step and
 * slow gusts roll across the island. Movement is centimetres: alive, never windswept.
 */
export const windUniforms = {
  uWindTime: { value: 0 },
  /** 0 holds everything still (reduced motion). */
  uWindStrength: { value: 1 },
}

/** How a part bends: canopies lean from the base of the puff, blades from the root, heads as a whole. */
export type WindBend = 'canopy' | 'blade' | 'head' | 'bush'

const BEND: Record<WindBend, string> = {
  // Unit sphere: still at the bottom, full lean at the top.
  canopy: 'clamp((transformed.y + 1.0) * 0.5, 0.0, 1.0)',
  // Cone 0.3 tall centred on its middle: rooted at the bottom, the tip moves most.
  blade: 'pow(clamp((transformed.y + 0.15) / 0.3, 0.0, 1.0), 2.0)',
  head: '1.0',
  // Planter shrubs, a few tens of centimetres across.
  bush: 'clamp(transformed.y * 2.0 + 0.5, 0.0, 1.0)',
}

const GLSL_PARS = /* glsl */ `
uniform float uWindTime;
uniform float uWindStrength;
`

function windGlsl(bend: WindBend, amplitude: number) {
  return /* glsl */ `
#include <begin_vertex>
{
#ifdef USE_INSTANCING
  vec3 windAnchor = instanceMatrix[3].xyz;
#else
  vec3 windAnchor = modelMatrix[3].xyz;
#endif
  float windPhase = dot(windAnchor.xz, vec2(0.37, 0.23));
  float windGust = 0.5 + 0.5 * sin(uWindTime * 0.21 + windAnchor.x * 0.06 + windAnchor.z * 0.045);
  float windWave = sin(uWindTime * 1.05 + windPhase) * 0.6 + sin(uWindTime * 2.2 + windPhase * 1.7) * 0.25;
  float windSide = sin(uWindTime * 0.83 + windPhase * 1.3);
  float windAmount = ${BEND[bend]} * (0.35 + 0.65 * windGust) * ${amplitude.toFixed(4)} * uWindStrength;
  transformed.x += windWave * windAmount;
  transformed.z += windSide * windAmount * 0.45;
}
`
}

/** Makes `material` sway with the shared breeze. Returns the same material for inline use. */
export function applyWind<T extends THREE.Material>(material: T, bend: WindBend, amplitude: number): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniforms.uWindTime
    shader.uniforms.uWindStrength = windUniforms.uWindStrength
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_PARS}`)
      .replace('#include <begin_vertex>', windGlsl(bend, amplitude))
  }
  material.customProgramCacheKey = () => `wind-${bend}-${amplitude}`
  return material
}
