import { useGLTF, useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/** Blender'dan pişirilmiş oda: her grup kendi (albedo × ışık) dokusuyla ışıksız çizilir.
 *  Işık hesabı yapılmadığı için zayıf GPU'da da hafiftir. */
const KOK = '/oda3d'
const GRUPLAR = ['oda', 'raflar', 'kitaplar', 'esya'] as const
export const HAREKETLILER = [
  'Cekmece_Ust_Sol', 'Cekmece_Ust_Orta', 'Cekmece_Ust_Sag',
  'Cekmece_Alt_Sol', 'Cekmece_Alt_Orta', 'Cekmece_Alt_Sag', 'Yan_Sol_Kapi',
] as const

useGLTF.preload(`${KOK}/oda.glb`, '/draco/')

function dokuYollari(tema: string): Record<string, string> {
  return Object.fromEntries(
    [...GRUPLAR, ...HAREKETLILER].map((ad) => [ad, `${KOK}/${ad}_${tema}.webp`]),
  )
}

export interface OdaParcalari {
  readonly sahne: THREE.Group
  readonly hareketli: ReadonlyMap<string, THREE.Mesh>
}

export function useOdaParcalari(tema = 'gunduz'): OdaParcalari {
  const { scene } = useGLTF(`${KOK}/oda.glb`, '/draco/')
  const dokular = useTexture(dokuYollari(tema))

  return useMemo(() => {
    const hareketli = new Map<string, THREE.Mesh>()
    scene.traverse((nesne) => {
      if (!(nesne instanceof THREE.Mesh)) return
      const doku = dokular[nesne.name]
      if (nesne.name === 'Pencere_Cami') {
        nesne.material = new THREE.MeshBasicMaterial({
          color: '#dfe9ee', transparent: true, opacity: 0.07, depthWrite: false,
        })
        nesne.renderOrder = 2
        return
      }
      if (!doku) return
      doku.flipY = false
      doku.colorSpace = THREE.SRGBColorSpace
      doku.anisotropy = 4
      nesne.material = new THREE.MeshBasicMaterial({ map: doku })
      if ((HAREKETLILER as readonly string[]).includes(nesne.name)) hareketli.set(nesne.name, nesne)
    })
    return { sahne: scene, hareketli }
  }, [scene, dokular])
}

export function OdaModeli({ parcalar }: { readonly parcalar: OdaParcalari }) {
  useEffect(() => {
    parcalar.sahne.traverse((n) => {
      n.matrixAutoUpdate = !(n instanceof THREE.Mesh) || parcalar.hareketli.has(n.name)
      n.updateMatrix()
    })
  }, [parcalar])
  return <primitive object={parcalar.sahne} />
}
