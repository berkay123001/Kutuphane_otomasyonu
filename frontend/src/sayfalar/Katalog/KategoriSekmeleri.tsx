/** Çekmece ayraç sekmeleri: tablist, dolaşan tabIndex, oklar/Home/End, taşarsa yatay kaydırma. */
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { SagIkonu } from './ikonlar'
import { hedefSira, type Sekme } from './katalogVeri'
import { useKaydirmaKenarlari } from './useKaydirmaKenarlari'
import stil from './Sekmeler.module.css'

interface Props {
  readonly sekmeler: readonly Sekme[]
  readonly secili: number | null
  readonly onSec: (kategoriId: number | null) => void
  readonly panelId: string
  readonly idOnEki: string
}

export const sekmeId = (onEk: string, s: Sekme) => `${onEk}-${s.anahtar}`

const KENAR_PAYI = 48

function gorunurYap(serit: HTMLElement | null, anahtar: string | undefined, davranis: ScrollBehavior) {
  const sekme = serit?.querySelector<HTMLElement>(`[data-anahtar="${anahtar ?? ''}"]`)
  if (!serit || !sekme || typeof serit.scrollBy !== 'function') return
  const k = serit.getBoundingClientRect()
  const s = sekme.getBoundingClientRect()
  if (s.left < k.left + KENAR_PAYI) serit.scrollBy({ left: s.left - k.left - KENAR_PAYI, behavior: davranis })
  else if (s.right > k.right - KENAR_PAYI) serit.scrollBy({ left: s.right - k.right + KENAR_PAYI, behavior: davranis })
}

export function KategoriSekmeleri({ sekmeler, secili, onSec, panelId, idOnEki }: Props) {
  const seritRef = useRef<HTMLDivElement>(null)
  const azalt = useReducedMotion() ?? false
  // 'auto' CSS'teki scroll-behavior: smooth'a düşer; azaltılmış harekette 'instant' gerekir.
  const davranis: ScrollBehavior = azalt ? 'instant' : 'smooth'
  const kenar = useKaydirmaKenarlari(seritRef, sekmeler.length)
  const aktifIndeks = sekmeler.findIndex((s) => s.kategoriId === secili)
  const odakIndeks = Math.max(0, aktifIndeks)
  const aktifAnahtar = sekmeler[aktifIndeks]?.anahtar

  useEffect(() => {
    gorunurYap(seritRef.current, aktifAnahtar, davranis)
  }, [aktifAnahtar, davranis])

  const tusaBas = (e: KeyboardEvent<HTMLDivElement>) => {
    const hedef = hedefSira(e.key, odakIndeks, sekmeler.length, 'yatay')
    const sekme = hedef === null ? undefined : sekmeler[hedef]
    if (!sekme) return
    e.preventDefault()
    onSec(sekme.kategoriId)
    seritRef.current?.querySelector<HTMLElement>(`[data-anahtar="${sekme.anahtar}"]`)?.focus()
  }

  const kaydir = (yon: 1 | -1) => {
    const serit = seritRef.current
    if (serit && typeof serit.scrollBy === 'function') {
      serit.scrollBy({ left: yon * serit.clientWidth * 0.7, behavior: davranis })
    }
  }

  return (
    <div className={stil.sekmeler} data-sol={kenar.sol} data-sag={kenar.sag}>
      <button
        type="button"
        className={`${stil.kaydir} ${stil.kaydirSol}`}
        onClick={() => kaydir(-1)}
        tabIndex={-1}
        aria-hidden="true"
        title="Sola kaydır"
      >
        <SagIkonu />
      </button>
      <div ref={seritRef} className={stil.serit} role="tablist" aria-label="Kategoriler" onKeyDown={tusaBas}>
        {sekmeler.map((s, i) => {
          const acik = i === aktifIndeks
          return (
            <button
              key={s.anahtar}
              id={sekmeId(idOnEki, s)}
              data-anahtar={s.anahtar}
              type="button"
              role="tab"
              className={stil.sekme}
              aria-selected={acik}
              aria-controls={panelId}
              tabIndex={i === odakIndeks ? 0 : -1}
              title={s.aralik}
              onClick={() => onSec(s.kategoriId)}
            >
              {s.etiket} <b>{s.sayi ?? '·'}</b>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={`${stil.kaydir} ${stil.kaydirSag}`}
        onClick={() => kaydir(1)}
        tabIndex={-1}
        aria-hidden="true"
        title="Sağa kaydır"
      >
        <SagIkonu />
      </button>
    </div>
  )
}
