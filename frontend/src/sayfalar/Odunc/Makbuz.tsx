/** Damgalamadan sonra beliren makbuz ve rafta kopya yokken ayırtma teklifi. */
import { useEffect, useRef } from 'react'
import { kisaTarih } from '../../lib/tarih'
import { Damga } from '../../ui/Damga'
import { fisNo } from './oduncVeri'
import type { OduncSonucu } from './useOduncMasasi'
import stil from './Damgalama.module.css'

/** Açılınca odak makbuza geçer: damgala düğmesi kaybolduğunda odak boşa düşmesin. */
export function Makbuz({ sonuc }: { readonly sonuc: OduncSonucu }) {
  const kutu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    kutu.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div ref={kutu} className={stil.makbuz} role="status" tabIndex={-1}>
      <Damga murekkep="lv" vur={1.05} className={stil.makbuzDamga}>
        Kayıt açıldı
      </Damga>
      <p className={stil.makbuzMetin}>
        Fiş {fisNo(sonuc.oduncId)} · {sonuc.uyeAdi} · {sonuc.sure} gün · son gün {kisaTarih(sonuc.sonGun)}
      </p>
    </div>
  )
}

interface TeklifProps {
  readonly ayirtildi: boolean
  readonly sirada: boolean
  readonly bekliyor: boolean
  readonly onAyirt: () => void
}

export function AyirtmaTeklifi({ ayirtildi, sirada, bekliyor, onAyirt }: TeklifProps) {
  if (ayirtildi || sirada) {
    return (
      <div className={stil.teklif}>
        <p>{ayirtildi ? 'Okuyucu sıraya alındı; kopya dönünce ona ayrılacak.' : 'Bu okuyucu bu kitap için zaten sırada.'}</p>
        <Damga murekkep="lv" vur={ayirtildi ? 0.1 : false}>
          Ayırtıldı
        </Damga>
      </div>
    )
  }
  return (
    <div className={stil.teklif}>
      <p>Rafta uygun kopya yok. Okuyucuyu sıraya alabilirsin.</p>
      <button type="button" className="btn" onClick={onAyirt} disabled={bekliyor} aria-busy={bekliyor}>
        {bekliyor ? 'Ayırtılıyor…' : 'Bu üye için ayırt'}
      </button>
    </div>
  )
}
