import { Suspense, useEffect } from 'react'
import { site } from '../../../data/site'
import { CONTACT_ROOM } from '../../../data/worldLocations'
import { RoomDoor, RoomFixtures, RoomShell, useRoomEscape } from '../ProjectRoom'
import { ROOM_DEPTH, ROOM_ORIGIN, ROOM_WIDTH, roomObstacles, updateRoomView, type RoomObstacle } from '../roomSpace'
import { SANS, SERIF } from '../roomTextures'
import { CanvasPanel, type PanelLink } from './CanvasPanel'
import { contactLinks, projectCovers } from './studioData'
import { Bookshelf, Chair, DESK_TOP, Desk, DeskLamp, Monitor, Mug, PinnedCard, PottedPlant, Rug } from './StudioFurniture'

const HALF_W = ROOM_WIDTH / 2
const HALF_D = ROOM_DEPTH / 2
const theme = CONTACT_ROOM
const INK = '#1d1c1a'
const MUTED = '#6c665d'
const BOARD = '#f7f2e8'

const DESK = { x: -HALF_W + 0.42, z: -0.9 }
const SHELF = { x: HALF_W - 0.19, z: -0.6 }

const OBSTACLES: RoomObstacle[] = [
  { x: DESK.x, z: DESK.z, hw: 0.38, hd: 0.86 },
  { x: DESK.x + 0.8, z: DESK.z + 0.1, hw: 0.26, hd: 0.26 },
  { x: SHELF.x, z: SHELF.z, hw: 0.19, hd: 0.82 },
  { x: -HALF_W + 0.5, z: -HALF_D + 0.5, hw: 0.26, hd: 0.26 },
  { x: HALF_W - 0.5, z: -HALF_D + 0.5, hw: 0.26, hd: 0.26 },
]

/** The board: who to write to and every real way to reach her, each a link. */
function drawBoard(ctx: CanvasRenderingContext2D, w: number, h: number): PanelLink[] {
  ctx.fillStyle = BOARD
  ctx.fillRect(0, 0, w, h)
  const pad = 110
  let y = pad
  ctx.textBaseline = 'top'
  ctx.fillStyle = MUTED
  ctx.font = `600 34px ${SANS}`
  ctx.letterSpacing = '10px'
  ctx.fillText('CONTACT', pad, y)
  y += 84
  ctx.letterSpacing = '0px'
  ctx.fillStyle = INK
  ctx.font = `400 140px ${SERIF}`
  ctx.fillText(site.name, pad, y)
  y += 160
  ctx.fillStyle = MUTED
  ctx.font = `500 40px ${SANS}`
  ctx.fillText([site.role, site.studio, site.location].filter(Boolean).join('  ·  '), pad, y)
  y += 84
  ctx.fillStyle = theme.accentColor
  ctx.fillRect(pad, y, 130, 6)
  y += 70

  const links: PanelLink[] = []
  for (const l of contactLinks()) {
    ctx.fillStyle = MUTED
    ctx.font = `600 30px ${SANS}`
    ctx.letterSpacing = '8px'
    ctx.fillText(l.label.toUpperCase(), pad, y + 16)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = INK
    ctx.font = `500 46px ${SANS}`
    const text = `${l.text}  ↗`
    ctx.fillText(text, pad + 330, y)
    const tw = ctx.measureText(text).width
    ctx.fillRect(pad + 330, y + 60, tw, 3)
    links.push({ x: pad - 20, y: y - 22, w: 330 + tw + 40, h: 110, href: l.href, label: l.label })
    y += 120
  }
  return links
}

