import * as THREE from 'three'

/** Fair / light skin tone (tint over existing skin textures). */
export const CHARACTER_SKIN_COLOR = '#F2D4C4'

const SKIN_MATERIAL_HINTS = [
  'skin',
  'body',
  'face',
  'head',
  'flesh',
  'ch03_body',
  'character_body',
]

const NON_SKIN_HINTS = [
  'hair',
  'cloth',
  'shirt',
  'pant',
  'trouser',
  'shoe',
  'boot',
  'eye',
  'lash',
  'teeth',
  'tongue',
  'nail',
  'blazer',
  'jacket',
  'coat',
  'bag',
  'accessory',
  'metal',
  'glass',
]

function isSkinSurface(meshName: string, materialName: string): boolean {
  const combined = `${meshName} ${materialName}`.toLowerCase()
  if (NON_SKIN_HINTS.some((h) => combined.includes(h))) return false
  return SKIN_MATERIAL_HINTS.some((h) => combined.includes(h))
}

function applyToMaterial(mat: THREE.MeshStandardMaterial, color: THREE.Color) {
  mat.color.copy(color)
  mat.roughness = THREE.MathUtils.clamp(mat.roughness, 0.72, 0.9)
  mat.metalness = Math.min(mat.metalness, 0.05)
  mat.needsUpdate = true
}

/**
 * Tint only skin materials on the loaded character GLB.
 * Preserves maps, normals, and UVs.
 */
export function applyCharacterSkinTone(root: THREE.Object3D, hex = CHARACTER_SKIN_COLOR) {
  const color = new THREE.Color(hex)
  const touched = new Set<string>()

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return
    const mesh = child as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

    materials.forEach((m) => {
      if (!(m instanceof THREE.MeshStandardMaterial)) return
      const matName = m.name || ''
      const meshName = mesh.name || ''
      if (!isSkinSurface(meshName, matName)) return

      applyToMaterial(m, color)
      touched.add(`${meshName}::${matName}`)
    })
  })

  if (import.meta.env.DEV && touched.size > 0) {
    console.log('[Character] Skin tone applied to:', [...touched])
  } else if (import.meta.env.DEV && touched.size === 0) {
    console.warn('[Character] No skin materials matched — inspect GLB material names')
  }
}
