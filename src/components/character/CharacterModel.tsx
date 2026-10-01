import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useState } from 'react'
import * as THREE from 'three'
import { useOptionalSitting } from '../world/benches/SittingContext'
import { ANUSHRI_BONES } from './anushriBoneNames'
import { CHARACTER_MODEL_URL } from './characterConfig'
import { characterSignals } from './characterSignals'
import { useLocomotionMixer } from './useLocomotionMixer'
import { SEATED, seatedArmWeight } from './sittingPose'
import type { CharacterRigRefs } from './useCharacterRefs'

/**
 * Joint positions of the prepared model (metres, feet on y = 0, facing +z, her right side at -x).
 * They must be re-measured if `public/models/anushri-character.glb` is regenerated from a different export.
 */
const J = {
  hips: 0.86,
  legX: 0.1,
  knee: 0.46,
  crotch: 0.75,
  chest: 1.12,
  shoulderX: 0.17,
  shoulder: 1.29,
  elbow: 0.99,
  armpit: 1.15,
  armInner: 0.13,
  handBottom: 0.69,
  jeansTop: 1.05,
  neck: 1.38,
}

type ArmRow = [y: number, axisX: number, halfX: number, axisZ: number, halfZ: number, bodySide: number]

/**
 * Measured arm cross-section by height and side: [y, centre |x|, half width, centre z, half depth, body side |x|].
 * The arms hang at her sides with the wrists sunk into the hips and the hands beside the thighs; her right arm (-x)
 * hangs further out and further back than her left. Outward-facing surface inside the body side belongs to the
 * waist / hips; the back of the arm and hand is always further out.
 */
const ARM_PROFILE: { right: ArmRow[]; left: ArmRow[] } = {
  right: [
    [0.68, 0.212, 0.041, 0.025, 0.048, 0.207],
    [0.76, 0.215, 0.035, 0.029, 0.04, 0.21],
    [0.82, 0.208, 0.038, 0.014, 0.042, 0.203],
    [0.88, 0.202, 0.042, -0.002, 0.043, 0.197],
    [0.94, 0.195, 0.045, -0.018, 0.044, 0.19],
    [1.0, 0.188, 0.048, -0.033, 0.045, 0.165],
    [1.06, 0.179, 0.046, -0.039, 0.043, 0.135],
    [1.12, 0.175, 0.042, -0.04, 0.052, 0.135],
    [1.16, 0.173, 0.046, -0.04, 0.06, 0.14],
    [1.22, 0.172, 0.05, -0.04, 0.07, 0.15],
  ],
  left: [
    [0.68, 0.194, 0.034, 0.057, 0.047, 0.189],
    [0.76, 0.2, 0.042, 0.058, 0.042, 0.195],
    [0.8, 0.208, 0.045, 0.045, 0.044, 0.203],
    [0.84, 0.214, 0.039, 0.036, 0.038, 0.209],
    [0.9, 0.196, 0.04, 0.016, 0.043, 0.191],
    [0.96, 0.186, 0.042, -0.001, 0.045, 0.18],
    [1.02, 0.175, 0.047, -0.019, 0.046, 0.14],
    [1.08, 0.168, 0.045, -0.028, 0.047, 0.125],
    [1.12, 0.165, 0.045, -0.028, 0.055, 0.13],
    [1.16, 0.168, 0.047, -0.033, 0.062, 0.135],
    [1.22, 0.17, 0.05, -0.035, 0.07, 0.15],
  ],
}

type ArmSection = [axisX: number, halfX: number, axisZ: number, halfZ: number, bodySide: number]

function armProfile(y: number, x: number): ArmSection {
  const rows = x < 0 ? ARM_PROFILE.right : ARM_PROFILE.left
  const first = rows[0]
  if (y <= first[0]) return first.slice(1) as ArmSection
  for (let i = 1; i < rows.length; i++) {
    const b = rows[i]
    if (y <= b[0]) {
      const a = rows[i - 1]
      const t = (y - a[0]) / (b[0] - a[0])
      return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t) as ArmSection
    }
  }
  return rows[rows.length - 1].slice(1) as ArmSection
}

