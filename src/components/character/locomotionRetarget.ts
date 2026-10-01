import * as THREE from 'three'
import { ANUSHRI_BONES as B } from './anushriBoneNames'

const SAMPLE_RATE = 30

type Mapping = {
  source: string
  target: string
  /** Child joints giving each bone's rest direction, so differing rest poses (T-pose vs arms down) line up. */
  sourceChild?: string
  targetDir?: [from: string, to: string]
}

type LimbSide = { arm: string; foreArm: string; upLeg: string; leg: string }

const TARGET_SIDES: LimbSide[] = [
  { arm: B.leftArm, foreArm: B.leftForeArm, upLeg: B.leftUpLeg, leg: B.leftLeg },
  { arm: B.rightArm, foreArm: B.rightForeArm, upLeg: B.rightUpLeg, leg: B.rightLeg },
]

export type RetargetedLocomotion = {
  walk: THREE.AnimationClip
  /** Ground speed (m/s) the walk cycle is animated for at timeScale 1. */
  walkSpeed: number
  /** Walk clip time at which her first foot strikes the ground. */
  strikeTime: number
}

function findSourceBone(root: THREE.Object3D, name: string) {
  let hit: THREE.Object3D | null = null
  root.traverse((o) => {
    if (hit) return
    const n = o.name.replace(/^mixamorig:?/, '')
    if (n === name) hit = o
  })
  return hit as THREE.Object3D | null
}

/** Rest transform of a target bone relative to the character (bones are in bind pose). */
function characterSpace(bone: THREE.Object3D) {
  const m = bone.matrix.clone()
  let p = bone.parent
  while (p && (p as THREE.Bone).isBone) {
    m.premultiply(p.matrix)
    p = p.parent
  }
  return m
}

/**
 * Bakes a Mixamo-style walk onto Anushri's runtime skeleton. Each source bone's world rotation relative to a
 * reference pose that matches her rest pose is applied to her bone in world space, then converted to local
 * rotations, so differing bone orientations, chain lengths, units and rest poses do not matter. Only a scaled
 * vertical bob and sideways sway of the hips is kept; forward motion stays with the character controller.
 */
