import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion, useIsTouchDevice } from '../../hooks/useMediaQuery'
import { getProjectBySlug } from '../../data/projects'
import { getProjectEntrance } from '../../data/projectWorld'
import { ARCHETYPE_FOOTPRINT, worldProjectSlots } from '../../data/worldLayout'
import { damp } from '../character/CharacterAnimations'
import {
  PAN_DAMPING,
  PAN_RECENTER_DAMPING,
  ROOF_CLEARANCE_HEIGHT,
  ROOF_CLEARANCE_MARGIN,
  ZOOM_DAMPING,
  mapView,
} from './mapNavigation'

/** Elevated three-quarter view: high enough to read paths and neighbouring buildings. */
const CAM_HEIGHT = 7.4
const CAM_DISTANCE = 11
const LOOK_AHEAD = 3
const LOOK_Y = 0.9
const MIN_CAMERA_Y = 1.4

const ROOF_ZONES = worldProjectSlots.map((s) => {
  const fp = ARCHETYPE_FOOTPRINT[s.archetype]
  return {
    x: s.position.x,
    z: s.position.z,
    cos: Math.cos(s.rotation),
    sin: Math.sin(s.rotation),
    hw: fp.width / 2 + ROOF_CLEARANCE_MARGIN,
    hd: fp.depth / 2 + ROOF_CLEARANCE_MARGIN,
  }
})

/** Lowest camera height allowed at (x, z) so it never dips into a building. */
function minCameraHeight(x: number, z: number) {
  for (const r of ROOF_ZONES) {
    const dx = x - r.x
    const dz = z - r.z
    const lx = dx * r.cos - dz * r.sin
    const lz = dx * r.sin + dz * r.cos
    if (Math.abs(lx) < r.hw && Math.abs(lz) < r.hd) return ROOF_CLEARANCE_HEIGHT
  }
  return MIN_CAMERA_Y
}

export function WorldCameraRig() {
  const { camera } = useThree()
  const { character, pointer, journeyPhase, pendingProjectSlug, moving } = useWorldState()
  const reduced = useReducedMotion()
  const isTouch = useIsTouchDevice()
  const desiredPos = useRef(new THREE.Vector3())
  const desiredLook = useRef(new THREE.Vector3())
  const look = useRef<THREE.Vector3 | null>(null)

  useFrame((_, delta) => {
    const project = pendingProjectSlug ? getProjectBySlug(pendingProjectSlug) : undefined
    const entrance = project ? getProjectEntrance(project) : null
    const phase = journeyPhase
    const doorShot = !!entrance && (phase === 'arrived' || phase === 'doorOpening' || phase === 'entering')
    const view = mapView

    view.zoom = damp(view.zoom, view.targetZoom, reduced ? 20 : ZOOM_DAMPING, delta)
    if (doorShot || phase !== 'world' || (moving && !view.dragging)) {
      const recenter = doorShot ? 4 : PAN_RECENTER_DAMPING
      view.targetPanX = damp(view.targetPanX, 0, recenter, delta)
      view.targetPanZ = damp(view.targetPanZ, 0, recenter, delta)
    }
    const panLambda = reduced ? 20 : PAN_DAMPING
    view.panX = damp(view.panX, view.targetPanX, panLambda, delta)
    view.panZ = damp(view.panZ, view.targetPanZ, panLambda, delta)

    const zoom = view.zoom
    if (entrance && doorShot) {
      const fx = Math.sin(entrance.doorYaw)
      const fz = Math.cos(entrance.doorYaw)
      const doorX = entrance.x - fx * 1.1
      const doorZ = entrance.z - fz * 1.1
      const back = phase === 'entering' ? 2.6 : 6.4
      const up = phase === 'entering' ? 2 : 3.3
      desiredPos.current.set(doorX + fx * back + fz * 0.5, up, doorZ + fz * back - fx * 0.5)
      desiredLook.current.set(doorX, 1.25, doorZ)
    } else {
      let fx = character.x
      let fz = character.z
      let height = CAM_HEIGHT
      let distance = CAM_DISTANCE
      let ahead = LOOK_AHEAD
      if (entrance && phase === 'walking') {
        fx = THREE.MathUtils.lerp(character.x, entrance.buildingX, 0.38)
        fz = THREE.MathUtils.lerp(character.z, entrance.buildingZ, 0.38)
        height += 0.6
        distance += 0.8
        ahead *= 0.5
      }
      fx += view.panX
      fz += view.panZ
      desiredPos.current.set(fx, height * zoom, fz + distance * zoom)
      desiredLook.current.set(fx, LOOK_Y, fz - ahead * Math.min(1, zoom))

      if (!reduced && !isTouch && phase === 'world' && !view.dragging) {
        desiredPos.current.x += pointer.x * 0.35
        desiredPos.current.y += pointer.y * 0.18
      }
      desiredPos.current.y = Math.max(desiredPos.current.y, minCameraHeight(desiredPos.current.x, desiredPos.current.z))
    }

    const lambda = reduced ? 20 : phase === 'walking' ? 2.2 : phase === 'world' ? (view.dragging ? 10 : 4) : 3
    camera.position.x = damp(camera.position.x, desiredPos.current.x, lambda, delta)
    camera.position.y = damp(camera.position.y, desiredPos.current.y, lambda, delta)
    camera.position.z = damp(camera.position.z, desiredPos.current.z, lambda, delta)

    if (!look.current) look.current = desiredLook.current.clone()
    look.current.x = damp(look.current.x, desiredLook.current.x, lambda * 1.3, delta)
    look.current.y = damp(look.current.y, desiredLook.current.y, lambda * 1.3, delta)
    look.current.z = damp(look.current.z, desiredLook.current.z, lambda * 1.3, delta)
    camera.lookAt(look.current)
    view.focusX = look.current.x
    view.focusZ = look.current.z

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = phase === 'entering' ? 34 : phase === 'doorOpening' ? 36 : 38
      camera.fov = damp(camera.fov, targetFov, 3, delta)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
