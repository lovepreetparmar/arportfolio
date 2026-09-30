import type { LocationType } from '../data/projectWorld'
import { glide, loopNoise, noiseBurst, rand, RandomScheduler, tone } from './synth'

export type RoomPreset = 'boutique' | 'kitchen' | 'studio' | 'gallery'

export function roomPresetFor(type: LocationType): RoomPreset {
  if (type === 'jewellery') return 'boutique'
  if (type === 'restaurant') return 'kitchen'
  if (type === 'gallery') return 'gallery'
  return 'studio'
}

/**
 * Quiet room tone per kind of project space, built lazily the first time a room opens:
 * a warm hush in the boutique, a faint kitchen murmur, a calm studio, a still gallery.
 */
export class ProjectAudio {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private preset: RoomPreset | null = null
  private sources: AudioScheduledSourceNode[] = []
  private accents: RandomScheduler | null = null

  attach(ctx: AudioContext, out: GainNode) {
    this.ctx = ctx
    this.out = out
  }

  detach() {
    this.stopRoom()
    this.ctx = null
    this.out = null
    this.preset = null
  }

  setPreset(preset: RoomPreset | null) {
    if (preset === this.preset) return
    this.stopRoom()
    this.preset = preset
    if (preset) this.buildRoom(preset)
  }

  private stopRoom() {
    this.accents?.stop()
    this.accents = null
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
      s.disconnect()
    }
    this.sources = []
  }

  private buildRoom(preset: RoomPreset) {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return

    const bed = (color: 'pink' | 'brown', cutoff: number, level: number) => {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = cutoff
      const g = ctx.createGain()
      g.gain.value = level
      this.sources.push(loopNoise(ctx, color, f, 4))
      f.connect(g).connect(out)
    }

    if (preset === 'boutique') {
      bed('pink', 480, 0.5)
      const pad = ctx.createGain()
      pad.gain.value = 0
      glide(pad.gain, 0.022, ctx, 3)
      const soft = ctx.createBiquadFilter()
      soft.type = 'lowpass'
      soft.frequency.value = 900
      pad.connect(soft).connect(out)
      for (const f of [220, 277.18, 329.63]) {
        const o = ctx.createOscillator()
        o.frequency.value = f
        o.detune.value = rand(-6, 6)
        o.connect(pad)
        o.start()
        this.sources.push(o)
      }
      this.accents = new RandomScheduler(
        () => rand(7, 14),
        () => {
          const at = ctx.currentTime + 0.05
          tone(ctx, out, { at, frequency: rand(2400, 3200), duration: 1.2, peak: 0.018, attack: 0.004, pan: rand(-0.5, 0.5) })
        },
      )
    } else if (preset === 'kitchen') {
      bed('brown', 380, 0.6)
      const sizzleFilter = ctx.createBiquadFilter()
      sizzleFilter.type = 'highpass'
      sizzleFilter.frequency.value = 4200
      const sizzle = ctx.createGain()
      sizzle.gain.value = 0.05
      this.sources.push(loopNoise(ctx, 'white', sizzleFilter, 3))
      sizzleFilter.connect(sizzle).connect(out)
      this.accents = new RandomScheduler(
        () => rand(3.5, 9),
        () => {
          const at = ctx.currentTime + 0.05
          const f = rand(1900, 2800)
          tone(ctx, out, { at, frequency: f, duration: 0.35, peak: 0.03, pan: rand(-0.6, 0.6) })
          tone(ctx, out, { at: at + rand(0.08, 0.16), frequency: f * 1.33, duration: 0.25, peak: 0.018, pan: rand(-0.6, 0.6) })
        },
      )
    } else if (preset === 'studio') {
      bed('pink', 600, 0.45)
      this.accents = new RandomScheduler(
        () => rand(5, 11),
        () => {
          let at = ctx.currentTime + 0.05
          const strokes = Math.floor(rand(2, 5))
          for (let i = 0; i < strokes; i++) {
            noiseBurst(ctx, out, { at, duration: rand(0.06, 0.14), peak: 0.03, frequency: rand(2500, 4200), q: 2 })
            at += rand(0.12, 0.25)
          }
        },
      )
    } else {
      bed('pink', 700, 0.4)
    }
    this.accents?.start()
  }
}