/** Rig-space constants the controller animates around (see `CharacterRig` / `CharacterController`). */
const RIG_SCALE = 0.86
const RIG_HIPS_Y = 0.82
const RIG_CHEST_Y = 0.38
/** Her thighs are longer than the rig's, so the seated hip drop is scaled to keep her feet on the ground. */
const HIP_DROP = 1
/** Her arms are longer too; the rig's seated arms would leave her hands floating past her knees. */
const SEATED_ARMS = { upperArm: -0.1, upperArmIn: 0.15, elbow: -0.65 }

const BONE = {
  hips: 0,
  spine: 1,
  chest: 2,
  head: 3,
  armL: 4,
  elbowL: 5,
  armR: 6,
  elbowR: 7,
  legL: 8,
  kneeL: 9,
  legR: 10,
  kneeR: 11,
} as const
const BONE_COUNT = 12

const { smoothstep } = THREE.MathUtils

/**
 * Inside the arm/hand tube below the armpit. The generated mesh fuses the arms to the torso and the hands to the hips,
 * so this is also where it gets cut apart.
 */
function inArm(x: number, y: number, z: number, nx = 0) {
  const ax = Math.abs(x)
  const [axisX, halfX, axisZ, halfZ, bodySide] = armProfile(y, x)
  const u = (ax - axisX) / halfX
  const v = (z - axisZ) / halfZ
  if (u ** 4 + v ** 4 >= 1) return false
  // Where an arm presses on the waist or a hand on the hip, both surfaces share the tube; the body's faces outward.
  return !(ax < bodySide && nx * Math.sign(x) > 0.5)
}

const CUT_TOP = J.armpit - 0.01

/**
 * 1 for vertices that move with an arm below the armpit. The tube test alone strands scraps of palm and fingertip on the
 * body (and bits of hip on the arm), so any piece connected only to the other side is handed over to it.
 */
function labelArms(pos: THREE.BufferAttribute, normal: THREE.BufferAttribute | undefined, index: THREE.BufferAttribute) {
  const n = pos.count
  const tube = new Uint8Array(n)
  for (let v = 0; v < n; v++) {
    const y = pos.getY(v)
    tube[v] = y > J.handBottom && y < CUT_TOP && inArm(pos.getX(v), y, pos.getZ(v), normal?.getX(v) ?? 0) ? 1 : 0
  }

  const parent = Int32Array.from({ length: n }, (_, i) => i)
  const find = (a: number) => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]]
      a = parent[a]
    }
    return a
  }
  const join = (a: number, b: number) => {
    if (tube[a] === tube[b]) parent[find(a)] = find(b)
  }
  // UV seams split vertices that share a position; weld them so pieces connect across seams.
  const byPosition = new Map<string, number>()
  for (let v = 0; v < n; v++) {
    const key = `${Math.round(pos.getX(v) * 1e5)},${Math.round(pos.getY(v) * 1e5)},${Math.round(pos.getZ(v) * 1e5)}`
    const first = byPosition.get(key)
    if (first === undefined) byPosition.set(key, v)
    else join(v, first)
  }
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    const b = index.getX(i + 1)
    const c = index.getX(i + 2)
    join(a, b)
    join(b, c)
    join(a, c)
  }

  const size = new Map<number, number>()
  const top = new Map<number, number>()
  for (let v = 0; v < n; v++) {
    const r = find(v)
    size.set(r, (size.get(r) ?? 0) + 1)
    top.set(r, Math.max(top.get(r) ?? -Infinity, pos.getY(v)))
  }
  let body = -1
  for (let v = 0; v < n; v++) {
    const r = find(v)
    if (!tube[v] && (body < 0 || size.get(r)! > size.get(body)!)) body = r
  }
  // The body is one piece and each real arm reaches up past the elbow; anything else is a stranded scrap.
  const arm = new Uint8Array(n)
  for (let v = 0; v < n; v++) {
    const r = find(v)
    arm[v] = tube[v] ? (top.get(r)! > J.elbow ? 1 : 0) : r === body ? 0 : 1
  }
  return arm
}

