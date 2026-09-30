import { useState } from 'react'
import { useMapCamera } from '../../context/MapCameraContext'
import { MiniMap } from './MiniMap'
import { projects } from '../../data/projects'
import { site } from '../../data/site'
type MapChromeProps = {
  onFlyToAbout: () => void
}

export function MapChrome({ onFlyToAbout }: MapChromeProps) {
  const { zoomAt, animateTo } = useMapCamera()
  const [indexOpen, setIndexOpen] = useState(false)

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-5 md:p-8">
        <div className="pointer-events-auto flex items-start justify-between">
          <p className="text-sm font-semibold tracking-tight">ANUSHRI RAINA</p>
          <div className="flex gap-6 text-xs tracking-[0.25em] uppercase">
            <button type="button" onClick={onFlyToAbout}>About</button>
            <button type="button" onClick={() => setIndexOpen(true)}>Index</button>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-[10px] tracking-[0.3em] text-muted uppercase">Drag to explore</p>
          <div className="pointer-events-auto flex flex-col items-end gap-3">
            <MiniMap />
            <div className="flex gap-2 text-xs tracking-[0.2em]">
              <button type="button" onClick={() => zoomAt(0.08, window.innerWidth / 2, window.innerHeight / 2)}>Zoom +</button>
              <button type="button" onClick={() => zoomAt(-0.08, window.innerWidth / 2, window.innerHeight / 2)}>Zoom −</button>
            </div>
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
                <li key={p.slug}>
                  <button
                    type="button"
                    className="flex w-full gap-4 py-2 text-left hover:opacity-50"
                    onClick={() => {
                      setIndexOpen(false)
                      animateTo({
                        x: p.position.x - window.innerWidth / 2 / 0.6,
                        y: p.position.y - window.innerHeight / 2 / 0.6,
                        zoom: 0.6,
                      })
                    }}
                  >
                    <span className="text-muted">{p.number}</span>
                    <span className="uppercase">{p.title}</span>
                  </button>
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
