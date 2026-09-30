import { useEffect, useState } from 'react'
import { gsap } from '../../utils/animations'

export function MapOpening({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setVisible(false)
        onDone()
      },
    })
    tl.from('.open-title', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' })
    tl.to('.open-wrap', { opacity: 0, duration: 0.6, delay: 0.5 })
  }, [onDone])

  if (!visible) return null

  return (
    <div className="open-wrap fixed inset-0 z-[60] flex items-center justify-center bg-[#ece8e1]">
      <div className="open-title text-center">
        <p className="text-4xl font-bold tracking-tight md:text-6xl">ANUSHRI RAINA</p>
        <p className="mt-3 text-xs tracking-[0.35em] uppercase text-muted">Graphic Designer</p>
      </div>
    </div>
  )
}
