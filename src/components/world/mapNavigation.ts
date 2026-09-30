/**
 * Map navigation tuning. Zoom is a multiplier on the default camera offset
 * (1 = the art-directed three-quarter view); < 1 is closer, > 1 is further out.
 */
export const DEFAULT_ZOOM = 1
export const MIN_ZOOM = 0.55
export const MAX_ZOOM = 1.9
/** Zoom change per wheel pixel (exponential, so every notch feels the same). */
export const ZOOM_SPEED = 0.0014
/** Damping rate for easing the current zoom toward the wheel target. */
export const ZOOM_DAMPING = 5
/** Pinch sensitivity relative to finger-distance ratio. */
export const PINCH_SPEED = 1.4

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

/** Camera must stay this high above any building roof it passes over. */
export const ROOF_CLEARANCE_HEIGHT = 5.4
export const ROOF_CLEARANCE_MARGIN = 0.9

type MapViewState = {
  zoom: number
  targetZoom: number
  panX: number
  panZ: number
  targetPanX: number
  targetPanZ: number
  dragging: boolean
  /** The current press turned into a pan or pinch, so its release is not a click. */
  gestured: boolean
  /** Ground point the camera is currently framing (for sun / shadow / fog follow). */
  focusX: number
  focusZ: number
}

/** Shared per-frame map view state (single world canvas). */
export const mapView: MapViewState = {
  zoom: DEFAULT_ZOOM,
  targetZoom: DEFAULT_ZOOM,
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

export function clampPan(x: number, z: number): [number, number] {
  const len = Math.hypot(x, z)
  if (len <= MAX_PAN) return [x, z]
  const s = MAX_PAN / len
  return [x * s, z * s]
}

/** True when a click event is really the end of a pan or pinch and should not walk or enter. */
export function wasDrag(e: { delta: number }) {
  return mapView.gestured || e.delta > DRAG_THRESHOLD
}
