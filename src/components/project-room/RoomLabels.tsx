import { useEffect, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { Project } from '../../data/projects'
import type { ProjectRoomTheme, ProjectWorldConfig } from '../../data/projectWorld'
import { useCursor } from '../../context/CursorContext'
import { wasDrag } from '../world/mapNavigation'
import { SANS, SERIF, fontsReady, isDark, wrapText } from './roomTextures'

/** Canvas pixels per metre of wall. */
const PX = 520
/** Lettering size on the wall relative to the layout units below. */
const TEXT_SCALE = 1.45

/** Only details that exist in the project data, in gallery-label order. */
export function projectDetails(project: Project, config: ProjectWorldConfig) {
  const meta = config.meta
  const rows: [string, string][] = []
  if (meta?.year) rows.push(['Year', meta.year])
  if (meta?.role && meta.role !== project.category) rows.push(['Role', meta.role])
  if (meta?.tools?.length) rows.push(['Tools', meta.tools.join(', ')])
  return { description: project.description ?? meta?.about, rows }
}

type Drawn = { texture: THREE.CanvasTexture; link: { top: number; bottom: number; width: number } | null }

function drawWallText(project: Project, config: ProjectWorldConfig, theme: ProjectRoomTheme, w: number, h: number): Drawn {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * PX)
  canvas.height = Math.round(h * PX)
  const ctx = canvas.getContext('2d')!
  const dark = isDark(theme.wallColor)
  const ink = dark ? '#efe6d6' : '#1d1c1a'
  const muted = dark ? '#b8ab96' : '#6c665d'
  const { description, rows } = projectDetails(project, config)
  ctx.scale(TEXT_SCALE, TEXT_SCALE)
  const maxW = canvas.width / TEXT_SCALE
  let y = 0

  ctx.textBaseline = 'top'
  ctx.fillStyle = muted
  ctx.font = `600 26px ${SANS}`
  ctx.letterSpacing = '7px'
  ctx.fillText(`${project.number}  —  ${project.category}`.toUpperCase(), 0, y)
  y += 64

  ctx.letterSpacing = '0px'
  ctx.fillStyle = ink
  ctx.font = `400 104px ${SERIF}`
  for (const line of wrapText(ctx, project.title, maxW, 2)) {
    ctx.fillText(line, 0, y)
    y += 104
  }
  y += 26
  ctx.fillStyle = theme.accentColor
  ctx.fillRect(0, y, 96, 5)
  y += 44

  if (description) {
    ctx.fillStyle = ink
    ctx.font = `400 30px ${SANS}`
    for (const line of wrapText(ctx, description, maxW * 0.92, 5)) {
      ctx.fillText(line, 0, y)
      y += 46
    }
    y += 26
  }

  for (const [label, value] of rows) {
    ctx.fillStyle = muted
    ctx.font = `600 22px ${SANS}`
    ctx.letterSpacing = '5px'
    ctx.fillText(label.toUpperCase(), 0, y + 6)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = ink
    ctx.font = `500 28px ${SANS}`
    const [line] = wrapText(ctx, value, maxW - 190, 1)
    ctx.fillText(line, 190, y)
    y += 48
  }

  let link: Drawn['link'] = null
  if (project.behanceUrl) {
    y += 30
    ctx.fillStyle = ink
    ctx.font = `600 24px ${SANS}`
    ctx.letterSpacing = '5px'
    const text = 'VIEW FULL PROJECT ON BEHANCE  ↗'
    ctx.fillText(text, 0, y)
    const width = ctx.measureText(text).width
    ctx.fillRect(0, y + 38, width, 2)
    link = { top: (y - 14) * TEXT_SCALE, bottom: (y + 54) * TEXT_SCALE, width: (width + 10) * TEXT_SCALE }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { texture, link }
}

/** Draws once the site fonts are available, and disposes the texture when the room closes. */
function useDrawn(draw: () => Drawn, deps: unknown[]) {
  const [drawn, setDrawn] = useState<Drawn | null>(null)
  useEffect(() => {
    let alive = true
    let result: Drawn | null = null
    fontsReady().then(() => {
      if (!alive) return
      result = draw()
      setDrawn(result)
    })
    return () => {
      alive = false
      result?.texture.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return drawn
}

type WallTextProps = {
  project: Project
  config: ProjectWorldConfig
  theme: ProjectRoomTheme
  width: number
  height: number
}

/** Vinyl-style wall text: number, category, title, description and the details that exist. */
export function RoomWallText({ project, config, theme, width, height }: WallTextProps) {
  const drawn = useDrawn(() => drawWallText(project, config, theme, width, height), [project, config, theme, width, height])
  const { setMode } = useCursor()
  if (!drawn) return null
  const link = drawn.link

  const openBehance = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag(e)) return
    window.open(project.behanceUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={drawn.texture} transparent roughness={0.9} depthWrite={false} />
      </mesh>
      {link && (
        <mesh
          position={[-width / 2 + link.width / PX / 2, height / 2 - (link.top + link.bottom) / 2 / PX, 0.01]}
          onClick={openBehance}
          onPointerOver={(e) => {
            e.stopPropagation()
            setMode('link', 'Behance')
          }}
          onPointerOut={() => setMode('default')}
        >
          <planeGeometry args={[link.width / PX, (link.bottom - link.top) / PX]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </group>
  )
}

function drawPlaque(project: Project, config: ProjectWorldConfig, theme: ProjectRoomTheme, title: string | undefined): Drawn {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 300
  const ctx = canvas.getContext('2d')!
  const boutique = theme.displayStyle === 'boutique'
  ctx.fillStyle = boutique ? '#1c1714' : '#fbf9f5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const ink = boutique ? '#eadbbd' : '#1d1c1a'
  const muted = boutique ? '#a99572' : '#7a746b'
  ctx.textBaseline = 'top'
  ctx.fillStyle = ink
  ctx.font = `400 46px ${SERIF}`
  let y = 34
  for (const line of wrapText(ctx, title ?? project.title, 412, 2)) {
    ctx.fillText(line, 34, y)
    y += 50
  }
  y += 14
  ctx.fillStyle = muted
  ctx.font = `600 18px ${SANS}`
  ctx.letterSpacing = '4px'
  const year = config.meta?.year
  ctx.fillText([project.category, year].filter(Boolean).join('  ·  ').toUpperCase(), 34, y)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = theme.accentColor
  ctx.fillRect(34, canvas.height - 40, 40, 4)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, link: null }
}

/** Small gallery plaque beside the hero artwork. */
export function RoomPlaque({
  project,
  config,
  theme,
  title,
}: {
  project: Project
  config: ProjectWorldConfig
  theme: ProjectRoomTheme
  title?: string
}) {
  const drawn = useDrawn(() => drawPlaque(project, config, theme, title), [project, config, theme, title])
  if (!drawn) return null
  return (
    <group>
      <mesh position={[0, 0, 0.006]}>
        <boxGeometry args={[0.4, 0.25, 0.012]} />
        <meshStandardMaterial color={theme.displayStyle === 'boutique' ? '#1c1714' : '#fbf9f5'} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.0125]}>
        <planeGeometry args={[0.4, 0.25]} />
        <meshStandardMaterial map={drawn.texture} roughness={0.7} />
      </mesh>
    </group>
  )
}
