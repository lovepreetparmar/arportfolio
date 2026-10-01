import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { getPlaceEntrance } from '../../data/worldLocations'
import { damp } from '../character/CharacterAnimations'
import { characterSignals } from '../character/characterSignals'
import {
  ROOM_BASE_DISTANCE,
  ROOM_FOV,
  ROOM_POLAR_RANGE,
  ROOM_ZOOM_RANGE,
  roomCollisionDistance,
  roomView,
} from '../project-room/roomSpace'
import { collisionDistance, minCameraHeight } from './cameraCollision'
import {
  BASE_DISTANCE,
  DEFAULT_POLAR,
  MAX_POLAR_ANGLE,
  ORBIT_DAMPING,
  PAN_DAMPING,
  PAN_RECENTER_DAMPING,
  PIVOT_HEIGHT,
  REVEAL_FROM,
  ZOOM_DAMPING,
  clampPolar,
  manualControlBlend,
  mapView,
  revealProgress,
  type CameraMode,
} from './mapNavigation'

/** Upward tilt after aiming at the pivot, so she sits just below frame centre with the streets ahead. */
const FRAME_TILT = 0.082
/** Slight pull-back while walking to a project so the destination stays in frame. */
const WALK_PULLBACK = 1.06
/** How far along the walk the pivot leans toward the destination building. */
const WALK_LEAN = 0.38
/** Door shot: the door frame, seen from slightly off-axis in front of the entrance. */
const DOOR_LOOK_Y = 1.25
/** Ground point framed for the sun, shadows and nearest-lamp choice, ahead of the pivot. */
const FOCUS_AHEAD = 3
/** Lower views come closer (fraction of the orbit distance at the lowest angle), keeping her readable. */
const LOW_ANGLE_DISTANCE = 0.62
/** Indoor view on arrival: from behind her, toward the hero wall. */
const ROOM_ARRIVAL_POLAR = 1.15
/** Indoors the orbit centres a little above her shoulders so the walls stay in frame. */
const ROOM_PIVOT_HEIGHT = 1.45
/** How quickly a flicked orbit dies away. */
const SPIN_DECAY = 3.6
/**
 * On picking a project the view eases round until the building is ahead of her, stopping this
 * far (radians) short of straight behind her so the shot stays three-quarter.
 */
const SELECT_FRAME_OFFSET = 0.55
const SELECT_FRAME_DAMPING = 1.8
/** First soft-follow stage: character → chase point (metres lag while walking). */
const WALK_CHASE_LAMBDA = 2.65
/** Second stage: chase → orbit pivot (catches up without snapping). */
const WALK_PIVOT_LAMBDA = 4.1
const IDLE_FOLLOW_LAMBDA = 6.2
/** Extra lag on camera position only while she is walking outdoors. */
const WALK_CAMERA_LAG = 5.4
const STOP_FOLLOW_LAMBDA = 4.8
/** Composition: a touch more headroom while following on foot. */
const WALK_FRAME_TILT = 0.094

const desiredPivot = new THREE.Vector3()
const desiredCamera = new THREE.Vector3()
const chasePivot = new THREE.Vector3()
const smoothCamera = new THREE.Vector3()

/** Equivalent of `target` within ±π of `current`, so the camera swings the short way round. */
function nearestAngle(current: number, target: number) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current))
}

function orbitPosition(pivot: THREE.Vector3, azimuth: number, polar: number, distance: number, out: THREE.Vector3) {
  const s = Math.sin(polar)
  return out.set(
    pivot.x + Math.sin(azimuth) * s * distance,
    pivot.y + Math.cos(polar) * distance,
    pivot.z + Math.cos(azimuth) * s * distance,
  )
}

/**
 * The world camera: a third-person orbit around Anushri's upper torso. The visitor owns the
 * viewing angle (drag to orbit, wheel / pinch to zoom); the camera follows her position but never
 * swings behind her on its own. Dragging up past the lowest orbit tilts the view into the sky.
 * Selecting a project levels the view and eases it onto the door and back again. Inside a project
 * room the same orbit follows her (or a focused artwork) and stays within the walls.
 */
