import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { characterSignals } from '../../character/characterSignals'
import { mapView } from '../mapNavigation'
import { dayNight } from './DayNightController'

const WARM = new THREE.Color('#ffd8b0')
const SUNSET = new THREE.Color('#ffc6a0')
const INTENSITY = 1.6

/**
 * Soft key light that travels with the character, on the camera's side of her so she stays
 * readable after dark from any orbit angle: a gentle warm tone at sunset, a warm face light at
 * night. Off in daylight.
 */
export function CharacterNightLight() {
  const light = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const l = light.current
    if (!l) return
    const { character, darkness } = dayNight.state
    const on = characterSignals.present ? character : 0
    l.intensity = on * INTENSITY
    l.color.copy(SUNSET).lerp(WARM, darkness)
    const s = Math.sin(mapView.azimuth)
    const c = Math.cos(mapView.azimuth)
    l.position.set(characterSignals.x + s * 1.2 + c * 0.45, 1.9, characterSignals.z + c * 1.2 - s * 0.45)
  })
  return <pointLight ref={light} intensity={0} distance={4} decay={2} color={WARM} />
}
