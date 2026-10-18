import { useEffect, useMemo, useState } from 'react'
import { useTema, type Tema } from '../tema/TemaSaglayici'
import { kapsaHesapla } from './kapsa'
import { KareTuvali } from './KareTuvali'
import { useSahneDurum, useSahneEylem, type SahneAyari } from './SahneSaglayici'
import { TozKatmani } from './TozKatmani'
import { ETKILESIMLER, SAHNE, arkaGorseli, etkilesim, merkez, type EtkilesimId, type Nokta } from './veri'
import stil from './Sahne.module.css'

/** Varsayılan odak: pencere ile fişlik dolabının arası (dar ekranlarda da merkezde kalsın). */
export const VARSAYILAN_ODAK: Nokta = [SAHNE.boyut.w * 0.5, SAHNE.boyut.h * 0.55]
const YAKINLIK = 1.8

export function hedefHesapla(id: EtkilesimId, ayar: SahneAyari): number {
  if (ayar.acik === id || ayar.yakin === id) return 1
  if (ayar.uzerinde === id) return 0.3
  return 0
}

/** Pencere boyutu; yeniden boyutlandırma olayları kare başına bire indirilir. */
function useEkran() {
  const [ekran, setEkran] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    let istek = 0
    const guncelle = () => {
      cancelAnimationFrame(istek)
      istek = requestAnimationFrame(() =>
        setEkran((e) =>
          e.w === window.innerWidth && e.h === window.innerHeight
            ? e
            : { w: window.innerWidth, h: window.innerHeight },
        ),
      )
    }
    window.addEventListener('resize', guncelle)
    return () => {
      cancelAnimationFrame(istek)
      window.removeEventListener('resize', guncelle)
    }
  }, [])
  return ekran
}

const TEMA_GECIS_MS = 1900

const TEMALAR: readonly Tema[] = ['gunduz', 'gece']

/** Tema değişirken eski katman geçiş süresince çizilir, sonra gizlenir (görsel bellekte kalır,
 *  bir sonraki geçişte büyük görsel yeniden çözülmez). */
function useGorunenTemalar(tema: Tema): readonly Tema[] {
  const [liste, setListe] = useState<readonly Tema[]>([tema])
  useEffect(() => {
    setListe((onceki) => (onceki.length === 1 && onceki[0] === tema ? onceki : [...onceki.filter((t) => t !== tema), tema]))
    const t = window.setTimeout(() => setListe([tema]), TEMA_GECIS_MS)
    return () => window.clearTimeout(t)
  }, [tema])
  return liste
}

/** Uygulamanın arkasındaki, Blender'da render edilmiş kütüphane odası. */
export function Sahne() {
  const { tema } = useTema()
  const { ayar } = useSahneDurum()
  const { kapsaBildir } = useSahneEylem()
  const ekran = useEkran()
  const temalar = useGorunenTemalar(tema)

  const temel = useMemo(() => kapsaHesapla(ekran, SAHNE.boyut, VARSAYILAN_ODAK), [ekran])
  useEffect(() => kapsaBildir(temel), [temel, kapsaBildir])

  const k = ayar.yakin
    ? kapsaHesapla(ekran, SAHNE.boyut, merkez(etkilesim(ayar.yakin).alan), YAKINLIK)
    : temel

  return (
    <div className={stil.sahne} data-kip={ayar.kip} data-yakin={ayar.yakin ?? undefined} aria-hidden="true">
      <div className={stil.filtre}>
        <div
          className={stil.tuval}
          style={{
            width: SAHNE.boyut.w,
            height: SAHNE.boyut.h,
            transform: `translate3d(${k.x}px, ${k.y}px, 0) scale(${k.olcek})`,
          }}
        >
          {TEMALAR.map((t) => (
            <div key={t} className={stil.katman} data-gorunur={t === tema} data-etkin={temalar.includes(t)}>
              <img className={stil.oda} src={SAHNE.temalar[t]} alt="" draggable={false} />
              <img className={stil.odaArka} src={arkaGorseli(t)} alt="" draggable={false} />
              {ETKILESIMLER.map((id) => (
                <KareTuvali key={id} id={id} tema={t} hedef={hedefHesapla(id, ayar)} />
              ))}
            </div>
          ))}
          {/* Toz yalnızca oda tam görünürken; arka plan kipinde çizim döngüsü tamamen durur */}
          {ayar.kip === 'tam' && <TozKatmani key={tema} tema={tema} />}
        </div>
      </div>
      <div className={stil.vinyet} />
    </div>
  )
}
