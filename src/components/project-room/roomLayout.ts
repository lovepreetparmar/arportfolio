import { ROOM_DEPTH, ROOM_HEIGHT, ROOM_WIDTH } from './roomSpace'

export type RoomWall = 'back' | 'left' | 'right'

/** An artwork's place on a wall, in room-local metres; `x`, `y`, `z` is the centre of the image. */
export type ArtworkPlacement = {
  index: number
  wall: RoomWall
  x: number
  y: number
  z: number
  width: number
  height: number
  /** Yaw that turns a +z-facing plane to face into the room from this wall. */
  rotationY: number
  /** Unit normal pointing from the wall into the room (x, z). */
  normal: [number, number]
}

export type RoomLayout = {
  artworks: ArtworkPlacement[]
  /** The wall text (title, description, details) on the left wall. */
  wallText: { z: number; width: number; height: number }
  /** Whether the right wall is free for the room's centrepiece prop. */
  rightWallFree: boolean
}

const WALLS: Record<RoomWall, { rotationY: number; normal: [number, number] }> = {
  back: { rotationY: 0, normal: [0, 1] },
  left: { rotationY: Math.PI / 2, normal: [1, 0] },
  right: { rotationY: -Math.PI / 2, normal: [-1, 0] },
}

/** Largest image of aspect `a` (width / height) within the given box; never stretched. */
function fit(a: number, maxW: number, maxH: number) {
  const width = Math.min(maxW, maxH * a)
  return { width, height: width / a }
}

/** Centres of `count` equal slots spread over [from, to]. */
function slots(count: number, from: number, to: number) {
  const step = (to - from) / count
  return Array.from({ length: count }, (_, i) => from + step * (i + 0.5))
}

const HANG_HEIGHT = 1.6
const CEILING_CLEARANCE = 0.55

function hangY(height: number, preferred = HANG_HEIGHT) {
  return Math.min(Math.max(preferred, 0.75 + height / 2), ROOM_HEIGHT - CEILING_CLEARANCE - height / 2)
}

/**
 * Hangs the artworks: the first (the cover) is the hero on the back wall, the rest alternate onto
 * the side walls. With a single artwork the hero grows and the side walls keep the wall text and
 * the centrepiece; no empty frames are ever hung.
 */
export function layoutRoom(aspects: number[]): RoomLayout {
  const artworks: ArtworkPlacement[] = []
  const place = (index: number, wall: RoomWall, x: number, y: number, z: number, size: { width: number; height: number }) =>
    artworks.push({ index, wall, x, y, z, ...size, ...WALLS[wall] })

  const halfW = ROOM_WIDTH / 2
  const halfD = ROOM_DEPTH / 2
  const supporting = aspects.length - 1
  if (aspects.length > 0) {
    const hero = fit(aspects[0], supporting === 0 ? 3.3 : 2.6, supporting === 0 ? 2.25 : 1.95)
    place(0, 'back', 0, hangY(hero.height, 1.75), -halfD, hero)
  }

  const rightCount = Math.min(3, Math.ceil(supporting / 2))
  const leftCount = Math.min(2, supporting - rightCount)
  const backCount = Math.min(2, supporting - rightCount - leftCount)
  let next = 1

  const rightSlots = slots(rightCount, -halfD + 0.7, halfD - 1.1)
  const rightSpan = rightCount > 0 ? (halfD * 2 - 1.8) / rightCount : 0
  for (const z of rightSlots) {
    const size = fit(aspects[next], Math.min(1.6, rightSpan - 0.55), 1.4)
    place(next++, 'right', halfW, hangY(size.height), z, size)
  }

  const leftSlots = slots(leftCount, -halfD + 0.7, -0.1)
  const leftSpan = leftCount > 0 ? (halfD - 0.8) / leftCount : 0
  for (const z of leftSlots) {
    const size = fit(aspects[next], Math.min(1.5, leftSpan - 0.5), 1.35)
    place(next++, 'left', -halfW, hangY(size.height), z, size)
  }

  for (let i = 0; i < backCount; i++) {
    const side = i === 0 ? -1 : 1
    const size = fit(aspects[next], 0.95, 1.2)
    place(next++, 'back', side * 2.95, hangY(size.height), -halfD, size)
  }

  const wallText = leftCount > 0 ? { z: 1.95, width: 2.3, height: 2.1 } : { z: 0.35, width: 3, height: 2.1 }
  return { artworks, wallText, rightWallFree: rightCount === 0 }
}
