import { useEffect, useRef } from 'react'

export function useCharacterKeyboard() {
  const keys = useRef(new Set<string>())

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      keys.current.add(e.key.toLowerCase())
    }
    const onUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  return keys
}
