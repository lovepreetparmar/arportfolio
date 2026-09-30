import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { createContext, useContext, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { EntranceLight, useSignLightMaterial, type EntranceLightStyle } from '../daynight/BuildingLighting'
import { createSignTexture, glowMat, WORLD_PALETTE, worldMat, type SignStyle } from '../worldMaterials'

type Vec3 = [number, number, number]

export type LocationContextValue = {
  /** 0 closed → 1 open; written by the location every frame. */
  openRef: MutableRefObject<number>
}

export const LocationContext = createContext<LocationContextValue | null>(null)

function useLocationContext() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('Building parts must be rendered inside a ProjectLocation')
  return ctx
}

type DoorProps = {
  width: number
  height: number
  /** Facade plane (local z) the door sits on. */
  z: number
  color: string
  frameColor: string
  handleColor?: string
  glazed?: boolean
  /** Night light over the entrance; every door throws a warm pool onto its step. */
  entranceLight?: EntranceLightStyle
}

/** Hinged door on the building's front; swings outward as the location opens. */
export function Door({
  width,
  height,
  z,
  color,
  frameColor,
  handleColor = WORLD_PALETTE.gold,
  glazed,
  entranceLight = 'lantern',
}: DoorProps) {
  const { openRef } = useLocationContext()
  const hinge = useRef<THREE.Group>(null)
  const leaf = worldMat(color, 0.7, 0.05)
  const frame = worldMat(frameColor, 0.75)
  const handle = worldMat(handleColor, 0.3, 0.7)

  useFrame(() => {
    if (hinge.current) hinge.current.rotation.y = -openRef.current * 1.3
  })

  return (
    <group>
      <mesh position={[0, height / 2, z + 0.006]} material={glowMat(WORLD_PALETTE.glassWarm, 0.9)}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, height + 0.05, z + 0.04]} material={frame} castShadow>
        <boxGeometry args={[width + 0.2, 0.1, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 + 0.05), height / 2, z + 0.04]} material={frame} castShadow>
          <boxGeometry args={[0.1, height, 0.08]} />
        </mesh>
      ))}
      <group ref={hinge} position={[-width / 2, 0, z + 0.03]}>
        <mesh position={[width / 2, height / 2, 0]} material={leaf} castShadow>
          <boxGeometry args={[width, height, 0.05]} />
        </mesh>
        {glazed ? (
          <mesh position={[width / 2, height * 0.62, 0.028]} material={glowMat(WORLD_PALETTE.glassWarm, 0.3)}>
            <planeGeometry args={[width * 0.62, height * 0.5]} />
          </mesh>
        ) : (
          [0.3, 0.72].map((fy) => (
            <mesh key={fy} position={[width / 2, height * fy, 0.03]} material={worldMat(color, 0.6, 0.05)}>
              <boxGeometry args={[width * 0.68, height * 0.3, 0.015]} />
            </mesh>
          ))
        )}
        <mesh position={[width * 0.86, height * 0.47, 0.05]} material={handle}>
          <sphereGeometry args={[0.035, 12, 10]} />
        </mesh>
      </group>
      <EntranceLight doorWidth={width} doorHeight={height} z={z} style={entranceLight} metal={frameColor} />
    </group>
  )
}

type WindowProps = {
  width: number
  height: number
  position: Vec3
  frameColor: string
  mullions?: 'cross' | 'grid' | 'vertical' | 'none'
  arch?: boolean
  sill?: string
  glow?: number
  /** Lamplight tone of the glass after dark. */
  nightGlass?: string
}

