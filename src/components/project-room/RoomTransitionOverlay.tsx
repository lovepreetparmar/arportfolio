import { motion, AnimatePresence } from 'framer-motion'
import { useWorldState } from '../../context/WorldStateContext'
import { useReducedMotion } from '../../hooks/useMediaQuery'

/** Brief dark veil while she passes through a doorway between the world and a project room. */
export function RoomTransitionOverlay() {
  const { veil } = useWorldState()
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {veil && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[65] bg-[#0a0908]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.12 : 0.3, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden
        />
      )}
    </AnimatePresence>
  )
}
