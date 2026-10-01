import { useTexture } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { audioManager } from '../../audio/AudioManager'
import { useCursor } from '../../context/CursorContext'
import { useWorldState } from '../../context/WorldStateContext'
import { getProjectBySlug, type Project } from '../../data/projects'
import { getProjectWorldConfig, type ProjectGalleryItem, type ProjectRoomTheme, type ProjectWorldConfig } from '../../data/projectWorld'
import { damp } from '../character/CharacterAnimations'
import { Door, LocationContext } from '../world/buildings/BuildingKit'
import { dayNight } from '../world/daynight/DayNightController'
import { mapView, wasDrag } from '../world/mapNavigation'
import { WORLD_PALETTE } from '../world/worldMaterials'
import { RoomArtwork } from './RoomArtwork'
import { RoomPlaque, RoomWallText } from './RoomLabels'
import { ROOM_SPOTS } from './RoomLights'
import { planRoomProps, RoomProps } from './RoomProps'
import { layoutRoom, type ArtworkPlacement } from './roomLayout'
import {
  ROOM_DEPTH,
  ROOM_DOOR,
  ROOM_FOV,
  ROOM_HEIGHT,
  ROOM_ORIGIN,
  ROOM_WIDTH,
  clearRoomFocus,
  constrainToRoom,
  roomObstacles,
  roomView,
  updateRoomView,
  useRoomView,
} from './roomSpace'
import { FLOOR_TILE_METRES, floorTexture, imageFingerprint } from './roomTextures'

const WALL_THICKNESS = 0.2
/** Matches the hinge swing of the building doors outside. */
const DOOR_SWING = 1.3
/** Wall visible around a focused frame, as a multiple of its outer size. */
const FOCUS_BREATHING = 1.3
const HALF_W = ROOM_WIDTH / 2
const HALF_D = ROOM_DEPTH / 2

/** Equivalent of `target` within ±π of `current`, so the camera swings the short way round. */
function nearestAngle(current: number, target: number) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current))
}

function useWalkHandler() {
  const { setTarget, setPointer } = useWorldState()
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag(e)) return
    clearRoomFocus()
    const [x, z] = constrainToRoom(e.point.x, e.point.z)
    setTarget({ x, y: 0, z })
  }
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    setPointer({
      x: (e.nativeEvent.clientX / window.innerWidth) * 2 - 1,
      y: -(e.nativeEvent.clientY / window.innerHeight) * 2 + 1,
    })
  }
  return { onClick, onPointerMove }
}

/** Walls, floor and ceiling; clicking any of them walks her to the nearest open floor. */
export function RoomShell({ theme }: { theme: ProjectRoomTheme }) {
  const handlers = useWalkHandler()
  const floorMap = useMemo(() => {
    const tex = floorTexture(theme.floorType, theme.floorColor)
    tex.repeat.set(ROOM_WIDTH / FLOOR_TILE_METRES, ROOM_DEPTH / FLOOR_TILE_METRES)
    return tex
  }, [theme.floorType, theme.floorColor])
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.93 }), [theme.wallColor])
  const trim = useMemo(() => {
    const c = new THREE.Color(theme.wallColor)
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    c.setHSL(hsl.h, hsl.s, hsl.l > 0.5 ? hsl.l - 0.08 : hsl.l + 0.05)
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })
  }, [theme.wallColor])
  useEffect(() => () => {
    wall.dispose()
    trim.dispose()
  }, [wall, trim])

  const sideW = (ROOM_WIDTH - ROOM_DOOR.width) / 2
  const header = ROOM_HEIGHT - ROOM_DOOR.height
  const t = WALL_THICKNESS

  return (
    <group {...handlers}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial map={floorMap} roughness={theme.floorType === 'wood' ? 0.55 : 0.7} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT + t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[ROOM_WIDTH + 2 * t, t, ROOM_DEPTH + 2 * t]} />
        <meshStandardMaterial color={theme.ceilingColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -HALF_D - t / 2]} material={wall} castShadow receiveShadow>
        <boxGeometry args={[ROOM_WIDTH + 2 * t, ROOM_HEIGHT, t]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALF_W + t / 2), ROOM_HEIGHT / 2, 0]} material={wall} castShadow receiveShadow>
          <boxGeometry args={[t, ROOM_HEIGHT, ROOM_DEPTH]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`f${s}`}
          position={[s * (ROOM_DOOR.width / 2 + sideW / 2), ROOM_HEIGHT / 2, HALF_D + t / 2]}
          material={wall}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[sideW, ROOM_HEIGHT, t]} />
        </mesh>
      ))}
      <mesh position={[0, ROOM_DOOR.height + header / 2, HALF_D + t / 2]} material={wall} castShadow receiveShadow>
        <boxGeometry args={[ROOM_DOOR.width, header, t]} />
      </mesh>

      <mesh position={[0, 0.05, -HALF_D + 0.01]} material={trim}>
        <boxGeometry args={[ROOM_WIDTH, 0.1, 0.02]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} position={[s * (HALF_W - 0.01), 0.05, 0]} material={trim}>
          <boxGeometry args={[0.02, 0.1, ROOM_DEPTH]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`bf${s}`} position={[s * (ROOM_DOOR.width / 2 + 0.1 + sideW / 2), 0.05, HALF_D - 0.01]} material={trim}>
          <boxGeometry args={[sideW - 0.2, 0.1, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0, ROOM_HEIGHT - 0.03, -HALF_D + 0.03]} material={trim}>
        <boxGeometry args={[ROOM_WIDTH, 0.06, 0.06]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`c${s}`} position={[s * (HALF_W - 0.03), ROOM_HEIGHT - 0.03, 0]} material={trim}>
          <boxGeometry args={[0.06, 0.06, ROOM_DEPTH]} />
        </mesh>
      ))}
    </group>
  )
}

