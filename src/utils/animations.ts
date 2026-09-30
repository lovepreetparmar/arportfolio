import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

export const motion = {
  duration: {
    fast: 0.45,
    base: 0.75,
    slow: 1.1,
  },
  ease: {
    out: 'power3.out',
    inOut: 'power2.inOut',
    expo: 'expo.out',
  },
}

export function fadeUp(
  targets: gsap.TweenTarget,
  options?: { delay?: number; stagger?: number; y?: number },
) {
  const { delay = 0, stagger = 0.08, y = 48 } = options ?? {}
  return gsap.from(targets, {
    y,
    opacity: 0,
    duration: motion.duration.base,
    ease: motion.ease.out,
    delay,
    stagger,
  })
}

export function revealLines(
  targets: gsap.TweenTarget,
  scrollTrigger?: ScrollTrigger.Vars,
) {
  return gsap.from(targets, {
    yPercent: 110,
    opacity: 0,
    duration: motion.duration.slow,
    ease: motion.ease.expo,
    stagger: 0.12,
    scrollTrigger,
  })
}
