import { Link } from 'react-router'
import type { PanelHareket } from '../../api/semalar'
import { tamAd } from '../../lib/bicim'
import { kisaTarih, noktaliTarih, saat, zamandanIso } from '../../lib/tarih'
import { Damga } from '../../ui/Damga'
import { defterNo, hareketDamgasi, satirZamani } from './panelVeri'
import stil from './HareketDefteri.module.css'

interface SatirProps {
  readonly hareket: PanelHareket
  readonly sira: number
  readonly bugun: string
}

function DefterSatiri({ hareket, sira, bugun }: SatirProps) {
  const zaman = satirZamani(sira)
  const damga = hareketDamgasi(hareket.tip)
  const gun = zamandanIso(hareket.zaman)
  return (
    <li className={stil.satir} style={{ animationDelay: `${zaman.satir}s` }}>
      <span className={stil.saat}>
        <time dateTime={hareket.zaman}>{saat(hareket.zaman)}</time>
        {gun !== bugun && <small>{kisaTarih(gun)}</small>}
      </span>
      <span className={stil.kitap}>
        <Link to={`/odunc/${hareket.kitap.id}`}>{hareket.kitap.baslik}</Link>
        {hareket.kitap.yerNumarasi && <small>{hareket.kitap.yerNumarasi}</small>}
      </span>
      <span className={stil.uye}>
        <Link to={`/uyeler/${hareket.uye.id}`}>{tamAd(hareket.uye)}</Link>
      </span>
      <Damga murekkep={damga.murekkep} vur={zaman.damga} egim={zaman.egim}>
        {damga.metin}
      </Damga>
    </li>
  )
}

interface Props {
  readonly bugun: string
  readonly hareketler: readonly PanelHareket[]
}

/** Nokta vuruşlu yazıcı: kâğıt yuvadan iner, son hareketler satır satır basılır, damgalar vurulur. */
export function HareketDefteri({ bugun, hareketler }: Props) {
  return (
    <div className={stil.yazici}>
      <div className={stil.yuva} aria-hidden="true" />
      <div className={stil.kagit}>
        <div className={stil.ust}>
          <span>Merkez Kütüphane · Günlük hareket</span>
          <span>
            No. {defterNo(bugun)} · {noktaliTarih(bugun)}
          </span>
        </div>
        {hareketler.length === 0 ? (
          <p className={stil.bos}>— Deftere henüz hareket yazılmadı —</p>
        ) : (
          <ol className={stil.satirlar}>
            {hareketler.map((h, i) => (
              <DefterSatiri key={h.id} hareket={h} sira={i} bugun={bugun} />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