const DAY_GLASS = new THREE.Color()
const NIGHT_GLASS = new THREE.Color('#1c2440')
const WHITE = new THREE.Color('#ffffff')

/** Ceiling track lights (the visible source of the spots) and high frosted windows that follow the time of day. */
export const RoomFixtures = memo(function RoomFixtures({ theme }: { theme: ProjectRoomTheme }) {
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.6 }), [])
  useEffect(() => () => glass.dispose(), [glass])
  useFrame(() => {
    const { sky, darkness } = dayNight.state
    DAY_GLASS.copy(sky).lerp(WHITE, 0.45)
    glass.color.copy(DAY_GLASS).lerp(NIGHT_GLASS, darkness)
    glass.emissive.copy(glass.color)
    glass.emissiveIntensity = 0.25 + 0.75 * (1 - darkness)
  })
  const metal = theme.displayStyle === 'boutique' ? theme.frameColor : '#2a2a2a'
  const stripLength = ROOM_DEPTH - 2.4

  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT - 0.03, ROOM_SPOTS[0].position[2]]}>
        <boxGeometry args={[4.2, 0.035, 0.05]} />
        <meshStandardMaterial color={metal} roughness={0.5} metalness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALF_W - 1.45), ROOM_HEIGHT - 0.03, 0]}>
          <boxGeometry args={[0.05, 0.035, 4.6]} />
          <meshStandardMaterial color={metal} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {ROOM_SPOTS.map(({ position: [x, y, z], target: [tx, ty, tz] }, i) => {
        const dx = tx - x
        const dy = ty - y
        const dz = tz - z
        return (
          <group key={i} position={[x, y - 0.06, z]} rotation={[Math.atan2(-dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0, 'YXZ']}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.045, 0.16, 16]} />
              <meshStandardMaterial color={metal} roughness={0.45} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.081]}>
              <circleGeometry args={[0.042, 16]} />
              <meshBasicMaterial color="#fff6e6" toneMapped={false} />
            </mesh>
          </group>
        )
      })}
      {[-1, 1].map((s) => (
        <group key={`w${s}`} position={[s * (HALF_W - 0.004), ROOM_HEIGHT - 0.42, 0]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <mesh material={glass}>
            <planeGeometry args={[stripLength, 0.34]} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[-stripLength / 2 + (stripLength / 6) * i, 0, 0.012]}>
              <boxGeometry args={[0.035, 0.38, 0.024]} />
              <meshStandardMaterial color={metal} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
})

/** The room's own door: the same hinged door as the buildings outside, and the way back out. */
export function RoomDoor({ theme }: { theme: ProjectRoomTheme }) {
  const { insideRoom, doorOpenAmount, exitProjectRoom, journeyPhase } = useWorldState()
  const { setMode } = useCursor()
  const openRef = useRef(1)
  const innerLeaf = useRef<THREE.Group>(null)
  const ctx = useMemo(() => ({ openRef }), [])
  useFrame((_, delta) => {
    openRef.current = damp(openRef.current, insideRoom ? doorOpenAmount : 0, 9, Math.min(delta, 0.1))
    if (innerLeaf.current) innerLeaf.current.rotation.y = -openRef.current * DOOR_SWING
  })
  const leaf = theme.displayStyle === 'boutique' ? '#3b2a20' : theme.frameColor
  const casing = theme.frameColor
  const { width, height } = ROOM_DOOR

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag(e) || journeyPhase !== 'inRoom') return
    setMode('default')
    clearRoomFocus()
    exitProjectRoom()
  }

  return (
    <LocationContext.Provider value={ctx}>
      <group
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (journeyPhase === 'inRoom') setMode('project', 'Exit')
        }}
        onPointerOut={() => setMode('default')}
      >
        <Door width={width} height={height} z={HALF_D} color={leaf} frameColor={casing} entranceLight="none" />
        <group ref={innerLeaf} position={[-width / 2, 0, HALF_D + 0.03]}>
          <mesh position={[width * 0.86, height * 0.47, -0.06]}>
            <boxGeometry args={[0.025, 0.32, 0.025]} />
            <meshStandardMaterial color={WORLD_PALETTE.gold} roughness={0.3} metalness={0.8} />
          </mesh>
          {[-0.13, 0.13].map((dy) => (
            <mesh key={dy} position={[width * 0.86, height * 0.47 + dy, -0.04]}>
              <boxGeometry args={[0.018, 0.018, 0.04]} />
              <meshStandardMaterial color={WORLD_PALETTE.gold} roughness={0.3} metalness={0.8} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, height + 0.05, HALF_D - 0.015]}>
          <boxGeometry args={[width + 0.24, 0.1, 0.03]} />
          <meshStandardMaterial color={casing} roughness={0.6} metalness={theme.displayStyle === 'boutique' ? 0.7 : 0} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (width / 2 + 0.06), height / 2, HALF_D - 0.015]}>
            <boxGeometry args={[0.12, height, 0.03]} />
            <meshStandardMaterial color={casing} roughness={0.6} metalness={theme.displayStyle === 'boutique' ? 0.7 : 0} />
          </mesh>
        ))}
        <mesh position={[0, height / 2, HALF_D - 0.1]}>
          <boxGeometry args={[width + 0.3, height + 0.15, 0.3]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
      <mesh position={[0, 1.3, HALF_D + WALL_THICKNESS + 0.8]}>
        <boxGeometry args={[1.6, 2.6, 1.6]} />
        <meshStandardMaterial color="#e9dcc6" emissive="#f3e3c4" emissiveIntensity={0.35} side={THREE.BackSide} />
      </mesh>
    </LocationContext.Provider>
  )
}

