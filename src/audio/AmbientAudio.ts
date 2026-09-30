import { glide, loopNoise, rand, RandomScheduler, tone } from './synth'

/**
 * Outdoor ambience: a soft wind bed shared by day and night, occasional birds by day, and a
 * distant hush with sparse crickets by night. Mix follows the day/night clock.
 */
export class AmbientAudio {
  private ctx: AudioContext | null = null
  private sources: AudioScheduledSourceNode[] = []
  private windGain: GainNode | null = null
  private dayGain: GainNode | null = null
  private nightGain: GainNode | null = null
  private day = 1
  private night = 0

  private birds = new RandomScheduler(
    () => rand(4, 11) / Math.max(0.35, this.day),
    () => {
      if (this.day > 0.15) this.birdCall()
    },
  )

  private crickets = new RandomScheduler(
    () => rand(2.2, 6.5) / Math.max(0.35, this.night),
    () => {
      if (this.night > 0.3) this.cricketSong()
    },
  )

  start(ctx: AudioContext, out: AudioNode) {
    this.stop()
    this.ctx = ctx

    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 420
    windFilter.Q.value = 0.6
    const gust = ctx.createOscillator()
    gust.frequency.value = 0.07
    const gustDepth = ctx.createGain()
    gustDepth.gain.value = 170
    gust.connect(gustDepth).connect(windFilter.frequency)
    const swell = ctx.createOscillator()
    swell.frequency.value = 0.045
    const swellDepth = ctx.createGain()
    swellDepth.gain.value = 0.18
    const windLevel = ctx.createGain()
    windLevel.gain.value = 0.6
    swell.connect(swellDepth).connect(windLevel.gain)
    const wind = loopNoise(ctx, 'brown', windFilter, 4)
    windFilter.connect(windLevel).connect(this.windGain).connect(out)
    gust.start()
    swell.start()

    this.dayGain = ctx.createGain()
    this.dayGain.gain.value = 0
    this.dayGain.connect(out)

    this.nightGain = ctx.createGain()
    this.nightGain.gain.value = 0
    this.nightGain.connect(out)
    const hushFilter = ctx.createBiquadFilter()
    hushFilter.type = 'lowpass'
    hushFilter.frequency.value = 260
    const hushLevel = ctx.createGain()
    hushLevel.gain.value = 0.35
    const hush = loopNoise(ctx, 'pink', hushFilter, 5)
    hushFilter.connect(hushLevel).connect(this.nightGain)

    this.sources = [wind, gust, swell, hush]
    this.applyMix(1.2)
    this.birds.start()
    this.crickets.start()
  }

  stop() {
    this.birds.stop()
    this.crickets.stop()
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
      s.disconnect()
    }
    this.sources = []
    this.windGain?.disconnect()
    this.dayGain?.disconnect()
    this.nightGain?.disconnect()
    this.windGain = this.dayGain = this.nightGain = null
    this.ctx = null
  }

  /** Day 1 / night 0 at noon; crossfades as the clock turns. */
  setMix(day: number, night: number) {
    this.day = day
    this.night = night
    this.applyMix(0.8)
  }

  private applyMix(seconds: number) {
    const ctx = this.ctx
    if (!ctx || !this.windGain || !this.dayGain || !this.nightGain) return
    glide(this.windGain.gain, 0.55 + this.day * 0.3 + this.night * 0.1, ctx, seconds)
    glide(this.dayGain.gain, this.day, ctx, seconds)
    glide(this.nightGain.gain, this.night, ctx, seconds)
  }

  private birdCall() {
    const ctx = this.ctx
    if (!ctx || !this.dayGain) return
    const pan = rand(-0.7, 0.7)
    const base = rand(2500, 4200)
    const notes = Math.floor(rand(2, 6))
    let at = ctx.currentTime + 0.05
    for (let i = 0; i < notes; i++) {
      const f = base * rand(0.88, 1.12)
      tone(ctx, this.dayGain, {
        at,
        frequency: f,
        frequencyEnd: f * rand(1.15, 1.45),
        duration: rand(0.06, 0.12),
        peak: rand(0.05, 0.09),
        attack: 0.01,
        pan,
      })
      at += rand(0.09, 0.17)
    }
  }

  private cricketSong() {
    const ctx = this.ctx
    if (!ctx || !this.nightGain) return
    const pan = rand(-0.8, 0.8)
    const f = rand(4200, 4900)
    const chirps = Math.floor(rand(3, 7))
    let at = ctx.currentTime + 0.05
    for (let c = 0; c < chirps; c++) {
      for (let p = 0; p < 3; p++) {
        tone(ctx, this.nightGain, { at: at + p * 0.034, frequency: f, duration: 0.02, peak: 0.028, attack: 0.004, pan })
      }
      at += rand(0.3, 0.42)
    }
  }
}
