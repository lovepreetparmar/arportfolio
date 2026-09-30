import { useMemo } from 'react'
import * as THREE from 'three'

export type Pt = [number, number, number]

type TaperedTubeProps = {
  points: Pt[]
  radius: number
  material: THREE.Material
  taper: (t: number) => number
  squash?: Pt
  tubularSegments?: number
  radialSegments?: number
  /** Vertex-colour gradient root → tip; the material must have `vertexColors` enabled. */
  colors?: [string, string]
  colorStart?: number
}

/** Tube along a curve whose radius follows `taper(t)`; used for hair locks and brows. */
export function TaperedTube({
  points,
  radius,
  material,
  taper,
  squash = [1, 1, 1],
  tubularSegments = 24,
  radialSegments = 10,
  colors,
  colorStart = 0.45,
}: TaperedTubeProps) {
  const key = JSON.stringify([points, radius, squash, tubularSegments, radialSegments, colors, colorStart])
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    const geo = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, false)
    const pos = geo.attributes.position
    const center = new THREE.Vector3()
    const v = new THREE.Vector3()
    for (let i = 0; i <= tubularSegments; i++) {
      curve.getPointAt(i / tubularSegments, center)
      const r = radius * taper(i / tubularSegments)
      for (let j = 0; j <= radialSegments; j++) {
        const idx = i * (radialSegments + 1) + j
        v.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(r)
        pos.setXYZ(idx, center.x + v.x * squash[0], center.y + v.y * squash[1], center.z + v.z * squash[2])
      }
    }
    geo.computeVertexNormals()

    if (colors) {
      const root = new THREE.Color(colors[0])
      const tip = new THREE.Color(colors[1])
      const c = new THREE.Color()
      const arr = new Float32Array(pos.count * 3)
      for (let i = 0; i <= tubularSegments; i++) {
        const k = THREE.MathUtils.clamp((i / tubularSegments - colorStart) / (1 - colorStart), 0, 1)
        c.copy(root).lerp(tip, k)
        for (let j = 0; j <= radialSegments; j++) {
          const idx = (i * (radialSegments + 1) + j) * 3
          arr[idx] = c.r
          arr[idx + 1] = c.g
          arr[idx + 2] = c.b
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    }
    return geo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return <mesh geometry={geometry} material={material} />
}
