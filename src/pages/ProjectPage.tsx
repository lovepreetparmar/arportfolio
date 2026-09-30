import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getNextProject, getProjectBySlug } from '../data/projects'

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const project = slug ? getProjectBySlug(slug) : undefined
  const next = slug ? getNextProject(slug) : undefined

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <p>Project not found</p>
        <Link to="/" className="mt-6 underline">Return to map</Link>
      </div>
    )
  }

  return (
    <article className="min-h-screen bg-[#f7f5f1] px-5 py-12 md:px-10">
      <Link to="/" className="text-xs tracking-[0.25em] uppercase">← Return to map</Link>
      <header className="mt-10">
        <p className="text-xs tracking-[0.3em] uppercase text-muted">{project.category}</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight">{project.title}</h1>
      </header>
      <div className="mt-12 space-y-16">
        {project.images.map((src) => (
          <img key={src} src={src} alt="" className="mx-auto max-w-5xl w-full object-contain" loading="lazy" />
        ))}
      </div>
      <a href={project.behanceUrl} className="mt-12 inline-block text-xs uppercase underline" target="_blank" rel="noopener noreferrer">
        Behance
      </a>
      {next && (
        <Link to={`/work/${next.slug}`} className="mt-8 block text-sm uppercase">
          Next territory → {next.title}
        </Link>
      )}
    </article>
  )
}
