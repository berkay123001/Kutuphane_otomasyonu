import { Link, useParams } from 'react-router'
import { useUye } from '../../api/sorgular'
import type { UyeDetay } from '../../api/semalar'
import { UstBar } from '../../kabuk/UstBar'
import { bugunIso } from '../../lib/tarih'
import { BosDurum, HataKutusu, Yukleniyor } from '../../ui/Durumlar'
import { Ayirttiklari, OdenmemisCezalar } from './profil/CezaVeAyirtma'
import { Elindekiler } from './profil/Elindekiler'
import { KotaPaneli, UyeBilgileri } from './profil/KotaVeBilgiler'
import { OkumaRafi } from './profil/OkumaRafi'
import { OkuyucuKarti } from './profil/OkuyucuKarti'
import { OduncVerBaglantisi, ProfilBasligi } from './profil/ProfilBasligi'
import { kimlikCoz } from './uyeVeri'
import stil from './profil/Profil.module.css'

function ProfilIcerigi({ uye }: { readonly uye: UyeDetay }) {
  const bugun = bugunIso()
  return (
    <>
      <ProfilBasligi uye={uye} bugun={bugun} />
      <div className={stil.izgara}>
        <div className={stil.solSutun}>
          <OkuyucuKarti uye={uye} bugun={bugun} />
          <KotaPaneli aktif={uye.istatistik.aktifOduncSayisi} />
          <UyeBilgileri uye={uye} />
        </div>
        <div className={stil.sagSutun}>
          <Elindekiler oduncler={uye.aktifOduncler} bugun={bugun} />
          <OdenmemisCezalar cezalar={uye.odenmemisCezalar} />
          <Ayirttiklari rezervasyonlar={uye.rezervasyonlar} />
          <OkumaRafi gecmis={uye.gecmis} />
        </div>
      </div>
    </>
  )
}

function ProfilGovdesi({ id, sorgu }: { readonly id: number | null; readonly sorgu: ReturnType<typeof useUye> }) {
  const uye = sorgu.data?.veri
  if (id === null) {
    return <BosDurum baslik="Böyle bir okuyucu yok" aciklama="Adres hatalı görünüyor; üye listesinden seçin." />
  }
  if (uye) return <ProfilIcerigi key={uye.id} uye={uye} />
  if (sorgu.isError) {
    return (
      <div className={stil.durum}>
        <HataKutusu hata={sorgu.error} yenidenDene={() => void sorgu.refetch()} />
      </div>
    )
  }
  return <Yukleniyor metin="Okuyucu kartı dolaptan çıkarılıyor…" />
}

/** 04 · Üye profili: okuyucu kartı, elindekiler, cezalar, ayırttıkları, okuma rafı. */
export default function UyeProfilSayfasi() {
  const { uyeId } = useParams()
  const id = kimlikCoz(uyeId)
  const sorgu = useUye(id)
  const uye = sorgu.data?.veri

  return (
    <>
      <UstBar etiket="Çekmece 04 — Üyeler">
        <Link to="/uyeler" className="btn">
          Tüm üyeler
        </Link>
        {uye && <OduncVerBaglantisi uyeId={uye.id} engeller={uye.oduncEngelleri} />}
      </UstBar>
      <ProfilGovdesi id={id} sorgu={sorgu} />
    </>
  )
}
