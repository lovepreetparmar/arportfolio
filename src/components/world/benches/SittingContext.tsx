import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { useWorldState } from '../../../context/WorldStateContext'
import { getBench, getBenchAnchors } from '../../../data/worldBenches'
import { isPlace } from '../../../data/worldLocations'
import { planRoute } from '../../../data/worldPaths'
import { isWalkClear } from '../worldObstacles'
import { beginApproach, createSittingState, isSeatedOrSitting, type SittingState } from './SittingState'

type SittingContextValue = {
  sittingRef: MutableRefObject<SittingState>
  requestSit: (benchId: string) => void
}

const SittingContext = createContext<SittingContextValue | null>(null)

export function SittingProvider({ children }: { children: ReactNode }) {
  const { setTarget, journeyPhase, characterRef, routeRef } = useWorldState()
  const sittingRef = useRef<SittingState>(createSittingState())

  const requestSit = useCallback(
    (benchId: string) => {
      const bench = getBench(benchId)
      const s = sittingRef.current
      if (!bench || journeyPhase !== 'world') return
      if (s.benchId === benchId && s.phase !== 'standing') return
      const { approach } = getBenchAnchors(bench)
      if (isSeatedOrSitting(s) || s.phase === 'standing') {
        s.queuedBench = bench
      } else {
        beginApproach(s, bench)
      }
      // A bench that is a place of its own (the viewpoint) is reached along its path when buildings stand in the way.
      const from = characterRef.current
      const route = isPlace(benchId) && !isWalkClear(from, approach) ? planRoute(from, benchId) : []
      const [first, ...rest] = [...route, { x: approach.x, y: 0, z: approach.z }]
      setTarget(first)
      routeRef.current = rest
    },
    [setTarget, journeyPhase, characterRef, routeRef],
  )

  const value = useMemo(() => ({ sittingRef, requestSit }), [requestSit])
  return <SittingContext.Provider value={value}>{children}</SittingContext.Provider>
}

export function useSitting() {
  const ctx = useContext(SittingContext)
  if (!ctx) throw new Error('useSitting requires SittingProvider')
  return ctx
}

let seatedBench: string | null = null
const seatedListeners = new Set<() => void>()

/** Called every frame by the director; listeners hear only when she settles on a bench or leaves it. */
export function publishSeatedBench(s: SittingState) {
  const id = s.phase === 'seated' ? s.benchId : null
  if (id === seatedBench) return
  seatedBench = id
  seatedListeners.forEach((l) => l())
}

/** The bench she is sitting on, for UI outside the canvas. */
export function useSeatedBench() {
  return useSyncExternalStore(
    (l) => {
      seatedListeners.add(l)
      return () => seatedListeners.delete(l)
    },
    () => seatedBench,
  )
}

/** For the character, which also renders outside the world (e.g. without benches). */
export function useOptionalSitting() {
  return useContext(SittingContext)?.sittingRef ?? null
}
