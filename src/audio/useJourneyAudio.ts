import { useEffect, useRef } from 'react'
import { useWorldState, type JourneyPhase } from '../context/WorldStateContext'
import { getProjectBySlug } from '../data/projects'
import { getProjectWorldConfig } from '../data/projectWorld'
import { audioManager } from './AudioManager'
import { roomPresetFor } from './ProjectAudio'

const OUTSIDE = { world: 1, room: 0 }
const ENTERING = { world: 0.6, room: 0.3 }
const INSIDE = { world: 0.08, room: 1 }
const LEAVING = { world: 0.6, room: 0.3 }

function presetForSlug(slug: string | null) {
  const project = slug ? getProjectBySlug(slug) : null
  return project ? roomPresetFor(getProjectWorldConfig(project).locationType) : null
}

/**
 * Turns the project journey into sound: a soft select cue, the door opening and closing once
 * on the way in and once on the way out, and the outdoor-to-room ambience crossfade.
 */
export function useJourneyAudio() {
  const { journeyPhase, pendingProjectSlug, roomProjectSlug, legacyProjectSlug } = useWorldState()
  const lastPhase = useRef<JourneyPhase>(journeyPhase)
  const lastLegacy = useRef<string | null>(legacyProjectSlug)

  useEffect(() => {
    const prev = lastPhase.current
    lastPhase.current = journeyPhase
    if (prev === journeyPhase) return

    if (journeyPhase === 'walking' && prev !== 'walking') audioManager.play('select')
    if (journeyPhase === 'doorOpening') {
      audioManager.play('doorHandle')
      audioManager.play('doorOpen', 0.22)
      audioManager.setRoom(presetForSlug(pendingProjectSlug))
    }
    if (journeyPhase === 'entering') audioManager.setIndoor(ENTERING.world, ENTERING.room, 0.6)
    if (journeyPhase === 'inRoom') {
      audioManager.play('doorClose', 0.15)
      audioManager.setIndoor(INSIDE.world, INSIDE.room, 1.2)
    }
    if (journeyPhase === 'exiting') {
      audioManager.play('doorHandle')
      audioManager.play('doorOpen', 0.12)
      audioManager.setIndoor(LEAVING.world, LEAVING.room, 0.8)
    }
    if (journeyPhase === 'world' && prev === 'exiting') audioManager.play('doorClose')
    if (journeyPhase === 'world' && (prev === 'exiting' || prev === 'entering') && !legacyProjectSlug) {
      audioManager.setIndoor(OUTSIDE.world, OUTSIDE.room, 1.2)
      audioManager.releaseRoom(1.6)
    }
  }, [journeyPhase, pendingProjectSlug, legacyProjectSlug])

  useEffect(() => {
    const prev = lastLegacy.current
    lastLegacy.current = legacyProjectSlug
    if (prev === legacyProjectSlug) return
    if (legacyProjectSlug && !prev) {
      audioManager.setRoom(presetForSlug(legacyProjectSlug))
      audioManager.play('doorClose', 0.1)
      audioManager.setIndoor(INSIDE.world, INSIDE.room, 1.2)
    } else if (!legacyProjectSlug && prev) {
      audioManager.play('doorOpen')
      audioManager.play('doorClose', 0.75)
      audioManager.setIndoor(OUTSIDE.world, OUTSIDE.room, 1.4)
      audioManager.releaseRoom(1.8)
    }
  }, [legacyProjectSlug])

  useEffect(() => {
    if (roomProjectSlug) audioManager.setRoom(presetForSlug(roomProjectSlug))
  }, [roomProjectSlug])
}
