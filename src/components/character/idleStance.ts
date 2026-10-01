import * as THREE from 'three'
import { ANUSHRI_BONES as B } from './anushriBoneNames'

const { damp, clamp } = THREE.MathUtils

/** Side of the body (+x is her left) whose leg carries her weight. */
const SUPPORT = 1

/**
 * Relaxed standing pose in character space (facing +z), at full lean into the supporting hip. The pelvis rises and
 * shifts over the supporting leg; spine and chest counter it so the shoulders settle slightly the other way and the
 * head stays level.
 */
const STANCE = {
  hipShift: 0.026,
  hipDrop: 0.004,
  pelvisRoll: 0.042,
  pelvisYaw: 0.07,
  spineRoll: -0.03,
  chestRoll: -0.027,
  chestYaw: -0.045,
  chestPitch: 0.016,
  headRoll: 0.02,
  headYaw: -0.02,
}

/** Planted feet: |x| from centre, z forward, heel lift (the foot is rigid with the shin), and leg turn-out. */
const SUPPORT_FOOT = { x: 0.072, z: -0.005, lift: 0, turn: 0.1 }
const FREE_FOOT = { x: 0.088, z: 0.06, lift: 0.006, turn: 0.26 }
/** Arms hang a little differently: the supporting side with a softer elbow, the other a touch further back. */
const SUPPORT_ARM = { pitch: -0.03, out: 0.018, elbow: -0.17 }
const FREE_ARM = { pitch: 0.035, out: 0.01, elbow: -0.07 }

const BREATH_PERIOD = 4.3
/** Lean into the hip right after stopping; she settles into the full stance from here. */
const ARRIVAL_LEAN = 0.45
const ADJUST_SECONDS = 1.8

type Leg = { thigh: THREE.Bone; shin: THREE.Bone; side: number; thighLen: number; shinLen: number }

const qHips = new THREE.Quaternion()
const qSpine = new THREE.Quaternion()
const qChest = new THREE.Quaternion()
const qHead = new THREE.Quaternion()
const qArm = new THREE.Quaternion()
const qFore = new THREE.Quaternion()
const qThigh = new THREE.Quaternion()
const qShin = new THREE.Quaternion()
const qLocal = new THREE.Quaternion()
const qInv = new THREE.Quaternion()
const euler = new THREE.Euler(0, 0, 0, 'YXZ')
const armEuler = new THREE.Euler()
const hipsPos = new THREE.Vector3()
const hipJoint = new THREE.Vector3()
const foot = new THREE.Vector3()
const reach = new THREE.Vector3()
const pole = new THREE.Vector3()
const bend = new THREE.Vector3()
const knee = new THREE.Vector3()
const limb = new THREE.Vector3()
const ax = new THREE.Vector3()
const ay = new THREE.Vector3()
const az = new THREE.Vector3()
const basis = new THREE.Matrix4()

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

/** Rotation whose local -y runs along `down` and local +z faces `front` (made perpendicular). */
function aimBone(down: THREE.Vector3, front: THREE.Vector3, out: THREE.Quaternion) {
  ay.copy(down).negate()
  az.copy(front).addScaledVector(ay, -front.dot(ay)).normalize()
  ax.crossVectors(ay, az)
  return out.setFromRotationMatrix(basis.makeBasis(ax, ay, az))
}

/**
 * Two-bone leg IK: plants the foot at `target` (character space) from the hip joint, the knee bending toward `turn`
 * radians outward from straight ahead. Writes local thigh / shin rotations under a pelvis rotated by `pelvis`.
 */
function solveLeg(leg: Leg, hip: THREE.Vector3, target: THREE.Vector3, turn: number, pelvis: THREE.Quaternion) {
  const a = leg.thighLen
  const b = leg.shinLen
  reach.subVectors(target, hip)
  const dist = clamp(reach.length(), Math.abs(a - b) + 1e-3, (a + b) * 0.9999)
  reach.normalize()
  const cosA = clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1)
  const sinA = Math.sqrt(1 - cosA * cosA)
  pole.set(leg.side * Math.sin(turn), 0, Math.cos(turn))
  bend.copy(pole).addScaledVector(reach, -pole.dot(reach)).normalize()
  knee.copy(hip).addScaledVector(reach, a * cosA).addScaledVector(bend, a * sinA)

  aimBone(limb.subVectors(knee, hip).normalize(), bend, qThigh)
  const front = pole.set(0, 0, 1).applyQuaternion(qThigh)
  aimBone(limb.copy(hip).addScaledVector(reach, dist).sub(knee).normalize(), front, qShin)

  return {
    thigh: qLocal.copy(qInv.copy(pelvis).invert()).multiply(qThigh),
    shin: qShin.premultiply(qThigh.invert()),
  }
}

/**
 * Her standing pose and the life in it: slow breathing, a resting lean into one hip that now and then eases toward
 * centre and back, and the occasional small posture adjustment, all on irregular timings. Written over the mixer
 * output with weight `1 - gait`, so walking blends straight out of and back into it.
 */
