import type { CharacterState } from './CharacterAnimations'

export type TerritoryProp = 'notebook' | 'magazine' | 'tablet' | 'poster' | 'none'

export function territoryProp(territory: string, state: CharacterState): TerritoryProp {
  if (state === 'reading' || territory === 'editorial') return 'magazine'
  if (state === 'pointing' && territory === 'print') return 'poster'
  if (territory === 'digital') return 'tablet'
  if (territory === 'branding' || state === 'inspecting') return 'notebook'
  return 'none'
}
