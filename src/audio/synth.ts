/** Small Web Audio helpers: every sound in the world is synthesised, so there are no files to load. */

export const rand = (min: number, max: number) => min + Math.random() * (max - min)

export type NoiseColor = 'white' | 'pink' | 'brown'

const noiseCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>()

/** Looping noise buffer, cached per context. */
export function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor, seconds = 3): AudioBuffer {
  let perCtx = noiseCache.get(ctx)
  if (!perCtx) {
    perCtx = new Map()
    noiseCache.set(ctx, perCtx)
  }
  const key = `${color}|${seconds}`
  const cached = perCtx.get(key)
  if (cached) return cached

  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') {
      data[i] = white * 0.5
    } else if (color === 'pink') {
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12
    } else {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }
  }
  // Short crossfade at the loop point so looping never clicks.
  const fade = Math.min(2048, Math.floor(length / 8))
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    data[length - fade + i] = data[length - fade + i] * (1 - k) + data[i] * k
  }
  perCtx.set(key, buffer)
  return buffer
}

/** Starts a looping noise source; returns it so the caller can stop it. */
export function loopNoise(ctx: BaseAudioContext, color: NoiseColor, destination: AudioNode, seconds = 3) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, color, seconds)
  src.loop = true
  src.loopStart = Math.random() * seconds * 0.5
  src.connect(destination)
  src.start(ctx.currentTime, src.loopStart)
  return src
}

/** Attack / exponential-decay envelope on a gain param. */
export function envelope(param: AudioParam, at: number, peak: number, attack: number, decay: number) {
  param.cancelScheduledValues(at)
  param.setValueAtTime(0.0001, at)
  param.linearRampToValueAtTime(peak, at + attack)
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}

type BurstOptions = {
  at: number
  duration: number
  peak: number
  attack?: number
  filter?: BiquadFilterType
  frequency?: number
  frequencyEnd?: number
  q?: number
  color?: NoiseColor
  pan?: number
}

/** One-shot filtered noise: rustles, swishes, clicks, breaths of air. */
export function noiseBurst(ctx: BaseAudioContext, out: AudioNode, o: BurstOptions) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, o.color ?? 'white', 2)
  const filter = ctx.createBiquadFilter()
  filter.type = o.filter ?? 'bandpass'
  filter.frequency.setValueAtTime(o.frequency ?? 1200, o.at)
  if (o.frequencyEnd) filter.frequency.exponentialRampToValueAtTime(o.frequencyEnd, o.at + o.duration)
  filter.Q.value = o.q ?? 0.8
  const gain = ctx.createGain()
  envelope(gain.gain, o.at, o.peak, o.attack ?? 0.01, Math.max(0.02, o.duration - (o.attack ?? 0.01)))
  src.connect(filter).connect(gain)
  connectPanned(ctx, gain, out, o.pan)
  src.start(o.at, Math.random() * 1.5)
  src.stop(o.at + o.duration + 0.05)
}

type ToneOptions = {
  at: number
  frequency: number
  frequencyEnd?: number
  duration: number
  peak: number
  attack?: number
  type?: OscillatorType
  pan?: number
  /** Lowpass cutoff to soften bright waveforms. */
  soften?: number
}

/** One-shot oscillator note with a pitch glide: chirps, clicks, soft plucks, creaks. */
export function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOptions) {
  const osc = ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.frequency, o.at)
  if (o.frequencyEnd) osc.frequency.exponentialRampToValueAtTime(o.frequencyEnd, o.at + o.duration)
  const gain = ctx.createGain()
  envelope(gain.gain, o.at, o.peak, o.attack ?? 0.005, Math.max(0.02, o.duration - (o.attack ?? 0.005)))
  let node: AudioNode = osc
  if (o.soften) {
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = o.soften
    node = node.connect(lp)
  }
  node.connect(gain)
  connectPanned(ctx, gain, out, o.pan)
  osc.start(o.at)
  osc.stop(o.at + o.duration + 0.05)
}

function connectPanned(ctx: BaseAudioContext, node: AudioNode, out: AudioNode, pan?: number) {
  if (pan && 'createStereoPanner' in ctx) {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    node.connect(p).connect(out)
  } else {
    node.connect(out)
  }
}

/** Smoothly moves a gain towards a value without clicks. */
export function glide(param: AudioParam, value: number, ctx: BaseAudioContext, seconds = 0.6) {
  const now = ctx.currentTime
  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.setTargetAtTime(value, now, Math.max(0.01, seconds / 3))
}

/** Repeating randomised timer; stops cleanly and never stacks. */
export class RandomScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly next: () => number
  private readonly fire: () => void

  constructor(next: () => number, fire: () => void) {
    this.next = next
    this.fire = fire
  }

  start() {
    this.stop()
    const loop = () => {
      this.timer = setTimeout(() => {
        this.fire()
        loop()
      }, this.next() * 1000)
    }
    loop()
  }

  stop() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
