import * as THREE from 'three'
import { registerNightMaterial } from './daynight/nightLighting'

/** Warm editorial palette for the world: cream base, muted greens, wood, stone, terracotta. */
export const WORLD_PALETTE = {
  background: '#efe8dc',
  ground: '#ebe3d4',
  groundSpeck: '#ddd2bf',
  path: '#ddd0ba',
  pathEdge: '#cbbca2',
  plaza: '#e5d9c5',
  plazaRing: '#cdbfa5',
  grass: '#c6c8a5',
  grassDeep: '#b4b893',
  tuft: '#9ea680',
  leaf: '#9aa47c',
  leafDeep: '#85916a',
  leafLight: '#b0b791',
  cypress: '#6f7c5c',
  trunk: '#8b6c52',
  stone: '#c5bba9',
  stoneDark: '#ada290',
  wood: '#a87e5b',
  woodDark: '#6e533f',
  ivory: '#f2eadd',
  plaster: '#ecdfcd',
  whiteWall: '#f5f2eb',
  terracotta: '#b8714f',
  terracottaDeep: '#9c5a3f',
  charcoal: '#2f2d2a',
  slate: '#4c4b48',
  gold: '#c9a64a',
  glassWarm: '#f3ddb4',
  ink: '#1d1c1a',
  sage: '#8f9a78',
  ochre: '#c79a4e',
  mutedRed: '#b44b3f',
  flowerCream: '#f3ecdc',
  flowerTerracotta: '#c77d5e',
} as const

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

/** Softly lit interior / lamp glass; `nightColor` sets the lamplight tone it warms to after dark. */
export function glowMat(color: Hex = WORLD_PALETTE.glassWarm, intensity = 0.55, nightColor?: Hex): THREE.MeshStandardMaterial {
  const key = `${color}|${intensity}|${nightColor ?? ''}`
  let m = glowCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.6,
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
    ctx.fillStyle = rand() > 0.5 ? WORLD_PALETTE.groundSpeck : '#f3ede2'
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
