import { Suspense, useEffect } from 'react'
import { site } from '../../../data/site'
import { ABOUT_ROOM } from '../../../data/worldLocations'
import { RoomDoor, RoomFixtures, RoomShell, useRoomEscape } from '../ProjectRoom'
import { ROOM_DEPTH, ROOM_ORIGIN, ROOM_WIDTH, roomObstacles, updateRoomView, type RoomObstacle } from '../roomSpace'
import { SANS, SERIF, wrapText } from '../roomTextures'
import { CanvasPanel, type PanelLink } from './CanvasPanel'
import { contactLinks, projectCovers, projectSwatches, studioTools } from './studioData'
import {
  Books,
  Bookshelf,
  Chair,
  DESK_TOP,
  Desk,
  DeskLamp,
  FramedImage,
  Headphones,
  Monitor,
  Mug,
  OpenBook,
  PinnedCard,
  PottedPlant,
  Rug,
  Sketchbook,
} from './StudioFurniture'

const HALF_W = ROOM_WIDTH / 2
const HALF_D = ROOM_DEPTH / 2
const theme = ABOUT_ROOM
const INK = '#1d1c1a'
const MUTED = '#6c665d'

const DESK = { x: -1.75, z: -HALF_D + 0.42 }
const SHELF = { x: HALF_W - 0.19, z: 0.5 }

const OBSTACLES: RoomObstacle[] = [
  { x: DESK.x, z: DESK.z, hw: 0.86, hd: 0.38 },
  { x: DESK.x + 0.15, z: DESK.z + 0.78, hw: 0.26, hd: 0.26 },
  { x: SHELF.x, z: SHELF.z, hw: 0.19, hd: 1.02 },
  { x: HALF_W - 0.5, z: -HALF_D + 0.5, hw: 0.26, hd: 0.26 },
  { x: -HALF_W + 0.5, z: HALF_D - 0.8, hw: 0.26, hd: 0.26 },
]

/** Who she is, from the site's own words: name, role, bio, studio, disciplines and tools. */
function drawAbout(ctx: CanvasRenderingContext2D, w: number): PanelLink[] {
  const s = 1.45
  ctx.scale(s, s)
  const maxW = w / s
  let y = 0
  ctx.textBaseline = 'top'
  ctx.fillStyle = MUTED
  ctx.font = `600 26px ${SANS}`
  ctx.letterSpacing = '7px'
  ctx.fillText('ABOUT', 0, y)
  y += 64
  ctx.letterSpacing = '0px'
  ctx.fillStyle = INK
  ctx.font = `400 104px ${SERIF}`
  ctx.fillText(site.name, 0, y)
  y += 112
  ctx.fillStyle = MUTED
  ctx.font = `500 30px ${SANS}`
  ctx.fillText(site.role, 0, y)
  y += 60
  ctx.fillStyle = theme.accentColor
  ctx.fillRect(0, y, 96, 5)
  y += 44
  ctx.fillStyle = INK
  ctx.font = `400 30px ${SANS}`
  for (const line of wrapText(ctx, site.bio, maxW * 0.94, 5)) {
    ctx.fillText(line, 0, y)
    y += 46
  }
  y += 30
  const rows: [string, string][] = [
    ['Studio', site.studio],
    ['Based in', site.location],
    ['Practice', site.disciplines.join(' · ')],
  ]
  const tools = studioTools()
  if (tools.length) rows.push(['Tools', tools.join(' · ')])
  for (const [label, value] of rows) {
    ctx.fillStyle = MUTED
    ctx.font = `600 22px ${SANS}`
    ctx.letterSpacing = '5px'
    ctx.fillText(label.toUpperCase(), 0, y + 6)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = INK
    ctx.font = `500 28px ${SANS}`
    const lines = wrapText(ctx, value, maxW - 210, 2)
    lines.forEach((line, i) => ctx.fillText(line, 210, y + i * 40))
    y += 40 * lines.length + 12
  }

  const links: PanelLink[] = []
  y += 34
  let x = 0
  ctx.font = `600 24px ${SANS}`
  ctx.letterSpacing = '5px'
  for (const l of contactLinks().filter((c) => !c.href.startsWith('mailto:'))) {
    const text = `${l.label.toUpperCase()}  ↗`
    ctx.fillStyle = INK
    ctx.fillText(text, x, y)
    const tw = ctx.measureText(text).width
    ctx.fillRect(x, y + 38, tw, 2)
    links.push({ x: (x - 8) * s, y: (y - 14) * s, w: (tw + 16) * s, h: 68 * s, href: l.href, label: l.label })
    x += tw + 56
  }
  return links
}

