/** İade fişi: okuyucunun eski son-gün damgaları soluk, yeni yuvada nabız gibi atan hayalet tarih.
 *  Damgalanınca tahta damga iner (press), fiş sarsılır (thud), mürekkep izi ve halka belirir. */
import { damgaTarihi } from '../../lib/tarih'
import type { EskiDamga } from './oduncVeri'
import stil from './Damgalama.module.css'

const YUVA_SAYISI = 8

function EskiIz({ damga }: { readonly damga: EskiDamga }) {
  return (
    <span
      className={`${stil.eski} ${damga.murekkep === 'v' ? stil.eskiMor : stil.eskiKara}`}
      style={{ rotate: `${damga.egim}deg`, opacity: damga.saydamlik }}
    >
      {damga.metin}
    </span>
  )
}

function YeniIz({ metin }: { readonly metin: string }) {
  return (
    <>
      <span className={stil.halka} aria-hidden="true" />
      <span className={stil.iz}>
        <small>Merkez Kütüphane</small>
        <b>{metin}</b>
        <small>İade</small>
      </span>
      <span className={stil.alet} aria-hidden="true">
        <span className={stil.topuz} />
        <span className={stil.boyun} />
        <span className={stil.tahta} />
        <span className={stil.lastik} />
      </span>
    </>
  )
}

interface Props {
  readonly sonGun: string
  readonly eskiler: readonly EskiDamga[]
  readonly damgalandi: boolean
}

export function IadeFisi({ sonGun, eskiler, damgalandi }: Props) {
  const metin = damgaTarihi(sonGun)
  const yeniSira = Math.min(eskiler.length, YUVA_SAYISI - 1)

  const icerik = (i: number) => {
    const eski = eskiler[i]
    if (eski) return <EskiIz damga={eski} />
    if (i !== yeniSira) return null
    if (damgalandi) return <YeniIz metin={metin} />
    return (
      <span key={metin} className={stil.hayalet}>
        {metin}
      </span>
    )
  }

  return (
    <div className={`${stil.fis} ${damgalandi ? stil.sarsil : ''}`}>
      <div className={stil.fisBas}>
        <b>Merkez Kütüphane</b>
        <span>Bu kitap aşağıdaki son tarihte iade edilmelidir.</span>
      </div>
      <div className={stil.yuvalar}>
        {Array.from({ length: YUVA_SAYISI }, (_, i) => (
          <div key={i} className={stil.yuva}>
            {icerik(i)}
          </div>
        ))}
      </div>
    </div>
  )
}
