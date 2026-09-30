import type { CharacterState } from './CharacterAnimations'

export function nextCharacterState(input: {
  isWalking: boolean
  nearProject: boolean
  nearContact: boolean
  territory: string
  pointMoment: boolean
}): CharacterState {
  if (input.nearContact) return 'contact'
  if (input.isWalking) return 'walking'
  if (input.nearProject && input.territory === 'editorial') return 'reading'
  if (input.nearProject && input.pointMoment) return 'pointing'
  if (input.nearProject) return 'inspecting'
  return 'idle'
}
