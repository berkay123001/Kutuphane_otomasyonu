/** Fişin son hareketleri: tarih, demirbaş, üye, hareket türü. */
import { useId } from 'react'
import type { KitapDetay } from '../../api/semalar'
import { hareketSatirlari } from './katalogVeri'
import stil from './Onizleme.module.css'

const GOSTERILEN = 6

export function FisHareketleri({ hareketler }: { readonly hareketler: KitapDetay['hareketler'] }) {
  const baslikId = useId()
  const satirlar = hareketSatirlari(hareketler, GOSTERILEN)
  return (
    <section className={stil.hareketler} aria-labelledby={baslikId}>
      <h3 className="eyebrow" id={baslikId}>
        Fişin hareketleri
      </h3>
      {satirlar.length === 0 ? (
        <p className={stil.hareketKart}>Bu fişte henüz hareket yok.</p>
      ) : (
        <ol className={stil.hareketKart}>
          {satirlar.map((s, i) => (
            <li key={s.id} className={stil.hareket} style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
              <span>{s.tarih}</span>
              <span className={stil.hareketSoluk}>{s.barkod}</span>
              <span className={stil.hareketUye}>{s.uye}</span>
              <span className={stil.hareketTip} data-gec={s.gec}>
                {s.tip}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
