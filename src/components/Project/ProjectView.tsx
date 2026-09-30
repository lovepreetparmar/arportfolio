import { useEffect } from 'react'
import { getNextProject, getProjectBySlug } from '../../data/projects'
import { site } from '../../data/site'

type ProjectViewProps = {
  slug: string
  onClose: () => void
  onNextTerritory: (slug: string) => void
}

export function ProjectView({ slug, onClose, onNextTerritory }: ProjectViewProps) {
  const project = getProjectBySlug(slug)
  const next = getNextProject(slug)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!project) return null

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#f7f5f1]">
      <div className="mx-auto max-w-[1800px] px-5 py-8 md:px-10">
        <button type="button" className="text-xs tracking-[0.25em] uppercase" onClick={onClose}>
          ← Return to map
        </button>
        <header className="mt-10">
          <p className="text-xs tracking-[0.3em] uppercase text-muted">{project.category}</p>
          <h1 className="mt-4 text-[clamp(2rem,7vw,5rem)] font-semibold tracking-tight">{project.title}</h1>
        </header>
        <div className="mt-12 space-y-16 md:space-y-24">
          {project.images.map((src, i) => (
            <figure key={src} className={i % 2 === 1 ? 'ml-auto max-w-4xl md:mr-[10%]' : 'max-w-5xl'}>
              <img src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="w-full object-contain" />
            </figure>
          ))}
        </div>
        <p className="mt-12 max-w-2xl font-serif text-xl leading-relaxed">
          {project.description ?? 'Work from Anushri Raina’s Behance portfolio.'}
        </p>
        <a
          href={project.behanceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block text-xs tracking-[0.2em] uppercase underline"
        >
          Behance ↗
        </a>
        <div className="mt-16 flex flex-wrap gap-8 border-t border-line pt-10 text-xs tracking-[0.2em] uppercase">
          <button type="button" onClick={onClose}>← Return to map</button>
          {next && (
            <button type="button" onClick={() => onNextTerritory(next.slug)}>
              Next territory → {next.title}
            </button>
          )}
        </div>
        <p className="mt-12 pb-20 text-sm text-muted">
          <a href={site.behance}>Behance</a> · <a href={site.linkedin}>LinkedIn</a>
        </p>
      </div>
    </div>
  )
}
