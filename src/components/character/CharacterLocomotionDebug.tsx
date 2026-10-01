import { useEffect, useState } from 'react'
import { characterSignals } from './characterSignals'

function debugEnabled() {
  if (!import.meta.env.DEV) return false
  try {
    return localStorage.getItem('anushri-locomotion-debug') === '1'
  } catch {
    return false
  }
}

/** Dev-only overlay: `localStorage.setItem('anushri-locomotion-debug','1')` then reload. */
export function CharacterLocomotionDebug() {
  const [on, setOn] = useState(debugEnabled)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!on) return
    let id = 0
    const loop = () => {
      setTick((t) => t + 1)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [on])

  useEffect(() => {
    const check = () => setOn(debugEnabled())
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  if (!on) return null

  void tick
  return (
    <div
      className="pointer-events-none fixed bottom-3 left-3 z-[9999] max-w-xs rounded-md bg-black/75 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-200"
      aria-hidden
    >
      <div>locomotion: {characterSignals.locomotion}</div>
      <div>state: {characterSignals.locMotionState}</div>
      <div>gait: {characterSignals.gait.toFixed(2)}</div>
      <div>speed: {characterSignals.speed.toFixed(2)} m/s</div>
      <div>playback: {characterSignals.animPlaybackRate.toFixed(2)}×</div>
      <div>walk clip: {characterSignals.walkClipDuration.toFixed(2)}s</div>
    </div>
  )
}
