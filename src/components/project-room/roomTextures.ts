import * as THREE from 'three'

/** Small deterministic PRNG so every visit lays the same floor. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1))
  return `#${c.getHexString()}`
}

const floorCache = new Map<string, THREE.CanvasTexture>()

/** Metres of floor covered by one repeat of the floor texture. */
export const FLOOR_TILE_METRES = 2.4

/** Oak/walnut planks or honed stone slabs, with gentle tone variation board to board. */
export function floorTexture(type: 'wood' | 'stone', color: string) {
  const key = `${type}|${color}`
  const cached = floorCache.get(key)
  if (cached) return cached
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = rng(type === 'wood' ? 7 : 19)
  const pxPerM = size / FLOOR_TILE_METRES

  if (type === 'wood') {
    const plankW = Math.round(0.18 * pxPerM)
    for (let x = 0; x < size; x += plankW) {
      let y = -rand() * 1.2 * pxPerM
      while (y < size) {
        const len = (1.1 + rand() * 1.1) * pxPerM
        ctx.fillStyle = shade(color, (rand() - 0.5) * 0.035)
        ctx.fillRect(x, y, plankW, len)
        ctx.globalAlpha = 0.07
        for (let g = 0; g < 7; g++) {
          ctx.strokeStyle = shade(color, -0.12)
          ctx.lineWidth = 1 + rand() * 1.5
          const gx = x + 4 + rand() * (plankW - 8)
          ctx.beginPath()
          ctx.moveTo(gx, y)
          ctx.bezierCurveTo(gx + (rand() - 0.5) * 8, y + len * 0.33, gx + (rand() - 0.5) * 8, y + len * 0.66, gx, y + len)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = shade(color, -0.12)
        ctx.fillRect(x, y + len - 1.5, plankW, 1.5)
        y += len
      }
      ctx.fillStyle = shade(color, -0.14)
      ctx.fillRect(x + plankW - 1.5, 0, 1.5, size)
    }
  } else {
    const tile = size / 4
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 4; tx++) {
        ctx.fillStyle = shade(color, (rand() - 0.5) * 0.05)
        ctx.fillRect(tx * tile, ty * tile, tile, tile)
        for (let i = 0; i < 140; i++) {
          ctx.globalAlpha = 0.05 + rand() * 0.05
          ctx.fillStyle = shade(color, (rand() - 0.5) * 0.18)
          const r = 3 + rand() * 18
          ctx.beginPath()
          ctx.arc(tx * tile + rand() * tile, ty * tile + rand() * tile, r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }
    ctx.fillStyle = shade(color, -0.16)
    for (let i = 0; i <= 4; i++) {
      ctx.fillRect(i * tile - 1.5, 0, 3, size)
      ctx.fillRect(0, i * tile - 1.5, size, 3)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  floorCache.set(key, tex)
  return tex
}

let shadowTex: THREE.CanvasTexture | null = null

/** Soft rectangular drop shadow for frames hung on a wall. */
export function frameShadowTexture() {
  if (shadowTex) return shadowTex
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'blur(14px)'
  ctx.fillStyle = '#000'
  ctx.fillRect(34, 34, size - 68, size - 68)
  shadowTex = new THREE.CanvasTexture(canvas)
  return shadowTex
}

/** Coarse colour signature of an image, used to hang identical files only once. */
export function imageFingerprint(image: { width: number; height: number } & CanvasImageSource) {
  const n = 12
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = n
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return `${image.width}x${image.height}`
  ctx.drawImage(image, 0, 0, n, n)
  const data = ctx.getImageData(0, 0, n, n).data
  let sig = `${image.width}x${image.height}:`
  for (let i = 0; i < data.length; i += 4) sig += ((data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4)).toString(36)
  return sig
}

export const SERIF = '"Instrument Serif", Georgia, serif'
export const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'

/** Resolves once the site fonts are ready for canvas drawing (or straight away if unavailable). */
export function fontsReady(): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return Promise.all([
    document.fonts.load(`400 64px ${SERIF}`),
    document.fonts.load(`500 32px ${SANS}`),
    document.fonts.load(`600 32px ${SANS}`),
  ]).catch(() => undefined)
}

/** Wraps `text` to `maxWidth`, returning at most `maxLines` lines (the last one ellipsised). */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = Infinity) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next
      continue
    }
    lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line)
  else if (lines.length === maxLines && line) {
    let last = lines[maxLines - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[maxLines - 1] = `${last.trimEnd()}…`
  }
  return lines
}

/** True for dark wall colours, which take light lettering. */
export function isDark(hex: string) {
  const c = new THREE.Color(hex)
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.25
}
