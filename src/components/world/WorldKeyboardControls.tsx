import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'
import { useCharacterKeyboard } from '../character/useCharacterKeyboard'
import { clearRoomFocus, constrainToRoom } from '../project-room/roomSpace'

const FORWARD = ['w', 'arrowup']
const BACK = ['s', 'arrowdown']
const LEFT = ['a', 'arrowleft']
const RIGHT = ['d', 'arrowright']
const STEP_AHEAD = 0.9
/** On release she carries on this far and eases to a stop instead of halting mid-stride. */
const SETTLE = 0.3

const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)

/** WASD / arrow keys steer the character relative to the camera, in the world and inside a project room. */
export function WorldKeyboardControls() {
  const keys = useCharacterKeyboard()
  const { camera } = useThree()
  const { character, setTarget, journeyPhase, insideRoom } = useWorldState()
  const steering = useRef(false)
  const lastDir = useRef({ x: 0, z: 0 })

  useFrame(() => {
    const pressed = keys.current
    const any = (list: string[]) => list.some((k) => pressed.has(k))
    const ix = (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0)
    const iz = (any(FORWARD) ? 1 : 0) - (any(BACK) ? 1 : 0)
    const outdoor =
      !insideRoom &&
      (journeyPhase === 'world' ||
        journeyPhase === 'walking' ||
        journeyPhase === 'arrived' ||
        journeyPhase === 'exiting')
    const free = outdoor || (journeyPhase === 'inRoom' && insideRoom)

    if (!free || (ix === 0 && iz === 0)) {
      if (steering.current) {
        steering.current = false
        // A journey that took over owns her target; only a released key settles her where she is.
        if (free) {
          let sx = character.x + lastDir.current.x * SETTLE
          let sz = character.z + lastDir.current.z * SETTLE
          if (insideRoom) [sx, sz] = constrainToRoom(sx, sz)
          setTarget({ x: sx, y: 0, z: sz })
        }
      }
      return
    }

    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, up).normalize()
    const dx = forward.x * iz + right.x * ix
    const dz = forward.z * iz + right.z * ix
    const len = Math.hypot(dx, dz) || 1
    steering.current = true
    lastDir.current = { x: dx / len, z: dz / len }
    let tx = character.x + (dx / len) * STEP_AHEAD
    let tz = character.z + (dz / len) * STEP_AHEAD
    if (insideRoom) {
      clearRoomFocus()
      ;[tx, tz] = constrainToRoom(tx, tz)
    }
    setTarget({ x: tx, y: 0, z: tz })
  })

  return null
}
