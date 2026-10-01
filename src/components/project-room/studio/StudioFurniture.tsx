import { useTexture } from '@react-three/drei'
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'

type Vec3 = [number, number, number]

/** Height of the desk top; things on the desk sit at this y. */
export const DESK_TOP = 0.76

function Mat({ color, roughness = 0.8, metalness = 0 }: { color: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
}

/** Image texture in sRGB, ready to hang or show on a screen. */
export function useImage(src: string) {
  const texture = useTexture(src)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
  }, [texture])
  const img = texture.image as { width: number; height: number } | undefined
  return { texture, aspect: img?.width && img?.height ? img.width / img.height : 4 / 3 }
}

/** Plain timber desk on four legs. */
export function Desk({ position, rotationY = 0, width = 1.7, depth = 0.72, top = '#b88a5e', legs = '#2f2a26' }: {
  position: Vec3
  rotationY?: number
  width?: number
  depth?: number
  top?: string
  legs?: string
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, DESK_TOP - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.04, depth]} />
        <Mat color={top} roughness={0.6} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (width / 2 - 0.06), (DESK_TOP - 0.04) / 2, sz * (depth / 2 - 0.06)]} castShadow>
            <boxGeometry args={[0.04, DESK_TOP - 0.04, 0.04]} />
            <Mat color={legs} roughness={0.5} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** Simple upholstered desk chair; its front faces local +z. */
export function Chair({ position, rotationY = 0, seat = '#c9b79c', frame = '#2f2a26' }: {
  position: Vec3
  rotationY?: number
  seat?: string
  frame?: string
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.46, 0.06, 0.44]} />
        <Mat color={seat} />
      </mesh>
      <mesh position={[0, 0.78, -0.2]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.5, 0.05]} />
        <Mat color={seat} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.44, 8]} />
        <Mat color={frame} roughness={0.4} metalness={0.4} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.16, 0.03, Math.cos(a) * 0.16]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.03, 0.03, 0.32]} />
            <Mat color={frame} roughness={0.4} metalness={0.4} />
          </mesh>
        )
      })}
    </group>
  )
}

/** A monitor on a stand, showing an image. */
export function Monitor({ position, rotationY = 0, src, width = 0.62 }: { position: Vec3; rotationY?: number; src: string; width?: number }) {
  const { texture } = useImage(src)
  const h = width * 0.6
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.16]} />
        <Mat color="#2b2b2d" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.14, -0.03]}>
        <boxGeometry args={[0.04, 0.26, 0.03]} />
        <Mat color="#2b2b2d" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.2 + h / 2, 0]} castShadow>
        <boxGeometry args={[width + 0.03, h + 0.03, 0.025]} />
        <Mat color="#1f1f21" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.2 + h / 2, 0.0135]}>
        <planeGeometry args={[width, h]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.55} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Open sketchbook with pencil studies of a mark taking shape. */
export function Sketchbook({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#f8f3e8'
    ctx.fillRect(0, 0, 512, 256)
    ctx.fillStyle = '#e6dccb'
    ctx.fillRect(254, 0, 4, 256)
    ctx.strokeStyle = 'rgba(60,56,52,0.75)'
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(80 + i * 62, 90, 24 + i * 4, 0.2 * i, Math.PI * 1.7 + 0.2 * i)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(40, 180)
    ctx.bezierCurveTo(90, 140, 150, 220, 210, 170)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(385, 110, 56, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(345, 150)
    ctx.lineTo(385, 54)
    ctx.lineTo(425, 150)
    ctx.stroke()
    ctx.lineWidth = 1.5
    for (let y = 196; y < 236; y += 10) {
      ctx.beginPath()
      ctx.moveTo(300, y)
      ctx.lineTo(300 + 140 - (y - 196) * 1.5, y)
      ctx.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.008, 0]}>
        <boxGeometry args={[0.44, 0.016, 0.23]} />
        <Mat color="#3a3430" />
      </mesh>
      <mesh position={[0, 0.0175, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.21]} />
        <meshStandardMaterial map={texture} roughness={0.95} />
      </mesh>
      <mesh position={[0.12, 0.024, 0.13]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 0.16, 6]} />
        <Mat color="#d9a441" />
      </mesh>
    </group>
  )
}

/** Mug of coffee. */
export function Mug({ position, color = '#f2ede4' }: { position: Vec3; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 14]} />
        <Mat color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.086, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.004, 14]} />
        <Mat color="#3e2619" roughness={0.3} />
      </mesh>
      <mesh position={[0.045, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 6, 12]} />
        <Mat color={color} roughness={0.45} />
      </mesh>
    </group>
  )
}

/** Over-ear headphones lying on the desk. */
export function Headphones({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.085, 0.012, 8, 20, Math.PI]} />
        <Mat color="#2a2a2c" roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.085, 0.022, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.035, 14]} />
          <Mat color="#3a3a3d" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** Desk lamp; its shade glows warm. */
