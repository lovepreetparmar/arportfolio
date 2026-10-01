/** Moments of the day/night loop. Time runs 0 → 1 and wraps back to day. */
export type DayNightPhase = 'day' | 'afternoon' | 'sunset' | 'dusk' | 'night' | 'dawn'

export type DayNightKeyframe = {
  at: number
  phase: DayNightPhase
  /** Fog and background: the colour the distance dissolves into. */
  fog: string
  /** Upper-sky colour the atmosphere shades toward from the haze at the horizon. */
  sky: string
  /** Cloud cover strength (0 none → 1 full daytime clouds). */
  clouds: number
  /** Sunlit tops and shaded undersides of the clouds. */
  cloudLit: string
  cloudShade: string
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

/** Day pairs a warm sun with a cool sky fill, so colours read rich and shadows stay clean. */
export const DAY_NIGHT_KEYFRAMES: DayNightKeyframe[] = [
  {
    at: 0,
    phase: 'day',
    fog: '#efe8dc',
    sky: '#9fbedb',
    clouds: 0.9,
    cloudLit: '#ffffff',
    cloudShade: '#dbe3ec',
    hemiSky: '#eaf1f6',
    hemiGround: '#bcc99a',
    hemiIntensity: 0.8,
    sunColor: '#fff0d4',
    sunIntensity: 1.72,
    sunOffset: [9, 15, 7],
    fillColor: '#d6e4f3',
    fillIntensity: 0.24,
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
    sky: '#a9c0d6',
    clouds: 0.9,
    cloudLit: '#fffaf1',
    cloudShade: '#dfdfe3',
    hemiSky: '#f4f0e6',
    hemiGround: '#c2c497',
    hemiIntensity: 0.8,
    sunColor: '#ffe2b6',
    sunIntensity: 1.74,
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
    sky: '#b3b1c6',
    clouds: 0.8,
    cloudLit: '#fbdcc4',
    cloudShade: '#c4afb6',
    hemiSky: '#ffdcbf',
    hemiGround: '#bba08c',
    hemiIntensity: 0.8,
    sunColor: '#ffb47c',
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
    sky: '#5f6690',
    clouds: 0.35,
    cloudLit: '#b49db0',
    cloudShade: '#7c7894',
    hemiSky: '#aca0c4',
    hemiGround: '#626a70',
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
    clouds: 0.04,
    cloudLit: '#454d6a',
    cloudShade: '#2b3248',
    hemiSky: '#7888b6',
    hemiGround: '#2c3a3a',
    hemiIntensity: 0.8,
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
    clouds: 0.04,
    cloudLit: '#454d6a',
    cloudShade: '#2b3248',
    hemiSky: '#7888b6',
    hemiGround: '#2c3a3a',
    hemiIntensity: 0.8,
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
    sky: '#aab0c8',
    clouds: 0.45,
    cloudLit: '#f7dccf',
    cloudShade: '#b3adbd',
    hemiSky: '#f3dcd2',
    hemiGround: '#9ea394',
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
