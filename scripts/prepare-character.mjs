/**
 * Turns a raw image-to-3D character export into the web-ready model the world loads:
 * faces +z, stands on y = 0 at the target height, and is simplified to a light triangle budget.
 *
 *   node scripts/prepare-character.mjs <input.glb> [output.glb] [--yaw=-90] [--tris=40000]
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
  console.error('usage: node scripts/prepare-character.mjs <input.glb> [output.glb] [--yaw=-90] [--tris=40000]')
  process.exit(1)
}
const YAW = (flag('yaw', -90) * Math.PI) / 180
const TARGET_TRIS = flag('tris', 40000)
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
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, slots: /^normalTexture$/, resize: [1024, 1024] }),
)
console.log(`output: ${Math.round(count())} triangles → ${output}`)
await io.write(output, doc)
