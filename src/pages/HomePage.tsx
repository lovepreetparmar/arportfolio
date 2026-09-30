import { useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { WorldStateProvider, useWorldState } from '../context/WorldStateContext'
import { World } from '../components/world/World'
import { WorldUI } from '../components/Navigation/WorldUI'
import { MapOpening } from '../components/map/MapOpening'
import { ProjectView } from '../components/Project/ProjectView'
import { AboutPanel } from '../components/Project/AboutPanel'
import { ProjectRoom } from '../components/project-room/ProjectRoom'
import { RoomTransitionOverlay } from '../components/project-room/RoomTransitionOverlay'
import { useWorldJourneyOrchestrator } from '../hooks/useWorldJourneyOrchestrator'
import { useWorldPointer } from '../hooks/useWorldPointer'
import { useReducedMotion } from '../hooks/useMediaQuery'

function WorldExperience() {
  useWorldPointer()
  useWorldJourneyOrchestrator()
  const reduced = useReducedMotion()
  const [opened, setOpened] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const {
    saveWorld,
    navigateToProject,
    roomProjectSlug,
    legacyProjectSlug,
    journeyPhase,
    clearLegacyProjectView,
    exitProjectRoom,
  } = useWorldState()

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

  const inRoom = journeyPhase === 'inRoom' && !!roomProjectSlug

  return (
    <>
      {!opened && <MapOpening onDone={() => setOpened(true)} />}
      <World onSelectProject={openProject} dimmed={inRoom} />
      <RoomTransitionOverlay />
      <WorldUI
        onFlyToContact={() => {
          saveWorld()
          setAboutOpen(true)
        }}
        onOpenProjectDirect={reduced ? openProject : undefined}
      />
      <AnimatePresence>
        {inRoom && roomProjectSlug && (
          <ProjectRoom key={roomProjectSlug} slug={roomProjectSlug} onExit={exitProjectRoom} />
        )}
      </AnimatePresence>
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
