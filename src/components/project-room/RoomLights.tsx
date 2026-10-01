import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'
import { getPlaceRoomTheme } from '../../data/worldLocations'
import { damp } from '../character/CharacterAnimations'
import { dayNight } from '../world/daynight/DayNightController'
import { ROOM_DEPTH, ROOM_HEIGHT, ROOM_ORIGIN, ROOM_WIDTH } from './roomSpace'

type Vec3 = [number, number, number]

/** Ceiling track spots (room-local): the hero on the back wall and a wash along each side wall. */
export const ROOM_SPOTS: { position: Vec3; target: Vec3; angle: number; intensity: number }[] = [
  { position: [0, ROOM_HEIGHT - 0.14, -ROOM_DEPTH / 2 + 1.75], target: [0, 1.7, -ROOM_DEPTH / 2], angle: 0.62, intensity: 26 },
  { position: [-ROOM_WIDTH / 2 + 1.45, ROOM_HEIGHT - 0.14, 0], target: [-ROOM_WIDTH / 2, 1.55, 0], angle: 1.05, intensity: 24 },
  { position: [ROOM_WIDTH / 2 - 1.45, ROOM_HEIGHT - 0.14, 0], target: [ROOM_WIDTH / 2, 1.55, 0], angle: 1.05, intensity: 24 },
]

const FILL_POSITION: Vec3 = [0, ROOM_HEIGHT - 0.6, 0.6]
const NIGHT_WARMTH = new THREE.Color('#ffc890')
const DAY_FILL = new THREE.Color('#eef2f6')

const at = ([x, y, z]: Vec3): Vec3 => [ROOM_ORIGIN.x + x, y, ROOM_ORIGIN.z + z]

/**
 * The room's lights are always in the scene (at zero while she is outside) so entering a room
 * never changes the light count and recompiles every world material. Spots carry the gallery
 * look; the fill brightens by day and warms after dark, following the shared day/night clock.
 * The ambient term stands in for the walls' bounce light, which the world's sky light can't give.
 */
export function RoomLights() {
  const { insideRoom, roomProjectSlug } = useWorldState()
  const spots = useRef<(THREE.SpotLight | null)[]>([])
  const fill = useRef<THREE.PointLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const level = useRef(0)
  const targets = useMemo(() => ROOM_SPOTS.map((s) => {
    const o = new THREE.Object3D()
    o.position.set(...at(s.target))
    return o
  }), [])
  const lightColor = useMemo(
    () => new THREE.Color(getPlaceRoomTheme(roomProjectSlug)?.lightColor ?? '#fff2e0'),
    [roomProjectSlug],
  )
  const color = useMemo(() => new THREE.Color(), [])

  useFrame((_, delta) => {
    level.current = insideRoom ? damp(level.current, 1, 6, Math.min(delta, 0.1)) : 0
    const on = level.current
    const dark = dayNight.state.darkness
    color.copy(lightColor).lerp(NIGHT_WARMTH, dark * 0.35)
    spots.current.forEach((light, i) => {
      if (!light) return
      light.intensity = on * ROOM_SPOTS[i].intensity * (1 + 0.3 * dark)
      light.color.copy(color)
    })
    if (fill.current) {
      fill.current.intensity = on * THREE.MathUtils.lerp(16, 11, dark)
      fill.current.color.copy(DAY_FILL).lerp(color, 0.4 + dark * 0.6)
    }
    if (ambient.current) {
      ambient.current.intensity = on * THREE.MathUtils.lerp(0.35, 0.6, dark)
      ambient.current.color.copy(DAY_FILL).lerp(color, dark)
    }
  })

  return (
    <group>
      {targets.map((t, i) => (
        <primitive key={`t${i}`} object={t} />
      ))}
      {ROOM_SPOTS.map((s, i) => (
        <spotLight
          key={i}
          ref={(l) => {
            spots.current[i] = l
          }}
          position={at(s.position)}
          target={targets[i]}
          angle={s.angle}
          penumbra={0.85}
          decay={2}
          distance={9}
          intensity={0}
        />
      ))}
      <pointLight ref={fill} position={at(FILL_POSITION)} distance={12} decay={2} intensity={0} />
      <ambientLight ref={ambient} intensity={0} />
    </group>
  )
}
