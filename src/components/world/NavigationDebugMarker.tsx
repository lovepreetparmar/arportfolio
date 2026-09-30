import { useWorldState } from '../../context/WorldStateContext'

export function NavigationDebugMarker() {
  const { destinationMarker } = useWorldState()
  if (!import.meta.env.DEV || !destinationMarker) return null

  return (
    <group position={[destinationMarker.x, 0.05, destinationMarker.z]}>
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#e85c2a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.35, 32]} />
        <meshBasicMaterial color="#e8784a" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.04]} />
        <meshBasicMaterial color="#e8784a" />
      </mesh>
    </group>
  )
}
