import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { CharacterController } from './CharacterController'
import { CharacterRig } from './CharacterRig'
import { useCharacterRefs } from './useCharacterRefs'

export function Character() {
  const refs = useCharacterRefs()
  const { accentColor, activeTerritory, characterState } = useWorldState()
  const reduced = useReducedMotion()
  const segments = reduced ? 16 : 24

  return (
    <group>
      <pointLight position={[0.5, 1.85, 1.1]} intensity={0.42} color="#fff5eb" distance={5.5} />
      <pointLight position={[-0.8, 1.4, -0.4]} intensity={0.12} color={accentColor} distance={4.5} />
      <pointLight position={[0.9, 1.6, -0.6]} intensity={0.18} color="#ffe8d6" distance={4} />
      <spotLight
        position={[2, 4, 3]}
        angle={0.45}
        penumbra={0.8}
        intensity={0.25}
        castShadow={false}
        color="#ffffff"
      />
      <CharacterController refs={refs} />
      <CharacterRig
        refs={refs}
        accent={accentColor}
        territory={activeTerritory}
        state={characterState}
        segments={segments}
      />
    </group>
  )
}
