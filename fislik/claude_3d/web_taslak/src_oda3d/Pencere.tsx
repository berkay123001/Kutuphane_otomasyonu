import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

/** Pencereden görünen park: Poly Haven HDRI'sinin ton eşlenmiş hâli, sahne arka planı olarak.
 *  Blender'da dünya döndürmesi 0; Three'nin eşdikdörtgen eşlemesiyle hizalamak için Y döndürmesi. */
export function DisManzara({ tema = 'gunduz', parlaklik = 1.05 }: { readonly tema?: string; readonly parlaklik?: number }) {
  const doku = useTexture(`/oda3d/dis_${tema}.webp`)
  const { scene } = useThree()
  useEffect(() => {
    doku.mapping = THREE.EquirectangularReflectionMapping
    doku.colorSpace = THREE.SRGBColorSpace
    scene.background = doku
    scene.backgroundIntensity = parlaklik
    scene.backgroundRotation.set(0, -Math.PI / 2, 0)
    return () => {
      scene.background = null
    }
  }, [doku, scene, parlaklik])
  return null
}
