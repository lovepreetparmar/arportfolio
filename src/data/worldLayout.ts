/** Art-directed 3D world positions (meters). Deliberate spacing — not derived from 2D map. */

export type WorldTier = 'hero' | 'support' | 'background'

export type WorldProjectSlot = {
  slug: string
  position: { x: number; y: number; z: number }
  tier: WorldTier
  footprint: { width: number; depth: number }
  rotation?: number
}

export const WORLD_SPAWN = { x: 0, y: 0, z: 1.2 }

export const CONTACT_POSITION = { x: 0, y: 0, z: 46 }

export const ABOUT_POSITION = { x: -19, y: 0, z: 11 }

/** Opening view: character + Food Creatives (hero) + Brand Identity (support). */
export const OPENING_FOCUS_SLUG = 'food-creatives'

export const worldProjectSlots: WorldProjectSlot[] = [
  { slug: 'food-creatives', position: { x: 0, y: 0, z: -13 }, tier: 'hero', footprint: { width: 9, depth: 7 } },
  { slug: 'brand-identity', position: { x: 10, y: 0, z: -7 }, tier: 'support', footprint: { width: 5, depth: 4 } },
  { slug: 'roshan-shah', position: { x: 17, y: 0, z: -2 }, tier: 'background', footprint: { width: 5, depth: 5 } },
  { slug: 'brand-with-a-heart', position: { x: -11, y: 0, z: -9 }, tier: 'background', footprint: { width: 4.5, depth: 4 } },
  { slug: 'adventure-website', position: { x: -13, y: 0, z: -19 }, tier: 'background', footprint: { width: 6, depth: 3 } },
  { slug: 'billboards', position: { x: 19, y: 0, z: -17 }, tier: 'background', footprint: { width: 4, depth: 6 } },
  { slug: 'timbs', position: { x: -15, y: 0, z: 5 }, tier: 'background', footprint: { width: 6, depth: 5 } },
  { slug: 'invitation', position: { x: -18, y: 0, z: 12 }, tier: 'background', footprint: { width: 4, depth: 4 } },
  { slug: 'social-media', position: { x: 14, y: 0, z: 14 }, tier: 'background', footprint: { width: 6, depth: 3 } },
  { slug: 'real-estate', position: { x: 7, y: 0, z: 20 }, tier: 'background', footprint: { width: 4, depth: 5 } },
  { slug: 'book-cover', position: { x: -7, y: 0, z: 24 }, tier: 'background', footprint: { width: 3.5, depth: 4 } },
  { slug: 'company-portfolio', position: { x: 12, y: 0, z: 28 }, tier: 'background', footprint: { width: 5, depth: 4 } },
]

const slotBySlug = new Map(worldProjectSlots.map((s) => [s.slug, s]))

export function getWorldSlot(slug: string): WorldProjectSlot | undefined {
  return slotBySlug.get(slug)
}

export function getTierScale(tier: WorldTier): number {
  switch (tier) {
    case 'hero':
      return 1.05
    case 'support':
      return 0.72
    case 'background':
      return 0.48
  }
}

/** Camera / character distance thresholds */
export const REVEAL = {
  silhouette: 26,
  title: 11,
  metadata: 6.5,
  fullGallery: 4.2,
  interact: 3.8,
}
