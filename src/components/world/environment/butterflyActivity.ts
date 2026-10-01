import * as THREE from 'three'
import { dayNight } from '../daynight/DayNightController'

/** 0 = fully off (night), 1 = full daytime activity. Smooth across sunset, dusk and dawn. */
export function butterflyActivity(): number {
  const { phase, state } = dayNight
  const d = state.darkness
  switch (phase) {
    case 'night':
      return 0
    case 'dusk':
      return THREE.MathUtils.lerp(0.18, 0, THREE.MathUtils.smoothstep(d, 0.42, 0.58))
    case 'sunset':
      return THREE.MathUtils.lerp(1, 0.15, THREE.MathUtils.smoothstep(d, 0.18, 0.48))
    case 'dawn':
      return THREE.MathUtils.smoothstep(1 - d, 0.35, 0.72)
    case 'afternoon':
      return THREE.MathUtils.lerp(1, 0.88, d * 0.35)
    default:
      return THREE.MathUtils.lerp(1, 0.82, d * 0.25)
  }
}
