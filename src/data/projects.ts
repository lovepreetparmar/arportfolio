export type ClusterLayout = 'scatter' | 'stack' | 'poster' | 'editorial' | 'strip' | 'wall'

export interface MapImage {
  src: string
  x: number
  y: number
  w: number
  rotate?: number
}

export interface Project {
  id: string
  number: string
  slug: string
  title: string
  category: string
  description?: string
  position: { x: number; y: number }
  scale: number
  layout: ClusterLayout
  accent?: string
  images: string[]
  mapImages: MapImage[]
  behanceUrl: string
  territory: 'branding' | 'editorial' | 'digital' | 'print' | 'experiments'
}

const base = (slug: string) => `/projects/${slug}`

function assets(slug: string): string[] {
  return [`${base(slug)}/cover.webp`, `${base(slug)}/01.webp`]
}

function scatterLayout(images: string[], spread = 1): MapImage[] {
  const offsets = [
    { x: 0, y: 0, w: 420, r: -4 },
    { x: 380, y: 120, w: 360, r: 6 },
    { x: -320, y: 280, w: 340, r: -8 },
    { x: 200, y: -200, w: 300, r: 3 },
    { x: 520, y: 360, w: 280, r: 5 },
    { x: -180, y: 480, w: 320, r: -3 },
  ]
  const count = Math.max(4, images.length)
  return Array.from({ length: count }, (_, i) => {
    const o = offsets[i % offsets.length]
    return {
      src: images[i % images.length],
      x: o.x * spread,
      y: o.y * spread,
      w: o.w,
      rotate: o.r,
    }
  })
}

function layoutFor(type: ClusterLayout, images: string[], scale: number): MapImage[] {
  const s = scale
  switch (type) {
    case 'poster':
      return [{ src: images[0], x: 0, y: 0, w: 680 * s, rotate: -2 }]
    case 'stack':
      return images.map((src, i) => ({
        src,
        x: i * 28,
        y: i * 24,
        w: 400 * s,
        rotate: -6 + i * 4,
      }))
    case 'strip':
      return images.map((src, i) => ({
        src,
        x: i * 340 * s,
        y: 0,
        w: 320 * s,
        rotate: 0,
      }))
    case 'editorial':
      return images.map((src, i) => ({
        src,
        x: (i % 2) * 300 * s,
        y: Math.floor(i / 2) * 380 * s,
        w: 280 * s,
        rotate: 0,
      }))
    case 'wall':
      return images.flatMap((src, i) =>
        Array.from({ length: 2 }, (_, j) => ({
          src,
          x: (i * 2 + j) * 160 * s,
          y: j * 140 * s,
          w: 150 * s,
          rotate: (i + j) % 2 ? 3 : -2,
        })),
      ).slice(0, 8)
    case 'scatter':
    default:
      return scatterLayout(images, s)
  }
}

function p(
  partial: Omit<Project, 'images' | 'mapImages'> & { imgs?: string[] },
): Project {
  const images = partial.imgs ?? assets(partial.slug)
  return {
    ...partial,
    images,
    mapImages: layoutFor(partial.layout, images, partial.scale),
  }
}

export const projects: Project[] = [
  p({
    id: '01', number: '01', slug: 'brand-identity',
    title: 'Brand Identity | Mockup Brand', category: 'Brand Identity',
    position: { x: 2400, y: 2100 }, scale: 1.15, layout: 'poster', territory: 'branding',
    accent: '#c43d3d',
    behanceUrl: 'https://www.behance.net/gallery/248198295/Brand-Identity-Mockup-Brand',
  }),
  p({
    id: '02', number: '02', slug: 'roshan-shah',
    title: 'Roshan Shah Jewellers', category: 'Brand Identity',
    position: { x: 4600, y: 1700 }, scale: 1.25, layout: 'scatter', territory: 'branding',
    accent: '#c9a227',
    behanceUrl: 'https://www.behance.net/gallery/227006567/Jewellery-Brand-Identity-Roshan-Shah-Jewellers',
  }),
  p({
    id: '03', number: '03', slug: 'food-creatives',
    title: 'Food Creatives', category: 'Campaign',
    position: { x: 8400, y: 2300 }, scale: 1.3, layout: 'scatter', territory: 'experiments',
    accent: '#f77f00',
    behanceUrl: 'https://www.behance.net/gallery/242821061/Food-Creatives',
  }),
  p({
    id: '04', number: '04', slug: 'brand-with-a-heart',
    title: 'Brand With A Heart', category: 'Brand Concept',
    position: { x: 3000, y: 4700 }, scale: 1.1, layout: 'stack', territory: 'branding',
    behanceUrl: 'https://www.behance.net/gallery/245401853/Brand-With-A-Heart-Brand-Concept-Design',
  }),
  p({
    id: '05', number: '05', slug: 'timbs',
    title: 'Timbs', category: 'Branding & Social',
    position: { x: 5600, y: 5100 }, scale: 1.2, layout: 'wall', territory: 'experiments',
    behanceUrl: 'https://www.behance.net/gallery/225659479/Timbs',
  }),
  p({
    id: '06', number: '06', slug: 'adventure-website',
    title: 'Adventure Website Mockup', category: 'Digital Design',
    position: { x: 9200, y: 4400 }, scale: 1.05, layout: 'strip', territory: 'digital',
    behanceUrl: 'https://www.behance.net/gallery/242021543/Adventure-Wesbite-Mockup',
  }),
  p({
    id: '07', number: '07', slug: 'invitation',
    title: 'A4 Invitation | Moodboard', category: 'Print Design',
    position: { x: 2000, y: 6100 }, scale: 1.1, layout: 'editorial', territory: 'print',
    behanceUrl: 'https://www.behance.net/gallery/225950611/A4-Invitation-Moodboard',
  }),
  p({
    id: '08', number: '08', slug: 'social-media',
    title: 'Social Media Banners', category: 'Social Creative',
    position: { x: 7600, y: 6700 }, scale: 1, layout: 'strip', territory: 'digital',
    behanceUrl: 'https://www.behance.net/gallery/225040911/Social-Media-Banners',
  }),
  p({
    id: '09', number: '09', slug: 'real-estate',
    title: 'Real Estate Branding', category: 'Branding',
    position: { x: 4000, y: 7100 }, scale: 0.95, layout: 'poster', territory: 'branding',
    behanceUrl: 'https://www.behance.net/gallery/225925307/Branding-Real-Estate',
  }),
  p({
    id: '10', number: '10', slug: 'book-cover',
    title: 'Book Cover', category: 'Print',
    position: { x: 6300, y: 7300 }, scale: 1, layout: 'poster', territory: 'print',
    behanceUrl: 'https://www.behance.net/gallery/225833191/Book-Cover',
  }),
  p({
    id: '11', number: '11', slug: 'billboards',
    title: 'Billboards or Hoardings', category: 'OOH',
    position: { x: 10000, y: 6100 }, scale: 1.15, layout: 'poster', territory: 'editorial',
    behanceUrl: 'https://www.behance.net/gallery/225769125/Billboards-or-Hoardings',
  }),
  p({
    id: '12', number: '12', slug: 'company-portfolio',
    title: 'Company Portfolio', category: 'Identity',
    position: { x: 10400, y: 3600 }, scale: 1, layout: 'editorial', territory: 'digital',
    behanceUrl: 'https://www.behance.net/gallery/225767477/Company-Portfolio',
  }),
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

export function getNextProject(slug: string): Project | undefined {
  const i = projects.findIndex((p) => p.slug === slug)
  if (i === -1) return undefined
  return projects[(i + 1) % projects.length]
}
