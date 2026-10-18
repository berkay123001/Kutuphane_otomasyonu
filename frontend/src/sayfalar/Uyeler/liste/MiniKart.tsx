import { motion } from 'motion/react'
import type { Ref } from 'react'
import { Link } from 'react-router'
import type { UyeListe } from '../../../api/semalar'
import { basHarfler, tamAd } from '../../../lib/bicim'
import { Damga } from '../../../ui/Damga'
import { useKartEgimi } from '../kancalar'
import { KOTA, TUR_ETIKETI, kartDamgalari, kotaDilimleri } from '../uyeVeri'
import stil from './MiniKart.module.css'

interface Props {
  readonly uye: UyeListe
  readonly sira: number
  readonly bugun: string
  readonly ref?: Ref<HTMLAnchorElement>
}

/** Dolaptaki küçük okuyucu kartı: sırayla dağıtılır, fareyle eğilir, profile açılır. */
export function MiniKart({ uye, sira, bugun, ref }: Props) {
  const { egim, parlama, izle, birak } = useKartEgimi(10, 14)
  const damgalar = kartDamgalari(uye, bugun)
  const gecikme = 0.45 + Math.min(sira, 16) * 0.05

  return (
    <Link
      ref={ref}
      to={`/uyeler/${uye.id}`}
      className={stil.kap}
      data-soluk={!uye.aktif}
      style={{ animationDelay: `${gecikme}s` }}
      onMouseMove={izle}
      onMouseLeave={birak}
    >
      <motion.div className={stil.kart} style={egim}>
        <div className={stil.serit} aria-hidden="true">
          <span>Merkez Kütüphane</span>
          <b>Okuyucu kartı</b>
        </div>
        <div className={stil.govde}>
          <div className={stil.foto} aria-hidden="true">
            {basHarfler(uye.ad, uye.soyad)}
          </div>
          <div className={stil.bilgi}>
            <span className={stil.ad}>{tamAd(uye)}</span>
            <span className={stil.no}>{uye.uyeNo}</span>
            <span className={stil.ek}>
              {TUR_ETIKETI[uye.tur]} · {uye.bolum ?? '—'}
            </span>
          </div>
        </div>
        <div className={stil.alt}>
          <span aria-hidden="true">Kota</span>
          <span className={stil.noktalar} aria-hidden="true">
            {kotaDilimleri(uye.aktifOduncSayisi).map((dolu, i) => (
              <span key={i} className={stil.nokta} data-dolu={dolu} />
            ))}
          </span>
          <span className="sr">
            {uye.aktifOduncSayisi} / {KOTA} ödünç
          </span>
        </div>
        {damgalar.length > 0 && (
          <span className={stil.damgalar}>
            {damgalar.map((d, i) => (
              <Damga key={d.metin} murekkep={d.murekkep} vur={gecikme + 0.5 + i * 0.12} egim={i % 2 ? 4 : -6}>
                {d.metin}
              </Damga>
            ))}
          </span>
        )}
        <motion.span className={stil.parilti} aria-hidden="true" style={parlama} />
      </motion.div>
    </Link>
  )
}