/**
 * The generator painted sleeve and skin onto the hips where the arms and hands pressed against them, which shows as dark
 * streaks once an arm moves away. Those hip vertices borrow the texture of the nearest denim instead (and the arms borrow
 * sleeve or skin back where denim was painted on them).
 */
type TexelReader = (u: number, v: number) => [r: number, g: number, b: number]

function texelReader(image: CanvasImageSource | undefined, size = 512): TexelReader | null {
  if (!image || typeof OffscreenCanvas === 'undefined') return null
  const ctx = new OffscreenCanvas(size, size).getContext('2d')
  if (!ctx) return null
  ctx.drawImage(image, 0, 0, size, size)
  const px = ctx.getImageData(0, 0, size, size).data
  return (u, v) => {
    const x = THREE.MathUtils.clamp(Math.floor(u * size), 0, size - 1)
    const y = THREE.MathUtils.clamp(Math.floor(v * size), 0, size - 1)
    const i = (y * size + x) * 4
    return [px[i], px[i + 1], px[i + 2]]
  }
}

const isDenim = ([r, , b]: [number, number, number]) => b - r > 13 && b > 90

function patchHipTexture(pos: THREE.BufferAttribute, uv: THREE.BufferAttribute, armSide: Uint8Array, read: TexelReader) {
  const denim: number[] = []
  const painted: number[] = []
  // The reverse happens too: denim painted on fingertips and the inside of the wrists where they touched the jeans.
  const armClean: number[] = []
  const armDenim: number[] = []
  for (let v = 0; v < pos.count; v++) {
    const y = pos.getY(v)
    const ax = Math.abs(pos.getX(v))
    if (y < J.handBottom - 0.04 || y > J.jeansTop) continue
    const blue = isDenim(read(uv.getX(v), uv.getY(v)))
    if (armSide[v]) {
      ;(blue ? armDenim : armClean).push(v)
      continue
    }
    const [axisX, halfX, axisZ, halfZ] = armProfile(y, pos.getX(v))
    if (ax < axisX - halfX * 1.5 || ax > axisX || Math.abs(pos.getZ(v) - axisZ) > halfZ * 1.5) continue
    ;(blue ? denim : painted).push(v)
  }

  // Nearest in texture space among nearby sources, so the patch stays within the same texture island and doesn't streak.
  const borrow = (targets: number[], sources: number[], reach: number) => {
    const cell = (v: number) => [pos.getX(v), pos.getY(v), pos.getZ(v)].map((c) => Math.floor(c / reach))
    const grid = new Map<string, number[]>()
    for (const s of sources) {
      const key = cell(s).join()
      const list = grid.get(key)
      if (list) list.push(s)
      else grid.set(key, [s])
    }
    for (const v of targets) {
      const [cx, cy, cz] = cell(v)
      let best = -1
      let bestD = Infinity
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            for (const s of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
              const d3 =
                (pos.getX(s) - pos.getX(v)) ** 2 + (pos.getY(s) - pos.getY(v)) ** 2 + (pos.getZ(s) - pos.getZ(v)) ** 2
              if (d3 > reach ** 2) continue
              const d = (uv.getX(s) - uv.getX(v)) ** 2 + (uv.getY(s) - uv.getY(v)) ** 2
              if (d < bestD) {
                bestD = d
                best = s
              }
            }
          }
      if (best >= 0) uv.setXY(v, uv.getX(best), uv.getY(best))
    }
  }
  borrow(painted, denim, 0.08)
  borrow(armDenim, armClean, 0.04)
  uv.needsUpdate = true
}

