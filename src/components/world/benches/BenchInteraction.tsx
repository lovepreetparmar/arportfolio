import { useFrame } from '@react-three/fiber'
import { useWorldState } from '../../../context/WorldStateContext'
import { getWorldBenches, type BenchSpot } from '../../../data/worldBenches'
import { useReducedMotion } from '../../../hooks/useMediaQuery'
import { Bench } from './Bench'
import { useSitting } from './SittingContext'
import { stepSitting } from './SittingState'

/** Runs the sitting state machine; mount before the character so she reads this frame's phase. */
export function SittingDirector() {
  const { sittingRef } = useSitting()
  const { characterRef, targetRef, journeyPhase } = useWorldState()
  const reduced = useReducedMotion()

  useFrame((_, delta) => {
    stepSitting(sittingRef.current, {
      character: characterRef.current,
      target: targetRef.current,
      exploring: journeyPhase === 'world',
      delta: Math.min(delta, 0.1),
      reduced,
    })
  })

  return null
}

/** A sittable bench; hovering shows the "Sit" cursor and clicking sends her to sit. */
export function BenchInteraction({ bench }: { bench: BenchSpot }) {
  const { requestSit } = useSitting()
  return <Bench bench={bench} onSelect={requestSit} />
}

export function WorldBenches() {
  const benches = getWorldBenches()
  return (
    <>
      {benches.map((b) => (
        <BenchInteraction key={b.id} bench={b} />
      ))}
    </>
  )
}
