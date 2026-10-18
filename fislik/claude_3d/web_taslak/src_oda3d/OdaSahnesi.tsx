import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { BAKIS_GENEL, type Bakis } from './koordinat'
import { OdaModeli, useOdaParcalari } from './OdaModeli'
import { DisManzara } from './Pencere'

/** Kamerayı hedef bakışa yumuşakça taşır; genel bakışta fare ile hafif paralaks. */
function KameraSurucu({ bakis, paralaks }: { readonly bakis: Bakis; readonly paralaks: boolean }) {
  const { camera, pointer } = useThree()
  const hedef = useRef(new THREE.Vector3(...bakis.hedef))
  const gecici = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3.2)
    const [px, py, pz] = bakis.konum
    const ox = paralaks ? pointer.x * 0.18 : 0
    const oy = paralaks ? pointer.y * 0.08 : 0
    camera.position.lerp(gecici.current.set(px + ox, py + oy, pz), k)
    hedef.current.lerp(gecici.current.set(...bakis.hedef), k)
    camera.lookAt(hedef.current)
    const kam = camera as THREE.PerspectiveCamera
    if (Math.abs(kam.fov - bakis.fov) > 0.01) {
      kam.fov += (bakis.fov - kam.fov) * k
      kam.updateProjectionMatrix()
    }
  })
  return null
}

function Oda() {
  const parcalar = useOdaParcalari('gunduz')
  return <OdaModeli parcalar={parcalar} />
}

interface Props {
  readonly bakis?: Bakis
  readonly children?: ReactNode
}

export function OdaSahnesi({ bakis = BAKIS_GENEL, children }: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={{ position: [...BAKIS_GENEL.konum], fov: BAKIS_GENEL.fov, near: 0.05, far: 60 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Suspense fallback={null}>
        <DisManzara />
        <Oda />
        {children}
      </Suspense>
      <KameraSurucu bakis={bakis} paralaks={bakis === BAKIS_GENEL} />
    </Canvas>
  )
}

export default function OdaOnizleme() {
  return <OdaSahnesi />
}
