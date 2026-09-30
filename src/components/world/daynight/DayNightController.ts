import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { DAY_NIGHT_KEYFRAMES, DAY_TIME, NIGHT_TIME, type DayNightKeyframe, type DayNightPhase } from './dayNightKeyframes'

/**
 * Central day/night clock. Everything that changes with the time of day (lights, fog, lamps,
 * windows, sky, character light, ambience) reads `dayNight.state`; nothing keeps its own copy.
 *
 * Each visit starts in 'auto': daylight, then a single evening that settles into night and stays
 * there. The first use of the ☀/☾ switch hands control to the visitor ('manual') for good.
 */
export type DayNightControl = 'auto' | 'manual'
export type DayNightTarget = 'day' | 'night'

/** Seconds for a full manual evening transition (day → sunset → dusk → night) and a full morning one. */
export const TO_NIGHT_SECONDS = 7
export const TO_DAY_SECONDS = 5
/** Auto evening: a very gentle warming from AUTO_EVENING_START, night reached at AUTO_EVENING_END. */
export const AUTO_EVENING_START = 45
export const AUTO_EVENING_END = 75
/**
 * Shapes the auto evening so the first half (45–60 s) only drifts into late-afternoon warmth and
 * sunset → dusk → night play out over the second half (60–75 s), with no pause in between.
 */
const AUTO_EASE_POWER = 1.24

type Color = THREE.Color

export type DayNightState = {
  fog: Color
  sky: Color
  clouds: number
  cloudLit: Color
  cloudShade: Color
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
  'clouds',
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
const COLORS = ['fog', 'sky', 'cloudLit', 'cloudShade', 'hemiSky', 'hemiGround', 'sunColor', 'fillColor'] as const

function createState(): DayNightState {
  return {
    fog: new THREE.Color(),
    sky: new THREE.Color(),
    clouds: 1,
    cloudLit: new THREE.Color(),
    cloudShade: new THREE.Color(),
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
  control: 'auto' as DayNightControl,
  /** Where the world is heading: the visitor's choice in manual, the evening's course in auto. */
  target: 'day' as DayNightTarget,
  /** Seconds of world time since the visit began (only advances while the world is rendering). */
  autoElapsed: 0,
  /** Keyframe clock: 0 = day … 0.62 = night … wraps through dawn back to day. */
  time: DAY_TIME,
  transition: null as Transition | null,
  state: createState(),
  phase: 'day' as DayNightPhase,
}
sample(dayNight.time, dayNight.state)

const listeners = new Set<() => void>()
let snapshot = ''
const snapshotKey = () =>
  `${dayNight.control}|${dayNight.target}|${dayNight.phase}|${dayNight.state.darkness > 0.5 ? 1 : 0}`
snapshot = snapshotKey()

function emitIfChanged() {
  const next = snapshotKey()
  if (next === snapshot) return
  snapshot = next
  listeners.forEach((l) => l())
}

/** Keyframe time of the automatic evening after `elapsed` seconds. */
function autoTime(elapsed: number) {
  const u = THREE.MathUtils.clamp((elapsed - AUTO_EVENING_START) / (AUTO_EVENING_END - AUTO_EVENING_START), 0, 1)
  return DAY_TIME + (NIGHT_TIME - DAY_TIME) * THREE.MathUtils.smoothstep(Math.pow(u, AUTO_EASE_POWER), 0, 1)
}

/** Advances the clock by one frame; called once per frame by the world environment. */
export function tickDayNight(delta: number) {
  if (dayNight.control === 'auto') {
    dayNight.autoElapsed += delta
    dayNight.time = autoTime(dayNight.autoElapsed)
    if (dayNight.autoElapsed >= AUTO_EVENING_START) dayNight.target = 'night'
  } else {
    const tr = dayNight.transition
    if (tr) {
      tr.elapsed += delta
      const k = tr.duration <= 0 ? 1 : THREE.MathUtils.smootherstep(tr.elapsed / tr.duration, 0, 1)
      dayNight.time = wrap(tr.from + (tr.to - tr.from) * k)
      if (tr.elapsed >= tr.duration) dayNight.transition = null
    }
  }
  dayNight.phase = sample(dayNight.time, dayNight.state)
  emitIfChanged()
}

/**
 * Hands control to the visitor and eases from wherever the clock is to the chosen resting time:
 * an unfinished evening reverses back to day, a finished night moves on through dawn, and a
 * morning in progress turns back to night.
 */
export function setDayNightTarget(target: DayNightTarget, reduced = false) {
  dayNight.control = 'manual'
  dayNight.target = target
  const from = dayNight.time
  let to: number
  let span: number
  if (target === 'night') {
    to = NIGHT_TIME
    span = NIGHT_TIME - DAY_TIME
  } else {
    to = from < NIGHT_TIME - 0.001 ? DAY_TIME : 1 + DAY_TIME
    span = to > 1 ? 1 + DAY_TIME - NIGHT_TIME : NIGHT_TIME - DAY_TIME
  }
  const base = target === 'night' ? TO_NIGHT_SECONDS : TO_DAY_SECONDS
  const duration = reduced ? 0.8 : base * THREE.MathUtils.clamp(Math.abs(to - from) / span, 0.3, 1)
  dayNight.transition = Math.abs(to - from) < 0.0005 ? null : { from, to, elapsed: 0, duration }
  emitIfChanged()
}

export function toggleDayNight(reduced = false) {
  const heading = dayNight.control === 'auto' ? (dayNight.state.darkness > 0.5 ? 'night' : 'day') : dayNight.target
  setDayNightTarget(heading === 'night' ? 'day' : 'night', reduced)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Who is in control, where the world is heading, current phase and whether it is dark (for HUD contrast). */
export function useDayNight() {
  const key = useSyncExternalStore(subscribe, () => snapshot)
  const [control, target, phase, dark] = key.split('|')
  return {
    control: control as DayNightControl,
    target: target as DayNightTarget,
    phase: phase as DayNightPhase,
    dark: dark === '1',
  }
}
