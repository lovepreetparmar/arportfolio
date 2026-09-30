import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useCursor } from '../../context/CursorContext'

type ArtworkFrameProps = {
  src: string
  alt: string
  to?: string
  className?: string
  imgClassName?: string
  style?: React.CSSProperties
  priority?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export function ArtworkFrame({
  src,
  alt,
  to,
  className,
  imgClassName,
  style,
  priority,
  ...rest
}: ArtworkFrameProps) {
  const { setMode } = useCursor()

  const img = (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={clsx('shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]', imgClassName)}
    />
  )

  const content = to ? (
    <Link
      to={to}
      onMouseEnter={() => setMode('project', 'View')}
      onMouseLeave={() => setMode('default')}
    >
      {img}
    </Link>
  ) : (
    img
  )

  return (
    <div className={className} style={style} {...rest}>
      {content}
    </div>
  )
}
