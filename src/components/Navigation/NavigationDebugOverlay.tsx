import { getProjectBySlug } from '../../data/projects'
import { horizontalDistance, ARRIVAL_THRESHOLD } from '../../navigation/worldNavigation'
import { useWorldState } from '../../context/WorldStateContext'

export function NavigationDebugOverlay() {
  if (!import.meta.env.DEV) return null

  const {
    character,
    target,
    characterRef,
    targetRef,
    moving,
    navigationMode,
    pendingProjectSlug,
    destinationMarker,
  } = useWorldState()

  const project = pendingProjectSlug ? getProjectBySlug(pendingProjectSlug) : null
  const dist = horizontalDistance(characterRef.current, targetRef.current)
  const state = moving && dist > ARRIVAL_THRESHOLD ? 'WALKING' : navigationMode === 'inspecting' ? 'INSPECT' : 'IDLE'

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] rounded bg-ink/85 p-3 font-mono text-[10px] leading-relaxed text-canvas">
      <p className="mb-2 uppercase tracking-wider text-[#e8784a]">Navigation debug</p>
      <p>PROJECT: {project?.title ?? '—'}</p>
      <p className="mt-2 opacity-70">Character:</p>
      <p>{character.x.toFixed(2)}, {character.y.toFixed(2)}, {character.z.toFixed(2)}</p>
      <p className="mt-2 opacity-70">Target:</p>
      <p>{target.x.toFixed(2)}, {target.y.toFixed(2)}, {target.z.toFixed(2)}</p>
      {destinationMarker && (
        <>
          <p className="mt-2 opacity-70">Marker:</p>
          <p>{destinationMarker.x.toFixed(2)}, {destinationMarker.z.toFixed(2)}</p>
        </>
      )}
      <p className="mt-2">Distance: {dist.toFixed(2)}</p>
      <p>State: {state}</p>
      <p className="mt-2 text-[#e85c2a]">TARGET ● (orange sphere in world)</p>
    </div>
  )
}
