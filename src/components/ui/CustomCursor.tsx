import clsx from 'clsx'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect } from 'react'
import { useCursor } from '../../context/CursorContext'
import { useIsTouchDevice } from '../../hooks/useMediaQuery'

export function CustomCursor() {
  const isTouch = useIsTouchDevice()
  const { mode, label } = useCursor()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const springX = useSpring(x, { stiffness: 500, damping: 40 })
  const springY = useSpring(y, { stiffness: 500, damping: 40 })

  useEffect(() => {
    if (isTouch) return
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [isTouch, x, y])

  if (isTouch) return null

  const showLabel = mode === 'project' || mode === 'link'

  return (
    <motion.div className="pointer-events-none fixed top-0 left-0 z-[9999] mix-blend-difference" style={{ x: springX, y: springY }} aria-hidden>
      <div
        className={clsx(
          'flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-canvas text-canvas',
          showLabel ? 'h-14 w-14 bg-ink text-[9px] tracking-[0.12em] uppercase' : 'h-1.5 w-1.5 bg-canvas',
        )}
      >
        {showLabel && (label || (mode === 'project' ? 'View →' : 'Open →'))}
      </div>
    </motion.div>
  )
}
