import * as THREE from 'three'
import { createHairGradientMaterial, createHairMaterial, PALETTE } from './characterMaterials'
import { TaperedTube, type Pt } from './TaperedTube'

const hair = createHairMaterial(PALETTE.hair)
const hairMid = createHairMaterial(PALETTE.hairMid)
const hairHi = createHairMaterial(PALETTE.hairHighlight)
const hairGradient = createHairGradientMaterial()

const FLAT: Pt = [1.12, 1, 0.85]
const TO_CHESTNUT: [string, string] = [PALETTE.hair, PALETTE.hairChestnut]
const MID_TO_CHESTNUT: [string, string] = [PALETTE.hairMid, PALETTE.hairChestnut]

function lockTaper(t: number) {
  return (0.85 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.2))) * (1 - 0.7 * Math.pow(t, 2))
}

function HairLock({
  points,
  radius,
  material,
  squash,
  colors,
}: {
  points: Pt[]
  radius: number
  material?: THREE.Material
  squash?: Pt
  colors?: [string, string]
}) {
  return (
    <TaperedTube
      points={points}
      radius={radius}
      material={colors ? hairGradient : (material ?? hair)}
      taper={lockTaper}
      squash={squash}
      colors={colors}
    />
  )
}

const SIDES = [1, -1] as const

function mirror(points: Pt[], s: number): Pt[] {
  return points.map(([x, y, z]) => [x * s, y, z])
}

/** Face-framing layers for one side: long waves to mid-chest with outward-curling ends. */
function SideHair({ s }: { s: number }) {
  return (
    <group>
      <HairLock
        points={mirror(
          [
            [0.12, 0.13, 0.06],
            [0.158, 0.04, 0.078],
            [0.15, -0.07, 0.085],
            [0.172, -0.18, 0.088],
            [0.158, -0.29, 0.08],
            [0.15, -0.39, 0.075],
            [0.165, -0.47, 0.08],
            [0.185, -0.51, 0.097],
          ],
          s,
        )}
        radius={0.052}
        squash={FLAT}
        colors={TO_CHESTNUT}
      />
      <HairLock
        points={mirror(
          [
            [0.09, 0.12, 0.118],
            [0.12, 0.03, 0.11],
            [0.126, -0.07, 0.1],
            [0.12, -0.16, 0.095],
            [0.135, -0.24, 0.092],
            [0.16, -0.28, 0.104],
          ],
          s,
        )}
        radius={0.03}
        squash={FLAT}
        colors={MID_TO_CHESTNUT}
      />
      <HairLock
        points={mirror(
          [
            [0.14, 0.08, 0.02],
            [0.18, -0.05, 0.04],
            [0.19, -0.15, 0.055],
            [0.2, -0.21, 0.07],
          ],
          s,
        )}
        radius={0.04}
        material={hairMid}
        squash={FLAT}
      />

      <mesh position={[s * 0.148, 0.02, -0.03]} scale={[0.55, 1.25, 1.1]} material={hair}>
        <sphereGeometry args={[0.07, 16, 16]} />
      </mesh>

      {/* Volume resting on the shoulder, then falling behind it */}
      <HairLock
        points={mirror(
          [
            [0.15, 0.05, -0.03],
            [0.19, -0.1, -0.04],
            [0.2, -0.19, -0.06],
            [0.19, -0.3, -0.11],
            [0.175, -0.42, -0.14],
            [0.195, -0.5, -0.15],
          ],
          s,
        )}
        radius={0.05}
        squash={[1.2, 1, 0.9]}
        colors={TO_CHESTNUT}
      />
    </group>
  )
}

type CharacterHairProps = {
  segments: number
}

/**
 * Crown, slightly off-centre part, and matching face-framing layers on both sides.
 * Head-local units; parented to the `hair` ref for sway.
 */
