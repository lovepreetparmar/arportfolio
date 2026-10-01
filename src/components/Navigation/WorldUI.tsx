import { useState } from 'react'
import { getProjectBySlug, projects } from '../../data/projects'
import { isDark } from '../project-room/roomTextures'
import { contactLinks } from '../project-room/studio/studioData'
import { site } from '../../data/site'
import { useWorldState } from '../../context/WorldStateContext'
import { getPlaceRoomTheme, getWorldLocation, VIEWPOINT } from '../../data/worldLocations'
import { useSeatedBench } from '../world/benches/SittingContext'
import { useDayNight } from '../world/daynight/DayNightController'
import { WorldToggles } from './WorldToggles'

type WorldUIProps = {
  /** Reduced-motion: optional direct open from index. */
  onOpenProjectDirect?: (slug: string) => void
}

function roomHint(slug: string | null) {
  const type = slug ? getWorldLocation(slug)?.type : undefined
  if (type === 'about') return 'Drag to look · Click the door to leave'
  if (type === 'contact') return 'Choose a link to open it · Click the door to leave'
  return 'Click artwork to look closer · Drag to look · Click the door to leave'
}

export function WorldUI({ onOpenProjectDirect }: WorldUIProps) {
  const { navigateToProject, journeyPhase, insideRoom, roomProjectSlug, pendingProjectSlug } = useWorldState()
  const roomTheme = insideRoom ? getPlaceRoomTheme(roomProjectSlug) : null
  const darkRoom = !!roomTheme && isDark(roomTheme.wallColor)
  const traveling = journeyPhase === 'walking' || journeyPhase === 'arrived' || journeyPhase === 'doorOpening'
  const { dark: night } = useDayNight()
  const atViewpoint = useSeatedBench() === VIEWPOINT.id && journeyPhase === 'world'
  const hint = insideRoom
    ? roomHint(roomProjectSlug)
    : traveling
      ? getProjectBySlug(pendingProjectSlug ?? '')
        ? 'Walking to project…'
        : 'Walking…'
      : atViewpoint
        ? `Drag up to look at the ${night ? 'stars' : 'sky'} · Click to walk on`
        : 'Select a location · Click to walk · Drag to look'
  const [indexOpen, setIndexOpen] = useState(false)
  const dark = roomTheme ? darkRoom : night

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-5 transition-colors duration-1000 md:p-8 ${dark ? 'text-[#efe9dc]' : ''}`}
      >
        <div className="pointer-events-auto flex items-start justify-between">
          <p className="text-sm font-semibold tracking-tight">ANUSHRI RAINA</p>
          <div className="flex gap-6 text-xs tracking-[0.25em] uppercase">
            <button type="button" onClick={() => navigateToProject('about')}>
              About
            </button>
            <button type="button" onClick={() => setIndexOpen(true)}>Index</button>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            {insideRoom && roomProjectSlug === 'contact' && (
              <ul className="pointer-events-auto mb-3 flex gap-5 text-xs tracking-[0.2em] uppercase">
                {contactLinks().map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {l.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p
              className={`text-[10px] tracking-[0.3em] uppercase transition-colors duration-1000 ${dark ? 'text-[#b9b4c4]' : roomTheme ? 'text-ink/75' : 'text-muted'}`}
            >
              {hint}
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-5">
            <WorldToggles />
            <button
              type="button"
              className="text-xs tracking-[0.2em] uppercase"
              onClick={() => navigateToProject('contact')}
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
