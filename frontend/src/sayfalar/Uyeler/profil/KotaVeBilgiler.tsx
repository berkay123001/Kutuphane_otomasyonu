import type { UyeDetay } from '../../../api/semalar'
import { para } from '../../../lib/bicim'
import { KOTA, cezaToplami, kotaDilimleri, uyelikAyi } from '../uyeVeri'
import stil from './Profil.module.css'

/** Ödünç kotası: beş dilim, dolanlar sırayla mora boyanır (tasarım: .q-row). */
export function KotaPaneli({ aktif }: { readonly aktif: number }) {
  return (
    <div className={stil.panel}>
      <div className={stil.kotaBas}>
        <span className={stil.etiket}>Ödünç kotası</span>
        <b>
          {aktif} / {KOTA}
        </b>
      </div>
      <div className={stil.kotaSirasi} aria-hidden="true">
        {kotaDilimleri(aktif).map((dolu, i) => (
          <span key={i} className={stil.dilim} data-dolu={dolu} style={{ animationDelay: `${1 + i * 0.09}s` }} />
        ))}
      </div>
    </div>
  )
}

export function UyeBilgileri({ uye }: { readonly uye: UyeDetay }) {
  const { okunanKitapSayisi, gecikmisOduncSayisi } = uye.istatistik
  const borc = cezaToplami(uye.odenmemisCezalar)
  return (
    <dl className={`${stil.bilgiler} ${stil.panel}`}>
      <div>
        <dt>Üyelik</dt>
        <dd>{uyelikAyi(uye.uyelikTarihi)}</dd>
      </div>
      <div>
        <dt>Okunan</dt>
        <dd>{okunanKitapSayisi} kitap</dd>
      </div>
      <div>
        <dt>Gecikme</dt>
        <dd data-uyari={gecikmisOduncSayisi > 0}>{gecikmisOduncSayisi} kitap</dd>
      </div>
      <div>
        <dt>Ödenmemiş ceza</dt>
        <dd data-uyari={borc > 0}>{para(borc)}</dd>
      </div>
    </dl>
  )
}
