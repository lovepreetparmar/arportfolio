import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { characterSpawn } from '../data/world3d'
import { getProjectBySlug } from '../data/projects'
import { getProjectEntrance, hasProjectInteriorRoom } from '../data/projectWorld'
import { planRoute } from '../data/worldPaths'
import type { CharacterState } from '../components/character/CharacterAnimations'
import { useReducedMotion } from '../hooks/useMediaQuery'

export type Vec3 = { x: number; y: number; z: number }

export type JourneyPhase =
  | 'world'
  | 'walking'
  | 'arrived'
  | 'doorOpening'
  | 'entering'
  | 'inRoom'
  | 'exiting'

type SavedWorld = {
  character: Vec3
  target: Vec3
  at: number
}

type WorldStateContextValue = {
  character: Vec3
  target: Vec3
  setTarget: (t: Vec3) => void
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
  journeyPhase: JourneyPhase
  pendingProjectSlug: string | null
  roomProjectSlug: string | null
  legacyProjectSlug: string | null
  doorOpenAmount: number
  setDoorOpenAmount: (n: number) => void
  cameraFocus: Vec3 | null
  navigateToProject: (slug: string) => void
  onCharacterArrivedAtEntrance: () => void
  advanceJourneyTo: (phase: JourneyPhase) => void
  beginProjectReveal: () => void
  openLegacyProjectView: (slug: string) => void
  clearLegacyProjectView: () => void
  exitProjectRoom: () => void
  characterRef: MutableRefObject<Vec3>
  targetRef: MutableRefObject<Vec3>
  /** Remaining path waypoints after the current target. */
  routeRef: MutableRefObject<Vec3[]>
  advanceRoute: () => boolean
}

const STORAGE_KEY = 'anushri-world-state'
const WorldStateContext = createContext<WorldStateContextValue | null>(null)

