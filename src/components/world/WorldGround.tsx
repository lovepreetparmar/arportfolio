import { useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useWorldState } from '../../context/WorldStateContext'

const DRAG_THRESHOLD_PX = 6

export function WorldGround() {
  const { setNavigationTarget, setPointer } = useWorldState()
  const pointerDown = useRef<{ x: number; y: number } | null>(null)
  const clickPoint = useRef(new THREE.Vector3())
  const { gl } = useThree()

  const onPointerDown = (e: THREE.Event & { point: THREE.Vector3; nativeEvent: PointerEvent }) => {
    pointerDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    clickPoint.current.copy(e.point)
    gl.domElement.setPointerCapture(e.nativeEvent.pointerId)
  }

  const onPointerMove = (e: THREE.Event & { nativeEvent: PointerEvent }) => {
    const nx = (e.nativeEvent.clientX / window.innerWidth) * 2 - 1
    const ny = -(e.nativeEvent.clientY / window.innerHeight) * 2 + 1
    setPointer({ x: nx, y: ny })
  }

  const onPointerUp = (e: THREE.Event & { nativeEvent: PointerEvent }) => {
    gl.domElement.releasePointerCapture(e.nativeEvent.pointerId)
    const start = pointerDown.current
    pointerDown.current = null
    if (!start) return
    const dx = e.nativeEvent.clientX - start.x
    const dy = e.nativeEvent.clientY - start.y
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
      setNavigationTarget({ x: clickPoint.current.x, y: 0, z: clickPoint.current.z }, 'click')
    }
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial visible={false} />
    </mesh>
  )
}
