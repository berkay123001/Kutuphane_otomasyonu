/** Sağ sütun: seçili kitabın büyük fişi, eylemler, raftaki yeri ve son hareketleri. */
import { useId } from 'react'
import type { KitapListe } from '../../api/semalar'
import { useKitap } from '../../api/sorgular'
import { bugunIso } from '../../lib/tarih'
import { BosDurum, HataKutusu, Yukleniyor } from '../../ui/Durumlar'
import { BuyukFis } from './BuyukFis'
import { FisEylemleri } from './FisEylemleri'
import { FisHareketleri } from './FisHareketleri'
import { onizlemeModeli } from './katalogVeri'
import { RafYeri } from './RafYeri'
import stil from './Onizleme.module.css'

interface Props {
  readonly kitapId: number | null
  /** Çekmecedeki satır; ayrıntı gelene dek fiş bundan çizilir */
  readonly listeKitabi: KitapListe | undefined
  readonly listeYukleniyor: boolean
}

function Icerik({ kitapId, listeKitabi, listeYukleniyor }: Props) {
  const detay = useKitap(kitapId)
  const d = detay.data?.veri.id === kitapId ? detay.data?.veri : undefined
  const model = onizlemeModeli(listeKitabi, d, bugunIso())

  if (!model) {
    if (kitapId === null && !listeYukleniyor) {
      return <BosDurum baslik="Seçili fiş yok" aciklama="Çekmeceden bir fiş seç ya da aramayı değiştir." />
    }
    if (detay.isError) return <HataKutusu hata={detay.error} yenidenDene={() => void detay.refetch()} />
    return <Yukleniyor metin="Fiş çekmeceden çıkarılıyor…" adet={1} />
  }

  return (
    <>
      <BuyukFis key={model.id} model={model} />
      {detay.isError && (
        <p className={`note ${stil.uyari}`} role="status">
          Kopya ayrıntıları alınamadı; fiş liste bilgisinden çizildi.
        </p>
      )}
      <FisEylemleri key={`eylem-${model.id}`} kitapId={model.id} baslik={model.baslik} />
      <RafYeri kitapId={model.id} baslik={model.baslik} yer={model.rafYeri} yerNumarasi={model.yerNumarasi} />
      {d && <FisHareketleri key={`hareket-${model.id}`} hareketler={d.hareketler} />}
    </>
  )
}

export function SeciliFis(p: Props) {
  const baslikId = useId()
  return (
    <aside className={stil.onizleme} aria-labelledby={baslikId}>
      <div className={stil.baslikSatiri}>
        <h2 className="h2" id={baslikId}>
          Seçili fiş
        </h2>
        <p className="note">Bir fişe tıkla — kitap raftan çıksın</p>
      </div>
      <Icerik {...p} />
    </aside>
  )
}
