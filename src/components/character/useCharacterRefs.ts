import { useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'

export type CharacterRigRefs = {
  root: React.RefObject<Group | null>
  hips: React.RefObject<Group | null>
  spine: React.RefObject<Group | null>
  chest: React.RefObject<Group | null>
  head: React.RefObject<Group | null>
  hair: React.RefObject<Group | null>
  hairBack: React.RefObject<Group | null>
  eyes: React.RefObject<Group | null>
  leftShoulder: React.RefObject<Group | null>
  leftArm: React.RefObject<Group | null>
  leftHand: React.RefObject<Group | null>
  rightShoulder: React.RefObject<Group | null>
  rightArm: React.RefObject<Group | null>
  rightHand: React.RefObject<Group | null>
  leftLeg: React.RefObject<Group | null>
  rightLeg: React.RefObject<Group | null>
  leftKnee: React.RefObject<Group | null>
  rightKnee: React.RefObject<Group | null>
  blazer: React.RefObject<Group | null>
  bag: React.RefObject<Group | null>
  shadow: React.RefObject<Mesh | null>
}

export function useCharacterRefs(): CharacterRigRefs {
  const root = useRef<Group>(null)
  const hips = useRef<Group>(null)
  const spine = useRef<Group>(null)
  const chest = useRef<Group>(null)
  const head = useRef<Group>(null)
  const hair = useRef<Group>(null)
  const hairBack = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const leftShoulder = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const leftHand = useRef<Group>(null)
  const rightShoulder = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const rightHand = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const leftKnee = useRef<Group>(null)
  const rightKnee = useRef<Group>(null)
  const blazer = useRef<Group>(null)
  const bag = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)

  // One object for the component's lifetime: effects keyed on it (the model's skinning) must not re-run per render.
  return useMemo(
    () => ({
      root,
      hips,
      spine,
      chest,
      head,
      hair,
      hairBack,
      eyes,
      leftShoulder,
      leftArm,
      leftHand,
      rightShoulder,
      rightArm,
      rightHand,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      blazer,
      bag,
      shadow,
    }),
    [],
  )
}