type Exhibit = { item: ProjectGalleryItem; texture: THREE.Texture }

/** The artworks (each image file hung once), labels and props for one project. */
function RoomExhibition({ project, config, theme }: { project: Project; config: ProjectWorldConfig; theme: ProjectRoomTheme }) {
  const { setTarget } = useWorldState()
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const view = useRoomView()
  const items = useMemo(() => {
    const seen = new Set<string>()
    return config.gallery.filter((g) => !seen.has(g.src) && !!seen.add(g.src))
  }, [config])
  const textures = useTexture(items.map((g) => g.src))

  const exhibits = useMemo(() => {
    const seen = new Set<string>()
    const out: Exhibit[] = []
    items.forEach((item, i) => {
      const texture = textures[i]
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      const image = texture.image as HTMLImageElement | undefined
      const sig = image ? imageFingerprint(image) : item.src
      if (seen.has(sig)) return
      seen.add(sig)
      out.push({ item, texture })
    })
    return out
  }, [items, textures, gl])

  const layout = useMemo(
    () =>
      layoutRoom(
        exhibits.map(({ texture }) => {
          const image = texture.image as { width: number; height: number } | undefined
          return image && image.height > 0 ? image.width / image.height : 4 / 3
        }),
      ),
    [exhibits],
  )
  const props = useMemo(() => planRoomProps(theme, layout.rightWallFree), [theme, layout.rightWallFree])

  useEffect(() => {
    roomObstacles.length = 0
    roomObstacles.push(...props.map((p) => p.obstacle))
    updateRoomView({ items: exhibits.map((e) => e.item) })
    return () => {
      roomObstacles.length = 0
    }
  }, [props, exhibits])

  const select = (p: ArtworkPlacement) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag(e)) return
    if (roomView.focusIndex === p.index) {
      updateRoomView({ viewerIndex: p.index })
      audioManager.play('imageOpen')
      return
    }
    const [nx, nz] = p.normal
    const [tx, tz] = [-nz, nx]
    const options = [1, -1].map((s) => [p.x + nx * 1.55 + tx * 0.6 * s, p.z + nz * 1.55 + tz * 0.6 * s] as const)
    const [lx, lz] = Math.hypot(...options[0]) <= Math.hypot(...options[1]) ? options[0] : options[1]
    const [sx, sz] = constrainToRoom(ROOM_ORIGIN.x + lx, ROOM_ORIGIN.z + lz)
    const cx = ROOM_ORIGIN.x + p.x
    const cz = ROOM_ORIGIN.z + p.z
    setTarget({ x: sx, y: 0, z: sz })
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(ROOM_FOV / 2))
    const aspect = size.width / Math.max(1, size.height)
    const surround = 2 * (Math.min(p.width, p.height) * 0.1 + 0.045)
    const distance = THREE.MathUtils.clamp(
      FOCUS_BREATHING *
        Math.max((p.height + surround) / (2 * tanHalf), (p.width + surround) / (2 * tanHalf * aspect)),
      1.8,
      5.6,
    )
    const azimuth = nearestAngle(mapView.azimuth, Math.atan2(nx, nz))
    const polar = 1.4
    mapView.targetAzimuth = azimuth
    mapView.targetPolar = polar
    mapView.targetZoom = 1
    updateRoomView({
      focusIndex: p.index,
      focus: { x: cx, y: p.y, z: cz, azimuth, polar, distance },
      faceYaw: Math.atan2(cx - sx, cz - sz),
    })
  }

  const hero = layout.artworks[0]
  const heroOnly = layout.artworks.filter((a) => a.wall === 'back').length === 1
  const plaqueX = hero ? hero.width / 2 + Math.min(hero.width, hero.height) * 0.1 + 0.4 : 0

  return (
    <group>
      {layout.artworks.map((placement) => (
        <RoomArtwork
          key={placement.index}
          placement={placement}
          texture={exhibits[placement.index].texture}
          theme={theme}
          focused={view.focusIndex === placement.index}
          onSelect={select(placement)}
        />
      ))}
      {hero && heroOnly && plaqueX + 0.25 < HALF_W && (
        <group position={[plaqueX, 1.25, -HALF_D + 0.002]}>
          <RoomPlaque project={project} config={config} theme={theme} title={exhibits[0].item.title} />
        </group>
      )}
      <group position={[-HALF_W + 0.006, 1.62, layout.wallText.z]} rotation={[0, Math.PI / 2, 0]}>
        <RoomWallText project={project} config={config} theme={theme} width={layout.wallText.width} height={layout.wallText.height} />
      </group>
      <RoomProps props={props} theme={theme} heroTexture={exhibits[0]?.texture ?? null} />
    </group>
  )
}

/**
 * A project's walk-in exhibition room, built inside the world scene. Anushri, the camera, the
 * controls, the day/night clock and the audio are the same ones as outside; only the place changes.
 */
/** Escape steps back out: first out of a framed artwork, then out of the room. */
export function useRoomEscape() {
  const { exitProjectRoom } = useWorldState()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || roomView.viewerIndex !== null) return
      if (roomView.focusIndex !== null) clearRoomFocus()
      else exitProjectRoom()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [exitProjectRoom])
}

export function ProjectRoom({ slug }: { slug: string }) {
  const project = getProjectBySlug(slug)
  const config = useMemo(() => (project ? getProjectWorldConfig(project) : null), [project])
  useRoomEscape()

  if (!project || !config) return null
  const theme = config.room

  return (
    <group position={[ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z]}>
      <RoomShell theme={theme} />
      <RoomFixtures theme={theme} />
      <RoomDoor theme={theme} />
      <Suspense fallback={null}>
        <RoomExhibition project={project} config={config} theme={theme} />
      </Suspense>
    </group>
  )
}
