import { createContext, useContext, useState, type ReactNode } from 'react'

export type CursorMode = 'default' | 'project' | 'image' | 'link'

type CursorState = {
  mode: CursorMode
  label: string
  setMode: (mode: CursorMode, label?: string) => void
}

const CursorContext = createContext<CursorState | null>(null)

export function CursorProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CursorMode>('default')
  const [label, setLabel] = useState('')

  const setMode = (next: CursorMode, nextLabel = '') => {
    setModeState(next)
    setLabel(nextLabel)
  }

  return (
    <CursorContext.Provider value={{ mode, label, setMode }}>
      {children}
    </CursorContext.Provider>
  )
}

export function useCursor() {
  const ctx = useContext(CursorContext)
  if (!ctx) throw new Error('useCursor must be used within CursorProvider')
  return ctx
}
