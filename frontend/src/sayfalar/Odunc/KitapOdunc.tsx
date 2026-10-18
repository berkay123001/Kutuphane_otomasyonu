/** /odunc/:kitapId — fiş, kopyalar, hareketler ve ödünç masası. */
import { Link } from 'react-router'
import { ApiHatasi } from '../../api/istemci'
import type { KitapDetay } from '../../api/semalar'
import { useKitap, useUye } from '../../api/sorgular'
import { bugunIso } from '../../lib/tarih'
import { BosDurum, HataKutusu, Yukleniyor } from '../../ui/Durumlar'
import { Hareketler } from './Hareketler'
import { KatalogFisi } from './KatalogFisi'
import { KitapBasligi } from './KitapBasligi'
import { Kopyalar } from './Kopyalar'
import { OduncMasasi } from './OduncMasasi'
import { verilecekKopyaId, type OkuyucuDurumu } from './oduncVeri'
import { useOduncMasasi } from './useOduncMasasi'
import stil from './Fis.module.css'

function FisYok() {
  return (
    <section className={stil.bos} aria-labelledby="h-fis-yok">
      <h1 className="h1" id="h-fis-yok">
        Fiş bulunamadı
      </h1>
      <BosDurum baslik="Bu fiş çekmecede yok" aciklama="Kitap kaldırılmış ya da numara yanlış olabilir." />
      <Link className="btn btn-v" to="/katalog">
        Kataloğa dön
      </Link>
    </section>
  )
}

function KitapEkrani({ kitap }: { readonly kitap: KitapDetay }) {
  const masa = useOduncMasasi(kitap.id)
  const uyeSorgu = useUye(masa.uyeId)
  const bugun = bugunIso()
  const verilecekId = verilecekKopyaId(kitap.kopyalar, masa.uyeId)
  const halkaliId = masa.sonuc?.kopyaId ?? verilecekId
  const uye = masa.uyeId !== null ? (uyeSorgu.data?.veri ?? null) : null
  const okuyucu: OkuyucuDurumu =
    masa.uyeId === null ? 'yok' : uye ? 'hazir' : uyeSorgu.isError ? 'hata' : 'yukleniyor'

  return (
    <>
      <KitapBasligi kitap={kitap} />
      <div className={stil.izgara}>
        <div className={stil.solSutun}>
          <KatalogFisi kitap={kitap} />
          <Kopyalar
            kopyalar={kitap.kopyalar}
            halkaliId={halkaliId}
            uyeId={masa.uyeId}
            verilen={masa.sonuc}
            bugun={bugun}
          />
          <Hareketler hareketler={kitap.hareketler} kopyalar={kitap.kopyalar} />
        </div>
        <div className={stil.sagSutun}>
          <OduncMasasi
            kitap={kitap}
            masa={masa}
            uye={uye}
            okuyucu={okuyucu}
            verilecekId={verilecekId}
            bugun={bugun}
          />
        </div>
      </div>
    </>
  )
}

export function KitapOdunc({ kitapId }: { readonly kitapId: number | null }) {
  const sorgu = useKitap(kitapId)
  const bulunamadi = sorgu.error instanceof ApiHatasi && sorgu.error.durum === 404
  if (kitapId === null || bulunamadi) return <FisYok />
  // Arka plandaki bir tazeleme düşse bile eldeki veriyle masa (ve makbuz) yerinde kalır.
  if (sorgu.data) return <KitapEkrani kitap={sorgu.data.veri} />
  if (sorgu.isError) return <HataKutusu hata={sorgu.error} yenidenDene={() => void sorgu.refetch()} />
  return <Yukleniyor metin="Fiş çekmeceden çıkarılıyor…" />
}