export function DeskLamp({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.02, 16]} />
        <Mat color="#2f2a26" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0.02]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
        <Mat color="#2f2a26" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.39, 0.1]} rotation={[0.9, 0, 0]}>
        <coneGeometry args={[0.08, 0.12, 16, 1, true]} />
        <meshStandardMaterial color="#c4643e" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.36, 0.13]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshBasicMaterial color="#ffe2b0" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Small potted plant: a pot and a loose crown of leaves. */
export function PottedPlant({ position, scale = 1, pot = '#e9e4dc', leaf = '#5f8c4f' }: {
  position: Vec3
  scale?: number
  pot?: string
  leaf?: string
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.44, 18]} />
        <Mat color={pot} />
      </mesh>
      {[0, 1.3, 2.5, 3.7, 5, 5.9].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.08, 0.72 + (i % 3) * 0.1, Math.sin(a) * 0.08]}
          rotation={[Math.sin(a) * 0.4, a, Math.cos(a) * 0.4]}
          scale={[0.17, 0.42, 0.05]}
          castShadow
        >
          <sphereGeometry args={[1, 10, 8]} />
          <Mat color={i % 2 ? '#4f7a45' : leaf} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

const BOOK_COLORS = ['#c4643e', '#2f2d2a', '#e8e0d2', '#7f9a6c', '#d69a3f', '#4d5563', '#b9a688', '#8b3a2f']

/** A run of upright books along local x. */
export function Books({ position, count, rotationY = 0, seed = 0 }: { position: Vec3; count: number; rotationY?: number; seed?: number }) {
  const books = useMemo(() => {
    let x = 0
    return Array.from({ length: count }, (_, i) => {
      const r = Math.abs(Math.sin((i + seed) * 12.9898) * 43758.5453) % 1
      const w = 0.03 + r * 0.025
      const h = 0.2 + ((r * 7) % 1) * 0.08
      const b = { x: x + w / 2, w, h, c: BOOK_COLORS[(i + seed) % BOOK_COLORS.length] }
      x += w + 0.004
      return b
    })
  }, [count, seed])
  const total = books.length ? books[books.length - 1].x + books[books.length - 1].w / 2 : 0
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x - total / 2, b.h / 2, 0]}>
          <boxGeometry args={[b.w, b.h, 0.17]} />
          <Mat color={b.c} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** A book left open, face up. */
export function OpenBook({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.085, 0.012, 0]} rotation={[0, 0, s * -0.06]}>
          <boxGeometry args={[0.17, 0.014, 0.23]} />
          <Mat color="#f6f0e3" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={[0.36, 0.008, 0.24]} />
        <Mat color="#7f9a6c" />
      </mesh>
    </group>
  )
}

/** Low open bookshelf along local x, with its shelves at the given heights. */
export function Bookshelf({ position, rotationY = 0, width = 2, height = 0.95, depth = 0.34, children }: {
  position: Vec3
  rotationY?: number
  width?: number
  height?: number
  depth?: number
  children?: ReactNode
}) {
  const wood = '#b88a5e'
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[0.02, height / 2, height - 0.02].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, 0.03, depth]} />
          <Mat color={wood} roughness={0.65} />
        </mesh>
      ))}
      {[-1, 0, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 - 0.015), height / 2, 0]} castShadow>
          <boxGeometry args={[0.03, height, depth]} />
          <Mat color={wood} roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, height / 2, -depth / 2 + 0.005]}>
        <boxGeometry args={[width, height, 0.01]} />
        <Mat color="#a37a52" />
      </mesh>
      {children}
    </group>
  )
}

/** Framed image on a wall; `width` is the picture's width. */
export function FramedImage({ src, width, position, rotationY = 0, frame = '#2b2622', mat = 0.06 }: {
  src: string
  width: number
  position: Vec3
  rotationY?: number
  frame?: string
  mat?: number
}) {
  const { texture, aspect } = useImage(src)
  const h = width / aspect
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, 0.015]} castShadow>
        <boxGeometry args={[width + mat * 2 + 0.05, h + mat * 2 + 0.05, 0.03]} />
        <Mat color={frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.031]}>
        <planeGeometry args={[width + mat * 2, h + mat * 2]} />
        <Mat color="#faf7f1" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.033]}>
        <planeGeometry args={[width, h]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** An image card pinned flat to a board or wall, at (x, y) on it. */
export function PinnedCard({ src, x, y, width, tilt, pin }: { src: string; x: number; y: number; width: number; tilt: number; pin: string }) {
  const { texture, aspect } = useImage(src)
  const h = width / aspect
  return (
    <group position={[x, y, 0.03]} rotation={[0, 0, tilt]}>
      <mesh>
        <planeGeometry args={[width + 0.04, h + 0.04]} />
        <Mat color="#fbf8f2" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[width, h]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
      <mesh position={[0, h / 2 - 0.02, 0.01]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <Mat color={pin} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** A woven rug on the floor. */
export function Rug({ position, size, color = '#d9c3a3', border = '#c4643e' }: {
  position: Vec3
  size: [number, number]
  color?: string
  border?: string
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={size} />
        <Mat color={border} roughness={1} />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size[0] - 0.16, size[1] - 0.16]} />
        <Mat color={color} roughness={1} />
      </mesh>
    </group>
  )
}