function vertexWeights(x: number, y: number, tube: number, out: Float32Array) {
  out.fill(0)
  const ax = Math.abs(x)
  const left = x < 0

  // Below the armpit the arm tube decides; above it the shoulder is clear of the torso, so a lateral cut works.
  const lateral = smoothstep(ax, J.armInner, J.armInner + 0.025)
  const arm =
    THREE.MathUtils.lerp(tube, lateral, smoothstep(y, J.armpit - 0.01, J.armpit + 0.06)) *
    (1 - smoothstep(y, J.shoulder - 0.02, J.shoulder + 0.07))
  if (arm > 0) {
    const fore = 1 - smoothstep(y, J.elbow - 0.05, J.elbow + 0.05)
    out[left ? BONE.elbowL : BONE.elbowR] += arm * fore
    out[left ? BONE.armL : BONE.armR] += arm * (1 - fore)
  }

  const body = 1 - arm
  const leg = (1 - smoothstep(y, J.crotch - 0.04, J.crotch + 0.1)) * body
  if (leg > 0) {
    const sideL = 1 - smoothstep(x, -0.02, 0.02)
    const shin = 1 - smoothstep(y, J.knee - 0.05, J.knee + 0.05)
    out[BONE.kneeL] += leg * sideL * shin
    out[BONE.legL] += leg * sideL * (1 - shin)
    out[BONE.kneeR] += leg * (1 - sideL) * shin
    out[BONE.legR] += leg * (1 - sideL) * (1 - shin)
  }

  const torso = body - leg
  const head = smoothstep(y, J.neck - 0.03, J.neck + 0.04)
  const chest = smoothstep(y, J.chest - 0.1, J.chest + 0.04) * (1 - head)
  const spine = smoothstep(y, J.hips + 0.06, J.hips + 0.18) * (1 - head - chest)
  out[BONE.head] += torso * head
  out[BONE.chest] += torso * chest
  out[BONE.spine] += torso * spine
  out[BONE.hips] += torso * (1 - head - chest - spine)
}

function buildSkeleton() {
  const names = [
    ANUSHRI_BONES.hips,
    ANUSHRI_BONES.spine,
    ANUSHRI_BONES.chest,
    ANUSHRI_BONES.head,
    ANUSHRI_BONES.leftArm,
    ANUSHRI_BONES.leftForeArm,
    ANUSHRI_BONES.rightArm,
    ANUSHRI_BONES.rightForeArm,
    ANUSHRI_BONES.leftUpLeg,
    ANUSHRI_BONES.leftLeg,
    ANUSHRI_BONES.rightUpLeg,
    ANUSHRI_BONES.rightLeg,
  ]
  const bones = names.map((name) => {
    const b = new THREE.Bone()
    b.name = name
    return b
  })
  const place = (i: number, parent: number | null, x: number, y: number) => {
    bones[i].position.set(x, y, 0)
    if (parent !== null) bones[parent].add(bones[i])
  }
  place(BONE.hips, null, 0, J.hips)
  place(BONE.spine, BONE.hips, 0, 0)
  place(BONE.chest, BONE.spine, 0, J.chest - J.hips)
  place(BONE.head, BONE.chest, 0, J.neck - J.chest)
  place(BONE.armL, BONE.chest, -J.shoulderX, J.shoulder - J.chest)
  place(BONE.elbowL, BONE.armL, 0, J.elbow - J.shoulder)
  place(BONE.armR, BONE.chest, J.shoulderX, J.shoulder - J.chest)
  place(BONE.elbowR, BONE.armR, 0, J.elbow - J.shoulder)
  place(BONE.legL, BONE.hips, -J.legX, 0)
  place(BONE.kneeL, BONE.legL, 0, J.knee - J.hips)
  place(BONE.legR, BONE.hips, J.legX, 0)
  place(BONE.kneeR, BONE.legR, 0, J.knee - J.hips)
  return bones
}

/**
 * A denim vertex representative of the jeans around an opening (upper-middle brightness, 1.5–5 cm out from the rim).
 * The rim itself sits in the crease where the arm pressed, which the generator shaded darker than the rest of the wash.
 */
