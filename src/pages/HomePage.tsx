import { useCallback, useRef, useState } from 'react'
import { WorldStateProvider, useWorldState } from '../context/WorldStateContext'
import { World } from '../components/world/World'
import { WorldUI } from '../components/Navigation/WorldUI'
import { NavigationDebugOverlay } from '../components/Navigation/NavigationDebugOverlay'
import { MapOpening } from '../components/map/MapOpening'
import { ProjectView } from '../components/Project/ProjectView'
import { AboutPanel } from '../components/Project/AboutPanel'
import { useWorldPointer } from '../hooks/useWorldPointer'

function WorldExperience() {
  useWorldPointer()
  const [opened, setOpened] = useState(false)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { saveWorld, restoreWorld, clearSavedWorld, navigateToProject } = useWorldState()
  const openTimer = useRef<number | null>(null)

  const handleArrivedAtProject = useCallback((slug: string) => {
    if (openTimer.current) window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => {
      saveWorld()
      setActiveSlug(slug)
    }, 700)
  }, [saveWorld])

  const handleSelectProject = useCallback(
    (slug: string) => {
      if (slug === '__about__') {
        saveWorld()
        setAboutOpen(true)
        return
      }
      navigateToProject(slug, 'project')
    },
    [navigateToProject, saveWorld],
  )

  const closeProject = useCallback(() => {
    setActiveSlug(null)
    setAboutOpen(false)
    restoreWorld()
    clearSavedWorld()
  }, [restoreWorld, clearSavedWorld])

  return (
    <>
      {!opened && <MapOpening onDone={() => setOpened(true)} />}
      <World onSelectProject={handleSelectProject} onArrivedAtProject={handleArrivedAtProject} />
      <WorldUI
        onFlyToContact={() => {
          saveWorld()
          setAboutOpen(true)
        }}
      />
      <NavigationDebugOverlay />
      {activeSlug && (
        <ProjectView
          slug={activeSlug}
          onClose={closeProject}
          onNextTerritory={(slug) => {
            setActiveSlug(null)
            navigateToProject(slug, 'index')
          }}
        />
      )}
      {aboutOpen && <AboutPanel onClose={closeProject} />}
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
