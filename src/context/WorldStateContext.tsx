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
import { useTexture } from '@react-three/drei'
import { characterSpawn } from '../data/world3d'
import { getProjectBySlug } from '../data/projects'
import { getProjectWorldConfig } from '../data/projectWorld'
import { getPlaceEntrance, hasPlaceInterior, isPlace } from '../data/worldLocations'
import { planRoute } from '../data/worldPaths'
import type { CharacterState } from '../components/character/CharacterAnimations'
import { ROOM_ARRIVAL, ROOM_DOORSTEP, isInRoomSpace, resetRoomView } from '../components/project-room/roomSpace'
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
  /** True while she is physically inside a project room (rather than out in the world). */
  insideRoom: boolean
  /** Black veil over the canvas while she passes through a doorway. */
  veil: boolean
  setVeil: (v: boolean) => void
  doorOpenAmount: number
  setDoorOpenAmount: (n: number) => void
  cameraFocus: Vec3 | null
  navigateToProject: (slug: string) => void
  onCharacterArrivedAtEntrance: () => void
  advanceJourneyTo: (phase: JourneyPhase) => void
  stepThroughDoor: () => void
  beginProjectReveal: () => void
  openLegacyProjectView: (slug: string) => void
  clearLegacyProjectView: () => void
  exitProjectRoom: () => void
  leaveRoomToEntrance: () => void
  finishRoomExit: () => void
  characterRef: MutableRefObject<Vec3>
  targetRef: MutableRefObject<Vec3>
  /** Remaining path waypoints after the current target. */
  routeRef: MutableRefObject<Vec3[]>
  advanceRoute: () => boolean
}

const STORAGE_KEY = 'anushri-world-state'
const WorldStateContext = createContext<WorldStateContextValue | null>(null)

/** How far she walks into the open doorway before the veil closes. */
const DOORWAY_DEPTH = 1.15
/** On the way out she appears just inside the doorway and steps out past the entrance mark. */
const EXIT_DOORWAY = 0.9
const EXIT_STEP_OUT = 0.9

