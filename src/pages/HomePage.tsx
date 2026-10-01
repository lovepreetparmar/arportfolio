import { useCallback, useState } from 'react'
import { WorldStateProvider, useWorldState } from '../context/WorldStateContext'
import { World } from '../components/world/World'
import { WorldUI } from '../components/Navigation/WorldUI'
import { MapOpening } from '../components/map/MapOpening'
import { ProjectView } from '../components/Project/ProjectView'
import { AboutPanel } from '../components/Project/AboutPanel'
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
  const [opened, setOpened] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { saveWorld, navigateToProject, legacyProjectSlug, clearLegacyProjectView } = useWorldState()

  const openProject = useCallback(
    (slug: string) => {
      if (slug === '__about__') {
        saveWorld()
        setAboutOpen(true)
        return
      }
      navigateToProject(slug)
    },
    [saveWorld, navigateToProject],
  )

  const closeProject = useCallback(() => {
    clearLegacyProjectView()
    setAboutOpen(false)
  }, [clearLegacyProjectView])

  const closeAbout = useCallback(() => {
    setAboutOpen(false)
    clearLegacyProjectView()
  }, [clearLegacyProjectView])

  return (
    <>
      {!opened && <MapOpening onDone={() => setOpened(true)} />}
      <World onSelectProject={openProject} />
      <RoomTransitionOverlay />
      <WorldUI
        onFlyToContact={() => {
          saveWorld()
          setAboutOpen(true)
        }}
        onOpenProjectDirect={reduced ? openProject : undefined}
      />
      <RoomArtworkViewer />
      {legacyProjectSlug && (
        <ProjectView
          slug={legacyProjectSlug}
          onClose={closeProject}
          onNextTerritory={(slug) => navigateToProject(slug)}
        />
      )}
      {aboutOpen && <AboutPanel onClose={closeAbout} />}
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
