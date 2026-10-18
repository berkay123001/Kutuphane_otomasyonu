import { useEffect, useId, useRef, useState } from 'react'
import { sayi } from '../../../lib/bicim'
import stil from './Liste.module.css'

export const ARAMA_GECIKMESI_MS = 250

interface AramaProps {
  /** URL'deki (?q=) geçerli arama */
  readonly q: string
  readonly onAra: (metin: string) => void
  readonly sonuc: number | undefined
}

/**
 * Cetvelli kâğıt arama kutusu; yazmayı bırakınca 250 ms sonra adrese yazar. Kendi yazdığı
 * adresi geri okumaz (yazarken harf kaybolmasın); yalnızca dışarıdan gelen (geri/ileri) değişikliği alır.
 */
export function UyeArama({ q, onAra, sonuc }: AramaProps) {
  const kimlik = useId()
  const [metin, setMetin] = useState(q)
  const gonderilen = useRef(q)
  const saat = useRef<number | undefined>(undefined)
  const sonOnAra = useRef(onAra)

  useEffect(() => {
    sonOnAra.current = onAra
  })

  useEffect(() => () => window.clearTimeout(saat.current), [])

  useEffect(() => {
    if (q === gonderilen.current) return
    gonderilen.current = q
    window.clearTimeout(saat.current)
    setMetin(q)
  }, [q])

  const degis = (deger: string) => {
    setMetin(deger)
    window.clearTimeout(saat.current)
    saat.current = window.setTimeout(() => {
      const temiz = deger.trim()
      if (temiz === gonderilen.current) return
      gonderilen.current = temiz
      sonOnAra.current(temiz)
    }, ARAMA_GECIKMESI_MS)
  }

  return (
    <div className={stil.arama} role="search">
      <label className="eyebrow" htmlFor={kimlik}>
        Okuyucu ara
      </label>
      <div className={stil.kutu}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <input
          id={kimlik}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Ad, soyad, okuyucu no ya da e-posta"
          value={metin}
          maxLength={100}
          onChange={(e) => degis(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') degis('')
          }}
        />
        {q && sonuc !== undefined && <span className={stil.kutuSayi}>{sayi(sonuc)} sonuç</span>}
      </div>
    </div>
  )
}

const SEKMELER = [
  { ad: 'Tümü', deger: undefined },
  { ad: 'Aktif', deger: true },
  { ad: 'Pasif', deger: false },
] as const

interface SekmeProps {
  readonly aktif: boolean | undefined
  readonly onSec: (deger: boolean | undefined) => void
  readonly sayi: number | undefined
}

/** Dolabın üstündeki dosya sekmeleri: Tümü / Aktif / Pasif. */
export function FiltreSekmeleri({ aktif, onSec, sayi: adet }: SekmeProps) {
  return (
    <div className={stil.sekmeler} role="group" aria-label="Üyelik durumu">
      {SEKMELER.map((s) => {
        const secili = aktif === s.deger
        return (
          <button key={s.ad} type="button" className={stil.sekme} aria-pressed={secili} onClick={() => onSec(s.deger)}>
            {s.ad}
            {secili && adet !== undefined && <b>{sayi(adet)}</b>}
          </button>
        )
      })}
    </div>
  )
}