export function WorldCameraRig() {
  const { camera } = useThree()
  const { character, journeyPhase, pendingProjectSlug, roomProjectSlug, moving, insideRoom } = useWorldState()
  const reduced = useReducedMotion()
  const pivot = useRef<THREE.Vector3 | null>(null)
  const distance = useRef(BASE_DISTANCE)
  const reach = useRef(BASE_DISTANCE)
  const tilt = useRef(FRAME_TILT)
  const wasInside = useRef(insideRoom)
  /** Project the selection glide was set up for, and whether it is still easing. */
  const framed = useRef<{ slug: string | null; gliding: boolean }>({ slug: null, gliding: false })
  const followInit = useRef(false)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const view = mapView
    const phase = journeyPhase
    const entrance = pendingProjectSlug ? getPlaceEntrance(pendingProjectSlug) : null
    const now = performance.now()
    const autoFrame = manualControlBlend(now)

    const frame = framed.current
    if (phase !== 'walking' || !entrance) {
      frame.slug = null
      frame.gliding = false
    } else if (frame.slug !== pendingProjectSlug) {
      frame.slug = pendingProjectSlug
      const ideal = Math.atan2(character.x - entrance.buildingX, character.z - entrance.buildingZ)
      const off = Math.atan2(Math.sin(ideal - view.targetAzimuth), Math.cos(ideal - view.targetAzimuth))
      if (!reduced && autoFrame > 0.4 && Math.abs(off) > SELECT_FRAME_OFFSET) {
        view.targetAzimuth += (off - Math.sign(off) * SELECT_FRAME_OFFSET) * autoFrame
        frame.gliding = true
      }
    }
    if (view.dragging || Math.abs(view.azimuth - view.targetAzimuth) < 0.01) frame.gliding = false

    if (!view.dragging && (view.spinAzimuth || view.spinPolar)) {
      view.targetAzimuth += view.spinAzimuth * delta
      view.targetPolar = clampPolar(view.targetPolar + view.spinPolar * delta)
      const fade = Math.exp(-SPIN_DECAY * delta)
      view.spinAzimuth = Math.abs(view.spinAzimuth * fade) < 0.01 ? 0 : view.spinAzimuth * fade
      view.spinPolar = Math.abs(view.spinPolar * fade) < 0.01 ? 0 : view.spinPolar * fade
    }
    const doorShot = !!entrance && (phase === 'arrived' || phase === 'doorOpening' || phase === 'entering')
    const mode: CameraMode = insideRoom ? 'PROJECT_ROOM' : doorShot ? 'PROJECT_TRANSITION' : 'WORLD'
    view.mode = mode

    // Passing through a doorway (behind the veil) cuts straight to the new place.
    const cut = insideRoom !== wasInside.current
    if (cut) {
      wasInside.current = insideRoom
      view.panX = view.panZ = view.targetPanX = view.targetPanZ = 0
      if (insideRoom) {
        view.azimuth = view.targetAzimuth = 0
        view.polar = view.targetPolar = ROOM_ARRIVAL_POLAR
        view.zoom = view.targetZoom = 1
      } else {
        const left = roomProjectSlug ? getPlaceEntrance(roomProjectSlug) : null
        if (left) view.azimuth = view.targetAzimuth = nearestAngle(view.azimuth, left.doorYaw)
        view.polar = view.targetPolar = DEFAULT_POLAR
        view.zoom = view.targetZoom = 1
      }
    }
    if (mode === 'PROJECT_ROOM') {
      view.targetZoom = THREE.MathUtils.clamp(view.targetZoom, ...ROOM_ZOOM_RANGE)
      view.targetPolar = THREE.MathUtils.clamp(view.targetPolar, ...ROOM_POLAR_RANGE)
    }

    view.zoom = damp(view.zoom, view.targetZoom, reduced ? 20 : ZOOM_DAMPING, delta)
    const reveal = mode === 'WORLD' ? revealProgress(performance.now()) : 1
    if (reveal < 1) view.zoom = THREE.MathUtils.lerp(REVEAL_FROM.zoom, view.targetZoom, reveal)
    const cinematicWalk = mode === 'WORLD' && (moving || characterSignals.walking)
    if (mode !== 'WORLD' || (moving && !view.dragging)) {
      const recenter =
        mode === 'WORLD' ? PAN_RECENTER_DAMPING * (0.22 + 0.78 * autoFrame) * (cinematicWalk ? 0.92 : 1) : 4
      view.targetPanX = damp(view.targetPanX, 0, recenter, delta)
      view.targetPanZ = damp(view.targetPanZ, 0, recenter, delta)
    }
    const panLambda = reduced ? 20 : PAN_DAMPING
    view.panX = damp(view.panX, view.targetPanX, panLambda, delta)
    view.panZ = damp(view.panZ, view.targetPanZ, panLambda, delta)

    if (entrance) view.targetPolar = Math.min(view.targetPolar, MAX_POLAR_ANGLE)
    let azimuth = view.targetAzimuth
    let polar = view.targetPolar
    const lowView = THREE.MathUtils.smoothstep(view.polar, DEFAULT_POLAR, MAX_POLAR_ANGLE)
    let dist = BASE_DISTANCE * view.zoom * THREE.MathUtils.lerp(1, LOW_ANGLE_DISTANCE, lowView)
    let frameTilt = FRAME_TILT * (1 - 0.5 * lowView)
    if (cinematicWalk) frameTilt = THREE.MathUtils.lerp(frameTilt, WALK_FRAME_TILT * (1 - 0.45 * lowView), 0.35)

    if (mode === 'PROJECT_TRANSITION' && entrance) {
      const fx = Math.sin(entrance.doorYaw)
      const fz = Math.cos(entrance.doorYaw)
      const entering = phase === 'entering'
      const back = entering ? 2.6 : 6.4
      const up = (entering ? 2 : 3.3) - DOOR_LOOK_Y
      const ox = fx * back + fz * 0.5
      const oz = fz * back - fx * 0.5
      const horizontal = Math.hypot(ox, oz)
      desiredPivot.set(entrance.x - fx * 1.1, DOOR_LOOK_Y, entrance.z - fz * 1.1)
      azimuth = nearestAngle(view.azimuth, Math.atan2(ox, oz))
      polar = Math.atan2(horizontal, up)
      dist = Math.hypot(horizontal, up)
      frameTilt = 0
    } else if (mode === 'PROJECT_ROOM') {
      if (phase === 'exiting') view.targetAzimuth = azimuth = nearestAngle(view.azimuth, Math.PI)
      const focus = roomView.focus
      if (focus) {
        desiredPivot.set(focus.x, focus.y, focus.z)
        dist = focus.distance * view.zoom
        frameTilt = 0
      } else {
        const fresh = cut || !characterSignals.present
        desiredPivot.set(fresh ? character.x : characterSignals.x, ROOM_PIVOT_HEIGHT, fresh ? character.z : characterSignals.z)
        dist = ROOM_BASE_DISTANCE * view.zoom
        frameTilt = 0.1
      }
    } else {
      const present = characterSignals.present && !cut
      desiredPivot.set(present ? characterSignals.x : character.x, PIVOT_HEIGHT, present ? characterSignals.z : character.z)
      if (entrance && phase === 'walking') {
        desiredPivot.x = THREE.MathUtils.lerp(desiredPivot.x, entrance.buildingX, WALK_LEAN)
        desiredPivot.z = THREE.MathUtils.lerp(desiredPivot.z, entrance.buildingZ, WALK_LEAN)
        dist *= WALK_PULLBACK
      }
      desiredPivot.x += view.panX
      desiredPivot.z += view.panZ
    }

    const transition = mode === 'PROJECT_TRANSITION'
    const room = mode === 'PROJECT_ROOM'
    const orbitLambda = reduced
      ? 30
      : transition
        ? 2.6
        : view.dragging
          ? 14
          : room
            ? 4.5
            : frame.gliding && autoFrame > 0.35
              ? SELECT_FRAME_DAMPING * (0.35 + 0.65 * autoFrame)
              : ORBIT_DAMPING
    const settling = mode === 'WORLD' && !cinematicWalk && !moving && characterSignals.present
    const chaseLambda = reduced
      ? 30
      : transition
        ? 2.8
        : room
          ? 4
          : cinematicWalk
            ? WALK_CHASE_LAMBDA
            : settling
              ? STOP_FOLLOW_LAMBDA
              : IDLE_FOLLOW_LAMBDA
    const pivotLambda = reduced
      ? 30
      : transition
        ? 2.8
        : room
          ? 4
          : cinematicWalk
            ? WALK_PIVOT_LAMBDA
            : settling
              ? STOP_FOLLOW_LAMBDA
              : IDLE_FOLLOW_LAMBDA
    view.azimuth = damp(view.azimuth, azimuth, orbitLambda, delta)
    view.polar = damp(view.polar, polar, orbitLambda, delta)
    if (reveal < 1) {
      view.azimuth = THREE.MathUtils.lerp(REVEAL_FROM.azimuth, azimuth, reveal)
      view.polar = THREE.MathUtils.lerp(REVEAL_FROM.polar, polar, reveal)
    }
    distance.current = damp(distance.current, dist, reduced ? 30 : transition ? 2.8 : room ? 4 : 9, delta)
    tilt.current = damp(tilt.current, frameTilt, 3, delta)

    if (!pivot.current) {
      pivot.current = desiredPivot.clone()
      chasePivot.copy(desiredPivot)
      followInit.current = false
    }
    const p = pivot.current
    chasePivot.x = damp(chasePivot.x, desiredPivot.x, chaseLambda, delta)
    chasePivot.y = damp(chasePivot.y, desiredPivot.y, chaseLambda, delta)
    chasePivot.z = damp(chasePivot.z, desiredPivot.z, chaseLambda, delta)
    p.x = damp(p.x, chasePivot.x, pivotLambda, delta)
    p.y = damp(p.y, chasePivot.y, pivotLambda, delta)
    p.z = damp(p.z, chasePivot.z, pivotLambda, delta)
    if (cut) {
      chasePivot.copy(desiredPivot)
      p.copy(desiredPivot)
      followInit.current = false
      view.azimuth = azimuth
      view.polar = polar
      distance.current = dist
      tilt.current = frameTilt
    }

    const orbitPolar = Math.min(view.polar, MAX_POLAR_ANGLE)
    const lookUp = Math.max(0, view.polar - MAX_POLAR_ANGLE)
    orbitPosition(p, view.azimuth, orbitPolar, distance.current, desiredCamera)
    const clear =
      mode === 'WORLD' ? collisionDistance(p, desiredCamera) : room ? roomCollisionDistance(p, desiredCamera) : distance.current
    if (cut) reach.current = clear
    else reach.current = clear < reach.current ? damp(reach.current, clear, 25, delta) : damp(reach.current, clear, 3, delta)
    orbitPosition(p, view.azimuth, orbitPolar, Math.min(distance.current, reach.current), desiredCamera)
    desiredCamera.y = Math.max(desiredCamera.y, minCameraHeight(desiredCamera.x, desiredCamera.z))
    if (cut || !followInit.current) {
      smoothCamera.copy(desiredCamera)
      followInit.current = true
    }
    const camLag = reduced
      ? 30
      : view.dragging
        ? 18
        : cinematicWalk
          ? WALK_CAMERA_LAG
          : settling
            ? 7.5
            : 12
    smoothCamera.x = damp(smoothCamera.x, desiredCamera.x, camLag, delta)
    smoothCamera.y = damp(smoothCamera.y, desiredCamera.y, camLag, delta)
    smoothCamera.z = damp(smoothCamera.z, desiredCamera.z, camLag, delta)
    camera.position.copy(smoothCamera)
    camera.lookAt(p)
    camera.rotateX(tilt.current + lookUp)

    view.focusX = p.x - Math.sin(view.azimuth) * FOCUS_AHEAD
    view.focusZ = p.z - Math.cos(view.azimuth) * FOCUS_AHEAD

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = room ? ROOM_FOV : phase === 'entering' ? 34 : phase === 'doorOpening' ? 36 : 38
      camera.fov = cut ? targetFov : damp(camera.fov, targetFov, 3, delta)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
