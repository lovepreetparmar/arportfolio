import { WORLD } from '../../data/mapLayout'
import { projects } from '../../data/projects'
import { useMapCamera } from '../../context/MapCameraContext'

export function MiniMap() {
  const { camera, animateTo } = useMapCamera()
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const viewW = (vw / camera.zoom / WORLD.width) * 100
  const viewH = (vh / camera.zoom / WORLD.height) * 100
  const viewL = (camera.x / WORLD.width) * 100
  const viewT = (camera.y / WORLD.height) * 100

  return (
    <div className="pointer-events-auto w-36 rounded-sm border border-ink/15 bg-canvas/80 p-2 backdrop-blur-sm">
      <div className="relative aspect-[3/2] w-full bg-ink/5">
        {projects.map((p) => (
          <button
            key={p.slug}
            type="button"
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/50"
            style={{
              left: `${(p.position.x / WORLD.width) * 100}%`,
              top: `${(p.position.y / WORLD.height) * 100}%`,
            }}
            onClick={() =>
              animateTo({ x: p.position.x - vw / 2 / 0.55, y: p.position.y - vh / 2 / 0.55, zoom: 0.55 })
            }
            aria-label={p.title}
          />
        ))}
        <div
          className="absolute border border-ink/70"
          style={{
            left: `${viewL}%`,
            top: `${viewT}%`,
            width: `${viewW}%`,
            height: `${viewH}%`,
          }}
        />
      </div>
    </div>
  )
}
