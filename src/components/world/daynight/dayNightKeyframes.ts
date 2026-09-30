/** Moments of the day/night loop. Time runs 0 → 1 and wraps back to day. */
export type DayNightPhase = 'day' | 'afternoon' | 'sunset' | 'dusk' | 'night' | 'dawn'

export type DayNightKeyframe = {
  at: number
  phase: DayNightPhase
  /** Fog and background: the colour the distance dissolves into. */
  fog: string
  /** Top of the screen at night reads as sky; this is its colour. */
  sky: string
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  /** Sun by day, moon by night. */
  sunColor: string
  sunIntensity: number
  /** Light position relative to the camera focus; low values give long shadows. */
  sunOffset: [number, number, number]
  fillColor: string
  fillIntensity: number
  /** Multiplier on window, doorway and display glow. */
  windows: number
  /** Street lamps, entrance lanterns and their light pools (0 off → 1 fully on). */
  lamps: number
  /** Subtle sign illumination. */
  signs: number
  stars: number
  moon: number
  /** Soft warm light that keeps the character readable after dark. */
  character: number
  /** Ambience mix handed to the audio system. */
  dayAudio: number
  nightAudio: number
}

/** The day keyframe reproduces the original art-directed daylight exactly. */
export const DAY_NIGHT_KEYFRAMES: DayNightKeyframe[] = [
  {
    at: 0,
    phase: 'day',
    fog: '#efe8dc',
    sky: '#efe8dc',
    hemiSky: '#fff8ec',
    hemiGround: '#d9ccb4',
    hemiIntensity: 0.93,
    sunColor: '#fff0dc',
    sunIntensity: 1.55,
    sunOffset: [9, 15, 7],
    fillColor: '#e9eef2',
    fillIntensity: 0.22,
    windows: 1,
    lamps: 0,
    signs: 0,
    stars: 0,
    moon: 0,
    character: 0,
    dayAudio: 1,
    nightAudio: 0,
  },
  {
    at: 0.2,
    phase: 'afternoon',
    fog: '#f0e4cf',
    sky: '#efe2cc',
    hemiSky: '#fff2dc',
    hemiGround: '#d7c6a8',
    hemiIntensity: 0.88,
    sunColor: '#ffe2b6',
    sunIntensity: 1.6,
    sunOffset: [12, 11, 4],
    fillColor: '#ebdfcd',
    fillIntensity: 0.21,
    windows: 1,
    lamps: 0,
    signs: 0,
    stars: 0,
    moon: 0,
    character: 0,
    dayAudio: 0.95,
    nightAudio: 0,
  },
  {
    at: 0.38,
    phase: 'sunset',
    fog: '#ecd2b8',
    sky: '#e7c3a6',
    hemiSky: '#ffdcbf',
    hemiGround: '#bba08c',
    hemiIntensity: 0.8,
    sunColor: '#ffb888',
    sunIntensity: 1.42,
    sunOffset: [16, 5, -2],
    fillColor: '#cdb4cc',
    fillIntensity: 0.28,
    windows: 1.5,
    lamps: 0.18,
    signs: 0.1,
    stars: 0,
    moon: 0.08,
    character: 0.2,
    dayAudio: 0.7,
    nightAudio: 0.12,
  },
  {
    at: 0.5,
    phase: 'dusk',
    fog: '#948aa6',
    sky: '#6f6a8e',
    hemiSky: '#aca0c4',
    hemiGround: '#72667d',
    hemiIntensity: 0.7,
    sunColor: '#e59a86',
    sunIntensity: 0.42,
    sunOffset: [15, 2.5, -5],
    fillColor: '#909ecd',
    fillIntensity: 0.32,
    windows: 1.9,
    lamps: 0.75,
    signs: 0.6,
    stars: 0.45,
    moon: 0.6,
    character: 0.65,
    dayAudio: 0.3,
    nightAudio: 0.55,
  },
  {
    at: 0.62,
    phase: 'night',
    fog: '#323a50',
    sky: '#141a2e',
    hemiSky: '#7888b6',
    hemiGround: '#2e3344',
    hemiIntensity: 0.74,
    sunColor: '#b6c4ec',
    sunIntensity: 0.6,
    sunOffset: [-9, 14, 5],
    fillColor: '#5f6c98',
    fillIntensity: 0.24,
    windows: 2.4,
    lamps: 1,
    signs: 1,
    stars: 1,
    moon: 1,
    character: 1,
    dayAudio: 0.03,
    nightAudio: 1,
  },
  {
    at: 0.86,
    phase: 'night',
    fog: '#323a50',
    sky: '#141a2e',
    hemiSky: '#7888b6',
    hemiGround: '#2e3344',
    hemiIntensity: 0.74,
    sunColor: '#b6c4ec',
    sunIntensity: 0.6,
    sunOffset: [-9, 14, 5],
    fillColor: '#5f6c98',
    fillIntensity: 0.24,
    windows: 2.4,
    lamps: 1,
    signs: 1,
    stars: 1,
    moon: 1,
    character: 1,
    dayAudio: 0.03,
    nightAudio: 1,
  },
  {
    at: 0.94,
    phase: 'dawn',
    fog: '#d9c9c4',
    sky: '#b9a9b4',
    hemiSky: '#f3dcd2',
    hemiGround: '#a89b9c',
    hemiIntensity: 0.8,
    sunColor: '#ffcaa8',
    sunIntensity: 0.95,
    sunOffset: [-14, 5, 6],
    fillColor: '#cbcee6',
    fillIntensity: 0.25,
    windows: 1.4,
    lamps: 0.2,
    signs: 0.15,
    stars: 0.12,
    moon: 0.25,
    character: 0.15,
    dayAudio: 0.5,
    nightAudio: 0.3,
  },
]

/** Resting times for the day and night modes (just past their keyframes). */
export const DAY_TIME = 0.02
export const NIGHT_TIME = 0.64