export function CharacterHair({ segments }: CharacterHairProps) {
  const seg = Math.max(20, Math.min(segments, 32))
  return (
    <group>
      <mesh position={[0, 0.058, -0.012]} rotation={[-0.6, 0, -0.03]} scale={[0.93, 1, 0.98]} material={hair}>
        <sphereGeometry args={[0.17, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>

      <mesh position={[0.045, 0.166, 0]} rotation={[0, 0, -0.26]} scale={[1.05, 0.38, 1.12]} material={hair}>
        <sphereGeometry args={[0.12, seg, seg]} />
      </mesh>
      <mesh position={[-0.07, 0.162, -0.01]} rotation={[0, 0, 0.36]} scale={[0.95, 0.35, 1.04]} material={hairMid}>
        <sphereGeometry args={[0.1, seg, seg]} />
      </mesh>

      {/* Soft sweep from the part toward her left temple */}
      <HairLock
        points={[
          [-0.025, 0.2, 0.09],
          [0.03, 0.172, 0.135],
          [0.085, 0.128, 0.128],
          [0.126, 0.068, 0.1],
          [0.14, 0, 0.08],
        ]}
        radius={0.03}
        squash={[1, 1.15, 0.8]}
      />
      <HairLock
        points={[
          [-0.015, 0.192, 0.11],
          [0.035, 0.16, 0.14],
          [0.078, 0.118, 0.134],
        ]}
        radius={0.015}
        material={hairHi}
      />

      {SIDES.map((s) => (
        <SideHair key={s} s={s} />
      ))}
    </group>
  )
}

/** Long back section to mid-back, ends flicking out. Parented to the `hairBack` ref for walk lag. */
export function CharacterHairBack({ segments }: CharacterHairProps) {
  const seg = Math.max(16, Math.min(segments, 28))
  return (
    <group>
      <mesh position={[0, -0.25, -0.005]} scale={[0.95, 1, 0.95]} material={hair}>
        <cylinderGeometry args={[0.15, 0.21, 0.6, seg, 1, true, Math.PI / 2 + 0.45, Math.PI - 0.9]} />
      </mesh>

      <HairLock
        points={[
          [-0.1, 0.02, -0.14],
          [-0.135, -0.14, -0.175],
          [-0.15, -0.3, -0.2],
          [-0.165, -0.44, -0.2],
          [-0.15, -0.56, -0.2],
          [-0.175, -0.62, -0.215],
        ]}
        radius={0.046}
        squash={[1.2, 1, 0.8]}
        colors={TO_CHESTNUT}
      />
      <HairLock
        points={[
          [-0.04, 0.05, -0.15],
          [-0.055, -0.14, -0.195],
          [-0.04, -0.32, -0.215],
          [-0.065, -0.48, -0.215],
          [-0.05, -0.6, -0.21],
          [-0.07, -0.66, -0.23],
        ]}
        radius={0.05}
        squash={[1.2, 1, 0.8]}
        colors={MID_TO_CHESTNUT}
      />
      <HairLock
        points={[
          [0.04, 0.05, -0.15],
          [0.06, -0.14, -0.195],
          [0.045, -0.32, -0.215],
          [0.07, -0.47, -0.215],
          [0.055, -0.59, -0.21],
          [0.075, -0.64, -0.23],
        ]}
        radius={0.05}
        squash={[1.2, 1, 0.8]}
        colors={TO_CHESTNUT}
      />
      <HairLock
        points={[
          [0.1, 0.02, -0.14],
          [0.135, -0.14, -0.175],
          [0.15, -0.3, -0.2],
          [0.17, -0.43, -0.2],
          [0.155, -0.55, -0.2],
          [0.18, -0.61, -0.215],
        ]}
        radius={0.046}
        squash={[1.2, 1, 0.8]}
        colors={MID_TO_CHESTNUT}
      />
      <HairLock
        points={[
          [0, 0.08, -0.16],
          [0.015, -0.1, -0.2],
          [-0.005, -0.3, -0.22],
          [0.01, -0.46, -0.22],
        ]}
        radius={0.02}
        material={hairHi}
      />
    </group>
  )
}
