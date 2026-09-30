import { createContext, useContext, useState, type ReactNode } from 'react'

export type NavTheme = 'light' | 'dark'

const NavThemeContext = createContext<{
  theme: NavTheme
  setTheme: (t: NavTheme) => void
}>({ theme: 'light', setTheme: () => {} })

export function NavThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<NavTheme>('light')
  return (
    <NavThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </NavThemeContext.Provider>
  )
}

export function useNavTheme() {
  return useContext(NavThemeContext)
}
