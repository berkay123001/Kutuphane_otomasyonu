/** Çekmecedeki tek katalog fişi (tasarım: .fc). Üstüne gelince/odaklanınca yükselir, seçiliyse ataçlıdır. */
import { memo, useState } from 'react'
import type { KitapListe } from '../../api/semalar'
import { Damga } from '../../ui/Damga'
import { fisModeli, kalanGecikme } from './katalogVeri'
import type { Riffle } from './useRiffle'
import stil from './Cekmece.module.css'

interface Props {
  readonly kitap: KitapListe
  readonly sira: number
  readonly secili: boolean
  /** Yığındaki tek Tab durağı mı */
  readonly durak: boolean
  readonly riffle: Riffle
  readonly onSec: (id: number) => void
}

function KatalogFisiBileseni({ kitap, sira, secili, durak, riffle, onSec }: Props) {
  // Gecikme fiş kurulduğunda bir kez hesaplanır; sonradan değişip animasyonu yeniden başlatmaz.
  const [gecikme] = useState(() =>
    kalanGecikme(sira, riffle.taban, (performance.now() - riffle.baslangic) / 1000),
  )
  // Düşüş bitince animasyon adı kalkar; liste yeniden sıralanıp düğüm taşınırsa yeniden oynamaz.
  const [dustu, setDustu] = useState(false)
  const m = fisModeli(kitap)
  const yer = [m.yer.ust, m.yer.alt].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={stil.fis}
      data-fis=""
      data-yon={dustu ? undefined : riffle.yon}
      style={{ animationDelay: `${gecikme}s` }}
      aria-pressed={secili}
      tabIndex={durak ? 0 : -1}
      onClick={() => onSec(kitap.id)}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setDustu(true)
      }}
    >
      {secili && <span className={stil.atac} aria-hidden="true" />}
      <span className={stil.fisUst}>
        <span className={stil.fisYer}>{yer}</span>
        <Damga murekkep={m.damga.murekkep} egim={-2} className={stil.fisDamga}>
          {m.damga.etiket}
        </Damga>
      </span>
      <span className={stil.fisBaslik}>
        {kitap.baslik} <span className={stil.fisYazar}>/ {kitap.yazar}</span>
      </span>
      <span className={stil.fisGovde}>
        <span>{m.yayin}</span>
        <span>{m.konu}</span>
        <span className={stil.fisMeta}>{m.ozet}</span>
      </span>
      <span className={stil.delik} aria-hidden="true" />
    </button>
  )
}

export const KatalogFisi = memo(KatalogFisiBileseni)