function surroundingDenim(
  pos: THREE.BufferAttribute,
  uv: THREE.BufferAttribute,
  armSide: Uint8Array,
  rim: number[],
  read: TexelReader,
) {
  const near = rim.filter((v) => pos.getY(v) < J.jeansTop)
  if (!near.length) return -1
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (const v of near) {
    const p = [pos.getX(v), pos.getY(v), pos.getZ(v)]
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[k] - 0.05)
      hi[k] = Math.max(hi[k], p[k] + 0.05)
    }
  }
  const found: [number, number][] = []
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v)
    const y = pos.getY(v)
    const z = pos.getZ(v)
    if (armSide[v] || y >= J.jeansTop || x < lo[0] || x > hi[0] || y < lo[1] || y > hi[1] || z < lo[2] || z > hi[2]) continue
    let d = Infinity
    for (const r of near) d = Math.min(d, (pos.getX(r) - x) ** 2 + (pos.getY(r) - y) ** 2 + (pos.getZ(r) - z) ** 2)
    if (d < 0.015 ** 2 || d > 0.05 ** 2) continue
    const c = read(uv.getX(v), uv.getY(v))
    if (isDenim(c)) found.push([c[0] + c[1] + c[2], v])
  }
  if (!found.length) return -1
  found.sort((a, b) => a[0] - b[0])
  return found[Math.floor(found.length * 0.7)][1]
}

/**
 * The generated mesh is one closed skin wrapped around arm and torso together, so cutting them apart leaves the flank
 * under each arm (and the hip under each hand) open. Each opening is closed by stitching its two sides together
 * bottom-up. Every stitched triangle samples a single texel: rim neighbours often lie on different islands of the
 * texture atlas, and interpolating between them would smear unrelated texture across the gap. On the body that texel
 * is the rim's most typical denim (or darkest top, above the waistband), since the rim itself carries sleeve paint.
 */
