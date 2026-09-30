import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '../../../context/CursorContext'
import { BENCH_SEAT_HEIGHT, type BenchSpot } from '../../../data/worldBenches'
import { wasDrag } from '../mapNavigation'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'

const SLAT = 0.045
const SEAT_Y = BENCH_SEAT_HEIGHT - SLAT / 2

type BenchProps = {
  bench: BenchSpot
  onSelect?: (id: string) => void
}

/** Slatted park bench; its front (local +z) is the side you sit facing. */
export function Bench({ bench, onSelect }: BenchProps) {
  const { setMode } = useCursor()
  const wood = worldMat(WORLD_PALETTE.wood, 0.8)
  const dark = worldMat(WORLD_PALETTE.lampMetal, 0.45, 0.45)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag(e) || !onSelect) return
    onSelect(bench.id)
  }

  return (
    <group
      position={[bench.x, 0, bench.z]}
      rotation={[0, bench.rot, 0]}
      onClick={onClick}
      onPointerOver={(e) => {
        if (!onSelect) return
        e.stopPropagation()
        setMode('project', 'Sit')
      }}
      onPointerOut={() => {
        if (!onSelect) return
        setMode('default')
      }}
    >
      {[-0.13, 0, 0.13].map((z) => (
        <mesh key={z} position={[0, SEAT_Y, z]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[1.3, SLAT, 0.11]} />
        </mesh>
      ))}
      {[0.55, 0.69].map((y) => (
        <mesh key={y} position={[0, y, -0.205]} rotation={[-0.12, 0, 0]} material={wood} castShadow>
          <boxGeometry args={[1.3, 0.1, 0.035]} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (SEAT_Y - SLAT / 2) / 2, 0]} material={dark} castShadow>
            <boxGeometry args={[0.05, SEAT_Y - SLAT / 2, 0.42]} />
          </mesh>
          <mesh position={[0, 0.56, -0.215]} rotation={[-0.12, 0, 0]} material={dark} castShadow>
            <boxGeometry args={[0.045, 0.38, 0.04]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
