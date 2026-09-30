import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { characterSignals } from '../../character/characterSignals'
import { dayNight } from './DayNightController'

const WARM = new THREE.Color('#ffd8b0')
const SUNSET = new THREE.Color('#ffc6a0')
const INTENSITY = 1.6

/**
 * Soft key light that travels with the character so she stays readable after dark:
 * a gentle warm tone at sunset, a warm face light at night. Off in daylight.
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
    l.position.set(characterSignals.x + 0.45, 1.9, characterSignals.z + 1.2)
  })
  return <pointLight ref={light} intensity={0} distance={4} decay={2} color={WARM} />
}
