/**
 * Turns a raw image-to-3D character export into the web-ready model the world loads:
 * faces +z, stands on y = 0 at the target height, and is simplified to a light triangle budget.
 *
 *   node scripts/prepare-character.mjs <input.glb> [output.glb] [--yaw=-90] [--tris=40000] [--tex=0]
 *
 * `--tex` caps the base colour texture size (0 keeps it as exported).
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`))
  return a ? Number(a.split('=')[1]) : fallback
}
const [input, output = 'public/models/anushri-character.glb'] = args.filter((a) => !a.startsWith('--'))
if (!input) {
  console.error('usage: node scripts/prepare-character.mjs <input.glb> [output.glb] [--yaw=-90] [--tris=40000] [--tex=0]')
  process.exit(1)
}
const YAW = (flag('yaw', -90) * Math.PI) / 180
const TARGET_TRIS = flag('tris', 40000)
const TEX_SIZE = flag('tex', 0)
const TARGET_HEIGHT = 1.62

await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(input)
const root = doc.getRoot()

const count = () =>
  root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0)
console.log(`input: ${Math.round(count())} triangles`)

// Bake node transforms, then turn to face +z and normalise height / ground contact.
const c = Math.cos(YAW)
const s = Math.sin(YAW)
const lo = [Infinity, Infinity, Infinity]
const hi = [-Infinity, -Infinity, -Infinity]
for (const node of root.listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const m = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const nrm = prim.getAttribute('NORMAL')
    const p = [0, 0, 0]
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, p)
      const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]
      const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]
      const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
      const out = [x * c + z * s, y, -x * s + z * c]
      pos.setElement(i, out)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], out[k])
        hi[k] = Math.max(hi[k], out[k])
      }
    }
    if (nrm) {
      for (let i = 0; i < nrm.getCount(); i++) {
        nrm.getElement(i, p)
        const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2]
        const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2]
        const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2]
        const l = Math.hypot(x, y, z) || 1
        nrm.setElement(i, [(x * c + z * s) / l, y / l, (-x * s + z * c) / l])
      }
    }
  }
  node.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
}
const scale = TARGET_HEIGHT / (hi[1] - lo[1])
const cx = (lo[0] + hi[0]) / 2
const cz = (lo[2] + hi[2]) / 2
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const p = [0, 0, 0]
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, p)
      pos.setElement(i, [(p[0] - cx) * scale, (p[1] - lo[1]) * scale, (p[2] - cz) * scale])
    }
  }
}
for (const node of root.listNodes()) if (node.listChildren().length === 0 && !node.getMesh()) node.dispose()

// Generators export skin and fabric as fully metallic; the world renders the character as a matte dielectric.
for (const mat of root.listMaterials()) {
  mat.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.85)
}

const ratio = Math.min(1, TARGET_TRIS / count())
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }))

// Some exports ship without normals. Smooth, area-weighted ones are summed per position so UV seams don't show.
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getAttribute('NORMAL')) continue
    const pos = prim.getAttribute('POSITION')
    const idx = prim.getIndices()
    const n = pos.getCount()
    const key = new Int32Array(n)
    const byPosition = new Map()
    const p = [0, 0, 0]
    for (let i = 0; i < n; i++) {
      pos.getElement(i, p)
      const k = `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`
      if (!byPosition.has(k)) byPosition.set(k, i)
      key[i] = byPosition.get(k)
    }
    const sum = new Float32Array(n * 3)
    const a = [0, 0, 0]
    const b = [0, 0, 0]
    const c = [0, 0, 0]
    for (let t = 0; t < idx.getCount(); t += 3) {
      const ia = idx.getScalar(t)
      const ib = idx.getScalar(t + 1)
      const ic = idx.getScalar(t + 2)
      pos.getElement(ia, a)
      pos.getElement(ib, b)
      pos.getElement(ic, c)
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
      const fn = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
      for (const v of [ia, ib, ic]) for (let k = 0; k < 3; k++) sum[key[v] * 3 + k] += fn[k]
    }
    const out = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const s = key[i] * 3
      const l = Math.hypot(sum[s], sum[s + 1], sum[s + 2]) || 1
      out.set([sum[s] / l, sum[s + 1] / l, sum[s + 2] / l], i * 3)
    }
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(out).setBuffer(root.listBuffers()[0]))
  }
}

await doc.transform(
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, slots: /^normalTexture$/, resize: [1024, 1024] }),
  ...(TEX_SIZE ? [textureCompress({ encoder: sharp, slots: /^baseColorTexture$/, targetFormat: 'jpeg', quality: 90, resize: [TEX_SIZE, TEX_SIZE] })] : []),
)
console.log(`output: ${Math.round(count())} triangles → ${output}`)
await io.write(output, doc)
