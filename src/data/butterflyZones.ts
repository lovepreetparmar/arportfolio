import { WORLD_HUB } from './worldLayout'
import { WORLD_POND } from './worldScenery'

/** A peaceful outdoor patch where a few butterflies may drift. */
export type ButterflyZone = {
  id: string
  center: { x: number; z: number }
  radius: number
  maxButterflies: number
  yMin: number
  yMax: number
  /** Higher = more likely when several zones are in range. */
  weight: number
}

const ABOUT = { x: -21.5, z: 0.8 }
const CONTACT_GARDEN = { x: -22.5, z: -5.5 }

export const BUTTERFLY_ZONES: ButterflyZone[] = [
  {
    id: 'central-garden',
    center: WORLD_HUB,
    radius: 5.2,
    maxButterflies: 3,
    yMin: 0.45,
    yMax: 2.4,
    weight: 1.35,
  },
  {
    id: 'about-studio',
    center: ABOUT,
    radius: 4.2,
    maxButterflies: 2,
    yMin: 0.5,
    yMax: 2.2,
    weight: 1.1,
  },
  {
    id: 'contact-garden',
    center: CONTACT_GARDEN,
    radius: 3.6,
    maxButterflies: 2,
    yMin: 0.45,
    yMax: 2,
    weight: 0.95,
  },
  {
    id: 'pond',
    center: { x: WORLD_POND.x, z: WORLD_POND.z },
    radius: 2.8,
    maxButterflies: 2,
    yMin: 0.4,
    yMax: 1.6,
    weight: 1,
  },
  {
    id: 'west-park',
    center: { x: -11, z: 2.5 },
    radius: 4.5,
    maxButterflies: 2,
    yMin: 0.4,
    yMax: 2.1,
    weight: 0.85,
  },
  {
    id: 'south-meadow',
    center: { x: 2.5, z: 14 },
    radius: 5,
    maxButterflies: 2,
    yMin: 0.45,
    yMax: 2.3,
    weight: 0.8,
  },
]
