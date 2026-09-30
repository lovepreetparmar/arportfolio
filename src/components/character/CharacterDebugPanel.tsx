type CharacterDebugPanelProps = {
  playing: string
  available: string[]
  animState: string
  moving: boolean
}

export function CharacterDebugPanel({ playing, available, animState, moving }: CharacterDebugPanelProps) {
  if (!import.meta.env.DEV) return null

  return (
    <div className="pointer-events-none fixed bottom-20 left-5 z-50 rounded bg-ink/80 p-3 font-mono text-[10px] text-canvas">
      <p className="mb-1 uppercase tracking-wider opacity-60">Character animation</p>
      <p>State: {animState}</p>
      <p>Moving: {moving ? 'yes' : 'no'}</p>
      <p>Playing: {playing}</p>
      <p className="mt-2 opacity-60">Available:</p>
      <ul className="ml-2">
        {available.map((a) => (
          <li key={a}>• {a}</li>
        ))}
      </ul>
    </div>
  )
}
