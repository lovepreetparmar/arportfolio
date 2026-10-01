import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useCursor } from '../../../context/CursorContext'
import { wasDrag } from '../../world/mapNavigation'
import { fontsReady } from '../roomTextures'

/** Canvas pixels per metre of panel. */
export const PANEL_PX = 520

/** A clickable area on the panel, in canvas pixels from the top left. */
export type PanelLink = { x: number; y: number; w: number; h: number; href: string; label: string }

type Drawn = { texture: THREE.CanvasTexture; links: PanelLink[] }

type CanvasPanelProps = {
  width: number
  height: number
  /** Draws onto the panel and returns the link areas it drew. */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => PanelLink[]
  /** Redraws when this changes. */
  drawKey: string
  transparent?: boolean
}

/** Wall lettering drawn once the site fonts are ready; its links open like links on a page. */
export function CanvasPanel({ width, height, draw, drawKey, transparent = true }: CanvasPanelProps) {
  const [drawn, setDrawn] = useState<Drawn | null>(null)
  const { setMode } = useCursor()

  useEffect(() => {
    let alive = true
    let result: Drawn | null = null
    fontsReady().then(() => {
      if (!alive) return
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * PANEL_PX)
      canvas.height = Math.round(height * PANEL_PX)
      const links = draw(canvas.getContext('2d')!, canvas.width, canvas.height)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      result = { texture, links }
      setDrawn(result)
    })
    return () => {
      alive = false
      result?.texture.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey, width, height])

  if (!drawn) return null

  const open = (href: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag(e)) return
    if (href.startsWith('mailto:')) window.location.href = href
    else window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={drawn.texture} transparent={transparent} roughness={0.9} depthWrite={!transparent} />
      </mesh>
      {drawn.links.map((l) => (
        <mesh
          key={l.href}
          position={[-width / 2 + (l.x + l.w / 2) / PANEL_PX, height / 2 - (l.y + l.h / 2) / PANEL_PX, 0.01]}
          onClick={open(l.href)}
          onPointerOver={(e) => {
            e.stopPropagation()
            setMode('link', l.label)
          }}
          onPointerOut={() => setMode('default')}
        >
          <planeGeometry args={[l.w / PANEL_PX, l.h / PANEL_PX]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}
    </group>
  )
}