function entranceFrame(slug: string) {
  const e = getPlaceEntrance(slug)
  if (!e) return null
  return { e, fx: Math.sin(e.doorYaw), fz: Math.cos(e.doorYaw) }
}

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
  const [insideRoom, setInsideRoom] = useState(false)
  const [veil, setVeil] = useState(false)
  const [doorOpenAmount, setDoorOpenAmount] = useState(0)
  const [cameraFocus, setCameraFocus] = useState<Vec3 | null>(null)
  const characterRef = useRef(character)
  const targetRef = useRef(target)
  const routeRef = useRef<Vec3[]>([])
  const phaseRef = useRef(journeyPhase)
  const insideRef = useRef(insideRoom)
  const pendingRef = useRef(pendingProjectSlug)
  const roomSlugRef = useRef(roomProjectSlug)
  /** Project picked from the index while inside a room; visited once she is back outside. */
  const queuedSlugRef = useRef<string | null>(null)
  /** Where she was just placed; per-frame moves computed from her old spot are dropped until one starts here. */
  const placedRef = useRef<Vec3 | null>(null)
  characterRef.current = character
  targetRef.current = target

  const setPhase = useCallback((phase: JourneyPhase) => {
    phaseRef.current = phase
    setJourneyPhase(phase)
  }, [])

  const setPending = useCallback((slug: string | null) => {
    pendingRef.current = slug
    setPendingProjectSlug(slug)
  }, [])

  const setRoomSlug = useCallback((slug: string | null) => {
    roomSlugRef.current = slug
    setRoomProjectSlug(slug)
  }, [])

  const setInside = useCallback((inside: boolean) => {
    insideRef.current = inside
    setInsideRoom(inside)
  }, [])

  const setTarget = useCallback((t: Vec3) => {
    if (isInRoomSpace(t.x, t.z) !== insideRef.current) return
    routeRef.current = []
    targetRef.current = t
    setTargetState(t)
    setMoving(true)
    setLookAt(null)
  }, [])

  const advanceRoute = useCallback(() => {
    const next = routeRef.current.shift()
    if (!next) return false
    targetRef.current = next
    setTargetState(next)
    return true
  }, [])

  const updateCharacter = useCallback((c: Vec3) => {
    const placed = placedRef.current
    if (placed) {
      if (Math.hypot(c.x - placed.x, c.z - placed.z) > 0.5) return
      placedRef.current = null
    }
    setCharacter(c)
  }, [])

  /** Puts her at `at` (through a doorway) and sets where she walks next. */
  const placeCharacter = useCallback((at: Vec3, next: Vec3) => {
    placedRef.current = at
    routeRef.current = []
    characterRef.current = at
    targetRef.current = next
    setCharacter(at)
    setTargetState(next)
    setMoving(Math.hypot(next.x - at.x, next.z - at.z) > 0.05)
    setLookAt(null)
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

  const advanceJourneyTo = useCallback((phase: JourneyPhase) => setPhase(phase), [setPhase])

  /** She is through the door: the room for `slug` takes over. */
  const enterRoom = useCallback(
    (slug: string) => {
      resetRoomView()
      setRoomSlug(slug)
      setInside(true)
      placeCharacter(ROOM_DOORSTEP, ROOM_ARRIVAL)
      setPhase('inRoom')
      setPending(null)
      setDoorOpenAmount(0)
      setCameraFocus(null)
    },
    [placeCharacter, setInside, setPending, setPhase, setRoomSlug],
  )

  const exitProjectRoom = useCallback(() => {
    if (phaseRef.current !== 'inRoom') return
    setPhase('exiting')
    routeRef.current = []
    setTargetState(ROOM_DOORSTEP)
    setMoving(true)
  }, [setPhase])

  /** Sends her to a place: a project building, or one of the studios (About, Contact). */
  const navigateToProject = useCallback(
    (slug: string) => {
      const entrance = getPlaceEntrance(slug)
      if (!entrance || !isPlace(slug)) return
      const phase = phaseRef.current
      if (phase === 'inRoom') {
        if (slug !== roomSlugRef.current) {
          queuedSlugRef.current = slug
          exitProjectRoom()
        }
        return
      }
      if (phase !== 'world' && phase !== 'walking') return
      if (phase === 'walking' && pendingRef.current === slug) return

      const project = getProjectBySlug(slug)
      const config = project ? getProjectWorldConfig(project) : null
      if (config?.hasInteriorRoom) useTexture.preload(config.gallery.map((g) => g.src))
      const interior = hasPlaceInterior(slug)
      saveWorld()
      setPending(slug)
      setLegacyProjectSlug(null)
      setRoomSlug(null)
      setDoorOpenAmount(0)

      setCameraFocus({ x: entrance.buildingX, y: 1.2, z: entrance.buildingZ })
      setLookAt({ x: entrance.buildingX, y: 1.1, z: entrance.buildingZ })

      if (reduced) {
        if (interior) {
          enterRoom(slug)
        } else {
          setPhase('world')
          setLegacyProjectSlug(slug)
          setPending(null)
          setCameraFocus(null)
        }
        return
      }

      setPhase('walking')
      const route = planRoute(characterRef.current, slug)
      const first = route.shift() ?? { x: entrance.x, y: 0, z: entrance.z }
      routeRef.current = route
      setTargetState(first)
      setMoving(true)
    },
    [reduced, saveWorld, enterRoom, exitProjectRoom, setPending, setPhase, setRoomSlug],
  )

  const onCharacterArrivedAtEntrance = useCallback(() => {
    if (phaseRef.current !== 'walking') return
    setPhase('arrived')
    setMoving(false)
  }, [setPhase])

  /** With the door open she walks on into the doorway. */
  const stepThroughDoor = useCallback(() => {
    const slug = pendingRef.current
    const frame = slug ? entranceFrame(slug) : null
    if (!frame) return
    const { e, fx, fz } = frame
    routeRef.current = []
    setTargetState({ x: e.x - fx * DOORWAY_DEPTH, y: 0, z: e.z - fz * DOORWAY_DEPTH })
    setMoving(true)
  }, [])

  const beginProjectReveal = useCallback(() => {
    const slug = pendingRef.current
    if (!slug || phaseRef.current !== 'entering') return
    if (hasPlaceInterior(slug)) {
      enterRoom(slug)
      return
    }
    setLegacyProjectSlug(slug)
    setPhase('world')
    setDoorOpenAmount(0)
    setCameraFocus(null)
    setPending(null)
  }, [enterRoom, setPending, setPhase])

  /** Behind the veil: she leaves the room and stands in the building's open doorway. */
  const leaveRoomToEntrance = useCallback(() => {
    const slug = roomSlugRef.current
    const frame = slug ? entranceFrame(slug) : null
    if (!frame) return
    const { e, fx, fz } = frame
    setInside(false)
    placeCharacter(
      { x: e.x - fx * EXIT_DOORWAY, y: 0, z: e.z - fz * EXIT_DOORWAY },
      { x: e.x + fx * EXIT_STEP_OUT, y: 0, z: e.z + fz * EXIT_STEP_OUT },
    )
  }, [placeCharacter, setInside])

  const finishRoomExit = useCallback(() => {
    if (phaseRef.current !== 'exiting') return
    setPhase('world')
    setRoomSlug(null)
    setDoorOpenAmount(0)
    setCameraFocus(null)
    resetRoomView()
    clearSavedWorld()
    const queued = queuedSlugRef.current
    queuedSlugRef.current = null
    if (queued) navigateToProject(queued)
  }, [clearSavedWorld, navigateToProject, setPhase, setRoomSlug])

  const openLegacyProjectView = useCallback(
    (slug: string) => {
      setLegacyProjectSlug(slug)
      setPending(null)
      setPhase('world')
      setDoorOpenAmount(0)
      setCameraFocus(null)
    },
    [setPending, setPhase],
  )

  const clearLegacyProjectView = useCallback(() => {
    setLegacyProjectSlug(null)
    if (insideRef.current) return
    restoreWorld()
    clearSavedWorld()
    setPhase('world')
    setDoorOpenAmount(0)
    setCameraFocus(null)
    setPending(null)
    setRoomSlug(null)
  }, [restoreWorld, clearSavedWorld, setPending, setPhase, setRoomSlug])

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
      insideRoom,
      veil,
      setVeil,
      doorOpenAmount,
      setDoorOpenAmount,
      cameraFocus,
      navigateToProject,
      onCharacterArrivedAtEntrance,
      advanceJourneyTo,
      stepThroughDoor,
      beginProjectReveal,
      openLegacyProjectView,
      clearLegacyProjectView,
      exitProjectRoom,
      leaveRoomToEntrance,
      finishRoomExit,
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
      insideRoom,
      veil,
      doorOpenAmount,
      cameraFocus,
      navigateToProject,
      onCharacterArrivedAtEntrance,
      advanceJourneyTo,
      stepThroughDoor,
      beginProjectReveal,
      openLegacyProjectView,
      clearLegacyProjectView,
      exitProjectRoom,
      leaveRoomToEntrance,
      finishRoomExit,
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
