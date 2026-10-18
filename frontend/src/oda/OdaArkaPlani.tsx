import { memo } from 'react'
import stil from './OdaArkaPlani.module.css'

const tozlar = Array.from({ length: 14 }, (_, i) => i)

/** Arka plandaki tasarım odası. Görseller OdaCizimi'nin (tasarımın CSS odası) önceden çekilmiş
 *  gündüz/gece hâlleridir: canlı CSS sahnesi zayıf GPU'larda kaydırmayı 6–8 fps'ye düşürüyordu. */
export const OdaArkaPlani = memo(function OdaArkaPlani({ isiklarYaniyor = false }: {
  readonly isiklarYaniyor?: boolean
}) {
  return (
    <>
      <div className={stil.arka} aria-hidden="true">
        <div className={stil.resim} style={{ backgroundImage: 'url(/oda/gunduz.jpg)' }} />
        <div className={`${stil.resim} ${stil.gece}`} style={{ backgroundImage: 'url(/oda/gece.jpg)' }} />
        <div className={stil.toz}>
          {tozlar.map((i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      {isiklarYaniyor && <div className={stil.isiklar} aria-hidden="true" />}
    </>
  )
})