export function retargetLocomotion(
  source: THREE.Object3D,
  walkClip: THREE.AnimationClip,
  targetBones: THREE.Bone[],
): RetargetedLocomotion | null {
  const byName = new Map(targetBones.map((b) => [b.name, b]))
  source.updateMatrixWorld(true)
  for (const b of targetBones) b.updateMatrix()

  const restMatrix = new Map(targetBones.map((b) => [b.name, characterSpace(b)]))
  const restPos = (name: string) => new THREE.Vector3().setFromMatrixPosition(restMatrix.get(name)!)
  const restQuat = (name: string) => new THREE.Quaternion().setFromRotationMatrix(restMatrix.get(name)!)

  const srcHips = findSourceBone(source, 'Hips')
  const srcLeftArm = findSourceBone(source, 'LeftArm')
  const srcLeftToe = findSourceBone(source, 'LeftToeBase') ?? findSourceBone(source, 'LeftFoot')
  if (!srcHips || !srcLeftArm || !srcLeftToe) return null

  const srcLeftX = srcLeftArm.getWorldPosition(new THREE.Vector3()).x
  const targetLeftOf = (side: LimbSide) => Math.sign(restPos(side.arm).x) === Math.sign(srcLeftX)
  const srcLeftTarget = TARGET_SIDES.find(targetLeftOf)!
  const srcRightTarget = TARGET_SIDES.find((s) => s !== srcLeftTarget)!

  const mappings: Mapping[] = [
    { source: 'Hips', target: B.hips },
    { source: 'Spine', target: B.spine },
    { source: 'Spine2', target: B.chest },
    { source: 'Head', target: B.head },
  ]
  for (const [prefix, t] of [
    ['Left', srcLeftTarget],
    ['Right', srcRightTarget],
  ] as const) {
    mappings.push(
      { source: `${prefix}Arm`, target: t.arm, sourceChild: `${prefix}ForeArm`, targetDir: [t.arm, t.foreArm] },
      { source: `${prefix}ForeArm`, target: t.foreArm, sourceChild: `${prefix}Hand`, targetDir: [t.arm, t.foreArm] },
      { source: `${prefix}UpLeg`, target: t.upLeg, sourceChild: `${prefix}Leg`, targetDir: [t.upLeg, t.leg] },
      { source: `${prefix}Leg`, target: t.leg, sourceChild: `${prefix}Foot`, targetDir: [t.upLeg, t.leg] },
    )
  }

  type Resolved = { src: THREE.Object3D; target: string; ref: THREE.Quaternion; targetRest: THREE.Quaternion }
  const resolved: Resolved[] = []
  for (const m of mappings) {
    const src = findSourceBone(source, m.source)
    if (!src || !byName.has(m.target)) continue
    const ref = src.getWorldQuaternion(new THREE.Quaternion())
    if (m.sourceChild && m.targetDir) {
      const child = findSourceBone(source, m.sourceChild)
      if (child) {
        const srcDir = child.getWorldPosition(new THREE.Vector3()).sub(src.getWorldPosition(new THREE.Vector3())).normalize()
        const tgtDir = restPos(m.targetDir[1]).sub(restPos(m.targetDir[0])).normalize()
        ref.premultiply(new THREE.Quaternion().setFromUnitVectors(srcDir, tgtDir))
      }
    }
    resolved.push({ src, target: m.target, ref, targetRest: restQuat(m.target) })
  }

  const srcHipsRest = srcHips.getWorldPosition(new THREE.Vector3())
  const hipsRest = restPos(B.hips)
  const scale = hipsRest.y / srcHipsRest.y
  const order = targetBones.filter((b) => byName.has(b.name))

  const bake = (clip: THREE.AnimationClip) => {
    const mixer = new THREE.AnimationMixer(source)
    const action = mixer.clipAction(clip)
    action.play()
    const frames = Math.max(2, Math.round(clip.duration * SAMPLE_RATE)) + 1
    const times = new Float32Array(frames)
    const quats = new Map(order.map((b) => [b.name, new Float32Array(frames * 4)]))
    const hipsPos = new Float32Array(frames * 3)
    const toe: { t: number; z: number }[] = []
    const world = new Map<string, THREE.Quaternion>()
    const q = new THREE.Quaternion()
    const local = new THREE.Quaternion()
    const p = new THREE.Vector3()

    for (let i = 0; i < frames; i++) {
      const t = (clip.duration * i) / (frames - 1)
      times[i] = t
      mixer.setTime(t)
      source.updateMatrixWorld(true)

      for (const r of resolved) {
        r.src.getWorldQuaternion(q)
        world.set(r.target, q.clone().multiply(r.ref.clone().invert()).multiply(r.targetRest))
      }
      for (const bone of order) {
        const g = world.get(bone.name)
        if (!g) continue
        const parent = bone.parent as THREE.Bone
        const parentWorld = parent?.isBone ? world.get(parent.name) : undefined
        local.copy(parentWorld ? parentWorld.clone().invert().multiply(g) : g)
        const out = quats.get(bone.name)!
        if (i > 0) {
          const k = (i - 1) * 4
          const dot = out[k] * local.x + out[k + 1] * local.y + out[k + 2] * local.z + out[k + 3] * local.w
          if (dot < 0) local.set(-local.x, -local.y, -local.z, -local.w)
        }
        local.toArray(out, i * 4)
      }

      srcHips.getWorldPosition(p)
      hipsPos[i * 3] = (p.x - srcHipsRest.x) * scale
      hipsPos[i * 3 + 1] = (p.y - srcHipsRest.y) * scale
      hipsPos[i * 3 + 2] = (p.z - srcHipsRest.z) * scale
      const toePos = srcLeftToe.getWorldPosition(new THREE.Vector3())
      toe.push({ t, z: (toePos.z - p.z) * scale })
    }
    action.stop()
    mixer.uncacheRoot(source)

    let mx = 0
    let mz = 0
    for (let i = 0; i < frames; i++) {
      mx += hipsPos[i * 3]
      mz += hipsPos[i * 3 + 2]
    }
    mx /= frames
    mz /= frames
    for (let i = 0; i < frames; i++) {
      hipsPos[i * 3] += hipsRest.x - mx
      hipsPos[i * 3 + 1] += hipsRest.y
      hipsPos[i * 3 + 2] += hipsRest.z - mz
    }

    const tracks: THREE.KeyframeTrack[] = [new THREE.VectorKeyframeTrack(`${B.hips}.position`, times, hipsPos)]
    for (const [name, values] of quats) tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values))
    return { clip: new THREE.AnimationClip(clip.name, clip.duration, tracks), toe }
  }

  const walk = bake(walkClip)

  // A planted foot slides back relative to the hips at exactly the ground speed.
  let back = 0
  let backTime = 0
  let strike = walk.toe[0]
  for (let i = 1; i < walk.toe.length; i++) {
    const dz = walk.toe[i].z - walk.toe[i - 1].z
    const dt = walk.toe[i].t - walk.toe[i - 1].t
    if (dz < 0) {
      back -= dz
      backTime += dt
    }
    if (walk.toe[i].z > strike.z) strike = walk.toe[i]
  }
  const walkSpeed = backTime > 0 ? back / backTime : 1.3

  return { walk: walk.clip, walkSpeed, strikeTime: strike.t }
}
