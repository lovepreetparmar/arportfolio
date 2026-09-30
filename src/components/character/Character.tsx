import { Suspense } from 'react'
import { AnushriCharacter } from './AnushriCharacter'
import { CharacterPlaceholder } from './CharacterPlaceholder'

function CharacterLights() {
  return (
    <>
      <directionalLight position={[3, 5, 2]} intensity={0.55} castShadow />
      <pointLight position={[-1.2, 2.4, 1.5]} intensity={0.28} color="#fff9f2" distance={8} />
      <pointLight position={[1.5, 1.8, -1]} intensity={0.12} color="#e8784a" distance={6} />
    </>
  )
}

type CharacterProps = {
  onArrivedAtProject?: (slug: string) => void
}

export function Character({ onArrivedAtProject }: CharacterProps) {
  return (
    <group>
      <CharacterLights />
      <Suspense fallback={<CharacterPlaceholder />}>
        <AnushriCharacter onArrivedAtProject={onArrivedAtProject} />
      </Suspense>
    </group>
  )
}
