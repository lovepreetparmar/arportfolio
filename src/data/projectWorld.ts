import type { Project } from './projects'
import { ENTRANCE_CLEARANCE, getSlotFootprint, getWorldSlot } from './worldLayout'

export type LocationType =
  | 'jewellery'
  | 'restaurant'
  | 'fashion'
  | 'gallery'
  | 'studio'
  | 'architecture'
  | 'custom'

export type GalleryPlacement =
  | 'wall-left'
  | 'wall-right'
  | 'display'
  | 'pedestal'
  | 'board'
  | 'counter'

export type GalleryItemType = 'desktop' | 'mobile' | 'branding' | 'mockup' | 'image'

export type ProjectGalleryItem = {
  src: string
  title?: string
  description?: string
  type?: GalleryItemType
  placement: GalleryPlacement
}

export type ProjectWorldConfig = {
  slug: string
  locationType: LocationType
  /** Offset from slot center to walk-to entrance, in the building's local frame (meters). */
  entrance: { offsetX: number; offsetZ: number }
  environment: {
    exteriorLabel: string
    exteriorAccent: string
    interiorBackground: string
    interiorAccent: string
  }
  gallery: ProjectGalleryItem[]
  meta?: {
    role?: string
    year?: string
    tools?: string[]
    about?: string
  }
  /** Full interactive room (prototype: jewellery first). */
  hasInteriorRoom: boolean
}

const JEWELLERY_ROOM: ProjectWorldConfig = {
  slug: 'roshan-shah',
  locationType: 'jewellery',
  entrance: { offsetX: 0, offsetZ: 2.8 },
  environment: {
    exteriorLabel: 'Jewellers',
    exteriorAccent: '#c9a227',
    interiorBackground: 'linear-gradient(165deg, #1a1510 0%, #2d2418 45%, #1f1a14 100%)',
    interiorAccent: '#d4af37',
  },
  gallery: [
    {
      src: '/projects/roshan-shah/cover.webp',
      title: 'Brand identity',
      description: 'Roshan Shah Jewellers — visual identity and mark.',
      type: 'branding',
      placement: 'display',
    },
    {
      src: '/projects/roshan-shah/01.webp',
      title: 'Brand applications',
      description: 'Identity applied across touchpoints.',
      type: 'image',
      placement: 'wall-right',
    },
  ],
  meta: {
    role: 'Brand Identity',
    year: '2024',
    tools: ['Illustrator', 'Photoshop', 'InDesign'],
    about:
      'Brand identity for Roshan Shah Jewellers — a premium jewellery house. Logo, palette, and application system built for elegance and clarity.',
  },
  hasInteriorRoom: true,
}

const worldBySlug = new Map<string, ProjectWorldConfig>([[JEWELLERY_ROOM.slug, JEWELLERY_ROOM]])

export function inferLocationType(project: Project): LocationType {
  const slug = project.slug
  if (slug === 'roshan-shah') return 'jewellery'
  if (slug === 'food-creatives') return 'restaurant'
  if (slug === 'adventure-website' || slug === 'social-media' || slug === 'company-portfolio') return 'studio'
  if (slug === 'billboards' || slug === 'book-cover' || slug === 'invitation') return 'gallery'
  if (slug === 'real-estate') return 'architecture'
  if (project.territory === 'branding') return 'studio'
  return 'custom'
}

export function getDefaultWorldConfig(project: Project): ProjectWorldConfig {
  const locationType = inferLocationType(project)
  const accent = project.accent ?? '#c8c4bc'
  const label =
    locationType === 'jewellery'
      ? 'Jewellers'
      : locationType === 'restaurant'
        ? 'Kitchen'
        : locationType === 'gallery'
          ? 'Gallery'
          : locationType === 'architecture'
            ? 'Studio'
            : 'Studio'

  return {
    slug: project.slug,
    locationType,
    entrance: { offsetX: 0, offsetZ: getSlotFootprint(project.slug).depth / 2 + ENTRANCE_CLEARANCE },
    environment: {
      exteriorLabel: label,
      exteriorAccent: accent,
      interiorBackground: '#f7f5f1',
      interiorAccent: accent,
    },
    gallery: project.images.map((src, i) => ({
      src,
      title: project.title,
      type: 'image' as GalleryItemType,
      placement: (['wall-left', 'wall-right', 'display', 'board'] as GalleryPlacement[])[i % 4],
    })),
    meta: {
      role: project.category,
      about: project.description,
    },
    hasInteriorRoom: false,
  }
}

export function getProjectWorldConfig(project: Project): ProjectWorldConfig {
  return worldBySlug.get(project.slug) ?? getDefaultWorldConfig(project)
}

export function hasProjectInteriorRoom(slug: string): boolean {
  return worldBySlug.get(slug)?.hasInteriorRoom === true
}

export type EntranceWorld = {
  x: number
  y: number
  z: number
  buildingX: number
  buildingZ: number
  doorYaw: number
}

export function getProjectEntrance(project: Project): EntranceWorld {
  const slot = getWorldSlot(project.slug)
  const config = getProjectWorldConfig(project)
  const bx = slot?.position.x ?? 0
  const bz = slot?.position.z ?? -8
  const yaw = slot?.rotation ?? 0
  const { offsetX, offsetZ } = config.entrance
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return {
    x: bx + offsetX * cos + offsetZ * sin,
    y: 0,
    z: bz - offsetX * sin + offsetZ * cos,
    buildingX: bx,
    buildingZ: bz,
    doorYaw: yaw,
  }
}
