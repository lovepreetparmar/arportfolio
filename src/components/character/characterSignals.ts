/**
 * Per-frame character facts shared outside the rig (footstep audio, character night light).
 * Written by the character controller; read-only everywhere else.
 */
export const characterSignals = {
  /** False while the character is hidden (inside a project room). */
  present: false,
  /** True once her photo-based model has loaded and replaced the placeholder rig. */
  modelReady: false,
  walking: false,
  /** Leg-swing phase in radians; a foot lands each time it crosses π/2 + kπ. */
  walkPhase: 0,
  x: 0,
  z: 0,
}
