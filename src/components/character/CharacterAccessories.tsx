import { useMemo } from 'react'
import { PALETTE, createCharacterMaterial } from './characterMaterials'
import type { CharacterState } from './CharacterAnimations'

const paper = createCharacterMaterial(PALETTE.pearl, 0.95, 0)
const tabletMat = createCharacterMaterial('#2a2a2a', 0.4, 0.1)

type CharacterAccessoriesProps = {
  territory: string
  state: CharacterState
  accent: string
  segments: number
}

/** Territory props she carries near a project. */
export function CharacterAccessories({ territory, state, accent, segments }: CharacterAccessoriesProps) {
  const accentMat = useMemo(() => createCharacterMaterial(accent, 0.65, 0), [accent])

  const showNotebook = territory === 'branding' || state === 'inspecting'
  const showMagazine = territory === 'editorial' || state === 'reading'
  const showTablet = territory === 'digital'
  const showPoster = territory === 'print' && state === 'pointing'

  return (
    <group>
      {showNotebook && (
        <mesh position={[0.11, 0.04, 0.14]} rotation={[0.5, -0.3, 0.1]} material={paper}>
          <boxGeometry args={[0.09, 0.12, 0.018]} />
        </mesh>
      )}

      {showMagazine && (
        <group position={[0.07, 0.01, 0.13]} rotation={[0.8, -0.2, 0.05]}>
          <mesh material={paper}>
            <boxGeometry args={[0.11, 0.14, 0.016]} />
          </mesh>
          <mesh position={[0, 0, 0.01]} rotation={[0.15, 0, 0]} material={accentMat}>
            <boxGeometry args={[0.1, 0.12, 0.006]} />
          </mesh>
        </group>
      )}

      {showTablet && (
        <mesh position={[0.12, 0.06, 0.12]} rotation={[0.4, -0.4, 0]} material={tabletMat}>
          <boxGeometry args={[0.12, 0.17, 0.01]} />
        </mesh>
      )}

      {showPoster && (
        <mesh position={[0.2, 0.12, 0.06]} rotation={[0, -0.5, 0.1]} material={paper}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, segments]} />
        </mesh>
      )}
    </group>
  )
}
