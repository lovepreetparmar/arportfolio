/**
 * Camera navigation tuning. The camera orbits a pivot at the character's chest; zoom is a
 * multiplier on the default orbit distance (1 = the art-directed three-quarter view).
 */
export const DEFAULT_ZOOM = 1
export const MIN_ZOOM = 0.45
export const MAX_ZOOM = 1.9
/** Zoom change per wheel pixel (exponential, so every notch feels the same). */
export const ZOOM_SPEED = 0.0014
/** Damping rate for easing the current zoom toward the wheel target. */
export const ZOOM_DAMPING = 5
/** Pinch sensitivity relative to finger-distance ratio. */
export const PINCH_SPEED = 1.4

/** Orbit pivot height above the character's feet (upper torso of the ~1.62 m figure). */
export const PIVOT_HEIGHT = 1.15
/** Pivot-to-camera distance at zoom 1. */
export const BASE_DISTANCE = 12.65
export const MIN_CAMERA_DISTANCE = BASE_DISTANCE * MIN_ZOOM
export const MAX_CAMERA_DISTANCE = BASE_DISTANCE * MAX_ZOOM
/** Default view: from the south of the plaza toward the project streets, looking down about 30°. */
export const DEFAULT_AZIMUTH = 0
export const DEFAULT_POLAR = 1.054
/** Polar angle from straight up: never top-down, and at lowest about eye level, looking slightly up. */
export const MIN_POLAR_ANGLE = 0.45
export const MAX_POLAR_ANGLE = 1.5
/**
 * Dragging up past the lowest orbit keeps the camera there and tilts the view up into the sky by
 * the excess, to about 82° above the horizon at most, so the view never tips over the top.
 */
export const LOOK_UP_RANGE = 1.42
/** Orbit radians per dragged pixel. */
export const ORBIT_SPEED = 0.0058
export const ORBIT_SPEED_VERTICAL = 0.0042
export const ORBIT_DAMPING = 9

/** Pointer travel (px) before a press counts as a drag instead of a click. */
export const DRAG_THRESHOLD = 6
/** World metres panned per screen pixel at zoom 1 (scaled by zoom). */
export const PAN_SPEED = 0.022
/** Furthest the view can be panned from the character (metres). */
export const MAX_PAN = 24
/** Damping rate for easing the pan toward the dragged target. */
export const PAN_DAMPING = 9
/** How quickly a free pan drifts back to the character once she walks. */
export const PAN_RECENTER_DAMPING = 1.6

/**
 * WORLD: the visitor orbits and zooms freely. PROJECT_TRANSITION: the camera settles on the
 * door while she walks in. PROJECT_ROOM: the world is hidden behind the project room.
 */
export type CameraMode = 'WORLD' | 'PROJECT_TRANSITION' | 'PROJECT_ROOM'

type MapViewState = {
  mode: CameraMode
  zoom: number
  targetZoom: number
  azimuth: number
  targetAzimuth: number
  /** Orbit polar angle; beyond MAX_POLAR_ANGLE the excess is upward look (see LOOK_UP_RANGE). */
  polar: number
  targetPolar: number
  panX: number
  panZ: number
  targetPanX: number
  targetPanZ: number
  dragging: boolean
  /** The current press turned into an orbit, pan or pinch, so its release is not a click. */
  gestured: boolean
  /** Ground point the camera is currently framing (for sun / shadow / fog follow). */
  focusX: number
  focusZ: number
}

/** Shared per-frame camera state (single world canvas). */
export const mapView: MapViewState = {
  mode: 'WORLD',
  zoom: DEFAULT_ZOOM,
  targetZoom: DEFAULT_ZOOM,
  azimuth: DEFAULT_AZIMUTH,
  targetAzimuth: DEFAULT_AZIMUTH,
  polar: DEFAULT_POLAR,
  targetPolar: DEFAULT_POLAR,
  panX: 0,
  panZ: 0,
  targetPanX: 0,
  targetPanZ: 0,
  dragging: false,
  gestured: false,
  focusX: 0,
  focusZ: 0,
}

export function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
}

export function clampPolar(p: number) {
  return Math.min(MAX_POLAR_ANGLE + LOOK_UP_RANGE, Math.max(MIN_POLAR_ANGLE, p))
}

export function clampPan(x: number, z: number): [number, number] {
  const len = Math.hypot(x, z)
  if (len <= MAX_PAN) return [x, z]
  const s = MAX_PAN / len
  return [x * s, z * s]
}

/** True when a click event is really the end of an orbit, pan or pinch and should not walk or enter. */
export function wasDrag(e: { delta: number }) {
  return mapView.gestured || e.delta > DRAG_THRESHOLD
}
