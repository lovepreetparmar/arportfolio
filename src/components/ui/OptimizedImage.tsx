import clsx from 'clsx'
import { useState } from 'react'

type OptimizedImageProps = {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  sizes?: string
  layoutId?: string
  onLoad?: () => void
}

export function OptimizedImage({
  src,
  alt,
  className,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, 50vw',
  onLoad,
}: OptimizedImageProps) {
  const [failed, setFailed] = useState(false)
  const webpSrc = src.replace(/\.(svg|png|jpe?g)$/i, '.webp')
  const showPicture = !src.endsWith('.svg') && webpSrc !== src

  if (failed) {
    return (
      <div
        className={clsx(
          'flex min-h-[240px] items-end bg-charcoal/5 p-6 text-sm text-muted',
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <span>Image unavailable — replace asset at {src}</span>
      </div>
    )
  }

  if (!showPicture) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={className}
        onLoad={onLoad}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        sizes={sizes}
        className={className}
        onLoad={onLoad}
        onError={() => setFailed(true)}
      />
    </picture>
  )
}
