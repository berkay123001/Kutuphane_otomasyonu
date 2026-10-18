import { AnimatePresence } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useUyeler } from '../../api/sorgular'
import { UstBar } from '../../kabuk/UstBar'
import { sayi } from '../../lib/bicim'
import { FiltreSekmeleri, UyeArama } from './liste/AramaVeSekmeler'
import { UyeIzgarasi } from './liste/UyeIzgarasi'
import { YeniUyeFormu } from './liste/YeniUyeFormu'
import { SAYFA_BOYU, aktifFiltresi } from './uyeVeri'
import ortak from './ortak.module.css'
import stil from './liste/Liste.module.css'

function ArtiIkonu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** Adres satırındaki filtreyi okur/yazar (?q=…&aktif=true|false). */
function useUyeFiltresi() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const aktif = aktifFiltresi(params.get('aktif'))

  const yaz = useCallback(
    (ad: 'q' | 'aktif', deger: string | null) =>
      setParams(
        (onceki) => {
          const yeni = new URLSearchParams(onceki)
          if (deger) yeni.set(ad, deger)
          else yeni.delete(ad)
          return yeni
        },
        { replace: true },
      ),
    [setParams],
  )

  return { q, aktif, yaz }
}

/** 04 · Üyeler: okuyucu dolabı — arama, durum sekmeleri, mini kartlar, yeni üye fişi. */
export default function UyelerSayfasi() {
  const { q, aktif, yaz } = useUyeFiltresi()
  const [formAcik, setFormAcik] = useState(false)
  const yeniDugme = useRef<HTMLButtonElement>(null)
  const filtre = { q: q || undefined, aktif }
  const ilk = useUyeler({ ...filtre, page: 1, limit: SAYFA_BOYU })
  const toplam = ilk.data?.meta?.total ?? ilk.data?.veri.length

  const formuKapat = () => {
    setFormAcik(false)
    yeniDugme.current?.focus()
  }
  const onAra = useCallback((m: string) => yaz('q', m || null), [yaz])

  return (
    <>
      <UstBar etiket="Çekmece 04 — Üyeler">
        <button
          ref={yeniDugme}
          type="button"
          className="btn btn-v"
          aria-expanded={formAcik}
          aria-controls="yeni-uye"
          onClick={() => setFormAcik((a) => !a)}
        >
          <ArtiIkonu />
          Yeni üye
        </button>
      </UstBar>

      <header className={stil.bas}>
        <h1 className={`h1 ${stil.baslik}`}>
          <span className={ortak.satir}>
            <span>Üyeler</span>
          </span>
        </h1>
        <p className={stil.sayac} aria-live="polite">
          <b>{toplam === undefined ? '…' : sayi(toplam)}</b>
          <span>okuyucu</span>
        </p>
      </header>

      <AnimatePresence initial={false}>{formAcik && <YeniUyeFormu key="yeni-uye" onKapat={formuKapat} />}</AnimatePresence>

      <UyeArama q={q} onAra={onAra} sonuc={toplam} />

      <section className={stil.dolapBolumu} aria-labelledby="h-dolap">
        <h2 className="sr" id="h-dolap">
          Okuyucu kartları
        </h2>
        <FiltreSekmeleri aktif={aktif} sayi={ilk.isPlaceholderData ? undefined : toplam} onSec={(d) => yaz('aktif', d === undefined ? null : String(d))} />
        <div className={stil.dolap}>
          <UyeIzgarasi filtre={filtre} ilk={ilk} />
        </div>
        <div className={`${stil.tahta} grain`} aria-hidden="true" />
      </section>
    </>
  )
}
