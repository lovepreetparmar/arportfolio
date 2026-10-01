import { getProjectBySlug, type Project } from './projects'
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

/** How a project's exhibition room is dressed: frames, props and mood. */
export type RoomDisplayStyle = 'boutique' | 'studio' | 'digital' | 'kitchen' | 'gallery' | 'neutral'

export type ProjectRoomTheme = {
  displayStyle: RoomDisplayStyle
  wallColor: string
  floorColor: string
  floorType: 'wood' | 'stone'
  ceilingColor: string
  accentColor: string
  /** Colour of the gallery spotlights. */
  lightColor: string
  frameColor: string
}

export type ProjectWorldConfig = {
  slug: string
  locationType: LocationType
  room: ProjectRoomTheme
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
  /** Walk-in 3D exhibition room; otherwise the project opens in the flat project view. */
  hasInteriorRoom: boolean
}

const ROOM_PALETTES: Record<RoomDisplayStyle, ProjectRoomTheme> = {
  boutique: {
    displayStyle: 'boutique',
    wallColor: '#3e332c',
    floorColor: '#5b4030',
    floorType: 'wood',
    ceilingColor: '#2c2521',
    accentColor: '#c9a227',
    lightColor: '#ffd9a8',
    frameColor: '#b8923a',
  },
  studio: {
    displayStyle: 'studio',
    wallColor: '#efe9df',
    floorColor: '#b98d62',
    floorType: 'wood',
    ceilingColor: '#f4f0e8',
    accentColor: '#c4643e',
    lightColor: '#fff1dc',
    frameColor: '#1f1d1b',
  },
  digital: {
    displayStyle: 'digital',
    wallColor: '#e2e5e7',
    floorColor: '#a3a29d',
    floorType: 'stone',
    ceilingColor: '#eceef0',
    accentColor: '#3d6fd8',
    lightColor: '#f3f6ff',
    frameColor: '#151618',
  },
  kitchen: {
    displayStyle: 'kitchen',
    wallColor: '#f0e3d1',
    floorColor: '#a85c3d',
    floorType: 'stone',
    ceilingColor: '#f6ede1',
    accentColor: '#f77f00',
    lightColor: '#ffe0b8',
    frameColor: '#5e3f2b',
  },
  gallery: {
    displayStyle: 'gallery',
    wallColor: '#f4f2ee',
    floorColor: '#c9a77f',
    floorType: 'wood',
    ceilingColor: '#f7f6f3',
    accentColor: '#8a7a66',
    lightColor: '#fff4e2',
    frameColor: '#c49a6c',
  },
  neutral: {
    displayStyle: 'neutral',
    wallColor: '#ebe7e0',
    floorColor: '#bab2a5',
    floorType: 'stone',
    ceilingColor: '#f3f1ec',
    accentColor: '#7f9a6c',
    lightColor: '#fff2e0',
    frameColor: '#2a2826',
  },
}

const STYLE_FOR_LOCATION: Record<LocationType, RoomDisplayStyle> = {
  jewellery: 'boutique',
  restaurant: 'kitchen',
  fashion: 'boutique',
  gallery: 'gallery',
  studio: 'studio',
  architecture: 'neutral',
  custom: 'neutral',
}

const DIGITAL_SLUGS = new Set(['adventure-website', 'social-media', 'company-portfolio'])

/** Room styling for a project: its location type picks the mood, its own accent tints it. */
export function getRoomTheme(project: Project, locationType: LocationType): ProjectRoomTheme {
  const style = DIGITAL_SLUGS.has(project.slug) ? 'digital' : STYLE_FOR_LOCATION[locationType]
  const palette = ROOM_PALETTES[style]
  return { ...palette, accentColor: project.accent ?? palette.accentColor }
}

const JEWELLERY_ROOM: ProjectWorldConfig = {
  slug: 'roshan-shah',
  locationType: 'jewellery',
  room: ROOM_PALETTES.boutique,
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
    room: getRoomTheme(project, locationType),
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
    hasInteriorRoom: true,
  }
}

export function getProjectWorldConfig(project: Project): ProjectWorldConfig {
  return worldBySlug.get(project.slug) ?? getDefaultWorldConfig(project)
}

export function hasProjectInteriorRoom(slug: string): boolean {
  const project = getProjectBySlug(slug)
  return !!project && getProjectWorldConfig(project).hasInteriorRoom
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
