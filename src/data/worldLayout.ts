/** Art-directed 3D world positions (meters). Buildings face the central plaza. */

export type BuildingArchetype = 'boutique' | 'kitchen' | 'studio' | 'pavilion'

export type PavilionStyle = 'plaster' | 'wood' | 'stone'

/** Colourway of a pavilion; the style sets its construction, the tone its paint. */
export type PavilionTone =
  | 'cream'
  | 'sage'
  | 'coral'
  | 'yellow'
  | 'honey'
  | 'walnut'
  | 'blue'
  | 'lavender'
  | 'sand'

export type WorldProjectSlot = {
  slug: string
  position: { x: number; y: number; z: number }
  archetype: BuildingArchetype
  style?: PavilionStyle
  tone?: PavilionTone
  /** Yaw in radians; the building's front (local +z) faces this direction. */
  rotation: number
}

export const WORLD_HUB = { x: 0, z: 0 }

export const PLAZA_RADIUS = 3.2

export const WORLD_SPAWN = { x: 0, y: 0, z: 1.2 }

export const CONTACT_POSITION = { x: 0, y: 0, z: 46 }

export const ABOUT_POSITION = { x: -19, y: 0, z: 11 }

export const OPENING_FOCUS_SLUG = 'food-creatives'

export const ARCHETYPE_FOOTPRINT: Record<BuildingArchetype, { width: number; depth: number }> = {
  boutique: { width: 4.6, depth: 3.4 },
  kitchen: { width: 5, depth: 3.6 },
  studio: { width: 4.8, depth: 4 },
  pavilion: { width: 3.6, depth: 3 },
}

/** Distance from the facade to the spot where the character stops at the door. */
export const ENTRANCE_CLEARANCE = 1.1

function slot(
  slug: string,
  x: number,
  z: number,
  archetype: BuildingArchetype,
  style?: PavilionStyle,
  tone?: PavilionTone,
): WorldProjectSlot {
  return {
    slug,
    position: { x, y: 0, z },
    archetype,
    style,
    tone,
    rotation: Math.atan2(WORLD_HUB.x - x, WORLD_HUB.z - z),
  }
}

export const worldProjectSlots: WorldProjectSlot[] = [
  slot('food-creatives', -6, -7, 'kitchen'),
  slot('roshan-shah', 6.5, -7.5, 'boutique'),
  slot('brand-identity', 0, -14, 'studio'),
  slot('adventure-website', -11, -19, 'pavilion', 'wood', 'honey'),
  slot('billboards', 12, -19, 'pavilion', 'plaster', 'yellow'),
  slot('brand-with-a-heart', -14, -4, 'pavilion', 'plaster', 'coral'),
  slot('company-portfolio', 15, -3, 'pavilion', 'stone', 'blue'),
  slot('timbs', -15, 7, 'pavilion', 'wood', 'walnut'),
  slot('social-media', 15, 8, 'pavilion', 'plaster', 'sage'),
  slot('invitation', -8, 15, 'pavilion', 'stone', 'lavender'),
  slot('real-estate', 9, 16, 'pavilion', 'stone', 'sand'),
  slot('book-cover', 0, 20, 'pavilion', 'plaster', 'cream'),
]

const slotBySlug = new Map(worldProjectSlots.map((s) => [s.slug, s]))

export function getWorldSlot(slug: string): WorldProjectSlot | undefined {
  return slotBySlug.get(slug)
}

export function getSlotFootprint(slug: string): { width: number; depth: number } {
  const s = slotBySlug.get(slug)
  return ARCHETYPE_FOOTPRINT[s?.archetype ?? 'pavilion']
}

/** Camera / character distance thresholds */
export const REVEAL = {
  silhouette: 26,
  title: 11,
  metadata: 6.5,
  fullGallery: 4.2,
  interact: 3.8,
}