export function Window({
  width,
  height,
  position,
  frameColor,
  mullions = 'cross',
  arch,
  sill,
  glow = 0.28,
  nightGlass,
}: WindowProps) {
  const glass = glowMat('#efdcb7', glow, nightGlass)
  const frame = worldMat(frameColor, 0.6, 0.1)
  const t = 0.05
  const bars: { p: Vec3; s: Vec3 }[] = []
  if (mullions === 'cross' || mullions === 'grid') bars.push({ p: [0, 0, 0.02], s: [width, t * 0.7, 0.03] })
  if (mullions === 'cross' || mullions === 'vertical') bars.push({ p: [0, 0, 0.02], s: [t * 0.7, height, 0.03] })
  if (mullions === 'grid') {
    bars.push({ p: [-width / 6, 0, 0.02], s: [t * 0.6, height, 0.03] })
    bars.push({ p: [width / 6, 0, 0.02], s: [t * 0.6, height, 0.03] })
    bars.push({ p: [0, height / 4, 0.02], s: [width, t * 0.6, 0.03] })
    bars.push({ p: [0, -height / 4, 0.02], s: [width, t * 0.6, 0.03] })
  }
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.005]} material={glass}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {arch && (
        <mesh position={[0, height / 2, 0.005]} material={glass}>
          <circleGeometry args={[width / 2, 24, 0, Math.PI]} />
        </mesh>
      )}
      {arch ? (
        <mesh position={[0, height / 2, 0.02]} material={frame}>
          <torusGeometry args={[width / 2, t / 2, 6, 24, Math.PI]} />
        </mesh>
      ) : (
        <mesh position={[0, height / 2, 0.02]} material={frame}>
          <boxGeometry args={[width + t, t, 0.04]} />
        </mesh>
      )}
      <mesh position={[0, -height / 2, 0.02]} material={frame}>
        <boxGeometry args={[width + t, t, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2, 0, 0.02]} material={frame}>
          <boxGeometry args={[t, height, 0.04]} />
        </mesh>
      ))}
      {bars.map((b, i) => (
        <mesh key={i} position={b.p} material={frame}>
          <boxGeometry args={b.s} />
        </mesh>
      ))}
      {sill && (
        <mesh position={[0, -height / 2 - 0.04, 0.06]} material={worldMat(sill, 0.9)} castShadow>
          <boxGeometry args={[width + 0.16, 0.05, 0.14]} />
        </mesh>
      )}
    </group>
  )
}

type SignBoardProps = {
  text: string
  width: number
  height: number
  position: Vec3
  rotation?: Vec3
  style: SignStyle
  depth?: number
  edgeColor?: string
  /** How brightly the sign face reads after dark. */
  nightGlow?: number
}

export function SignBoard({
  text,
  width,
  height,
  position,
  rotation,
  style,
  depth = 0.05,
  edgeColor,
  nightGlow = 0.5,
}: SignBoardProps) {
  const texture = useMemo(
    () => createSignTexture(text, width / height, style),
    [text, width, height, style.background, style.color, style.subtitle, style.serif, style.border],
  )
  const faceMat = useSignLightMaterial(texture, nightGlow)
  return (
    <group position={position} rotation={rotation}>
      <mesh material={worldMat(edgeColor ?? style.background, 0.8)} castShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.002]} material={faceMat}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}

type ProjectPosterProps = {
  src: string
  width: number
  position: Vec3
  rotation?: Vec3
  frameColor?: string
  maxHeight?: number
}

/** Real project artwork framed on a facade or easel. */
export function ProjectPoster({ src, width, position, rotation, frameColor = WORLD_PALETTE.charcoal, maxHeight }: ProjectPosterProps) {
  const texture = useTexture(src)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
  }, [texture])
  const img = texture.image as HTMLImageElement | undefined
  const aspect = img?.width && img?.height ? img.width / img.height : 0.75
  let w = width
  let h = w / aspect
  if (maxHeight && h > maxHeight) {
    h = maxHeight
    w = h * aspect
  }
  return (
    <group position={position} rotation={rotation}>
      <mesh material={worldMat(frameColor, 0.7)} castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** A-frame board by the entrance displaying the project's cover. */
export function EaselPoster({ src, position, rotationY = 0 }: { src: string; position: Vec3; rotationY?: number }) {
  const wood = worldMat(WORLD_PALETTE.woodDark, 0.85)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 0.55, -0.05]} rotation={[-0.14, 0, 0]} material={wood} castShadow>
          <boxGeometry args={[0.04, 1.12, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, -0.2]} rotation={[0.3, 0, 0]} material={wood} castShadow>
        <boxGeometry args={[0.04, 1, 0.04]} />
      </mesh>
      <ProjectPoster src={src} width={0.56} maxHeight={0.78} position={[0, 0.66, 0.0]} rotation={[-0.14, 0, 0]} frameColor={WORLD_PALETTE.ivory} />
    </group>
  )
}

/** Sign text from the project title, without a trailing word that repeats the location label. */
export function signName(title: string, label: string): string {
  const main = title.split('|')[0].trim()
  const re = new RegExp(`\\s+${label}$`, 'i')
  return main.replace(re, '').trim() || main
}

type PlanterProps = {
  position: Vec3
  pot: string
  kind: 'topiary' | 'bush' | 'herbs'
  scale?: number
}

