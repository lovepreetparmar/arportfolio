import * as THREE from 'three'
import { registerNightMaterial } from './daynight/nightLighting'

/**
 * Stylised palette for the world: a meadow-green island with warm sand paths, rich foliage,
 * honest wood and a curated set of painted facades. Saturation follows the hierarchy: project
 * facades and accents carry the colour, the ground and distance stay calmer.
 */
export const WORLD_PALETTE = {
  background: '#efe8dc',
  ground: '#a9c47f',
  groundSpeck: '#98b670',
  groundLight: '#b8d18c',
  path: '#ead1a5',
  pathEdge: '#bf9b70',
  plaza: '#eedab6',
  plazaRing: '#c7a67c',
  grass: '#b6d086',
  grassDeep: '#8fb266',
  tuft: '#6f9a48',
  leaf: '#6d9d47',
  leafDeep: '#4b7c3a',
  leafLight: '#8fbb55',
  cypress: '#3f6d40',
  trunk: '#86593a',
  stone: '#cbc0ab',
  stoneDark: '#a8998a',
  wood: '#a96a42',
  woodDark: '#5e3f2b',
  ivory: '#f5ecdc',
  plaster: '#f4e2c4',
  whiteWall: '#f6f3ec',
  terracotta: '#c4643e',
  terracottaDeep: '#a44a31',
  charcoal: '#2f2d2a',
  slate: '#4d5563',
  lampMetal: '#2e3d36',
  gold: '#d0a843',
  glassWarm: '#f3ddb4',
  glassDay: '#d4e3ea',
  ink: '#1d1c1a',
  sage: '#7f9a6c',
  ochre: '#d69a3f',
  mutedRed: '#bb4a3c',
  flowerCream: '#f7f2e6',
  flowerTerracotta: '#d9774f',
} as const

/** Flower heads, clustered by bed: white, then yellow, pink, lavender and orange accents. */
export const FLOWER_COLORS = ['#f7f2e6', '#f1c64a', '#e992ab', '#ae96d8', '#ee9446'] as const

/** Foliage families: each is [deep inner, mid crown, sunlit outer]. */
export const LEAF_FAMILIES = [
  ['#4b7c3a', '#6d9d47', '#8fbb55'],
  ['#3f7340', '#5e9448', '#80b35a'],
  ['#557a36', '#7ba446', '#9abd58'],
] as const
export const CYPRESS_TONES = ['#3f6d40', '#4a7a45', '#35603c'] as const

type Hex = string

const cache = new Map<string, THREE.MeshStandardMaterial>()

/** Shared matte material; identical inputs return the same instance. */
export function worldMat(color: Hex, roughness = 0.9, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}`
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    cache.set(key, m)
  }
  return m
}

const glowCache = new Map<string, THREE.MeshStandardMaterial>()

/**
 * Softly lit interior / lamp glass; `nightColor` sets the lamplight tone it warms to after dark.
 * Lower roughness lets window glass pick up a sun glint by day.
 */
export function glowMat(
  color: Hex = WORLD_PALETTE.glassWarm,
  intensity = 0.55,
  nightColor?: Hex,
  roughness = 0.6,
): THREE.MeshStandardMaterial {
  const key = `${color}|${intensity}|${nightColor ?? ''}|${roughness}`
  let m = glowCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness,
    })
    registerNightMaterial(m, 'windows', intensity, { nightColor })
    glowCache.set(key, m)
  }
  return m
}

export function createGroundTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = WORLD_PALETTE.ground
  ctx.fillRect(0, 0, size, size)
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 900; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 0.4 + rand() * 1.3
    ctx.globalAlpha = 0.18 + rand() * 0.3
    ctx.fillStyle = rand() > 0.5 ? WORLD_PALETTE.groundSpeck : WORLD_PALETTE.groundLight
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(36, 36)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function createStripeTexture(a: Hex, b: Hex, stripes = 10): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 16
  const ctx = canvas.getContext('2d')!
  const w = canvas.width / stripes
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? b : a
    ctx.fillRect(i * w, 0, w, canvas.height)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export type SignStyle = {
  background: Hex
  color: Hex
  /** Secondary line under the main text. */
  subtitle?: string
  subtitleColor?: Hex
  serif?: boolean
  border?: Hex
}

const SANS = "'Plus Jakarta Sans', system-ui, sans-serif"
const SERIF = "'Instrument Serif', Georgia, serif"

/** Letter-spaced signage drawn to a canvas; redraws once web fonts are ready. */
export function createSignTexture(text: string, aspect: number, style: SignStyle): THREE.CanvasTexture {
  const height = 128
  const width = Math.round(height * aspect)
  const canvas = document.createElement('canvas')
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')!
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4

  const draw = () => {
    ctx.setTransform(2, 0, 0, 2, 0, 0)
    ctx.fillStyle = style.background
    ctx.fillRect(0, 0, width, height)
    if (style.border) {
      ctx.strokeStyle = style.border
      ctx.lineWidth = 3
      ctx.strokeRect(7, 7, width - 14, height - 14)
    }
    const main = text.toUpperCase()
    const hasSub = !!style.subtitle
    let size = hasSub ? 44 : 52
    const family = style.serif ? SERIF : SANS
    const weight = style.serif ? '400' : '600'
    const spacing = style.serif ? 0.06 : 0.22
    const measure = () => {
      ctx.font = `${weight} ${size}px ${family}`
      return ctx.measureText(main).width + main.length * size * spacing
    }
    while (measure() > width * 0.86 && size > 12) size -= 2
    ctx.fillStyle = style.color
    ctx.textBaseline = 'middle'
    const total = measure()
    let x = (width - total) / 2 + (size * spacing) / 2
    const y = hasSub ? height * 0.42 : height * 0.52
    for (const ch of main) {
      ctx.fillText(ch, x, y)
      x += ctx.measureText(ch).width + size * spacing
    }
    if (style.subtitle) {
      const sub = style.subtitle.toUpperCase()
      const subSize = Math.max(12, Math.round(size * 0.36))
      ctx.font = `500 ${subSize}px ${SANS}`
      ctx.fillStyle = style.subtitleColor ?? style.color
      const subSpacing = subSize * 0.42
      const subW = ctx.measureText(sub).width + sub.length * subSpacing
      let sx = (width - subW) / 2 + subSpacing / 2
      for (const ch of sub) {
        ctx.fillText(ch, sx, height * 0.76)
        sx += ctx.measureText(ch).width + subSpacing
      }
    }
    tex.needsUpdate = true
  }

  draw()
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(draw).catch(() => {})
  }
  return tex
}
