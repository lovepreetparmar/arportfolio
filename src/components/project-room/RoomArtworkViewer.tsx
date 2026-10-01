import { useCallback } from 'react'
import { audioManager } from '../../audio/AudioManager'
import { ProjectImageViewer } from './ProjectImageViewer'
import { updateRoomView, useRoomView } from './roomSpace'

/** Full-size view of an artwork chosen inside a project room (a second click on a focused frame). */
export function RoomArtworkViewer() {
  const { items, viewerIndex } = useRoomView()
  const total = items.length
  const item = viewerIndex !== null ? (items[viewerIndex] ?? null) : null

  const close = useCallback(() => {
    updateRoomView({ viewerIndex: null })
    audioManager.play('imageClose')
  }, [])
  const step = useCallback(
    (by: number) => {
      if (viewerIndex === null || total === 0) return
      updateRoomView({ viewerIndex: (viewerIndex + by + total) % total })
    },
    [viewerIndex, total],
  )
  const prev = useCallback(() => step(-1), [step])
  const next = useCallback(() => step(1), [step])

  return <ProjectImageViewer item={item} index={viewerIndex ?? 0} total={total} onClose={close} onPrev={prev} onNext={next} />
}
