import type { ThreeEvent } from '@react-three/fiber'
import { useWorldState } from '../../context/WorldStateContext'
import { walkAround } from '../../data/worldPaths'
import { wasDrag } from './mapNavigation'

/** Invisible click plane: a click walks the character there; drags are left to map panning. */
export function WorldGround() {
  const { setTarget, setPointer, characterRef, routeRef, insideRoom } = useWorldState()

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (wasDrag(e) || insideRoom) return
    const [first, ...rest] = walkAround(characterRef.current, { x: e.point.x, z: e.point.z })
    setTarget(first)
    routeRef.current = rest
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const nx = (e.nativeEvent.clientX / window.innerWidth) * 2 - 1
    const ny = -(e.nativeEvent.clientY / window.innerHeight) * 2 + 1
    setPointer({ x: nx, y: ny })
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onClick={onClick} onPointerMove={onPointerMove}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial visible={false} />
    </mesh>
  )
}
