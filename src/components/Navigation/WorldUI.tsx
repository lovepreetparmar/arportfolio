import { useState } from 'react'
import { getProjectBySlug, projects } from '../../data/projects'
import { getProjectWorldConfig } from '../../data/projectWorld'
import { isDark } from '../project-room/roomTextures'
import { site } from '../../data/site'
import { useWorldState } from '../../context/WorldStateContext'
import { contactWorld } from '../../data/world3d'
import { ABOUT_POSITION } from '../../data/worldLayout'
import { useDayNight } from '../world/daynight/DayNightController'
import { WorldToggles } from './WorldToggles'

type WorldUIProps = {
  onFlyToContact: () => void
  /** Reduced-motion: optional direct open from index. */
  onOpenProjectDirect?: (slug: string) => void
}

export function WorldUI({ onFlyToContact, onOpenProjectDirect }: WorldUIProps) {
  const { setTarget, navigateToProject, journeyPhase, insideRoom, roomProjectSlug } = useWorldState()
  const roomProject = insideRoom && roomProjectSlug ? getProjectBySlug(roomProjectSlug) : undefined
  const darkRoom = !!roomProject && isDark(getProjectWorldConfig(roomProject).room.wallColor)
  const traveling = journeyPhase === 'walking' || journeyPhase === 'arrived' || journeyPhase === 'doorOpening'
  const hint = insideRoom
    ? 'Click artwork to look closer · Drag to look · Click the door to leave'
    : traveling
      ? 'Walking to project…'
      : 'Select a location · Click to walk · Drag to look · WASD to move'
  const [indexOpen, setIndexOpen] = useState(false)
  const { dark: night } = useDayNight()
  const dark = roomProject ? darkRoom : night

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-5 transition-colors duration-1000 md:p-8 ${dark ? 'text-[#efe9dc]' : ''}`}
      >
        <div className="pointer-events-auto flex items-start justify-between">
          <p className="text-sm font-semibold tracking-tight">ANUSHRI RAINA</p>
          <div className="flex gap-6 text-xs tracking-[0.25em] uppercase">
            <button
              type="button"
              onClick={() => {
                setTarget({ x: ABOUT_POSITION.x, y: 0, z: ABOUT_POSITION.z })
                onFlyToContact()
              }}
            >
              About
            </button>
            <button type="button" onClick={() => setIndexOpen(true)}>Index</button>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <p
            className={`text-[10px] tracking-[0.3em] uppercase transition-colors duration-1000 ${dark ? 'text-[#b9b4c4]' : roomProject ? 'text-ink/75' : 'text-muted'}`}
          >
            {hint}
          </p>
          <div className="pointer-events-auto flex items-center gap-5">
            <WorldToggles />
            <button
              type="button"
              className="text-xs tracking-[0.2em] uppercase"
              onClick={() => setTarget({ x: contactWorld.x, y: 0, z: contactWorld.z })}
            >
              Contact
            </button>
          </div>
        </div>
      </div>

      {indexOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-6" role="dialog" aria-modal="true">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto bg-canvas p-8">
            <div className="mb-6 flex justify-between">
              <p className="text-xs tracking-[0.3em] uppercase">Index</p>
              <button type="button" onClick={() => setIndexOpen(false)}>Close</button>
            </div>
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.slug} className="flex items-center gap-3 py-2">
                  <button
                    type="button"
                    className="flex flex-1 gap-4 text-left hover:opacity-50"
                    onClick={() => {
                      setIndexOpen(false)
                      navigateToProject(p.slug)
                    }}
                  >
                    <span className="text-muted">{p.number}</span>
                    <span className="uppercase">{p.title}</span>
                  </button>
                  {onOpenProjectDirect && (
                    <button
                      type="button"
                      className="text-[9px] tracking-[0.15em] text-muted underline"
                      onClick={() => {
                        setIndexOpen(false)
                        onOpenProjectDirect(p.slug)
                      }}
                    >
                      Open
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-line pt-6 text-sm">
              <a href={site.behance} className="block py-1">Behance</a>
              <a href={site.linkedin} className="block py-1">LinkedIn</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
