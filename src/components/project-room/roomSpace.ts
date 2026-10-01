import { useSyncExternalStore } from 'react'
import type { ProjectGalleryItem } from '../../data/projectWorld'

type Vec3 = { x: number; y: number; z: number }

/**
 * The exhibition room lives in the same scene as the world, far enough away that the world is
 * beyond the camera's far plane while she is inside. Local room axes: the door is in the front
 * wall (+z), the hero artwork on the back wall (−z).
 */
export const ROOM_ORIGIN = { x: 0, z: -420 }
export const ROOM_WIDTH = 8.4
export const ROOM_DEPTH = 8
export const ROOM_HEIGHT = 3.7
export const ROOM_DOOR = { width: 1.1, height: 2.3 }
/** Slightly wider lens indoors so a wall reads whole from inside the room. */
export const ROOM_FOV = 42
/** Orbit distance at zoom 1 and the zoom range inside a room. */
export const ROOM_BASE_DISTANCE = 4
export const ROOM_ZOOM_RANGE: [number, number] = [0.55, 1.3]
/** Orbit polar limits indoors: never top-down under the ceiling, never below eye level. */
export const ROOM_POLAR_RANGE: [number, number] = [0.8, 1.42]
/** Walkable inset from the walls. */
const WALL_MARGIN = 0.42
/** Her footprint radius when sliding around props. */
const BODY_RADIUS = 0.28
/** Anything within this distance of the room origin is room space. */
const ROOM_SPACE_RADIUS = 40

export const roomPoint = (x: number, z: number): Vec3 => ({ x: ROOM_ORIGIN.x + x, y: 0, z: ROOM_ORIGIN.z + z })

/** Just inside the door, where she appears and where she leaves from. */
export const ROOM_DOORSTEP = roomPoint(0, ROOM_DEPTH / 2 - 0.5)
/** Where she stops after coming in: far enough that the camera has room behind her. */
export const ROOM_ARRIVAL = roomPoint(0, 0.4)

export function isInRoomSpace(x: number, z: number) {
  return Math.hypot(x - ROOM_ORIGIN.x, z - ROOM_ORIGIN.z) < ROOM_SPACE_RADIUS
}

/** Axis-aligned prop footprint in room-local metres (centre and half extents). */
export type RoomObstacle = { x: number; z: number; hw: number; hd: number }

/** Props of the room currently on show, registered by the room while it is mounted. */
export const roomObstacles: RoomObstacle[] = []

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Nearest walkable point: inside the walls and clear of props (she slides around their edges). */
export function constrainToRoom(x: number, z: number): [number, number] {
  const hx = ROOM_WIDTH / 2 - WALL_MARGIN
  const hz = ROOM_DEPTH / 2 - WALL_MARGIN
  let lx = clamp(x - ROOM_ORIGIN.x, -hx, hx)
  let lz = clamp(z - ROOM_ORIGIN.z, -hz, hz)
  for (const o of roomObstacles) {
    const px = clamp(lx, o.x - o.hw, o.x + o.hw)
    const pz = clamp(lz, o.z - o.hd, o.z + o.hd)
    const dx = lx - px
    const dz = lz - pz
    const d = Math.hypot(dx, dz)
    if (d >= BODY_RADIUS) continue
    if (d > 1e-5) {
      lx = px + (dx / d) * BODY_RADIUS
      lz = pz + (dz / d) * BODY_RADIUS
    } else {
      const toX = o.hw - Math.abs(lx - o.x)
      const toZ = o.hd - Math.abs(lz - o.z)
      if (toX < toZ) lx = o.x + Math.sign(lx - o.x || 1) * (o.hw + BODY_RADIUS)
      else lz = o.z + Math.sign(lz - o.z || 1) * (o.hd + BODY_RADIUS)
    }
  }
  return [clamp(lx, -hx, hx) + ROOM_ORIGIN.x, clamp(lz, -hz, hz) + ROOM_ORIGIN.z]
}

/** Camera clearance from the room's walls, floor and ceiling. */
const CAMERA_INSET = 0.22
/** The camera never comes closer than this to its pivot. */
const MIN_ROOM_CAMERA_DISTANCE = 0.9

/** Longest pivot-to-camera distance along the desired ray that stays inside the room. */
export function roomCollisionDistance(pivot: Vec3, desired: Vec3): number {
  const len = Math.hypot(desired.x - pivot.x, desired.y - pivot.y, desired.z - pivot.z)
  if (len < 1e-6) return len
  const min = [ROOM_ORIGIN.x - ROOM_WIDTH / 2 + CAMERA_INSET, CAMERA_INSET + 0.1, ROOM_ORIGIN.z - ROOM_DEPTH / 2 + CAMERA_INSET]
  const max = [ROOM_ORIGIN.x + ROOM_WIDTH / 2 - CAMERA_INSET, ROOM_HEIGHT - CAMERA_INSET, ROOM_ORIGIN.z + ROOM_DEPTH / 2 - CAMERA_INSET]
  const o = [pivot.x, pivot.y, pivot.z]
  const d = [desired.x - pivot.x, desired.y - pivot.y, desired.z - pivot.z]
  let t = 1
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-6) continue
    const bound = d[i] > 0 ? max[i] : min[i]
    t = Math.min(t, Math.max(0, (bound - o[i]) / d[i]))
  }
  return Math.max(MIN_ROOM_CAMERA_DISTANCE, t * len)
}

/** Camera framing for a focused artwork. */
export type ArtworkFocus = { x: number; y: number; z: number; azimuth: number; polar: number; distance: number }

type RoomViewState = {
  items: ProjectGalleryItem[]
  /** Index of the artwork the camera is framing, if any. */
  focusIndex: number | null
  focus: ArtworkFocus | null
  /** Index of the artwork open in the full-screen viewer, if any. */
  viewerIndex: number | null
  /** Yaw she turns to once she stops (facing the focused artwork). */
  faceYaw: number | null
}

/** Shared between the room in the canvas and the image viewer in the page. */
export const roomView: RoomViewState = { items: [], focusIndex: null, focus: null, viewerIndex: null, faceYaw: null }

const listeners = new Set<() => void>()
let version = 0

export function updateRoomView(patch: Partial<RoomViewState>) {
  Object.assign(roomView, patch)
  version++
  listeners.forEach((l) => l())
}

export function clearRoomFocus() {
  if (roomView.focusIndex === null && roomView.faceYaw === null) return
  updateRoomView({ focusIndex: null, focus: null, faceYaw: null })
}

export function resetRoomView() {
  updateRoomView({ items: [], focusIndex: null, focus: null, viewerIndex: null, faceYaw: null })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRoomView() {
  useSyncExternalStore(subscribe, () => version)
  return roomView
}
