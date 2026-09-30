import * as THREE from 'three'
import type { DayNightState } from './DayNightController'

/**
 * Registry of materials whose brightness follows the time of day. Components register their
 * materials once; the environment applies every channel in a single pass per frame.
 */
export type NightChannel = 'windows' | 'lamps' | 'signs'

type Entry = {
  material: THREE.Material
  channel: NightChannel
  prop: 'emissiveIntensity' | 'opacity'
  /** Value at channel = 1 (for windows: the daylight value, scaled by the channel). */
  base: number
  /** Value at channel = 0. */
  floor: number
  /** Daylight emissive colour, warmed towards lamplight as it gets dark. */
  dayEmissive: THREE.Color | null
  nightEmissive: THREE.Color
}

const entries = new Set<Entry>()
/** Pale daylight glass reads as white when bright; after dark it shifts to warm lamplight. */
const NIGHT_GLASS = new THREE.Color('#ffb56a')
const NIGHT_GLASS_MIX = 0.55

export function registerNightMaterial(
  material: THREE.Material,
  channel: NightChannel,
  base: number,
  {
    prop = 'emissiveIntensity',
    floor = 0,
    nightColor,
  }: { prop?: Entry['prop']; floor?: number; nightColor?: string } = {},
) {
  const emissive = (material as THREE.MeshStandardMaterial).emissive
  const dayEmissive = prop === 'emissiveIntensity' && channel !== 'signs' && emissive ? emissive.clone() : null
  const nightEmissive = nightColor ? new THREE.Color(nightColor) : NIGHT_GLASS
  const entry: Entry = { material, channel, prop, base, floor, dayEmissive, nightEmissive }
  entries.add(entry)
  return () => {
    entries.delete(entry)
  }
}

export function applyNightLighting(state: DayNightState) {
  const warmth = state.darkness * NIGHT_GLASS_MIX
  for (const e of entries) {
    const level = state[e.channel]
    const value = e.channel === 'windows' ? e.base * level : e.floor + (e.base - e.floor) * level
    if (e.prop === 'opacity') {
      e.material.opacity = value
      e.material.visible = value > 0.002
    } else {
      const m = e.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = value
      if (e.dayEmissive) m.emissive.copy(e.dayEmissive).lerp(e.nightEmissive, warmth)
    }
  }
}

function createPoolTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

let poolTexture: THREE.CanvasTexture | null = null
const poolCache = new Map<string, THREE.MeshBasicMaterial>()

/** Soft radial light pool for the ground; invisible by day, fades in with the lamps channel. */
export function lightPoolMaterial(color = '#ffd29a', strength = 0.5, channel: NightChannel = 'lamps') {
  const key = `${color}|${strength}|${channel}`
  let m = poolCache.get(key)
  if (!m) {
    poolTexture ??= createPoolTexture()
    m = new THREE.MeshBasicMaterial({
      color,
      map: poolTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
    m.visible = false
    registerNightMaterial(m, channel, strength, { prop: 'opacity' })
    poolCache.set(key, m)
  }
  return m
}

const lampGlassCache = new Map<string, THREE.MeshStandardMaterial>()

/** Lamp / lantern glass: pale glass by day, warm glowing bulb at night. */
export function lampGlassMaterial(color = '#ffd8a0', nightIntensity = 2.2, dayIntensity = 0.12) {
  const key = `${color}|${nightIntensity}|${dayIntensity}`
  let m = lampGlassCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: '#f4ecdc',
      emissive: color,
      emissiveIntensity: dayIntensity,
      roughness: 0.4,
    })
    registerNightMaterial(m, 'lamps', nightIntensity, { floor: dayIntensity })
    lampGlassCache.set(key, m)
  }
  return m
}
