import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function pinScrub(
  trigger: Element,
  target: gsap.TweenTarget,
  vars: gsap.TweenVars,
  end = '+=120%',
) {
  return gsap.to(target, {
    ...vars,
    ease: 'none',
    scrollTrigger: {
      trigger,
      start: 'top top',
      end,
      scrub: true,
      pin: true,
      anticipatePin: 1,
    },
  })
}

export function revealOnScroll(trigger: Element, targets: gsap.TweenTarget) {
  return gsap.from(targets, {
    y: 60,
    opacity: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: 'power3.out',
    scrollTrigger: { trigger, start: 'top 78%' },
  })
}

export { gsap, ScrollTrigger }
