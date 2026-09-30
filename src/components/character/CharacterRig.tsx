import { CharacterAccessories } from './CharacterAccessories'
import type { CharacterState } from './CharacterAnimations'
import { CharacterClothing } from './CharacterClothing'
import { CharacterBody, HandMesh, LegAssembly, LimbLower, LimbUpper } from './CharacterBody'
import { CharacterEyes, CharacterHead } from './CharacterHead'
import { CharacterHair, CharacterHairBack } from './CharacterHair'
import type { CharacterRigRefs } from './useCharacterRefs'

const HEAD_SCALE = 0.84
/** Elbow pivot, where the upper sleeve meets the forearm (arm space). */
const ELBOW_Y = 0.3

type CharacterRigProps = {
  refs: CharacterRigRefs
  accent: string
  territory: string
  state: CharacterState
  segments: number
}

/** Character faces +z, so her right side is -x (the `left*` refs) and her left is +x. */
export function CharacterRig({ refs, accent, territory, state, segments }: CharacterRigProps) {
  return (
    <group ref={refs.root} scale={0.86}>
      <mesh ref={refs.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <circleGeometry args={[0.32, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.14} />
      </mesh>

      <group ref={refs.hips} position={[0, 0.82, 0]}>
        <group ref={refs.spine}>
          <CharacterBody segments={segments} />

          <group ref={refs.chest} position={[0, 0.38, 0]}>
            <CharacterClothing segments={segments} />

            <group position={[-0.168, 0.34, 0.01]} rotation={[0, 0, -0.1]}>
              <group ref={refs.leftShoulder}>
                <group ref={refs.leftArm}>
                  <LimbUpper segments={segments} />
                  <group ref={refs.leftHand} position={[0, -ELBOW_Y, 0]}>
                    <group position={[0, ELBOW_Y, 0]}>
                      <LimbLower segments={segments} />
                      <HandMesh segments={segments} side={-1} wrist="thread" />
                    </group>
                  </group>
                </group>
              </group>
            </group>

            <group position={[0.168, 0.34, 0.01]} rotation={[0, 0, 0.1]}>
              <group ref={refs.rightShoulder}>
                <group ref={refs.rightArm}>
                  <LimbUpper segments={segments} />
                  <group ref={refs.rightHand} position={[0, -ELBOW_Y, 0]}>
                    <group position={[0, ELBOW_Y, 0]}>
                      <LimbLower segments={segments} />
                      <HandMesh segments={segments} side={1} wrist="watch" />
                    </group>
                  </group>
                </group>
              </group>
            </group>

            <group ref={refs.blazer} />

            <group ref={refs.bag}>
              <CharacterAccessories territory={territory} state={state} accent={accent} segments={segments} />
            </group>

            <group ref={refs.head} position={[0, 0.53, 0.015]} scale={HEAD_SCALE}>
              <CharacterHead segments={segments} />
              <group position={[0, 0.03, 0]}>
                <group ref={refs.eyes}>
                  <CharacterEyes />
                </group>
              </group>
              <group ref={refs.hair}>
                <CharacterHair segments={segments} />
              </group>
              <group ref={refs.hairBack}>
                <CharacterHairBack segments={segments} />
              </group>
            </group>
          </group>
        </group>

        <group ref={refs.leftLeg} position={[-0.085, 0.02, 0]}>
          <LegAssembly segments={segments} kneeRef={refs.leftKnee} />
        </group>

        <group ref={refs.rightLeg} position={[0.085, 0.02, 0]}>
          <LegAssembly segments={segments} kneeRef={refs.rightKnee} />
        </group>
      </group>
    </group>
  )
}
