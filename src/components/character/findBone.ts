import type { Object3D, Bone } from 'three'

export function findBone(root: Object3D, candidates: string[]): Bone | null {
  let found: Bone | null = null
  root.traverse((obj) => {
    if (found) return
    if ((obj as Bone).isBone && candidates.some((c) => obj.name === c || obj.name.includes(c))) {
      found = obj as Bone
    }
  })
  return found
}
