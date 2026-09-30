import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { useNavTheme } from '../../context/NavThemeContext'
import { useCursor } from '../../context/CursorContext'

const links = [
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/#about' },
  { label: 'Menu', href: '/#contact' },
]

export function Navigation() {
  const { theme } = useNavTheme()
  const location = useLocation()
  const { setMode } = useCursor()
  const dark = theme === 'dark'

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 left-0 z-[90] flex items-center justify-between px-5 py-5 mix-blend-difference md:px-10',
        dark ? 'text-cream' : 'text-ink',
      )}
    >
      <Link to="/" className="text-sm font-bold tracking-tight">ANUSHRI</Link>
      <nav aria-label="Primary">
        <ul className="flex gap-8">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-xs tracking-[0.28em] uppercase"
                onMouseEnter={() => setMode('link', 'Open →')}
                onMouseLeave={() => setMode('default')}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {location.pathname !== '/' && (
        <Link to="/" className="absolute right-5 hidden text-xs uppercase md:block">Close</Link>
      )}
    </header>
  )
}
