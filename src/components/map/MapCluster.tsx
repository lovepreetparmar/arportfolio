import type { Project } from '../../data/projects'
import { MapArtwork } from './MapArtwork'

type MapClusterProps = {
  project: Project
  zoom: number
  onOpen: (project: Project, imageIndex: number) => void
}

export function MapCluster({ project, zoom, onOpen }: MapClusterProps) {
  const far = zoom < 0.32
  const mid = zoom >= 0.32 && zoom < 0.58
  const close = zoom >= 0.58
  const images = far ? project.mapImages.slice(0, 1) : mid ? project.mapImages.slice(0, 3) : project.mapImages

  return (
    <div
      className="absolute"
      style={{
        left: project.position.x,
        top: project.position.y,
        transform: `scale(${project.scale})`,
      }}
    >
      <div className="relative mb-4 max-w-[520px]">
        <p className="text-[10px] tracking-[0.35em] uppercase opacity-60">{project.number}</p>
        <h3
          className="mt-1 font-semibold uppercase tracking-tight"
          style={{ fontSize: far ? 14 : close ? 22 : 18 }}
        >
          {far ? project.category.split(' ')[0] : project.title}
        </h3>
        {!far && <p className="mt-1 text-xs opacity-50">{project.category}</p>}
      </div>
      <div className="relative h-[520px] w-[720px]">
        {images.map((img, i) => (
          <MapArtwork
            key={`${img.src}-${i}`}
            project={project}
            image={img}
            index={i}
            detail={close}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}
