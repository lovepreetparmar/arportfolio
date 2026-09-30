import clsx from 'clsx'
import { useRef, type ReactNode } from 'react'
import { useReducedMotion } from '../../hooks/useMediaQuery'

type MagneticButtonProps = {
  children: ReactNode
  className?: string
  href?: string
  onClick?: () => void
  external?: boolean
}

export function MagneticButton({
  children,
  className,
  href,
  onClick,
  external,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()

  const onMove = (e: React.PointerEvent) => {
    if (reducedMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    ref.current.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`
  }

  const onLeave = () => {
    if (!ref.current) return
    ref.current.style.transform = ''
  }

  const base = clsx(
    'group relative inline-flex items-center gap-2 text-sm tracking-[0.18em] uppercase transition-transform duration-300',
    className,
  )

  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={base}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
        <span className="h-px w-8 bg-ink transition-all duration-300 group-hover:w-12" />
      </a>
    )
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      className={base}
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </button>
  )
}
