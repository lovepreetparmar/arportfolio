import { noiseBurst, rand, tone } from './synth'

export type InteractionSound =
  | 'select'
  | 'benchSit'
  | 'benchStand'
  | 'doorHandle'
  | 'doorOpen'
  | 'doorClose'
  | 'imageOpen'
  | 'imageClose'

/** Soft, tactile UI and object sounds; nothing bright or arcade-like. */
export class InteractionAudio {
  private ctx: AudioContext | null = null
  private out: AudioNode | null = null

  attach(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx
    this.out = out
  }

  detach() {
    this.ctx = null
    this.out = null
  }

  play(sound: InteractionSound, delay = 0) {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return
    const at = ctx.currentTime + 0.01 + delay

    switch (sound) {
      case 'select':
        tone(ctx, out, { at, frequency: 660, duration: 0.5, peak: 0.1, attack: 0.008, type: 'triangle', soften: 1800 })
        tone(ctx, out, { at: at + 0.06, frequency: 990, duration: 0.42, peak: 0.045, attack: 0.008, soften: 2200 })
        break
      case 'benchSit':
        noiseBurst(ctx, out, { at, duration: 0.32, peak: 0.16, attack: 0.08, frequency: 1300, q: 0.7, color: 'pink' })
        this.creak(at + 0.18, 170, 140, 0.26, 0.05)
        break
      case 'benchStand':
        noiseBurst(ctx, out, { at, duration: 0.24, peak: 0.12, attack: 0.05, frequency: 1500, q: 0.7, color: 'pink' })
        this.creak(at + 0.04, 150, 175, 0.18, 0.03)
        break
      case 'doorHandle':
        noiseBurst(ctx, out, { at, duration: 0.03, peak: 0.12, filter: 'highpass', frequency: 2600 })
        tone(ctx, out, { at, frequency: 1850, duration: 0.05, peak: 0.035 })
        noiseBurst(ctx, out, { at: at + 0.09, duration: 0.035, peak: 0.1, filter: 'highpass', frequency: 2300 })
        break
      case 'doorOpen':
        this.creak(at, 210, 290, 0.5, 0.04)
        noiseBurst(ctx, out, {
          at,
          duration: 0.6,
          peak: 0.1,
          attack: 0.25,
          filter: 'lowpass',
          frequency: 400,
          frequencyEnd: 900,
          color: 'pink',
        })
        break
      case 'doorClose':
        tone(ctx, out, { at, frequency: 78, frequencyEnd: 55, duration: 0.2, peak: 0.28 })
        noiseBurst(ctx, out, { at, duration: 0.14, peak: 0.12, filter: 'lowpass', frequency: 520, color: 'brown' })
        noiseBurst(ctx, out, { at: at + 0.02, duration: 0.03, peak: 0.07, filter: 'highpass', frequency: 2400 })
        break
      case 'imageOpen':
        noiseBurst(ctx, out, { at, duration: 0.24, peak: 0.07, attack: 0.1, frequency: 600, frequencyEnd: 2000, q: 1.1 })
        break
      case 'imageClose':
        noiseBurst(ctx, out, { at, duration: 0.2, peak: 0.06, attack: 0.07, frequency: 1800, frequencyEnd: 550, q: 1.1 })
        break
    }
  }

  /** Wood under load: a resonant, slightly wavering low tone. */
  private creak(at: number, from: number, to: number, duration: number, peak: number) {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return
    tone(ctx, out, {
      at,
      frequency: from * rand(0.95, 1.05),
      frequencyEnd: to * rand(0.95, 1.05),
      duration,
      peak,
      attack: duration * 0.3,
      type: 'sawtooth',
      soften: 950,
    })
  }
}
