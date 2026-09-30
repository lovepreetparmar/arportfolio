import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion, useIsTouchDevice } from '../../hooks/useMediaQuery'

const CAM_HEIGHT = 2.35
const CAM_DISTANCE = 5.8

export function WorldCameraRig() {
  const { camera } = useThree()
  const { characterRef, targetRef, moving, pointer } = useWorldState()
  const reduced = useReducedMotion()
  const isTouch = useIsTouchDevice()
  const desiredPos = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())

  useFrame(() => {
    const follow = reduced ? 0.32 : 0.2
    const char = characterRef.current
    const target = targetRef.current

    const aheadX = moving ? THREE.MathUtils.lerp(char.x, target.x, 0.35) : char.x
    const aheadZ = moving ? THREE.MathUtils.lerp(char.z, target.z, 0.35) : char.z

    desiredPos.current.set(char.x - 0.4, CAM_HEIGHT, char.z + CAM_DISTANCE)
    camera.position.lerp(desiredPos.current, follow)

    look.current.set(aheadX, 1.15, aheadZ - 2)

    if (!reduced && !isTouch) {
      look.current.x += pointer.x * 0.22
      look.current.y += pointer.y * 0.1
    }

    camera.lookAt(look.current)

    if (!reduced && !isTouch) {
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -pointer.x * 0.012, 0.05)
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 38, 0.04)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
