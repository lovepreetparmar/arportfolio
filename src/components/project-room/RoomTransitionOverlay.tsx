import { motion, AnimatePresence } from 'framer-motion'
import { useWorldState } from '../../context/WorldStateContext'

export function RoomTransitionOverlay() {
  const { journeyPhase } = useWorldState()
  const show = journeyPhase === 'entering' || journeyPhase === 'exiting'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[65] bg-[#0a0908]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
      )}
    </AnimatePresence>
  )
}