function capOpenings(
  geometry: THREE.BufferGeometry,
  triangles: number[],
  armSide: Uint8Array,
  read: TexelReader | null,
  readFull: TexelReader | null,
) {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined
  const n = pos.count
  const weld = new Int32Array(n)
  const byPosition = new Map<string, number>()
  for (let v = 0; v < n; v++) {
    const key = `${Math.round(pos.getX(v) * 1e5)},${Math.round(pos.getY(v) * 1e5)},${Math.round(pos.getZ(v) * 1e5)}`
    const first = byPosition.get(key)
    weld[v] = first ?? v
    if (first === undefined) byPosition.set(key, v)
  }

  const edgeUses = new Map<number, number>()
  for (let i = 0; i < triangles.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = weld[triangles[i + k]]
      const b = weld[triangles[i + ((k + 1) % 3)]]
      const key = Math.min(a, b) * n + Math.max(a, b)
      edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1)
    }
  }
  // Rim edges are used by one triangle; a rim edge joining arm to body belongs to neither opening.
  const rim = new Map<number, number[]>()
  const link = (a: number, b: number) => {
    const list = rim.get(a)
    if (list) list.push(b)
    else rim.set(a, [b])
  }
  for (const [key, uses] of edgeUses) {
    const a = Math.floor(key / n)
    const b = key % n
    if (uses !== 1 || armSide[a] !== armSide[b]) continue
    link(a, b)
    link(b, a)
  }

  const added: number[] = []
  const texelOf: number[] = []
  const seen = new Set<number>()
  for (const start of rim.keys()) {
    if (seen.has(start)) continue
    // Walk the rim from one end (or anywhere, for a closed loop).
    let end = start
    const stack = [start]
    const piece = new Set([start])
    while (stack.length) {
      const v = stack.pop()!
      if (rim.get(v)!.length === 1) end = v
      for (const w of rim.get(v)!) {
        if (!piece.has(w)) {
          piece.add(w)
          stack.push(w)
        }
      }
    }
    // Rims can touch themselves where the cut pinches, so walk edges (an Euler trail) rather than vertices.
    const walked = new Set<number>()
    const edge = (a: number, b: number) => Math.min(a, b) * n + Math.max(a, b)
    const trail = [end]
    const path: number[] = []
    while (trail.length) {
      const v = trail[trail.length - 1]
      const w = rim.get(v)!.find((u) => !walked.has(edge(v, u)))
      if (w === undefined) path.push(trail.pop()!)
      else {
        walked.add(edge(v, w))
        trail.push(w)
      }
    }
    path.reverse()
    for (const v of piece) seen.add(v)
    const closed = path.length > 3 && path[0] === path[path.length - 1]
    if (closed) path.pop()
    if (path.length < 4) continue

    // Split into two sides that both run upward from the lowest point, then zip them together.
    const lowest = (list: number[]) => list.reduce((best, v, i) => (pos.getY(v) < pos.getY(list[best]) ? i : best), 0)
    let sideA: number[]
    let sideB: number[]
    if (closed) {
      const low = lowest(path)
      const loop = [...path.slice(low), ...path.slice(0, low)]
      const high = loop.reduce((best, v, i) => (pos.getY(v) > pos.getY(loop[best]) ? i : best), 0)
      sideA = loop.slice(0, high + 1)
      sideB = [loop[0], ...loop.slice(high).reverse()]
    } else {
      // An open rim ends where it meets the arm; both ends are above the bottom of the opening.
      const low = lowest(path)
      if (low === 0 || low === path.length - 1) continue
      sideA = path.slice(0, low + 1).reverse()
      sideB = path.slice(low)
    }

    let denim = -1
    let dark = -1
    if (read && uv && !armSide[path[0]]) {
      let bestDark = Infinity
      for (const v of path) {
        if (pos.getY(v) < J.jeansTop) continue
        const c = read(uv.getX(v), uv.getY(v))
        if (c[0] + c[1] + c[2] < bestDark) [bestDark, dark] = [c[0] + c[1] + c[2], v]
      }
      denim = surroundingDenim(pos, uv, armSide, path, readFull ?? read)
    }
    const stitch = (a: number, b: number, c: number) => {
      const y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3
      // Wind it to face away from the body's (or arm's) axis, or double-sided lighting shades it as a back face.
      const [ux, uy, uz] = [pos.getX(b) - pos.getX(a), pos.getY(b) - pos.getY(a), pos.getZ(b) - pos.getZ(a)]
      const [vx, vy, vz] = [pos.getX(c) - pos.getX(a), pos.getY(c) - pos.getY(a), pos.getZ(c) - pos.getZ(a)]
      let rx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3
      let rz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3
      if (armSide[a]) {
        const [axisX, , axisZ] = armProfile(y, rx)
        rx -= Math.sign(rx) * axisX
        rz -= axisZ
      }
      if ((uy * vz - uz * vy) * rx + (ux * vy - uy * vx) * rz < 0) added.push(a, c, b)
      else added.push(a, b, c)
      const flat = y < J.jeansTop ? denim : dark
      texelOf.push(flat >= 0 ? flat : a)
    }
    let i = 0
    let j = 0
    while (i < sideA.length - 1 || j < sideB.length - 1) {
      const advanceA =
        j >= sideB.length - 1 || (i < sideA.length - 1 && pos.getY(sideA[i + 1]) <= pos.getY(sideB[j + 1]))
      if (advanceA) {
        stitch(sideA[i], sideB[j], sideA[i + 1])
        i++
      } else {
        stitch(sideA[i], sideB[j], sideB[j + 1])
        j++
      }
    }
  }
  const stitched = added.length

  // Hip patching can leave a triangle's corners on different atlas islands, all denim but with hand paint in between.
  const kept: number[] = []
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = [triangles[i], triangles[i + 1], triangles[i + 2]]
    const y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3
    const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3
    const smeared =
      read &&
      uv &&
      !armSide[a] &&
      !armSide[b] &&
      !armSide[c] &&
      y > J.handBottom - 0.04 &&
      y < J.jeansTop &&
      Math.abs(x) > 0.12 &&
      [a, b, c].every((v) => isDenim(read(uv.getX(v), uv.getY(v)))) &&
      [
        [a, b, c],
        [a, b],
        [b, c],
        [c, a],
      ].some((vs) => {
        const u = vs.reduce((s, v) => s + uv.getX(v), 0) / vs.length
        const w = vs.reduce((s, v) => s + uv.getY(v), 0) / vs.length
        return !isDenim(read(u, w))
      })
    if (!smeared) {
      kept.push(a, b, c)
      continue
    }
    added.push(a, b, c)
    texelOf.push(a)
  }
  if (!added.length) return triangles

  // Added triangles get their own vertices with a flat texel; stitched ones also face away from the body's or arm's axis.
  const extra = added.length
  const attributes = Object.entries(geometry.attributes)
  for (const [name, attr] of attributes) {
    const size = attr.itemSize
    const data = name === 'skinIndex' ? new Uint16Array((n + extra) * size) : new Float32Array((n + extra) * size)
    for (let v = 0; v < n; v++) for (let k = 0; k < size; k++) data[v * size + k] = attr.getComponent(v, k)
    for (let t = 0; t < extra; t++) {
      const src = added[t]
      const from = name === 'uv' ? texelOf[Math.floor(t / 3)] : src
      for (let k = 0; k < size; k++) data[(n + t) * size + k] = attr.getComponent(from, k)
    }
    if (name === 'normal') {
      for (let t = 0; t < stitched; t++) {
        const src = added[t]
        let x = pos.getX(src)
        let z = pos.getZ(src)
        if (armSide[src]) {
          const [axisX, , axisZ] = armProfile(pos.getY(src), x)
          x -= Math.sign(x) * axisX
          z -= axisZ
        }
        const l = Math.hypot(x, z) || 1
        data.set([x / l, 0, z / l], (n + t) * 3)
      }
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(data, size, attr.normalized))
  }
  return [...kept, ...Array.from({ length: extra }, (_, t) => n + t)]
}

