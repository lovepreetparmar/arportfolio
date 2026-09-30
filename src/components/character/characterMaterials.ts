import * as THREE from 'three'

export const PALETTE = {
  skin: '#e6b797',
  skinShadow: '#cf9c7d',
  skinWarm: '#e5ad98',
  hair: '#231612',
  hairMid: '#2e1c16',
  hairHighlight: '#4a2a1d',
  hairChestnut: '#553020',
  eyeWhite: '#f4eee7',
  iris: '#2a1911',
  pupil: '#0b0705',
  lash: '#140d0a',
  lashLower: '#6a4a3e',
  brow: '#22150e',
  lip: '#b3303a',
  lipDeep: '#9e2832',
  mouth: '#6a1f24',
  top: '#1f1d1d',
  topShadow: '#2b2828',
  trouser: '#d9c9ae',
  trouserDeep: '#c8b797',
  check: '#9c8a70',
  shoe: '#1c1a19',
  gold: '#c9a64a',
  pearl: '#f2ece2',
  watch: '#151414',
  watchFace: '#e9e4da',
  redThread: '#b3262e',
}

export function createCharacterMaterial(color: string, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  })
}

export function createHairMaterial(color: string = PALETTE.hair) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0,
    side: THREE.DoubleSide,
  })
}

/** For hair locks whose colour comes from a root → tip vertex gradient. */
export function createHairGradientMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 0.6,
    metalness: 0,
    side: THREE.DoubleSide,
  })
}

export function createSkinMaterial() {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.skin,
    roughness: 0.8,
    metalness: 0,
  })
}

/** Subtle beige check for the high-waisted trousers. */
export function createCheckTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PALETTE.trouser
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = PALETTE.check

  ctx.globalAlpha = 0.5
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, size * 0.5)
  ctx.lineTo(size, size * 0.5)
  ctx.moveTo(size * 0.5, 0)
  ctx.lineTo(size * 0.5, size)
  ctx.stroke()

  ctx.globalAlpha = 0.28
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, size * 0.58)
  ctx.lineTo(size, size * 0.58)
  ctx.moveTo(size * 0.58, 0)
  ctx.lineTo(size * 0.58, size)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(5, 5)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