/** A handful of envelopes, squared up and slightly askew. */
function Envelopes({ position, rotationY = 0, count = 4 }: { position: [number, number, number]; rotationY?: number; count?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[(i % 2) * 0.012, 0.004 + i * 0.007, -(i % 3) * 0.008]} rotation={[0, (i % 2 ? 1 : -1) * 0.06 * i, 0]}>
          <mesh>
            <boxGeometry args={[0.24, 0.006, 0.16]} />
            <meshStandardMaterial color={i % 3 === 1 ? '#e9dcc4' : '#f7f2e6'} roughness={0.95} />
          </mesh>
          {i === count - 1 && (
            <mesh position={[0.08, 0.0035, -0.045]}>
              <boxGeometry args={[0.04, 0.001, 0.045]} />
              <meshStandardMaterial color={theme.accentColor} roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/**
 * The contact studio inside: a writing desk with a computer and post waiting, a letter shelf, and
 * the board on the back wall with every real way to reach her. The links open like links on a page.
 */
export function ContactRoom() {
  useRoomEscape()
  useEffect(() => {
    roomObstacles.length = 0
    roomObstacles.push(...OBSTACLES)
    updateRoomView({ items: [] })
    return () => {
      roomObstacles.length = 0
    }
  }, [])
  const covers = projectCovers(4)
  const desk = DESK_TOP

  return (
    <group position={[ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z]}>
      <RoomShell theme={theme} />
      <RoomFixtures theme={theme} />
      <RoomDoor theme={theme} />
      <Rug position={[0.3, 0, 0.2]} size={[2.4, 1.7]} color="#d8cdb8" border={theme.accentColor} />

      <group position={[0, 1.75, -HALF_D + 0.03]}>
        <mesh position={[0, 0, -0.012]} castShadow>
          <boxGeometry args={[3.3, 1.62, 0.03]} />
          <meshStandardMaterial color="#2a2926" roughness={0.6} />
        </mesh>
        <group position={[0, 0, 0.008]}>
          <CanvasPanel width={3.2} height={1.52} draw={drawBoard} drawKey={`contact${contactLinks().length}`} transparent={false} />
        </group>
      </group>

      <Desk position={[DESK.x, 0, DESK.z]} rotationY={Math.PI / 2} top="#9c7552" />
      <Chair position={[DESK.x + 0.8, 0, DESK.z + 0.1]} rotationY={-Math.PI / 2 - 0.3} seat="#3f6b5c" />
      <Suspense fallback={null}>
        {covers[0] && <Monitor position={[DESK.x - 0.12, desk, DESK.z]} rotationY={Math.PI / 2} src={covers[0]} />}
        <group position={[-HALF_W + 0.004, 1.75, DESK.z]} rotation={[0, Math.PI / 2, 0]}>
          {covers.slice(1).map((src, i) => (
            <PinnedCard key={src} src={src} x={-0.55 + i * 0.55} y={(i % 2) * 0.08} width={0.36} tilt={(i - 1) * 0.05} pin={theme.accentColor} />
          ))}
        </group>
      </Suspense>
      <Envelopes position={[DESK.x + 0.1, desk, DESK.z + 0.55]} rotationY={Math.PI / 2 + 0.2} />
      <Mug position={[DESK.x + 0.15, desk, DESK.z - 0.55]} color="#3f6b5c" />
      <DeskLamp position={[DESK.x - 0.15, desk, DESK.z - 0.68]} rotationY={Math.PI / 2 + 0.4} />

      <Bookshelf position={[SHELF.x, 0, SHELF.z]} rotationY={-Math.PI / 2} width={1.6} height={1.1}>
        <Envelopes position={[-0.45, 0.035, 0]} count={6} />
        <Envelopes position={[0.05, 0.035, 0]} count={3} rotationY={0.3} />
        <Envelopes position={[-0.2, 0.565, 0]} count={5} rotationY={-0.2} />
        <PottedPlant position={[0.45, 0.565, 0]} scale={0.4} pot="#3f6b5c" />
        <PottedPlant position={[-0.5, 1.1, 0]} scale={0.32} pot={BOARD} />
      </Bookshelf>

      <PottedPlant position={[-HALF_W + 0.5, 0, -HALF_D + 0.5]} scale={1.15} />
      <PottedPlant position={[HALF_W - 0.5, 0, -HALF_D + 0.5]} scale={1} pot="#c4643e" />
    </group>
  )
}
