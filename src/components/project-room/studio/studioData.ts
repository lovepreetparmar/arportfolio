import { projects } from '../../../data/projects'
import { getProjectWorldConfig } from '../../../data/projectWorld'
import { site } from '../../../data/site'

export type StudioLink = { label: string; text: string; href: string }

/** Every way to reach her that the site actually has; the email only once one is set. */
export function contactLinks(): StudioLink[] {
  const links: StudioLink[] = []
  if (site.email) links.push({ label: 'Email', text: site.email, href: `mailto:${site.email}` })
  if (site.behance) links.push({ label: 'Behance', text: site.behance.replace(/^https?:\/\/(www\.)?/, ''), href: site.behance })
  if (site.linkedin) links.push({ label: 'LinkedIn', text: site.linkedin.replace(/^https?:\/\/(www\.)?/, ''), href: site.linkedin })
  return links
}

/** Tools named in the project details, without repeats. */
export function studioTools(): string[] {
  const tools = new Set<string>()
  for (const p of projects) for (const t of getProjectWorldConfig(p).meta?.tools ?? []) tools.add(t)
  return [...tools]
}

/** Cover images of her projects, in portfolio order. */
export function projectCovers(count: number): string[] {
  return projects.map((p) => p.images[0]).filter(Boolean).slice(0, count)
}

/** Project accent colours, as swatches on the moodboard. */
export function projectSwatches(count: number): string[] {
  return [...new Set(projects.map((p) => p.accent).filter((c): c is string => !!c))].slice(0, count)
}
