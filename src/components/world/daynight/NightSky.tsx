import { useEffect, useMemo, useRef } from 'react'
import { useIsTouchDevice } from '../../../hooks/useMediaQuery'
import type { DayNightState } from './DayNightController'

/**
 * The camera looks down on the village and never sees the sky, so the evening sky lives in a
 * soft band across the top of the screen: a navy wash, a small moon and a few quiet stars.
 */
const STAR_COUNT = 22
const STAR_COUNT_MOBILE = 12

type SkyElements = { band: HTMLDivElement; moon: HTMLDivElement; stars: HTMLDivElement }
let elements: SkyElements | null = null
let last = { band: -1, moon: -1, stars: -1, sky: '' }

const q = (v: number) => Math.round(v * 100) / 100

/** Called from the environment frame loop; writes only when a value visibly changes. */
export function updateNightSky(state: DayNightState) {
  if (!elements) return
  const band = q(state.darkness * 0.9)
  const moon = q(state.moon)
  const stars = q(state.stars)
  const sky = `#${state.sky.getHexString()}`
  if (band !== last.band) elements.band.style.opacity = String(band)
  if (sky !== last.sky) elements.band.style.setProperty('--dn-sky', sky)
  if (moon !== last.moon) {
    elements.moon.style.opacity = String(moon)
    elements.moon.style.transform = `translateY(${(1 - moon) * 10}px)`
  }
  if (stars !== last.stars) elements.stars.style.opacity = String(stars)
  last = { band, moon, stars, sky }
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

export function NightSky() {
  const touch = useIsTouchDevice()
  const band = useRef<HTMLDivElement>(null)
  const moon = useRef<HTMLDivElement>(null)
  const stars = useRef<HTMLDivElement>(null)

  const starList = useMemo(() => {
    const rand = seeded(11)
    const count = touch ? STAR_COUNT_MOBILE : STAR_COUNT
    return Array.from({ length: count }, (_, i) => ({
      left: 4 + rand() * 92,
      top: 5 + Math.pow(rand(), 1.4) * 20,
      size: rand() > 0.82 ? 2 : 1.25,
      delay: rand() * 6,
      duration: 4 + rand() * 5,
      key: i,
    }))
  }, [touch])

  useEffect(() => {
    if (!band.current || !moon.current || !stars.current) return
    elements = { band: band.current, moon: moon.current, stars: stars.current }
    last = { band: -1, moon: -1, stars: -1, sky: '' }
    return () => {
      elements = null
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[42vh]" aria-hidden>
      <div
        ref={band}
        className="absolute inset-0"
        style={{
          opacity: 0,
          background: 'linear-gradient(to bottom, var(--dn-sky, #141a2e) 0%, color-mix(in srgb, var(--dn-sky, #141a2e) 55%, transparent) 38%, transparent 100%)',
        }}
      />
      <div ref={stars} className="absolute inset-0" style={{ opacity: 0 }}>
        {starList.map((s) => (
          <span
            key={s.key}
            className="absolute rounded-full bg-[#f4efe2]"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              boxShadow: '0 0 4px rgba(244,239,226,0.6)',
              animation: `dn-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>
      <div ref={moon} className="absolute left-[64%] top-[7%]" style={{ opacity: 0 }}>
        <div
          className="h-3.5 w-3.5 rounded-full md:h-[17px] md:w-[17px]"
          style={{
            background: 'radial-gradient(circle at 36% 34%, #f6f1e4 0%, #e2dac6 60%, #c9c0aa 100%)',
            boxShadow: '0 0 10px 2px rgba(236,228,206,0.22), 0 0 44px 12px rgba(170,185,225,0.1)',
          }}
        />
      </div>
    </div>
  )
}
