import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { gsap, revealLines } from '../../utils/animations'
import { useReducedMotion } from '../../hooks/useMediaQuery'

type SplitTextProps = {
  lines: string[]
  className?: string
  as?: 'h1' | 'h2' | 'p'
}

export function SplitText({ lines, className, as = 'h2' }: SplitTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const Tag = as

  useEffect(() => {
    if (!ref.current || reducedMotion) return
    const lineEls = ref.current.querySelectorAll('[data-line]')
    gsap.set(lineEls, { yPercent: 110, opacity: 0 })
    revealLines(lineEls, {
      trigger: ref.current,
      start: 'top 80%',
    })
  }, [reducedMotion, lines])

  return (
    <div ref={ref} className={className}>
      {lines.map((line) => (
        <div key={line} className="overflow-hidden">
          <Tag
            data-line
            className={clsx('block', !reducedMotion && 'will-change-transform')}
          >
            {line}
          </Tag>
        </div>
      ))}
    </div>
  )
}