function createSkinnedCharacter(scene: THREE.Object3D) {
  let source: THREE.Mesh | null = null
  scene.traverse((o) => {
    if (!source && (o as THREE.Mesh).isMesh) source = o as THREE.Mesh
  })
  if (!source) throw new Error('Character model has no mesh')
  const src = source as THREE.Mesh

  const geometry = src.geometry.clone()
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const index = geometry.getIndex()
  if (!index) throw new Error('Character model must be indexed')
  const armSide = labelArms(pos, geometry.getAttribute('normal') as THREE.BufferAttribute | undefined, index)

  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const w = new Float32Array(BONE_COUNT)
  const order = Array.from({ length: BONE_COUNT }, (_, i) => i)
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v)
    const y = pos.getY(v)
    const z = pos.getZ(v)
    vertexWeights(x, y, y < CUT_TOP ? armSide[v] : inArm(x, y, z) ? 1 : 0, w)
    order.sort((a, b) => w[b] - w[a])
    const total = w[order[0]] + w[order[1]] + w[order[2]] + w[order[3]] || 1
    for (let k = 0; k < 4; k++) {
      skinIndex[v * 4 + k] = order[k]
      skinWeight[v * 4 + k] = w[order[k]] / total
    }
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))

  // Drop the triangles bridging an arm to the body so arms and hands can move away without stretching a web.
  const kept: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    const b = index.getX(i + 1)
    const c = index.getX(i + 2)
    const below = pos.getY(a) < CUT_TOP && pos.getY(b) < CUT_TOP && pos.getY(c) < CUT_TOP
    if (below && (armSide[a] !== armSide[b] || armSide[b] !== armSide[c])) continue
    kept.push(a, b, c)
  }

  const material = (src.material as THREE.MeshStandardMaterial).clone()
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined
  const image = material.map?.image as CanvasImageSource | undefined
  const read = texelReader(image)
  if (uv && read) patchHipTexture(pos, uv, armSide, read)
  // Patches show one texel at full size, where denim is all light and dark threads; pick it from the real pixels.
  const fullSize = Math.min((image as ImageBitmap | undefined)?.width || 2048, 2048)
  geometry.setIndex(capOpenings(geometry, kept, armSide, read, read && texelReader(image, fullSize)))
  material.side = THREE.DoubleSide
  material.metalness = 0
  material.metalnessMap = null
  material.roughness = 0.85
  material.roughnessMap = null

  const mesh = new THREE.SkinnedMesh(geometry, material)
  const bones = buildSkeleton()
  mesh.add(bones[BONE.hips])
  mesh.updateMatrixWorld(true)
  mesh.bind(new THREE.Skeleton(bones))
  mesh.frustumCulled = false
  return { mesh, bones }
}

