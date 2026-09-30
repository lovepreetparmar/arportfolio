import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { characterSpawn } from '../data/world3d'
import { OPENING_FOCUS_SLUG } from '../data/worldLayout'
import type { CharacterState } from '../components/character/CharacterAnimations'
import { getCharacterDestination, getProjectWorldPosition, logNavigationStep } from '../navigation/worldNavigation'
import { getProjectBySlug } from '../data/projects'

export type Vec3 = { x: number; y: number; z: number }

export type NavigationMode = 'free' | 'navigating' | 'inspecting'
export type NavigationSource = 'manual' | 'index' | 'project' | 'click' | null

type SavedWorld = {
  character: Vec3
  target: Vec3
  at: number
}

type WorldStateContextValue = {
  character: Vec3
  target: Vec3
  characterRef: React.MutableRefObject<Vec3>
  targetRef: React.MutableRefObject<Vec3>
  setNavigationTarget: (t: Vec3, source?: NavigationSource) => void
  navigateToProject: (slug: string, source?: NavigationSource) => void
  cancelNavigation: () => void
  updateCharacter: (c: Vec3) => void
  moving: boolean
  setMoving: (v: boolean) => void
  pointer: { x: number; y: number }
  setPointer: (p: { x: number; y: number }) => void
  saveWorld: () => void
  restoreWorld: () => SavedWorld | null
  clearSavedWorld: () => void
  activeTerritory: string
  setActiveTerritory: (t: string) => void
  nearProjectSlug: string | null
  setNearProjectSlug: (slug: string | null) => void
  accentColor: string
  setAccentColor: (c: string) => void
  lookAt: Vec3 | null
  setLookAt: (p: Vec3 | null) => void
  characterState: CharacterState
  setCharacterState: (s: CharacterState) => void
  navigationMode: NavigationMode
  navigationSource: NavigationSource
  pendingProjectSlug: string | null
  clearPendingProject: () => void
  destinationMarker: Vec3 | null
  /** @deprecated use setNavigationTarget */
  setTarget: (t: Vec3, source?: NavigationSource) => void
}

const STORAGE_KEY = 'anushri-world-state'
const WorldStateContext = createContext<WorldStateContextValue | null>(null)

function assignVec3(dst: Vec3, src: Vec3) {
  dst.x = src.x
  dst.y = src.y ?? 0
  dst.z = src.z
}

