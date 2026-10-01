import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { characterSignals } from '../components/character/characterSignals'
import { isInRoomSpace } from '../components/project-room/roomSpace'
import { useOptionalSitting } from '../components/world/benches/SittingContext'
import type { SitPhase } from '../components/world/benches/SittingState'
import { dayNight } from '../components/world/daynight/DayNightController'
import { projects } from '../data/projects'
import { getProjectEntrance } from '../data/projectWorld'
import { getPlaceEntrance, STUDIO_LOCATIONS, VIEWPOINT } from '../data/worldLocations'
import { PLAZA_RADIUS } from '../data/worldLayout'
import { distanceToPaths } from '../data/worldPaths'
import { audioManager } from './AudioManager'
import type { FootstepSurface } from './CharacterAudio'

const MIX_INTERVAL = 0.25
const ENTRANCE_RADIUS = 1.1
const PATH_HALF_WIDTH = 0.8
const { smoothstep } = THREE.MathUtils

/**
 * Listens to the 3D world from inside the render loop and reports it to the audio manager:
 * footfalls in time with the walk cycle, bench sit/stand, and the day/night ambience mix.
 */
export function AudioSceneBridge() {
  const sittingRef = useOptionalSitting()
  const studioDoors = useMemo(() => STUDIO_LOCATIONS.flatMap((l) => getPlaceEntrance(l.id) ?? []), [])
  const entrances = useMemo(() => [...projects.map((p) => getProjectEntrance(p)), ...studioDoors], [studioDoors])
  const lastStep = useRef<number | null>(null)
  const lastSitPhase = useRef<SitPhase>('none')
  const mixTimer = useRef(0)

  useFrame((_, delta) => {
    mixTimer.current -= delta
    if (mixTimer.current <= 0) {
      mixTimer.current = MIX_INTERVAL
      audioManager.setEnvironment(dayNight.state.dayAudio, dayNight.state.nightAudio)
      if (characterSignals.present && !isInRoomSpace(characterSignals.x, characterSignals.z)) {
        const { x, z } = characterSignals
        const door = Math.min(...studioDoors.map((d) => Math.hypot(d.x - x, d.z - z)))
        const view = Math.hypot(VIEWPOINT.position.x - x, VIEWPOINT.position.z - z)
        audioManager.setPlace(1 - smoothstep(door, 1.5, 7), 1 - smoothstep(view, 3, 11))
      }
    }

    const phase = sittingRef?.current.phase ?? 'none'
    if (phase !== lastSitPhase.current) {
      if (phase === 'sitting') audioManager.play('benchSit')
      else if (phase === 'standing') audioManager.play('benchStand')
      lastSitPhase.current = phase
    }

    if (!audioManager.isEnabled || !characterSignals.present || !characterSignals.walking) {
      lastStep.current = null
      return
    }
    const step = Math.floor((characterSignals.walkPhase - Math.PI / 2) / Math.PI)
    if (lastStep.current !== null && step !== lastStep.current) {
      audioManager.footstep(surfaceAt(characterSignals.x, characterSignals.z, entrances))
    }
    lastStep.current = step
  })

  return null
}

function surfaceAt(x: number, z: number, entrances: { x: number; z: number }[]): FootstepSurface {
  if (isInRoomSpace(x, z)) return 'interior'
  if (entrances.some((e) => Math.hypot(e.x - x, e.z - z) < ENTRANCE_RADIUS)) return 'interior'
  if (Math.hypot(x, z) < PLAZA_RADIUS || distanceToPaths({ x, z }) < PATH_HALF_WIDTH) return 'path'
  return 'grass'
}
