import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { gunAy, haftaninGunu } from '../../lib/tarih'
import stil from './Kahraman.module.css'

/** Tasarımdaki daktilo başlangıcı (s); veri sonradan gelirse kısa bir nefesle başlar. */
const YAZI_GECIKMESI = 1.4
const EN_AZ_GECIKME = 0.25

/** Metin her değiştiğinde yazma gecikmesini ölçer: fiş asılmadan yazmaya başlamaz.
 *  Ölçüm boyamadan önce (layout effect) yapılır, tarayıcı yalnızca son gecikmeyi görür. */
function useYaziGecikmesi(metin: string): number {
  const acilis = useRef<number | null>(null)
  const [gecikme, setGecikme] = useState(YAZI_GECIKMESI)

  useLayoutEffect(() => {
    const simdi = performance.now()
    acilis.current ??= simdi
    const gecen = (simdi - acilis.current) / 1000
    setGecikme(Math.max(EN_AZ_GECIKME, YAZI_GECIKMESI - gecen))
  }, [metin])

  return gecikme
}

interface Props {
  /** Bugünün takvim tarihi ('YYYY-MM-DD') */
  readonly bugun: string
  /** Daktilo fişindeki cümle; yüklenirken null (yalnızca imleç yanıp söner) */
  readonly ozet: string | null
}

/** Gün adı ve tarih satır satır yükselir, altta daktilo fişi bugünü yazar. */
export function Kahraman({ bugun, ozet }: Props) {
  const metin = ozet ?? ''
  const gecikme = useYaziGecikmesi(metin)
  const uzunluk = Math.max(1, metin.length)
  const fisStili = { '--harf': uzunluk } as CSSProperties

  return (
    <header className={stil.kahraman}>
      <h1 className={`h1 ${stil.baslik}`}>
        <span className={stil.satir}>
          <span>{haftaninGunu(bugun)},</span>
        </span>
        <span className={stil.satir}>
          <span className={stil.altin}>{gunAy(bugun)}.</span>
        </span>
      </h1>
      <p className={stil.daktilo} style={fisStili} aria-live="polite">
        <span
          key={metin}
          className={stil.yazi}
          style={{
            width: `${metin.length}ch`,
            animationTimingFunction: `steps(${uzunluk}, end)`,
            animationDelay: `${gecikme}s`,
          }}
        >
          {metin}
        </span>
        <span className={stil.imlec} aria-hidden="true" />
      </p>
    </header>
  )
}
