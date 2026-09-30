import * as THREE from 'three'
import { createCharacterMaterial, createSkinMaterial, PALETTE } from './characterMaterials'
import { TaperedTube } from './TaperedTube'

const skin = createSkinMaterial()
const skinShade = createCharacterMaterial(PALETTE.skinShadow, 0.85, 0)
const blush = createCharacterMaterial(PALETTE.skinWarm, 0.85, 0)
const eyeWhite = createCharacterMaterial(PALETTE.eyeWhite, 0.4, 0)
const iris = createCharacterMaterial(PALETTE.iris, 0.3, 0)
const pupil = createCharacterMaterial(PALETTE.pupil, 0.3, 0)
const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const lash = createCharacterMaterial(PALETTE.lash, 0.7, 0)
const lashLower = createCharacterMaterial(PALETTE.lashLower, 0.8, 0)
const brow = createCharacterMaterial(PALETTE.brow, 0.9, 0)
const lipUpper = createCharacterMaterial(PALETTE.lipDeep, 0.7, 0)
const lipLower = createCharacterMaterial(PALETTE.lip, 0.65, 0)
const mouthLine = createCharacterMaterial(PALETTE.mouth, 0.8, 0)
const pearl = createCharacterMaterial(PALETTE.pearl, 0.25, 0.1)

const SIDES = [-1, 1] as const

function browTaper(t: number) {
  return 1.1 - 0.75 * t
}

type CharacterHeadProps = {
  segments: number
}

/** Head-local units; the parent `head` group applies the overall head scale. */
export function CharacterHead({ segments }: CharacterHeadProps) {
  const seg = Math.max(20, Math.min(segments, 32))
  return (
    <group>
      <mesh position={[0, -0.17, -0.005]} material={skin}>
        <capsuleGeometry args={[0.045, 0.1, 6, seg]} />
      </mesh>

      <mesh position={[0, 0.05, 0]} scale={[0.86, 1, 0.9]} material={skin}>
        <sphereGeometry args={[0.16, seg, seg]} />
      </mesh>
      <mesh position={[0, -0.04, 0.025]} scale={[0.82, 0.85, 0.85]} material={skin}>
        <sphereGeometry args={[0.13, seg, seg]} />
      </mesh>
      <mesh position={[0, -0.12, 0.076]} scale={[1.2, 0.82, 0.8]} material={skin}>
        <sphereGeometry args={[0.036, 16, 16]} />
      </mesh>

      {SIDES.map((s) => (
        <group key={s}>
          <mesh position={[s * 0.062, -0.03, 0.088]} scale={[1, 0.8, 0.7]} material={skin}>
            <sphereGeometry args={[0.04, 16, 14]} />
          </mesh>
          <mesh position={[s * 0.064, -0.024, 0.107]} scale={[1.25, 0.7, 0.25]} material={blush}>
            <sphereGeometry args={[0.028, 14, 12]} />
          </mesh>
          <mesh position={[s * 0.136, 0.02, -0.005]} scale={[0.35, 0.6, 0.45]} material={skinShade}>
            <sphereGeometry args={[0.05, 10, 10]} />
          </mesh>
          <mesh position={[s * 0.132, -0.03, 0.04]} material={pearl}>
            <sphereGeometry args={[0.009, 12, 10]} />
          </mesh>
        </group>
      ))}

      <CharacterFace />
    </group>
  )
}

/** Brows, nose, lips — static so blinking never distorts them. */
function CharacterFace() {
  return (
    <group>
      {SIDES.map((s) => (
        <TaperedTube
          key={s}
          points={[
            [s * 0.024, 0.065, 0.1425],
            [s * 0.062, 0.0745, 0.1295],
            [s * 0.09, 0.062, 0.1095],
          ]}
          radius={0.006}
          material={brow}
          taper={browTaper}
          squash={[1, 1, 0.6]}
          tubularSegments={14}
          radialSegments={6}
        />
      ))}

      <mesh position={[0, -0.006, 0.138]} rotation={[0.2, 0, 0]} material={skin}>
        <capsuleGeometry args={[0.006, 0.028, 4, 8]} />
      </mesh>
      <mesh position={[0, -0.03, 0.143]} scale={[1.2, 0.85, 0.8]} material={skin}>
        <sphereGeometry args={[0.012, 14, 12]} />
      </mesh>
      {SIDES.map((s) => (
        <mesh key={s} position={[s * 0.011, -0.034, 0.138]} scale={[1, 0.8, 0.8]} material={skinShade}>
          <sphereGeometry args={[0.007, 10, 8]} />
        </mesh>
      ))}

      {SIDES.map((s) => (
        <mesh
          key={s}
          position={[s * 0.0095, -0.0672, 0.133]}
          rotation={[0, 0, s * 0.12]}
          scale={[1.55, 0.48, 0.58]}
          material={lipUpper}
        >
          <sphereGeometry args={[0.0105, 12, 10]} />
        </mesh>
      ))}
      <mesh position={[0, -0.0765, 0.1315]} scale={[1.6, 0.56, 0.6]} material={lipLower}>
        <sphereGeometry args={[0.0138, 14, 10]} />
      </mesh>
      <mesh position={[0, -0.0466, 0.1385]} rotation={[0, 0, -Math.PI / 2 - Math.PI * 0.14]} material={mouthLine}>
        <torusGeometry args={[0.025, 0.0009, 4, 12, Math.PI * 0.28]} />
      </mesh>
    </group>
  )
}

/** Eyeballs + lash lines. Lives inside the `eyes` ref, which the controller squashes to blink. */
export function CharacterEyes() {
  return (
    <group>
      {SIDES.map((s) => (
        <group key={s} position={[s * 0.047, 0, 0.128]} rotation={[0, s * 0.28, 0]}>
          <mesh scale={[1.25, 0.68, 0.45]} material={eyeWhite}>
            <sphereGeometry args={[0.0215, 16, 12]} />
          </mesh>
          <mesh position={[0, -0.001, 0.0075]} scale={[1, 1, 0.5]} material={iris}>
            <sphereGeometry args={[0.0115, 14, 12]} />
          </mesh>
          <mesh position={[0, -0.001, 0.0112]} material={pupil}>
            <sphereGeometry args={[0.0052, 10, 8]} />
          </mesh>
          <mesh position={[0.0045, 0.0045, 0.0133]} material={glint}>
            <sphereGeometry args={[0.0023, 6, 6]} />
          </mesh>
          <mesh position={[0, -0.0135, 0.0045]} rotation={[0, 0, Math.PI * 0.15]} material={lash}>
            <torusGeometry args={[0.028, 0.0036, 5, 14, Math.PI * 0.7]} />
          </mesh>
          <mesh position={[0, 0.0125, 0.0035]} rotation={[0, 0, -Math.PI * 0.8]} material={lashLower}>
            <torusGeometry args={[0.026, 0.0017, 4, 12, Math.PI * 0.6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
