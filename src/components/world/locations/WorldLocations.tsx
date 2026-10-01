import { memo } from 'react'
import { WORLD_LOCATIONS } from '../../../data/worldLocations'
import { AboutStudio } from './AboutStudio'
import { CentralLandmark } from './CentralLandmark'
import { ContactStudio } from './ContactStudio'
import { SkyViewpoint } from './SkyViewpoint'
import { StudioLocation } from './StudioLocation'

type WorldLocationsProps = {
  onSelect: (id: string) => void
}

/** Builds every non-project place from the location registry. */
export const WorldLocations = memo(function WorldLocations({ onSelect }: WorldLocationsProps) {
  return (
    <>
      {WORLD_LOCATIONS.map((l) => {
        if (l.type === 'landmark') return <CentralLandmark key={l.id} location={l} />
        if (l.type === 'about')
          return (
            <StudioLocation key={l.id} location={l} onSelect={onSelect}>
              <AboutStudio location={l} />
            </StudioLocation>
          )
        if (l.type === 'contact')
          return (
            <StudioLocation key={l.id} location={l} onSelect={onSelect}>
              <ContactStudio location={l} />
            </StudioLocation>
          )
        if (l.type === 'viewpoint') return <SkyViewpoint key={l.id} location={l} />
        return null
      })}
    </>
  )
})
