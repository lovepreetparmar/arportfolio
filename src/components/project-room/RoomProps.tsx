import type { ReactNode } from 'react'
import type * as THREE from 'three'
import type { ProjectRoomTheme } from '../../data/projectWorld'
import { ROOM_DEPTH, ROOM_WIDTH, type RoomObstacle } from './roomSpace'

type PropKind = 'plant' | 'bench' | 'vitrine' | 'bookBench' | 'ceramics' | 'laptop'

export type RoomProp = { kind: PropKind; x: number; z: number; rotationY: number; obstacle: RoomObstacle }

const CENTREPIECE: Record<ProjectRoomTheme['displayStyle'], PropKind> = {
  boutique: 'vitrine',
  studio: 'bookBench',
  digital: 'laptop',
  kitchen: 'ceramics',
  gallery: 'bench',
  neutral: 'bench',
}

const LONG: PropKind[] = ['bench', 'bookBench']

/** A few pieces of furniture per room, kept to the walls and corners so the floor stays open. */
export function planRoomProps(theme: ProjectRoomTheme, rightWallFree: boolean): RoomProp[] {
  const halfW = ROOM_WIDTH / 2
  const halfD = ROOM_DEPTH / 2
  const props: RoomProp[] = []
  for (const side of [-1, 1]) {
    const x = side * (halfW - 0.5)
    const z = -halfD + 0.5
    props.push({ kind: 'plant', x, z, rotationY: side, obstacle: { x, z, hw: 0.24, hd: 0.24 } })
  }
  const kind = CENTREPIECE[theme.displayStyle]
  if (rightWallFree) {
    const long = LONG.includes(kind)
    const x = halfW - (long ? 0.62 : 0.75)
    props.push({
      kind,
      x,
      z: 0.3,
      rotationY: -Math.PI / 2,
      obstacle: long ? { x, z: 0.3, hw: 0.25, hd: 0.82 } : { x, z: 0.3, hw: 0.3, hd: 0.3 },
    })
  } else if (!LONG.includes(kind)) {
    const x = halfW - 0.7
    const z = halfD - 1.1
    props.push({ kind, x, z, rotationY: -Math.PI / 2, obstacle: { x, z, hw: 0.3, hd: 0.3 } })
  }
  return props
}

function Plant({ pot }: { pot: string }) {
  return (
    <group>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.2, 0.15, 0.44, 20]} />
        <meshStandardMaterial color={pot} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.02, 20]} />
        <meshStandardMaterial color="#3d2f24" roughness={1} />
      </mesh>
      {[0, 1.3, 2.5, 3.7, 5].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.07, 0.75 + (i % 2) * 0.12, Math.sin(a) * 0.07]}
          rotation={[Math.sin(a) * 0.35, a, Math.cos(a) * 0.35]}
          scale={[0.16, 0.42, 0.05]}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={i % 2 ? '#4f7a45' : '#5f8c4f'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function Bench({ seat, frame }: { seat: string; frame: string }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.42]} />
        <meshStandardMaterial color={seat} roughness={0.75} />
      </mesh>
      {[-0.64, 0.64].map((x) => (
        <mesh key={x} position={[x, 0.19, 0]}>
          <boxGeometry args={[0.06, 0.38, 0.36]} />
          <meshStandardMaterial color={frame} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Plinth({ color, height = 0.95, children }: { color: string; height?: number; children?: ReactNode }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.5, height, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <group position={[0, height, 0]}>{children}</group>
    </group>
  )
}

type PropsProps = { props: RoomProp[]; theme: ProjectRoomTheme; heroTexture: THREE.Texture | null }

export function RoomProps({ props, theme, heroTexture }: PropsProps) {
  const light = theme.displayStyle !== 'boutique'
  return (
    <>
      {props.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rotationY, 0]}>
          {p.kind === 'plant' && <Plant pot={light ? '#e9e4dc' : '#3a2e27'} />}
          {p.kind === 'bench' && <Bench seat={theme.displayStyle === 'gallery' ? '#3b3632' : '#8b6a4e'} frame="#2a2724" />}
          {p.kind === 'bookBench' && (
            <group>
              <Bench seat="#b98d62" frame="#2a2724" />
              {[theme.accentColor, '#e8e0d2', '#2f2d2a'].map((c, j) => (
                <mesh key={j} position={[0.45, 0.49 + j * 0.045, 0]} rotation={[0, j * 0.18, 0]}>
                  <boxGeometry args={[0.3, 0.04, 0.22]} />
                  <meshStandardMaterial color={c} roughness={0.8} />
                </mesh>
              ))}
            </group>
          )}
          {p.kind === 'vitrine' && (
            <Plinth color="#1a1513">
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.44, 0.012, 0.44]} />
                <meshStandardMaterial color="#3d1f24" roughness={1} />
              </mesh>
              <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
                <torusGeometry args={[0.045, 0.009, 12, 32]} />
                <meshStandardMaterial color={theme.accentColor} metalness={1} roughness={0.22} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[0.42, 0.38, 0.42]} />
                <meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.05} depthWrite={false} />
              </mesh>
            </Plinth>
          )}
          {p.kind === 'ceramics' && (
            <Plinth color="#efe6da">
              <mesh position={[0.06, 0.06, 0]}>
                <sphereGeometry args={[0.12, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color={theme.accentColor} roughness={0.45} side={2} />
              </mesh>
              <mesh position={[-0.1, 0.012, 0.08]}>
                <cylinderGeometry args={[0.11, 0.09, 0.024, 24]} />
                <meshStandardMaterial color="#f7f3ec" roughness={0.4} />
              </mesh>
            </Plinth>
          )}
          {p.kind === 'laptop' && (
            <Plinth color="#d9dcdf">
              <mesh position={[0, 0.008, 0]}>
                <boxGeometry args={[0.34, 0.016, 0.23]} />
                <meshStandardMaterial color="#b9bcc0" metalness={0.6} roughness={0.35} />
              </mesh>
              <group position={[0, 0.016, -0.11]} rotation={[-0.32, 0, 0]}>
                <mesh position={[0, 0.11, 0]}>
                  <boxGeometry args={[0.34, 0.22, 0.01]} />
                  <meshStandardMaterial color="#b9bcc0" metalness={0.6} roughness={0.35} />
                </mesh>
                {heroTexture && (
                  <mesh position={[0, 0.11, 0.0055]}>
                    <planeGeometry args={[0.31, 0.19]} />
                    <meshStandardMaterial map={heroTexture} emissive="#ffffff" emissiveMap={heroTexture} emissiveIntensity={0.6} />
                  </mesh>
                )}
              </group>
            </Plinth>
          )}
        </group>
      ))}
    </>
  )
}
