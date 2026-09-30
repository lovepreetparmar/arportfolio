import * as THREE from 'three'
import { SKY_ATMOSPHERE_GLSL, skyAtmosphereUniforms } from './skyAtmosphere'
import { GALAXY } from './skyCoordinates'

/** Peak Milky Way glow added to the night sky (linear); kept low so the town stays the focus. */
const GALAXY_STRENGTH = 0.065

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
${SKY_ATMOSPHERE_GLSL}
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSun;
uniform float uGalaxy;
uniform vec3 uPole;
uniform vec3 uCore;
uniform vec3 uSide;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec3 d = normalize(vDir);

  // Atmosphere shared with the distance haze (see skyAtmosphere), so the dissolved distance
  // stays seamless.
  vec3 sky = skyAtmoGradient(d, uHorizon);

  // Soft sun glow by day, only above the horizon, with the clouds drifting in front of it.
  float above = smoothstep(-0.02, 0.1, d.y);
  float toSun = max(dot(d, uSunDir), 0.0);
  float sun = pow(toSun, 8.0) * 0.08 + pow(toSun, 90.0) * 0.16 + smoothstep(0.99955, 0.9998, toSun) * 0.35;
  sky += uSunColor * sun * uSun * above;
  sky = skyAtmoWithClouds(d, sky);

  float glow = 0.0;
  vec3 tint = vec3(0.0);
  if (uGalaxy > 0.001) {
    // Galactic frame: latitude across the band, stretched noise along it.
    float gb = dot(d, uPole);
    vec3 g = vec3(dot(d, uCore), dot(d, uSide), gb);
    float core = exp((g.x - 1.0) * 2.4);
    float width = 0.1 + 0.1 * core;
    float band = exp(-(gb * gb) / (width * width));

    float clouds = smoothstep(0.22, 0.82, fbm(g * vec3(3.2, 3.2, 8.0) + 3.0));
    glow = band * (0.4 + 0.6 * core) * mix(0.3, 1.35, clouds);

    // Dark rift along the middle of the band, broken up into dust lanes.
    float riftWidth = 0.02 + 0.04 * core;
    float rift = exp(-pow((gb - 0.018 * sin(g.y * 5.0 + g.x * 3.0)) / riftWidth, 2.0));
    float dustNoise = fbm(g * vec3(5.5, 5.5, 18.0) + 11.0);
    float dust = rift * smoothstep(0.32, 0.62, dustNoise) + band * 0.45 * smoothstep(0.56, 0.86, dustNoise);
    glow *= 1.0 - clamp(dust, 0.0, 0.85);

    // Unresolved star grain; hazier toward the horizon, clearest overhead.
    glow *= 0.8 + 0.4 * noise(d * 700.0);
    glow *= mix(0.4, 1.0, smoothstep(-0.22, 0.75, d.y));

    tint = mix(vec3(0.6, 0.67, 0.92), vec3(0.96, 0.91, 0.83), clamp(core * 0.75 + clouds * 0.2, 0.0, 1.0));
    tint = mix(vec3(0.7, 0.65, 0.9), tint, band);
  }

  gl_FragColor = vec4(sky + tint * glow * uGalaxy * ${GALAXY_STRENGTH.toFixed(3)}, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(vec3(gl_FragCoord.xy, 7.0)) - 0.5) / 255.0;
}
`

export type SkyDomeUniforms = {
  uHorizon: { value: THREE.Color }
  uSunDir: { value: THREE.Vector3 }
  uSunColor: { value: THREE.Color }
  uSun: { value: number }
  uGalaxy: { value: number }
}

/**
 * The sky itself: a dome around the camera with the atmospheric gradient, clouds and a soft sun
 * glow by day and a procedural Milky Way by night. Depth-tested without writing depth and drawn
 * after the world, so every building, tree and hill in front of it hides it, and shading only
 * runs where sky is actually visible.
 */
export function createSkyDome(radius: number) {
  const uniforms = {
    ...skyAtmosphereUniforms,
    uHorizon: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSun: { value: 0 },
    uGalaxy: { value: 0 },
    uPole: { value: GALAXY.n },
    uCore: { value: GALAXY.u },
    uSide: { value: GALAXY.v },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    fog: false,
  })
  const geometry = new THREE.SphereGeometry(radius, 64, 32)
  return { geometry, material, uniforms: uniforms as SkyDomeUniforms }
}
