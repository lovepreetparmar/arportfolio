import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { ProjectRoomTheme } from '../../data/projectWorld'
import { useCursor } from '../../context/CursorContext'
import type { ArtworkPlacement } from './roomLayout'
import { frameShadowTexture, isDark } from './roomTextures'

type RoomArtworkProps = {
  placement: ArtworkPlacement
  texture: THREE.Texture
  theme: ProjectRoomTheme
  focused: boolean
  onSelect: (e: ThreeEvent<MouseEvent>) => void
}

const FRAME_DEPTH = 0.045

/**
 * A framed artwork on a wall: moulding, mat, the image at its own aspect ratio and a soft drop
 * shadow. Digital rooms hang their work as screens instead (thin bezel, gentle glow).
 */
export function RoomArtwork({ placement, texture, theme, focused, onSelect }: RoomArtworkProps) {
  const { setMode } = useCursor()
  const { width: w, height: h } = placement
  const screen = theme.displayStyle === 'digital'
  const boutique = theme.displayStyle === 'boutique'
  const mat = screen ? 0 : Math.min(w, h) * (boutique ? 0.1 : 0.085)
  const border = screen ? 0.03 : boutique ? 0.032 : 0.042
  const outerW = w + 2 * (mat + border)
  const outerH = h + 2 * (mat + border)
  const shadowOpacity = isDark(theme.wallColor) ? 0.55 : 0.32

  return (
    <group
      position={[placement.x, placement.y, placement.z]}
      rotation={[0, placement.rotationY, 0]}
      onClick={onSelect}
      onPointerOver={(e) => {
        e.stopPropagation()
        setMode('image', focused ? 'Open' : 'View')
      }}
      onPointerOut={() => setMode('default')}
    >
      <mesh position={[0.025, -0.05, 0.003]}>
        <planeGeometry args={[outerW + 0.28, outerH + 0.28]} />
        <meshBasicMaterial map={frameShadowTexture()} transparent opacity={shadowOpacity} depthWrite={false} color="#000" />
      </mesh>
      <mesh position={[0, 0, FRAME_DEPTH / 2]}>
        <boxGeometry args={[outerW, outerH, FRAME_DEPTH]} />
        <meshStandardMaterial
          color={screen ? '#121314' : theme.frameColor}
          roughness={screen ? 0.35 : boutique ? 0.32 : 0.6}
          metalness={boutique ? 0.75 : 0}
        />
      </mesh>
      {!screen && (
        <mesh position={[0, 0, FRAME_DEPTH + 0.001]}>
          <planeGeometry args={[w + 2 * mat, h + 2 * mat]} />
          <meshStandardMaterial color={boutique ? '#efe6d3' : '#f6f3ed'} roughness={0.95} />
        </mesh>
      )}
      <mesh position={[0, 0, FRAME_DEPTH + 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          roughness={screen ? 0.3 : 0.75}
          emissive={screen ? '#ffffff' : '#000000'}
          emissiveMap={screen ? texture : null}
          emissiveIntensity={screen ? 0.55 : 0}
        />
      </mesh>
    </group>
  )
}
