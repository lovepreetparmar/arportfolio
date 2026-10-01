/**
 * Per-frame character facts shared outside the rig (footstep audio, character night light).
 * Written by the character controller; read-only everywhere else.
 */
export type LocomotionDriver = 'procedural' | 'skeletal'

export const characterSignals = {
  /** False while the character is hidden (inside a project room). */
  present: false,
  /** True once her photo-based model has loaded and replaced the placeholder rig. */
  modelReady: false,
  walking: false,
  /** Leg-swing phase in radians; a foot lands each time it crosses π/2 + kπ. */
  walkPhase: 0,
  /** 0 = idle pose weight, 1 = full walk (used for clip crossfade). */
  gait: 0,
  /** Current horizontal speed (m/s). */
  speed: 0,
  locomotion: 'procedural' as LocomotionDriver,
  locMotionState: 'idle' as 'idle' | 'walk',
  walkClipDuration: 0,
  /** Ground speed (m/s) the walk clip is animated for at playback rate 1. */
  walkNaturalSpeed: 0,
  animPlaybackRate: 1,
  x: 0,
  z: 0,
}
