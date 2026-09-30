import { audioManager, useSoundEnabled } from '../../audio/AudioManager'
import { toggleDayNight, useDayNight } from '../world/daynight/DayNightController'
import { useReducedMotion } from '../../hooks/useMediaQuery'

const ICON = { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }

function SunIcon() {
  return (
    <svg {...ICON} aria-hidden>
      <circle cx="8" cy="8" r="2.9" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4
        return (
          <line
            key={i}
            x1={8 + Math.cos(a) * 5}
            y1={8 + Math.sin(a) * 5}
            x2={8 + Math.cos(a) * 6.6}
            y2={8 + Math.sin(a) * 6.6}
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...ICON} aria-hidden>
      <path d="M12.6 10.2A5.4 5.4 0 0 1 5.8 3.4a5.4 5.4 0 1 0 6.8 6.8Z" strokeLinejoin="round" />
    </svg>
  )
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg {...ICON} aria-hidden>
      <path d="M2.5 6.2h2.2L8 3.5v9L4.7 9.8H2.5Z" strokeLinejoin="round" />
      {on ? (
        <>
          <path d="M10.4 6a2.8 2.8 0 0 1 0 4" strokeLinecap="round" />
          <path d="M12.2 4.3a5.2 5.2 0 0 1 0 7.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="10.5" y1="6.2" x2="13.8" y2="9.8" strokeLinecap="round" />
          <line x1="13.8" y1="6.2" x2="10.5" y2="9.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/** Small ☀/☾ and sound switches that sit beside Contact. */
export function WorldToggles() {
  const { mode } = useDayNight()
  const soundOn = useSoundEnabled()
  const reduced = useReducedMotion()
  const night = mode === 'night'

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center opacity-80 transition-opacity hover:opacity-100"
        onClick={() => toggleDayNight(reduced)}
        aria-label={night ? 'Switch to day' : 'Switch to night'}
        aria-pressed={night}
        title={night ? 'Day' : 'Night'}
      >
        {night ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center opacity-80 transition-opacity hover:opacity-100"
        onClick={() => audioManager.toggle()}
        aria-label={soundOn ? 'Disable sound' : 'Enable sound'}
        aria-pressed={soundOn}
        title={soundOn ? 'Sound on' : 'Sound off'}
      >
        <SoundIcon on={soundOn} />
      </button>
    </div>
  )
}