export function Planter({ position, pot, kind, scale = 1 }: PlanterProps) {
  const potMat = worldMat(pot, 0.85)
  const leaf = worldMat(WORLD_PALETTE.leafDeep, 0.9)
  const leafLight = worldMat(WORLD_PALETTE.leaf, 0.9)
  return (
    <group position={position} scale={scale}>
      {kind === 'herbs' ? (
        <>
          <mesh position={[0, 0.16, 0]} material={potMat} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.32, 0.32]} />
          </mesh>
          {[-0.25, 0, 0.25].map((x, i) => (
            <mesh key={x} position={[x, 0.4, 0]} material={i % 2 ? leafLight : leaf} castShadow>
              <sphereGeometry args={[0.15, 12, 10]} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          <mesh position={[0, 0.2, 0]} material={potMat} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
          </mesh>
          {kind === 'topiary' ? (
            <>
              <mesh position={[0, 0.6, 0]} material={worldMat(WORLD_PALETTE.trunk, 0.9)}>
                <cylinderGeometry args={[0.02, 0.025, 0.4, 6]} />
              </mesh>
              <mesh position={[0, 0.88, 0]} material={leaf} castShadow>
                <sphereGeometry args={[0.24, 16, 12]} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, 0.55, 0]} scale={[1, 0.85, 1]} material={leafLight} castShadow>
              <sphereGeometry args={[0.3, 14, 12]} />
            </mesh>
          )}
        </>
      )}
    </group>
  )
}

type EntranceApronProps = {
  width: number
  /** Facade plane z; the apron extends forward from here. */
  z: number
  depth: number
  color?: string
  mat?: string
}

/** Paved threshold in front of the door where the character arrives. */
export function EntranceApron({ width, z, depth, color = WORLD_PALETTE.plaza, mat = WORLD_PALETTE.woodDark }: EntranceApronProps) {
  return (
    <group>
      <mesh position={[0, 0.06, z + depth / 2]} material={worldMat(color, 0.95)} receiveShadow castShadow>
        <boxGeometry args={[width, 0.12, depth]} />
      </mesh>
      <mesh position={[0, 0.125, z + 0.45]} material={worldMat(mat, 0.95)} receiveShadow>
        <boxGeometry args={[0.95, 0.012, 0.55]} />
      </mesh>
    </group>
  )
}

type AwningProps = {
  width: number
  depth: number
  y: number
  z: number
  texture: THREE.Texture
  valance?: string
}

export function Awning({ width, depth, y, z, texture, valance }: AwningProps) {
  const slope = 0.42
  return (
    <group position={[0, y, z]}>
      <mesh
        position={[0, -Math.sin(slope) * depth * 0.5, Math.cos(slope) * depth * 0.5]}
        rotation={[slope, 0, 0]}
        castShadow
      >
        <boxGeometry args={[width, 0.03, depth]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
      <mesh position={[0, -Math.sin(slope) * depth - 0.08, Math.cos(slope) * depth]} castShadow>
        <boxGeometry args={[width, 0.16, 0.02]} />
        <meshStandardMaterial map={valance ? undefined : texture} color={valance ?? '#ffffff'} roughness={0.9} />
      </mesh>
    </group>
  )
}

type GableRoofProps = {
  width: number
  depth: number
  rise: number
  baseY: number
  roofColor: string
  wallColor: string
  overhang?: number
}

/** Pitched roof with the ridge running front-to-back and filled gable ends. */
export function GableRoof({ width, depth, rise, baseY, roofColor, wallColor, overhang = 0.22 }: GableRoofProps) {
  const gable = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, 0)
    shape.lineTo(width / 2, 0)
    shape.lineTo(0, rise)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
    g.translate(0, 0, -depth / 2)
    return g
  }, [width, depth, rise])
  const half = width / 2 + overhang
  const slopeLen = Math.hypot(half, rise + overhang * (rise / (width / 2)))
  const angle = Math.atan2(rise, width / 2)
  const roof = worldMat(roofColor, 0.85)
  return (
    <group position={[0, baseY, 0]}>
      <mesh geometry={gable} material={worldMat(wallColor, 0.92)} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(s * (width / 2 - overhang * 0.1)) / 2, rise / 2 + 0.02, 0]}
          rotation={[0, 0, -s * angle]}
          material={roof}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[slopeLen, 0.08, depth + overhang * 2]} />
        </mesh>
      ))}
    </group>
  )
}
