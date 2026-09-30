import { motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { audioManager } from '../../audio/AudioManager'
import { getProjectBySlug } from '../../data/projects'
import { getProjectWorldConfig } from '../../data/projectWorld'
import { ProjectImageViewer } from './ProjectImageViewer'
import { JewelleryRoomInterior } from './environments/JewelleryRoomInterior'

type ProjectRoomProps = {
  slug: string
  onExit: () => void
}

export function ProjectRoom({ slug, onExit }: ProjectRoomProps) {
  const project = getProjectBySlug(slug)
  const config = project ? getProjectWorldConfig(project) : null
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const gallery = config?.gallery ?? []
  const viewerItem = viewerIndex !== null ? gallery[viewerIndex] ?? null : null

  const openViewer = useCallback((i: number) => {
    audioManager.play('imageOpen')
    setViewerIndex(i)
  }, [])
  const closeViewer = useCallback(() => {
    audioManager.play('imageClose')
    setViewerIndex(null)
  }, [])

  if (!project || !config) return null

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      role="region"
      aria-label={`${project.title} project room`}
    >
      {config.locationType === 'jewellery' ? (
        <JewelleryRoomInterior
          project={project}
          config={config}
          onOpenImage={openViewer}
          onExit={onExit}
        />
      ) : (
        <div className="flex min-h-full flex-col bg-canvas p-8">
          <button type="button" className="text-xs tracking-[0.2em] uppercase" onClick={onExit}>
            Exit
          </button>
          <h1 className="mt-8 text-3xl font-semibold">{project.title}</h1>
        </div>
      )}

      <ProjectImageViewer
        item={viewerItem}
        index={viewerIndex ?? 0}
        total={gallery.length}
        onClose={closeViewer}
        onPrev={() => setViewerIndex((i) => (i === null ? 0 : (i - 1 + gallery.length) % gallery.length))}
        onNext={() => setViewerIndex((i) => (i === null ? 0 : (i + 1) % gallery.length))}
      />
    </motion.div>
  )
}