export function WorldStateProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Vec3>({ ...characterSpawn, y: 0 })
  const [target, setTargetState] = useState<Vec3>({ ...characterSpawn, y: 0 })
  const [moving, setMoving] = useState(false)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [activeTerritory, setActiveTerritory] = useState('experiments')
  const [nearProjectSlug, setNearProjectSlug] = useState<string | null>(OPENING_FOCUS_SLUG)
  const [accentColor, setAccentColor] = useState('#f77f00')
  const [lookAt, setLookAt] = useState<Vec3 | null>(null)
  const [characterState, setCharacterState] = useState<CharacterState>('idle')
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('free')
  const [navigationSource, setNavigationSource] = useState<NavigationSource>(null)
  const [pendingProjectSlug, setPendingProjectSlug] = useState<string | null>(null)
  const [destinationMarker, setDestinationMarker] = useState<Vec3 | null>(null)

  const characterRef = useRef<Vec3>({ x: characterSpawn.x, y: 0, z: characterSpawn.z })
  const targetRef = useRef<Vec3>({ x: characterSpawn.x, y: 0, z: characterSpawn.z })

  const publishTarget = useCallback((t: Vec3) => {
    assignVec3(targetRef.current, t)
    setTargetState({ ...targetRef.current })
    setDestinationMarker({ ...targetRef.current })
  }, [])

  const syncCharacter = useCallback((c: Vec3) => {
    assignVec3(characterRef.current, c)
    setCharacter({ ...characterRef.current })
  }, [])

  const setNavigationTarget = useCallback(
    (t: Vec3, source: NavigationSource = 'manual') => {
      publishTarget({ x: t.x, y: 0, z: t.z })
      setMoving(true)
      setLookAt(null)
      setNavigationMode('navigating')
      setNavigationSource(source)
      if (source !== 'index' && source !== 'project') {
        setPendingProjectSlug(null)
      }
      logNavigationStep('setNavigationTarget', {
        source,
        target: { ...targetRef.current },
        character: { ...characterRef.current },
      })
    },
    [publishTarget],
  )

  const navigateToProject = useCallback(
    (slug: string, source: NavigationSource = 'index') => {
      const project = getProjectBySlug(slug)
      if (!project) return
      const from = { ...characterRef.current }
      const center = getProjectWorldPosition(project)
      const dest = getCharacterDestination(project, from)

      publishTarget(dest)
      setMoving(true)
      setLookAt(null)
      setNavigationMode('navigating')
      setNavigationSource(source)
      setPendingProjectSlug(slug)

      const distance = Math.hypot(dest.x - from.x, dest.z - from.z)
      if (import.meta.env.DEV) {
        console.log(`SELECTED PROJECT: ${project.title}`)
        console.log('PROJECT WORLD POSITION:', { x: center.x, y: center.y, z: center.z })
        console.log('CHARACTER CURRENT POSITION:', { x: from.x, y: from.y, z: from.z })
        console.log('CHARACTER TARGET:', {
          x: targetRef.current.x,
          y: targetRef.current.y,
          z: targetRef.current.z,
        })
        console.log('DISTANCE TO TARGET:', distance.toFixed(2))
        console.log('NAVIGATION STATE: navigating')
      }
      logNavigationStep('SELECTED PROJECT', {
        title: project.title,
        slug,
        projectWorld: center,
        character: from,
        characterTarget: { ...targetRef.current },
        distance,
        navigationState: 'navigating',
      })
    },
    [publishTarget],
  )

  const cancelNavigation = useCallback(() => {
    setNavigationMode('free')
    setNavigationSource(null)
    setPendingProjectSlug(null)
    setDestinationMarker(null)
  }, [])

  const clearPendingProject = useCallback(() => {
    setPendingProjectSlug(null)
    setNavigationMode('inspecting')
    setNavigationSource(null)
  }, [])

  const saveWorld = useCallback(() => {
    const payload: SavedWorld = {
      character: { ...characterRef.current },
      target: { ...targetRef.current },
      at: Date.now(),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [])

  const restoreWorld = useCallback((): SavedWorld | null => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as SavedWorld
      assignVec3(characterRef.current, data.character)
      assignVec3(targetRef.current, data.target)
      setCharacter({ ...characterRef.current })
      setTargetState({ ...targetRef.current })
      return data
    } catch {
      return null
    }
  }, [])

  const clearSavedWorld = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(
    () => ({
      character,
      target,
      characterRef,
      targetRef,
      setNavigationTarget,
      setTarget: setNavigationTarget,
      navigateToProject,
      cancelNavigation,
      updateCharacter: syncCharacter,
      moving,
      setMoving,
      pointer,
      setPointer,
      saveWorld,
      restoreWorld,
      clearSavedWorld,
      activeTerritory,
      setActiveTerritory,
      nearProjectSlug,
      setNearProjectSlug,
      accentColor,
      setAccentColor,
      lookAt,
      setLookAt,
      characterState,
      setCharacterState,
      navigationMode,
      navigationSource,
      pendingProjectSlug,
      clearPendingProject,
      destinationMarker,
    }),
    [
      character,
      target,
      setNavigationTarget,
      navigateToProject,
      cancelNavigation,
      syncCharacter,
      moving,
      pointer,
      saveWorld,
      restoreWorld,
      clearSavedWorld,
      activeTerritory,
      nearProjectSlug,
      accentColor,
      lookAt,
      characterState,
      navigationMode,
      navigationSource,
      pendingProjectSlug,
      clearPendingProject,
      destinationMarker,
    ],
  )

  return <WorldStateContext.Provider value={value}>{children}</WorldStateContext.Provider>
}

export function useWorldState() {
  const ctx = useContext(WorldStateContext)
  if (!ctx) throw new Error('useWorldState requires WorldStateProvider')
  return ctx
}
