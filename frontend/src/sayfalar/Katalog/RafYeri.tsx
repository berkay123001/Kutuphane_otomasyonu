/** Küçük kitaplık: seçili kitap raftan çekilir, komşuları yaslanır (tasarım: .rs). */
import { useMemo } from 'react'
import { rafSirtlari, type Sirt } from './katalogVeri'
import stil from './RafYeri.module.css'

interface Props {
  readonly kitapId: number
  readonly baslik: string
  /** 'B Blok · Raf 14'; ayrıntı gelene kadar null */
  readonly yer: string | null
  readonly yerNumarasi: string | null
}

function sirtSinifi(s: Sirt): string {
  if (s.secili) return `${stil.sirt} ${stil.secili}`
  if (s.yan === 'sol') return `${stil.sirt} ${stil.yasSol}`
  if (s.yan === 'sag') return `${stil.sirt} ${stil.yasSag}`
  return `${stil.sirt} ${stil.dolgu}`
}

export function RafYeri({ kitapId, baslik, yer, yerNumarasi }: Props) {
  const sirtlar = useMemo(() => rafSirtlari(kitapId), [kitapId])
  return (
    <div className={stil.raf}>
      <div className={stil.rafBas}>
        <span className="eyebrow">Rafta yeri</span>
        <p className={stil.rafYeri} aria-live="polite">
          <b>{yer ?? '···'}</b>
          {yerNumarasi && <span>{yerNumarasi}</span>}
        </p>
      </div>
      <div className={stil.dolap} aria-hidden="true">
        <div className={stil.sira} key={kitapId}>
          {sirtlar.map((s) => (
            <span
              key={s.anahtar}
              className={sirtSinifi(s)}
              style={{ height: `${s.yukseklik}%`, width: s.genislik, backgroundColor: s.renk }}
            >
              {s.secili && <span className={stil.sirtBaslik}>{baslik}</span>}
            </span>
          ))}
        </div>
      </div>
      <div className={`${stil.tahta} grain`} aria-hidden="true" />
    </div>
  )
}