export function WorldStateProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const [character, setCharacter] = useState<Vec3>(characterSpawn)
  const [target, setTargetState] = useState<Vec3>(characterSpawn)
  const [moving, setMoving] = useState(false)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [activeTerritory, setActiveTerritory] = useState('experiments')
  const [nearProjectSlug, setNearProjectSlug] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('#f77f00')
  const [lookAt, setLookAt] = useState<Vec3 | null>(null)
  const [characterState, setCharacterState] = useState<CharacterState>('idle')
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('world')
  const [pendingProjectSlug, setPendingProjectSlug] = useState<string | null>(null)
  const [roomProjectSlug, setRoomProjectSlug] = useState<string | null>(null)
  const [legacyProjectSlug, setLegacyProjectSlug] = useState<string | null>(null)
  const [doorOpenAmount, setDoorOpenAmount] = useState(0)
  const [cameraFocus, setCameraFocus] = useState<Vec3 | null>(null)
  const characterRef = useRef(character)
  const targetRef = useRef(target)
  const routeRef = useRef<Vec3[]>([])
  characterRef.current = character
  targetRef.current = target

  const setTarget = useCallback((t: Vec3) => {
    routeRef.current = []
    setTargetState(t)
    setMoving(true)
    setLookAt(null)
  }, [])

  const advanceRoute = useCallback(() => {
    const next = routeRef.current.shift()
    if (!next) return false
    setTargetState(next)
    return true
  }, [])

  const updateCharacter = useCallback((c: Vec3) => {
    setCharacter(c)
  }, [])

  const saveWorld = useCallback(() => {
    const payload: SavedWorld = {
      character: characterRef.current,
      target: targetRef.current,
      at: Date.now(),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [])

  const restoreWorld = useCallback((): SavedWorld | null => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as SavedWorld
      setCharacter(data.character)
      setTargetState(data.target)
      return data
    } catch {
      return null
    }
  }, [])

  const clearSavedWorld = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const advanceJourneyTo = useCallback((phase: JourneyPhase) => {
    setJourneyPhase(phase)
  }, [])

  const navigateToProject = useCallback(
    (slug: string) => {
      const project = getProjectBySlug(slug)
      if (!project) return
      saveWorld()
      setPendingProjectSlug(slug)
      setLegacyProjectSlug(null)
      setRoomProjectSlug(null)
      setDoorOpenAmount(0)

      const entrance = getProjectEntrance(project)
      setCameraFocus({ x: entrance.buildingX, y: 1.2, z: entrance.buildingZ })
      setLookAt({ x: entrance.buildingX, y: 1.1, z: entrance.buildingZ })

      if (reduced) {
        if (hasProjectInteriorRoom(slug)) {
          setJourneyPhase('inRoom')
          setRoomProjectSlug(slug)
          setPendingProjectSlug(null)
          setCameraFocus(null)
        } else {
          setJourneyPhase('world')
          setLegacyProjectSlug(slug)
          setPendingProjectSlug(null)
          setCameraFocus(null)
        }
        return
      }

      setJourneyPhase('walking')
      const route = planRoute(characterRef.current, slug)
      const first = route.shift() ?? { x: entrance.x, y: 0, z: entrance.z }
      routeRef.current = route
      setTargetState(first)
      setMoving(true)
    },
    [reduced, saveWorld],
  )

  const onCharacterArrivedAtEntrance = useCallback(() => {
    setJourneyPhase((phase) => {
      if (phase !== 'walking') return phase
      return 'arrived'
    })
    setMoving(false)
  }, [])

  const beginProjectReveal = useCallback(() => {
    const slug = pendingProjectSlug
    if (!slug) return
    if (hasProjectInteriorRoom(slug)) {
      setRoomProjectSlug(slug)
      setJourneyPhase('inRoom')
    } else {
      setLegacyProjectSlug(slug)
      setJourneyPhase('world')
      setDoorOpenAmount(0)
      setCameraFocus(null)
    }
    setPendingProjectSlug(null)
  }, [pendingProjectSlug])

  const openLegacyProjectView = useCallback((slug: string) => {
    setLegacyProjectSlug(slug)
    setPendingProjectSlug(null)
    setJourneyPhase('world')
    setDoorOpenAmount(0)
    setCameraFocus(null)
  }, [])

  const clearLegacyProjectView = useCallback(() => {
    setLegacyProjectSlug(null)
    restoreWorld()
    clearSavedWorld()
    setJourneyPhase('world')
    setDoorOpenAmount(0)
    setCameraFocus(null)
    setPendingProjectSlug(null)
    setRoomProjectSlug(null)
  }, [restoreWorld, clearSavedWorld])

  const exitProjectRoom = useCallback(() => {
    setJourneyPhase('exiting')
    setDoorOpenAmount(0)
    window.setTimeout(() => {
      setRoomProjectSlug(null)
      setJourneyPhase('world')
      setCameraFocus(null)
      restoreWorld()
      clearSavedWorld()
      setPendingProjectSlug(null)
    }, reduced ? 120 : 700)
  }, [restoreWorld, clearSavedWorld, reduced])

  const value = useMemo(
    () => ({
      character,
      target,
      setTarget,
      updateCharacter,
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
      journeyPhase,
      pendingProjectSlug,
      roomProjectSlug,
      legacyProjectSlug,
      doorOpenAmount,
      setDoorOpenAmount,
      cameraFocus,
      navigateToProject,
      onCharacterArrivedAtEntrance,
      advanceJourneyTo,
      beginProjectReveal,
      openLegacyProjectView,
      clearLegacyProjectView,
      exitProjectRoom,
      characterRef,
      targetRef,
      routeRef,
      advanceRoute,
    }),
    [
      character,
      target,
      setTarget,
      updateCharacter,
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
      journeyPhase,
      pendingProjectSlug,
      roomProjectSlug,
      legacyProjectSlug,
      doorOpenAmount,
      cameraFocus,
      navigateToProject,
      onCharacterArrivedAtEntrance,
      advanceJourneyTo,
      beginProjectReveal,
      openLegacyProjectView,
      clearLegacyProjectView,
      exitProjectRoom,
      advanceRoute,
    ],
  )

  return <WorldStateContext.Provider value={value}>{children}</WorldStateContext.Provider>
}

export function useWorldState() {
  const ctx = useContext(WorldStateContext)
  if (!ctx) throw new Error('useWorldState requires WorldStateProvider')
  return ctx
}