type RefKey = keyof CharacterRigRefs
const ROTATION_SOURCES: [number, RefKey][] = [
  [BONE.hips, 'hips'],
  [BONE.spine, 'spine'],
  [BONE.chest, 'chest'],
  [BONE.head, 'head'],
  [BONE.armL, 'leftArm'],
  [BONE.elbowL, 'leftHand'],
  [BONE.armR, 'rightArm'],
  [BONE.elbowR, 'rightHand'],
  [BONE.legL, 'leftLeg'],
  [BONE.kneeL, 'leftKnee'],
  [BONE.legR, 'rightLeg'],
  [BONE.kneeR, 'rightKnee'],
]
const ARMS: [number, number, number][] = [
  [BONE.armL, BONE.elbowL, -1],
  [BONE.armR, BONE.elbowR, 1],
]

/**
 * Photo-based character model, skinned at runtime and posed every frame from the procedural rig.
 * The rig keeps running as the animation driver with its meshes hidden, and stays visible if this fails to load.
 */
type BuiltCharacter = { mesh: THREE.SkinnedMesh; bones: THREE.Bone[] }
const headLook = new THREE.Quaternion()

export function CharacterModel({ refs }: { refs: CharacterRigRefs }) {
  const { scene } = useGLTF(CHARACTER_MODEL_URL)
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  const sittingRef = useOptionalSitting()
  useLocomotionMixer(built?.mesh ?? null)

  useEffect(() => {
    let cancelled = false
    setBuilt(null)
    const run = () => {
      if (cancelled) return
      try {
        setBuilt(createSkinnedCharacter(scene))
      } catch (err) {
        console.error('[Character] Failed to build skinned mesh', err)
      }
    }
    const id = window.setTimeout(run, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [scene])

  useLayoutEffect(() => {
    if (!built) return
    const rigBody = refs.hips.current
    if (rigBody) rigBody.visible = false
    characterSignals.modelReady = true
    const { mesh } = built
    return () => {
      characterSignals.modelReady = false
      if (rigBody) rigBody.visible = true
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
  }, [refs, built])

  useFrame(() => {
    if (!built) return
    const { mesh, bones } = built
    const root = refs.root.current
    const hips = refs.hips.current
    const chest = refs.chest.current
    const head = refs.head.current
    if (!root || !hips || !chest) return
    mesh.position.copy(root.position)

    const sitAmount = sittingRef?.current.amount ?? 0
    const skeletal = characterSignals.locomotion === 'skeletal' && sitAmount < 0.04

    if (!skeletal) {
      mesh.rotation.y = 0
      for (const [bone, key] of ROTATION_SOURCES) {
        const src = refs[key].current
        if (src) bones[bone].rotation.copy(src.rotation)
      }
    } else {
      mesh.rotation.y = hips.rotation.y
      if (head) bones[BONE.head].quaternion.multiply(headLook.setFromEuler(head.rotation))
    }

    const arms = seatedArmWeight(sitAmount)
    if (arms > 0) {
      for (const [upper, elbow, side] of ARMS) {
        bones[upper].rotation.x += (SEATED_ARMS.upperArm - SEATED.upperArm) * arms
        bones[upper].rotation.z -= side * (SEATED_ARMS.upperArmIn - SEATED.upperArmIn) * arms
        bones[elbow].rotation.x += (SEATED_ARMS.elbow - SEATED.elbow) * arms
      }
    }
    if (!skeletal) {
      bones[BONE.hips].position.set(0, J.hips + (hips.position.y - RIG_HIPS_Y) * HIP_DROP, 0)
      bones[BONE.chest].position.y = J.chest - J.hips + (chest.position.y - RIG_CHEST_Y) * RIG_SCALE
    }
  })

  if (!built) return null
  return <primitive object={built.mesh} />
}

useGLTF.preload(CHARACTER_MODEL_URL)
