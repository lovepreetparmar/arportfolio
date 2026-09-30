import { useSyncExternalStore } from 'react'
import { AmbientAudio } from './AmbientAudio'
import { CharacterAudio, type FootstepSurface } from './CharacterAudio'
import { InteractionAudio, type InteractionSound } from './InteractionAudio'
import { ProjectAudio, type RoomPreset } from './ProjectAudio'
import { glide } from './synth'

export const AUDIO_VOLUMES = {
  master: 0.5,
  ambient: 0.25,
  character: 0.35,
  interaction: 0.3,
  project: 0.2,
} as const

const FADE_OUT_MS = 400

type Graph = {
  ctx: AudioContext
  master: GainNode
  /** Outdoor ambience level (drops as the character goes inside). */
  world: GainNode
  /** Room tone level (rises as the character goes inside). */
  room: GainNode
}

/**
 * Single owner of the site's sound. Off by default: nothing is created until the visitor turns
 * sound on, and then one shared AudioContext feeds ambient, character, interaction and project
 * buses. Everything else only reports what is happening; the manager decides what is heard.
 */
class AudioManager {
  private graph: Graph | null = null
  private enabled = false
  private suspendTimer: ReturnType<typeof setTimeout> | null = null
  private releaseTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()

  private ambient = new AmbientAudio()
  private character = new CharacterAudio()
  private interaction = new InteractionAudio()
  private project = new ProjectAudio()

  /** Latest reported state, applied whenever sound is (re)enabled. */
  private mix = { day: 1, night: 0, world: 1, room: 0 }
  private roomPreset: RoomPreset | null = null

  get isEnabled() {
    return this.enabled
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  private ensureGraph(): Graph | null {
    if (this.graph) return this.graph
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor({ latencyHint: 'interactive' })
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    const bus = (volume: number) => {
      const g = ctx.createGain()
      g.gain.value = volume
      g.connect(master)
      return g
    }
    const ambientBus = bus(AUDIO_VOLUMES.ambient)
    const characterBus = bus(AUDIO_VOLUMES.character)
    const interactionBus = bus(AUDIO_VOLUMES.interaction)
    const projectBus = bus(AUDIO_VOLUMES.project)
    const world = ctx.createGain()
    world.gain.value = this.mix.world
    world.connect(ambientBus)
    const room = ctx.createGain()
    room.gain.value = this.mix.room
    room.connect(projectBus)

    this.character.attach(ctx, characterBus)
    this.interaction.attach(ctx, interactionBus)
    this.project.attach(ctx, room)
    this.graph = { ctx, master, world, room }
    return this.graph
  }

  /** Must be called from a user gesture (the sound toggle). */
  async enable() {
    if (this.enabled) return
    const graph = this.ensureGraph()
    if (!graph) return
    this.enabled = true
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer)
      this.suspendTimer = null
    }
    this.notify()
    try {
      await graph.ctx.resume()
    } catch {
      /* resume can reject if the page is closing */
    }
    if (!this.enabled) return
    this.ambient.start(graph.ctx, graph.world)
    this.ambient.setMix(this.mix.day, this.mix.night)
    this.project.setPreset(this.roomPreset)
    glide(graph.world.gain, this.mix.world, graph.ctx, 0.1)
    glide(graph.room.gain, this.mix.room, graph.ctx, 0.1)
    glide(graph.master.gain, AUDIO_VOLUMES.master, graph.ctx, 1.2)
  }

  disable() {
    if (!this.enabled) return
    this.enabled = false
    this.notify()
    const graph = this.graph
    if (!graph) return
    glide(graph.master.gain, 0, graph.ctx, FADE_OUT_MS / 1000)
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = null
      if (this.enabled) return
      this.ambient.stop()
      this.project.setPreset(null)
      graph.ctx.suspend().catch(() => {})
    }, FADE_OUT_MS + 100)
  }

  toggle() {
    if (this.enabled) this.disable()
    else void this.enable()
  }

  /** Day/night ambience weights from the day/night clock. */
  setEnvironment(day: number, night: number) {
    this.mix.day = day
    this.mix.night = night
    if (this.enabled) this.ambient.setMix(day, night)
  }

  /** Outdoor vs room levels for going in and out of a project. */
  setIndoor(world: number, room: number, seconds = 0.9) {
    this.mix.world = world
    this.mix.room = room
    const graph = this.graph
    if (!graph || !this.enabled) return
    glide(graph.world.gain, world, graph.ctx, seconds)
    glide(graph.room.gain, room, graph.ctx, seconds)
  }

  setRoom(preset: RoomPreset | null) {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer)
      this.releaseTimer = null
    }
    this.roomPreset = preset
    if (this.enabled) this.project.setPreset(preset)
  }

  /** Stops the room tone once it has faded out after leaving a project. */
  releaseRoom(afterSeconds: number) {
    if (this.releaseTimer) clearTimeout(this.releaseTimer)
    this.releaseTimer = setTimeout(() => {
      this.releaseTimer = null
      if (this.mix.room === 0) this.setRoom(null)
    }, afterSeconds * 1000)
  }

  footstep(surface: FootstepSurface) {
    if (this.enabled) this.character.step(surface)
  }

  play(sound: InteractionSound, delay = 0) {
    if (this.enabled) this.interaction.play(sound, delay)
  }

  dispose() {
    this.enabled = false
    if (this.suspendTimer) clearTimeout(this.suspendTimer)
    if (this.releaseTimer) clearTimeout(this.releaseTimer)
    this.ambient.stop()
    this.project.detach()
    this.character.detach()
    this.interaction.detach()
    this.graph?.ctx.close().catch(() => {})
    this.graph = null
    this.notify()
  }
}

export const audioManager = new AudioManager()

if (import.meta.hot) {
  import.meta.hot.dispose(() => audioManager.dispose())
}

export function useSoundEnabled() {
  return useSyncExternalStore(audioManager.subscribe, () => audioManager.isEnabled)
}
