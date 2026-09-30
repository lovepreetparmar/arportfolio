import type { MapImage, Project } from '../../data/projects'
import { useCursor } from '../../context/CursorContext'

type MapArtworkProps = {
  project: Project
  image: MapImage
  index: number
  detail: boolean
  onOpen: (project: Project, imageIndex: number) => void
}

export function MapArtwork({ project, image, index, detail, onOpen }: MapArtworkProps) {
  const { setMode } = useCursor()

  return (
    <button
      type="button"
      className="group absolute origin-center transition-transform duration-300 hover:z-20 hover:scale-[1.04]"
      style={{
        left: image.x,
        top: image.y,
        width: image.w,
        transform: `rotate(${image.rotate ?? 0}deg)`,
      }}
      onClick={() => onOpen(project, index)}
      onMouseEnter={() => setMode('project', 'View')}
      onMouseLeave={() => setMode('default')}
      aria-label={`Open ${project.title} image ${index + 1}`}
    >
      <img
        src={image.src}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-full shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]"
      />
      {detail && (
        <span className="pointer-events-none absolute -bottom-8 left-0 text-[10px] tracking-[0.2em] uppercase opacity-0 transition-opacity group-hover:opacity-100">
          {project.title} — {String(index + 1).padStart(2, '0')} / {String(project.mapImages.length).padStart(2, '0')}
        </span>
      )}
    </button>
  )
}
