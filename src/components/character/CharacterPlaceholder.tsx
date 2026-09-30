import { Html } from '@react-three/drei'

type CharacterPlaceholderProps = {
  message?: string
}

export function CharacterPlaceholder({ message = 'Character model loading…' }: CharacterPlaceholderProps) {
  return (
    <Html center position={[0, 1.2, 0]} distanceFactor={8}>
      <p className="pointer-events-none select-none text-[10px] tracking-[0.28em] uppercase text-ink/45">
        {message}
      </p>
    </Html>
  )
}
