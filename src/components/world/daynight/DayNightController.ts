import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { DAY_NIGHT_KEYFRAMES, DAY_TIME, NIGHT_TIME, type DayNightKeyframe, type DayNightPhase } from './dayNightKeyframes'

/**
 * Central day/night clock. Everything that changes with the time of day (lights, fog, lamps,
 * windows, sky, character light, ambience) reads `dayNight.state`; nothing keeps its own copy.
 */
export type DayNightMode = 'day' | 'night' | 'auto'

/** Seconds for the evening transition (day → sunset → dusk → night) and for the morning one. */
export const TO_NIGHT_SECONDS = 7
export const TO_DAY_SECONDS = 5
/** Real seconds for one full loop in auto mode. */
export const AUTO_CYCLE_SECONDS = 480

type Color = THREE.Color

export type DayNightState = {
  fog: Color
  sky: Color
  hemiSky: Color
  hemiGround: Color
  hemiIntensity: number
  sunColor: Color
  sunIntensity: number
  sunOffset: THREE.Vector3
  fillColor: Color
  fillIntensity: number
  windows: number
  lamps: number
  signs: number
  stars: number
  moon: number
  character: number
  dayAudio: number
  nightAudio: number
  /** 0 in daylight → 1 at night. */
  darkness: number
}

const colorCache = new Map<string, Color>()
const col = (hex: string) => {
  let c = colorCache.get(hex)
  if (!c) {
    c = new THREE.Color(hex)
    colorCache.set(hex, c)
  }
  return c
}

const lightness = (c: Color) => c.getHSL({ h: 0, s: 0, l: 0 }).l
const DAY_L = lightness(col(DAY_NIGHT_KEYFRAMES[0].fog))
const NIGHT_L = lightness(col(DAY_NIGHT_KEYFRAMES.find((k) => k.phase === 'night')!.fog))

const wrap = (t: number) => ((t % 1) + 1) % 1

function segment(t: number): [DayNightKeyframe, DayNightKeyframe, number] {
  const keys = DAY_NIGHT_KEYFRAMES
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i]
    const b = keys[i + 1] ?? { ...keys[0], at: 1 }
    if (t >= a.at && t < b.at) return [a, b, THREE.MathUtils.smoothstep(t, a.at, b.at)]
  }
  return [keys[0], keys[0], 0]
}

const NUMERIC = [
  'hemiIntensity',
  'sunIntensity',
  'fillIntensity',
  'windows',
  'lamps',
  'signs',
  'stars',
  'moon',
  'character',
  'dayAudio',
  'nightAudio',
] as const
const COLORS = ['fog', 'sky', 'hemiSky', 'hemiGround', 'sunColor', 'fillColor'] as const

function createState(): DayNightState {
  return {
    fog: new THREE.Color(),
    sky: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiIntensity: 0,
    sunColor: new THREE.Color(),
    sunIntensity: 0,
    sunOffset: new THREE.Vector3(),
    fillColor: new THREE.Color(),
    fillIntensity: 0,
    windows: 1,
    lamps: 0,
    signs: 0,
    stars: 0,
    moon: 0,
    character: 0,
    dayAudio: 1,
    nightAudio: 0,
    darkness: 0,
  }
}

function sample(t: number, out: DayNightState): DayNightPhase {
  const [a, b, k] = segment(wrap(t))
  for (const key of COLORS) out[key].copy(col(a[key])).lerp(col(b[key]), k)
  for (const key of NUMERIC) out[key] = a[key] + (b[key] - a[key]) * k
  out.sunOffset.set(
    a.sunOffset[0] + (b.sunOffset[0] - a.sunOffset[0]) * k,
    a.sunOffset[1] + (b.sunOffset[1] - a.sunOffset[1]) * k,
    a.sunOffset[2] + (b.sunOffset[2] - a.sunOffset[2]) * k,
  )
  out.darkness = THREE.MathUtils.clamp((DAY_L - lightness(out.fog)) / (DAY_L - NIGHT_L), 0, 1)
  return k < 0.5 ? a.phase : b.phase
}

type Transition = { from: number; to: number; elapsed: number; duration: number }

export const dayNight = {
  mode: 'day' as DayNightMode,
  time: DAY_TIME,
  transition: null as Transition | null,
  state: createState(),
  phase: 'day' as DayNightPhase,
}
sample(dayNight.time, dayNight.state)

const listeners = new Set<() => void>()
let snapshot = ''
const snapshotKey = () => `${dayNight.mode}|${dayNight.phase}|${dayNight.state.darkness > 0.5 ? 1 : 0}`
snapshot = snapshotKey()

function emitIfChanged() {
  const next = snapshotKey()
  if (next === snapshot) return
  snapshot = next
  listeners.forEach((l) => l())
}

/** Advances the clock by one frame; called once per frame by the world environment. */
export function tickDayNight(delta: number, reduced: boolean) {
  const tr = dayNight.transition
  if (tr) {
    tr.elapsed += delta
    const k = tr.duration <= 0 ? 1 : THREE.MathUtils.smootherstep(tr.elapsed / tr.duration, 0, 1)
    dayNight.time = wrap(tr.from + (tr.to - tr.from) * k)
    if (tr.elapsed >= tr.duration) dayNight.transition = null
  } else if (dayNight.mode === 'auto' && !reduced) {
    dayNight.time = wrap(dayNight.time + delta / AUTO_CYCLE_SECONDS)
  }
  dayNight.phase = sample(dayNight.time, dayNight.state)
  emitIfChanged()
}

/** Moves forward through the day to the mode's resting time, animating every stage in between. */
export function setDayNightMode(mode: DayNightMode, reduced = false) {
  dayNight.mode = mode
  if (mode !== 'auto') {
    const from = dayNight.time
    let to = mode === 'night' ? NIGHT_TIME : DAY_TIME
    if (to <= from + 0.001) to += 1
    const duration = reduced ? 0.8 : mode === 'night' ? TO_NIGHT_SECONDS : TO_DAY_SECONDS
    dayNight.transition = { from, to, elapsed: 0, duration }
  }
  emitIfChanged()
}

export function toggleDayNight(reduced = false) {
  setDayNightMode(dayNight.mode === 'night' ? 'day' : 'night', reduced)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Mode, current phase and whether the world is dark (for HUD contrast). */
export function useDayNight() {
  const key = useSyncExternalStore(subscribe, () => snapshot)
  const [mode, phase, dark] = key.split('|')
  return { mode: mode as DayNightMode, phase: phase as DayNightPhase, dark: dark === '1' }
}
