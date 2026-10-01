import { useCallback } from 'react'
import { WorldStateProvider, useWorldState } from '../context/WorldStateContext'
import { World } from '../components/world/World'
import { WorldUI } from '../components/Navigation/WorldUI'
import { WorldIntro } from '../components/world/WorldIntro'
import { ProjectView } from '../components/Project/ProjectView'
import { RoomArtworkViewer } from '../components/project-room/RoomArtworkViewer'
import { RoomTransitionOverlay } from '../components/project-room/RoomTransitionOverlay'
import { useWorldJourneyOrchestrator } from '../hooks/useWorldJourneyOrchestrator'
import { useWorldPointer } from '../hooks/useWorldPointer'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { useJourneyAudio } from '../audio/useJourneyAudio'

function WorldExperience() {
  useWorldPointer()
  useWorldJourneyOrchestrator()
  useJourneyAudio()
  const reduced = useReducedMotion()
  const { navigateToProject, legacyProjectSlug, clearLegacyProjectView } = useWorldState()

  const openProject = useCallback((slug: string) => navigateToProject(slug), [navigateToProject])

  return (
    <>
      <WorldIntro />
      <World onSelectProject={openProject} />
      <RoomTransitionOverlay />
      <WorldUI onOpenProjectDirect={reduced ? openProject : undefined} />
      <RoomArtworkViewer />
      {legacyProjectSlug && (
        <ProjectView
          slug={legacyProjectSlug}
          onClose={clearLegacyProjectView}
          onNextTerritory={(slug) => navigateToProject(slug)}
        />
      )}
    </>
  )
}

export function HomePage() {
  return (
    <WorldStateProvider>
      <WorldExperience />
    </WorldStateProvider>
  )
}
