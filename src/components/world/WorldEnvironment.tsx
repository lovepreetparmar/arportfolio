import { Grid } from '@react-three/drei'
import { useWorldState } from '../../context/WorldStateContext'
import { territoryMood } from '../../data/world3d'

export function WorldEnvironment() {
  const { activeTerritory, accentColor } = useWorldState()
  const mood = territoryMood[activeTerritory] ?? territoryMood.branding

  return (
    <>
      <color attach="background" args={[mood.fog]} />
      <fog attach="fog" args={[mood.fog, 8, 32]} />
      <ambientLight intensity={mood.ambient} />
      <directionalLight position={[5, 11, 6]} intensity={0.48} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 5, -2]} intensity={0.18} />
      <pointLight position={[0, 3, -6]} intensity={0.12} color={accentColor} distance={18} />
      <Grid
        infiniteGrid
        fadeDistance={22}
        fadeStrength={1.8}
        cellSize={0.55}
        sectionSize={4}
        cellColor="#d8d4cc"
        sectionColor="#ccc7be"
        cellThickness={0.35}
        sectionThickness={0.6}
        position={[0, 0, 0]}
      />
    </>
  )
}
