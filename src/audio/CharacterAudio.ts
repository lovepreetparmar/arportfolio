import { rand } from './synth'

export type FootstepSurface = 'path' | 'grass' | 'interior'

const VARIATIONS = 4

type SurfaceRecipe = {
  duration: number
  /** One-pole lowpass coefficient (lower = darker). */
  tone: number
  /** Low body thump frequency and level. */
  thump: number
  thumpLevel: number
  /** Crunch: how uneven the noise grain is. */
  grain: number
  level: number
}

const RECIPES: Record<FootstepSurface, SurfaceRecipe> = {
  path: { duration: 0.09, tone: 0.32, thump: 95, thumpLevel: 0.35, grain: 0.5, level: 0.55 },
  grass: { duration: 0.13, tone: 0.14, thump: 70, thumpLevel: 0.2, grain: 0.85, level: 0.45 },
  interior: { duration: 0.08, tone: 0.2, thump: 150, thumpLevel: 0.6, grain: 0.15, level: 0.5 },
}

function renderStep(ctx: BaseAudioContext, r: SurfaceRecipe, variation: number): AudioBuffer {
  const shift = 1 + (variation - 1.5) * 0.06
  const duration = r.duration * shift
  const length = Math.floor(ctx.sampleRate * (duration + 0.04))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lp = 0
  let grainHold = 1
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate
    const env = t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) / (duration * 0.32))
    if (i % 48 === 0) grainHold = 1 - r.grain * Math.random()
    lp += r.tone * ((Math.random() * 2 - 1) - lp)
    const thump = Math.sin(2 * Math.PI * r.thump * shift * t) * Math.exp(-t / 0.028) * r.thumpLevel
    data[i] = (lp * grainHold * 2.2 + thump) * env * r.level
  }
  return buffer
}

/** Quiet footsteps: four pre-rendered variations per surface, never the same one twice running. */
export class CharacterAudio {
  private buffers: Record<FootstepSurface, AudioBuffer[]> | null = null
  private last: Record<FootstepSurface, number> = { path: -1, grass: -1, interior: -1 }
  private ctx: AudioContext | null = null
  private out: AudioNode | null = null

  attach(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx
    this.out = out
    if (!this.buffers) {
      this.buffers = {
        path: Array.from({ length: VARIATIONS }, (_, i) => renderStep(ctx, RECIPES.path, i)),
        grass: Array.from({ length: VARIATIONS }, (_, i) => renderStep(ctx, RECIPES.grass, i)),
        interior: Array.from({ length: VARIATIONS }, (_, i) => renderStep(ctx, RECIPES.interior, i)),
      }
    }
  }

  detach() {
    this.ctx = null
    this.out = null
  }

  step(surface: FootstepSurface) {
    const ctx = this.ctx
    const out = this.out
    const set = this.buffers?.[surface]
    if (!ctx || !out || !set) return
    let index = Math.floor(Math.random() * set.length)
    if (index === this.last[surface]) index = (index + 1 + Math.floor(Math.random() * (set.length - 1))) % set.length
    this.last[surface] = index

    const src = ctx.createBufferSource()
    src.buffer = set[index]
    src.playbackRate.value = rand(0.92, 1.08)
    const gain = ctx.createGain()
    gain.gain.value = rand(0.75, 1)
    src.connect(gain).connect(out)
    src.start()
  }
}
