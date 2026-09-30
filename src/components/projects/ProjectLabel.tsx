import type { Project } from '../../data/projects'
import type { WorldTier } from '../../data/worldLayout'

type ProjectLabelProps = {
  project: Project
  tier: WorldTier
  mode: 'none' | 'hint' | 'title' | 'full'
}

export function ProjectLabel({ project, tier, mode }: ProjectLabelProps) {
  if (mode === 'none') return null

  const titleLines = project.title.split(/\s*\|\s*|\s+/).filter(Boolean)
  const mainTitle = titleLines.length > 2 ? titleLines.slice(0, 2) : [project.title]

  if (mode === 'hint') {
    return (
      <div className="pointer-events-none select-none text-[9px] tracking-[0.28em] uppercase text-ink/45">
        {project.number} — {project.category}
      </div>
    )
  }

  if (mode === 'title') {
    return (
      <div className="pointer-events-none select-none text-ink/80">
        <p className="text-[10px] tracking-[0.35em] text-ink/50">{project.number}</p>
        {tier === 'hero' ? (
          <div className="mt-1 text-lg font-semibold leading-[1.05] tracking-tight md:text-2xl">
            {mainTitle.map((line) => (
              <p key={line}>{line.toUpperCase()}</p>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs tracking-[0.2em] uppercase">{project.title}</p>
        )}
      </div>
    )
  }

  return (
    <div className="pointer-events-none select-none text-ink/85">
      <p className="text-[10px] tracking-[0.35em] text-ink/50">{project.number}</p>
      <div className="mt-1 text-xl font-semibold leading-[1.05] tracking-tight">
        {mainTitle.map((line) => (
          <p key={line}>{line.toUpperCase()}</p>
        ))}
      </div>
      <p className="mt-2 text-[10px] tracking-[0.25em] uppercase text-ink/55">{project.category}</p>
      <p className="mt-3 text-[9px] tracking-[0.3em] uppercase text-ink/40">View project →</p>
    </div>
  )
}
