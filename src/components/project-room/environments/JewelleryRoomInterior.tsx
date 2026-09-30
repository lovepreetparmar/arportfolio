import { motion } from 'framer-motion'
import type { Project } from '../../../data/projects'
import type { ProjectGalleryItem, ProjectWorldConfig } from '../../../data/projectWorld'

type JewelleryRoomInteriorProps = {
  project: Project
  config: ProjectWorldConfig
  onOpenImage: (index: number) => void
  onExit: () => void
}

function placementClass(placement: ProjectGalleryItem['placement']): string {
  switch (placement) {
    case 'wall-left':
      return 'md:col-start-1 md:row-start-2'
    case 'wall-right':
      return 'md:col-start-3 md:row-start-2'
    case 'display':
      return 'md:col-start-2 md:row-start-1'
    case 'board':
      return 'md:col-start-1 md:row-start-3'
    default:
      return 'md:col-start-2 md:row-start-3'
  }
}

export function JewelleryRoomInterior({ project, config, onOpenImage, onExit }: JewelleryRoomInteriorProps) {
  const accent = config.environment.interiorAccent

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col text-[#f5f0e8]"
      style={{ background: config.environment.interiorBackground }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.25), transparent 60%)',
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-start justify-between gap-4 p-5 md:p-8">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: accent }}>
            {config.environment.exteriorLabel}
          </p>
          <h1 className="mt-2 font-serif text-2xl tracking-tight md:text-4xl">{project.title}</h1>
          <p className="mt-1 text-xs tracking-[0.2em] uppercase text-white/50">{project.category}</p>
        </div>
        <button
          type="button"
          className="shrink-0 border border-white/20 px-4 py-2 text-[10px] tracking-[0.25em] uppercase transition-colors hover:border-white/50"
          onClick={onExit}
          aria-label="Exit project room and return to world"
        >
          Exit
        </button>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-5 pb-28 pt-4 md:grid-cols-3 md:grid-rows-3 md:gap-8 md:px-8">
        {config.gallery.map((item, i) => (
          <motion.button
            key={item.src}
            type="button"
            className={`group relative overflow-hidden rounded-sm border border-white/10 bg-black/20 text-left ${placementClass(item.placement)}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.5 }}
            onClick={() => onOpenImage(i)}
            aria-label={`View ${item.title ?? 'project image'}`}
          >
            <div className="aspect-[4/3] w-full overflow-hidden md:aspect-auto md:h-full md:min-h-[140px]">
              <img
                src={item.src}
                alt={item.title ?? project.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/70">{item.type ?? 'work'}</p>
              {item.title && <p className="text-sm font-medium">{item.title}</p>}
            </div>
            <span
              className="pointer-events-none absolute left-3 top-3 h-2 w-2 rounded-full opacity-80"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          </motion.button>
        ))}

        <aside
          className="md:col-start-3 md:row-start-1 rounded-sm border border-white/10 bg-black/25 p-5 backdrop-blur-sm"
        >
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/45">About</p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            {config.meta?.about ?? project.description ?? project.category}
          </p>
          <dl className="mt-6 space-y-3 text-xs">
            {config.meta?.role && (
              <div>
                <dt className="tracking-[0.2em] uppercase text-white/40">Role</dt>
                <dd className="mt-1">{config.meta.role}</dd>
              </div>
            )}
            {config.meta?.year && (
              <div>
                <dt className="tracking-[0.2em] uppercase text-white/40">Year</dt>
                <dd className="mt-1">{config.meta.year}</dd>
              </div>
            )}
            {config.meta?.tools && config.meta.tools.length > 0 && (
              <div>
                <dt className="tracking-[0.2em] uppercase text-white/40">Tools</dt>
                <dd className="mt-1">{config.meta.tools.join(' · ')}</dd>
              </div>
            )}
          </dl>
          <a
            href={project.behanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-[10px] tracking-[0.2em] uppercase underline decoration-white/30"
          >
            View on Behance ↗
          </a>
        </aside>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-center">
        <p className="text-[9px] tracking-[0.3em] uppercase text-white/35">Tap a display to enlarge</p>
      </div>

      <button
        type="button"
        className="absolute bottom-6 right-5 z-20 flex items-center gap-2 border border-white/15 bg-black/30 px-4 py-3 text-[10px] tracking-[0.25em] uppercase backdrop-blur-sm md:right-8"
        onClick={onExit}
        aria-label="Exit through door"
      >
        <span className="inline-block h-8 w-1 rounded-full bg-white/30" aria-hidden />
        Exit door
      </button>
    </div>
  )
}
