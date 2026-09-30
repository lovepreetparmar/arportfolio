import Lenis from 'lenis'
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { ScrollTrigger } from '../utils/animations'
import { useReducedMotion } from '../hooks/useMediaQuery'

type SmoothScrollContextValue = {
  lenis: Lenis | null
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({ lenis: null })

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        if (arguments.length && value !== undefined) {
          lenis.scrollTo(value, { immediate: true })
        }
        return lenis.scroll
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      },
    })

    ScrollTrigger.defaults({ scroller: document.body })
    ScrollTrigger.refresh()

    return () => {
      lenis.destroy()
      lenisRef.current = null
      ScrollTrigger.scrollerProxy(document.body, {})
    }
  }, [reducedMotion])

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisRef.current }}>
      {children}
    </SmoothScrollContext.Provider>
  )
}

export function useLenis() {
  return useContext(SmoothScrollContext).lenis
}
