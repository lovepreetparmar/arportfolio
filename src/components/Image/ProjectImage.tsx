import clsx from 'clsx'
import { useState } from 'react'

type ProjectImageProps = {
  src: string
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
}

export function ProjectImage({
  src,
  alt,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 70vw',
}: ProjectImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div
        className={clsx('flex items-center justify-center bg-charcoal/5 text-sm text-muted', className)}
        role="img"
        aria-label={alt}
      >
        Image unavailable
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
      className={className}
      onError={() => setError(true)}
    />
  )
}
