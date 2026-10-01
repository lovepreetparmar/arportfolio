import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { ProjectGalleryItem } from '../../data/projectWorld'

type ProjectImageViewerProps = {
  item: ProjectGalleryItem | null
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function ProjectImageViewer({ item, index, total, onClose, onPrev, onNext }: ProjectImageViewerProps) {
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose, onPrev, onNext])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/80 p-4 md:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={item.title ?? 'Project image'}
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-full w-full max-w-5xl"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={item.src}
              alt={item.title ?? ''}
              className="max-h-[75vh] w-full object-contain shadow-2xl"
            />
            {(item.title || item.description) && (
              <div className="mt-6 text-canvas">
                {item.title && <p className="text-lg font-semibold tracking-tight">{item.title}</p>}
                {item.description && <p className="mt-2 max-w-xl text-sm text-white/75">{item.description}</p>}
                {total > 1 && (
                  <p className="mt-4 text-[10px] tracking-[0.25em] uppercase text-white/50">
                    {index + 1} / {total}
                  </p>
                )}
              </div>
            )}
            <div className="absolute -top-2 right-0 flex gap-4 md:top-0">
              {total > 1 && (
                <>
                  <button
                    type="button"
                    className="text-xs tracking-[0.2em] uppercase text-white/80"
                    onClick={onPrev}
                    aria-label="Previous image"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="text-xs tracking-[0.2em] uppercase text-white/80"
                    onClick={onNext}
                    aria-label="Next image"
                  >
                    Next
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-xs tracking-[0.2em] uppercase text-white"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