export function createIdleStance(bones: THREE.Bone[]) {
  const byName = new Map(bones.map((b) => [b.name, b]))
  const get = (name: string) => byName.get(name)!
  const hips = get(B.hips)
  const spine = get(B.spine)
  const chest = get(B.chest)
  const head = get(B.head)
  const restHips = hips.position.clone()
  const restChest = chest.position.clone()

  const leg = (up: string, low: string): Leg => {
    const thigh = get(up)
    const shin = get(low)
    return {
      thigh,
      shin,
      side: Math.sign(thigh.position.x),
      thighLen: shin.position.length(),
      shinLen: restHips.y + thigh.position.y + shin.position.y,
    }
  }
  const legs = [leg(B.leftUpLeg, B.leftLeg), leg(B.rightUpLeg, B.rightLeg)]
  const arms = [
    { upper: get(B.leftArm), fore: get(B.leftForeArm) },
    { upper: get(B.rightArm), fore: get(B.rightForeArm) },
  ].map((a) => ({ ...a, side: Math.sign(a.upper.position.x) }))

  let time = Math.random() * 100
  let breath = Math.random() * Math.PI * 2
  let lean = ARRIVAL_LEAN
  let leanEase = ARRIVAL_LEAN
  let leanTarget = 1
  let centred = false
  let timer = rand(5, 9)
  let adjust = 1

  const schedule = () => {
    if (centred) {
      centred = false
      leanTarget = rand(0.92, 1)
      if (Math.random() < 0.5) adjust = 0
      timer = rand(9, 16)
    } else if (Math.random() < 0.32) {
      centred = true
      leanTarget = rand(0.5, 0.65)
      timer = rand(3, 6)
    } else {
      adjust = 0
      leanTarget = rand(0.88, 1)
      timer = rand(8, 15)
    }
  }

  return function applyIdleStance(delta: number, weight: number, still: boolean) {
    const w = clamp(weight, 0, 1)
    if (w < 0.02) {
      lean = leanEase = ARRIVAL_LEAN
      leanTarget = 1
      centred = false
      timer = rand(5, 9)
      adjust = 1
      chest.position.copy(restChest)
      return
    }

    time += delta
    breath += ((Math.PI * 2) / BREATH_PERIOD) * (1 + 0.07 * Math.sin(time * 0.13)) * delta
    timer -= delta
    if (timer <= 0) schedule()
    leanEase = damp(leanEase, leanTarget, 1.5, delta)
    lean = damp(lean, leanEase, 1.5, delta)
    if (adjust < 1) adjust = Math.min(1, adjust + delta / ADJUST_SECONDS)

    const life = still ? 0 : 1
    const b = Math.sin(breath) * life
    const e = Math.sin(Math.PI * adjust) ** 2 * life
    const swayX = 0.0022 * (Math.sin(time * 0.37) + 0.6 * Math.sin(time * 0.83 + 1.1)) * life
    const swayZ = 0.0018 * Math.sin(time * 0.29 + 0.4) * life
    const s = SUPPORT
    const k = still ? 1 : lean

    hipsPos.set(
      restHips.x + s * (STANCE.hipShift * k - 0.006 * e) + swayX,
      restHips.y - STANCE.hipDrop * k + 0.004 * e,
      restHips.z + swayZ,
    )
    euler.set(0, s * (STANCE.pelvisYaw + 0.02 * e), s * STANCE.pelvisRoll * k)
    qHips.setFromEuler(euler)
    euler.set(-0.003 * b, 0, s * STANCE.spineRoll * k)
    qSpine.setFromEuler(euler)
    euler.set(STANCE.chestPitch - 0.008 * b - 0.02 * e, s * STANCE.chestYaw, s * STANCE.chestRoll * k)
    qChest.setFromEuler(euler)
    euler.set(0.004 * b - 0.008 * e, s * STANCE.headYaw, s * STANCE.headRoll * k)
    qHead.setFromEuler(euler)

    hips.position.lerp(hipsPos, w)
    hips.quaternion.slerp(qHips, w)
    spine.quaternion.slerp(qSpine, w)
    chest.quaternion.slerp(qChest, w)
    head.quaternion.slerp(qHead, w)
    chest.position.set(restChest.x, restChest.y + 0.0022 * b * w, restChest.z)

    for (const l of legs) {
      const supporting = l.side === s
      const f = supporting ? SUPPORT_FOOT : FREE_FOOT
      hipJoint.copy(l.thigh.position).applyQuaternion(qHips).add(hipsPos)
      foot.set(l.side * f.x, f.lift, f.z)
      const { thigh, shin } = solveLeg(l, hipJoint, foot, f.turn, qHips)
      l.thigh.quaternion.slerp(thigh, w)
      l.shin.quaternion.slerp(shin, w)
    }

    for (const a of arms) {
      const supporting = a.side === s
      const pose = supporting ? SUPPORT_ARM : FREE_ARM
      qArm.setFromEuler(armEuler.set(pose.pitch, 0, a.side * (pose.out + 0.003 * b)))
      qFore.setFromEuler(armEuler.set(pose.elbow - (supporting ? 0 : 0.04 * e), 0, 0))
      a.upper.quaternion.slerp(qArm, w)
      a.fore.quaternion.slerp(qFore, w)
    }
  }
}
