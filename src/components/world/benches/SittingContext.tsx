import { createContext, useCallback, useContext, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react'
import { useWorldState } from '../../../context/WorldStateContext'
import { getBench, getBenchAnchors } from '../../../data/worldBenches'
import { beginApproach, createSittingState, isSeatedOrSitting, type SittingState } from './SittingState'

type SittingContextValue = {
  sittingRef: MutableRefObject<SittingState>
  requestSit: (benchId: string) => void
}

const SittingContext = createContext<SittingContextValue | null>(null)

export function SittingProvider({ children }: { children: ReactNode }) {
  const { setTarget, journeyPhase } = useWorldState()
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
      setTarget({ x: approach.x, y: 0, z: approach.z })
    },
    [setTarget, journeyPhase],
  )

  const value = useMemo(() => ({ sittingRef, requestSit }), [requestSit])
  return <SittingContext.Provider value={value}>{children}</SittingContext.Provider>
}

export function useSitting() {
  const ctx = useContext(SittingContext)
  if (!ctx) throw new Error('useSitting requires SittingProvider')
  return ctx
}

/** For the character, which also renders outside the world (e.g. without benches). */
export function useOptionalSitting() {
  return useContext(SittingContext)?.sittingRef ?? null
}
