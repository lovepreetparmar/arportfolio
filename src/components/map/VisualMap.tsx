import { useRef, useMemo } from 'react'
import { WORLD, mapLabels, centralLandmark, aboutLandmark, contactLandmark } from '../../data/mapLayout'
import { projects } from '../../data/projects'
import { useMapCamera } from '../../context/MapCameraContext'
import { usePanZoom } from '../../hooks/usePanZoom'
import { MapCluster } from './MapCluster'
import { site } from '../../data/site'

type VisualMapProps = {
  onOpenProject: (slug: string, imageIndex: number) => void
}

export function VisualMap({ onOpenProject }: VisualMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const { camera } = useMapCamera()
  usePanZoom(viewportRef)

  const visible = useMemo(() => {
    const vw = window.innerWidth / camera.zoom
    const vh = window.innerHeight / camera.zoom
    const margin = 800
    return projects.filter(
      (p) =>
        p.position.x > camera.x - margin &&
        p.position.x < camera.x + vw + margin &&
        p.position.y > camera.y - margin &&
        p.position.y < camera.y + vh + margin,
    )
  }, [camera.x, camera.y, camera.zoom])

  return (
    <div ref={viewportRef} className="fixed inset-0 touch-none overflow-hidden bg-[#ece8e1] grain">
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: WORLD.width,
          height: WORLD.height,
          transform: `translate(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '120px 120px',
          }}
          aria-hidden
        />

        {mapLabels.map((label) => (
          <p
            key={label.text}
            className="pointer-events-none absolute font-semibold uppercase tracking-[0.35em] text-ink/25"
            style={{
              left: label.x,
              top: label.y,
              fontSize: label.size === 'lg' ? 56 : label.size === 'md' ? 40 : 28,
            }}
          >
            {label.text}
          </p>
        ))}

        <div
          className="pointer-events-none absolute"
          style={{ left: centralLandmark.x, top: centralLandmark.y }}
        >
          <p className="text-6xl font-bold tracking-tight md:text-8xl">{centralLandmark.title.split(' ')[0]}</p>
          <p className="ml-[18%] text-5xl font-bold tracking-tight opacity-70 md:text-7xl">
            {centralLandmark.title.split(' ')[1]}
          </p>
          <p className="mt-4 text-xs tracking-[0.35em] uppercase">{centralLandmark.subtitle}</p>
        </div>

        <button
          type="button"
          className="absolute text-left"
          style={{ left: aboutLandmark.x, top: aboutLandmark.y, width: 220 }}
          onClick={() => onOpenProject('__about__', 0)}
        >
          <img src={aboutLandmark.portrait} alt="Anushri Raina" className="w-full grayscale" />
        </button>

        {visible.map((project) => (
          <MapCluster
            key={project.slug}
            project={project}
            zoom={camera.zoom}
            onOpen={(p, i) => onOpenProject(p.slug, i)}
          />
        ))}

        <div
          className="absolute"
          style={{ left: contactLandmark.x, top: contactLandmark.y }}
        >
          <p className="text-5xl font-bold leading-none">LET&apos;S</p>
          <p className="text-5xl font-bold leading-none">MAKE</p>
          <p className="text-5xl font-bold leading-none opacity-70">SOMETHING</p>
          <div className="mt-8 space-y-2 text-xs tracking-[0.25em] uppercase">
            {site.email && <a href={`mailto:${site.email}`}>Email</a>}
            <a href={site.behance} target="_blank" rel="noopener noreferrer">Behance</a>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
    </div>
  )
}
