import * as THREE from 'three'

/** Radius of the camera-centred sky shell; well inside the camera's far plane. */
export const SKY_RADIUS = 120

/**
 * Unit direction for a sky position: azimuth in degrees clockwise from north (-z, the view
 * from the plaza toward the project streets) and elevation in degrees above the horizon.
 */
export function direction(azimuthDeg: number, elevationDeg: number, out = new THREE.Vector3()) {
  const az = THREE.MathUtils.degToRad(azimuthDeg)
  const el = THREE.MathUtils.degToRad(elevationDeg)
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
}

export function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

/**
 * Orientation of the Milky Way: a great circle rising from the low northern distance (where the
 * default view looks), arching to about 74° overhead and down into the south-east, with the
 * brighter galactic core partway up the north-western sky. `n` is the galactic pole, `u` points
 * at the core, `v` completes the frame.
 */
export const GALAXY = (() => {
  const a = direction(-6, -14)
  const b = direction(-40, 60)
  const n = a.clone().cross(b).normalize()
  const core = direction(-28, 32)
  const u = core.addScaledVector(n, -core.dot(n)).normalize()
  const v = n.clone().cross(u)
  return { n, u, v }
})()

/** Direction at galactic longitude `l` (0 = core) and latitude `b`, both in radians. */
export function galacticDirection(l: number, b: number, out = new THREE.Vector3()) {
  const cb = Math.cos(b)
  return out
    .copy(GALAXY.u)
    .multiplyScalar(Math.cos(l) * cb)
    .addScaledVector(GALAXY.v, Math.sin(l) * cb)
    .addScaledVector(GALAXY.n, Math.sin(b))
}