/** Cork moodboard over the desk: her covers, the colours they use and a type specimen. */
function Moodboard({ position }: { position: [number, number, number] }) {
  const covers = projectCovers(5)
  const swatches = projectSwatches(5)
  const slots = [
    { x: -0.68, y: 0.2, w: 0.42, t: 0.04 },
    { x: -0.16, y: 0.24, w: 0.36, t: -0.05 },
    { x: 0.36, y: 0.18, w: 0.4, t: 0.03 },
    { x: -0.5, y: -0.26, w: 0.34, t: -0.03 },
    { x: 0.62, y: -0.24, w: 0.3, t: 0.06 },
  ]
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.012]} castShadow>
        <boxGeometry args={[2.06, 1.16, 0.024]} />
        <meshStandardMaterial color="#5b4535" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[1.96, 1.06]} />
        <meshStandardMaterial color="#c9a57a" roughness={1} />
      </mesh>
      {covers.map((src, i) => (
        <PinnedCard key={src} src={src} x={slots[i].x} y={slots[i].y} width={slots[i].w} tilt={slots[i].t} pin={theme.accentColor} />
      ))}
      {swatches.map((c, i) => (
        <mesh key={c} position={[-0.06 + i * 0.1, -0.3, 0.03]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.05]}>
          <planeGeometry args={[0.08, 0.12]} />
          <meshStandardMaterial color={c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Anushri's studio: her desk under a moodboard of her own covers, a hero piece on the back wall,
 * a shelf of books and framed work, and her words on the wall. Built in the shared room space with
 * the same shell, lights, door and controls as the project rooms.
 */
export function AboutRoom() {
  useRoomEscape()
  useEffect(() => {
    roomObstacles.length = 0
    roomObstacles.push(...OBSTACLES)
    updateRoomView({ items: [] })
    return () => {
      roomObstacles.length = 0
    }
  }, [])
  const covers = projectCovers(6)
  const desk = DESK_TOP

  return (
    <group position={[ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z]}>
      <RoomShell theme={theme} />
      <RoomFixtures theme={theme} />
      <RoomDoor theme={theme} />
      <Rug position={[0.2, 0, 0.1]} size={[2.8, 1.9]} />

      <group position={[-HALF_W + 0.006, 1.6, -0.35]} rotation={[0, Math.PI / 2, 0]}>
        <CanvasPanel width={3.5} height={2.4} draw={drawAbout} drawKey="about" />
      </group>

      <Desk position={[DESK.x, 0, DESK.z]} />
      <Chair position={[DESK.x + 0.15, 0, DESK.z + 0.78]} rotationY={Math.PI + 0.35} />
      <Sketchbook position={[DESK.x + 0.45, desk, DESK.z + 0.12]} rotationY={-0.12} />
      <Mug position={[DESK.x + 0.74, desk, DESK.z - 0.12]} />
      <Headphones position={[DESK.x - 0.62, desk, DESK.z + 0.16]} rotationY={0.5} />
      <DeskLamp position={[DESK.x - 0.7, desk, DESK.z - 0.2]} rotationY={0.5} />
      <PottedPlant position={[DESK.x + 0.76, desk, DESK.z + 0.2]} scale={0.3} pot="#c4643e" />

      <Suspense fallback={null}>
        {covers[0] && <Monitor position={[DESK.x - 0.12, desk, DESK.z - 0.12]} src={covers[0]} />}
        <Moodboard position={[DESK.x, 1.98, -HALF_D]} />
        {covers[1] && <FramedImage src={covers[1]} width={1.25} position={[1.75, 1.7, -HALF_D]} />}
        {covers.slice(2, 5).map((src, i) => (
          <FramedImage key={src} src={src} width={0.5} position={[HALF_W, 1.8, SHELF.z - 0.7 + i * 0.7]} rotationY={-Math.PI / 2} mat={0.05} />
        ))}
      </Suspense>

      <Bookshelf position={[SHELF.x, 0, SHELF.z]} rotationY={-Math.PI / 2}>
        <Books position={[-0.45, 0.035, 0]} count={14} />
        <Books position={[0.5, 0.035, 0]} count={9} seed={5} />
        <Books position={[-0.3, 0.49, 0]} count={10} seed={11} />
        <OpenBook position={[0.35, 0.95, 0.02]} rotationY={0.15} />
        <PottedPlant position={[-0.7, 0.95, 0]} scale={0.42} />
      </Bookshelf>

      <PottedPlant position={[HALF_W - 0.5, 0, -HALF_D + 0.5]} scale={1.25} />
      <PottedPlant position={[-HALF_W + 0.5, 0, HALF_D - 0.8]} scale={1.1} pot="#c4643e" />
    </group>
  )
}
