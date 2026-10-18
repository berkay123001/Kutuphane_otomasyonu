/** Çekmece 02 — Katalog: kart kataloğu çekmecesi, arama, kategori ayraçları ve seçili fiş. */
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { useKategoriler, useKitaplar } from '../../api/sorgular'
import { UstBar } from '../../kabuk/UstBar'
import { FisCekmecesi, type ListeDurumu } from './FisCekmecesi'
import { GeriIkonu } from './ikonlar'
import { AramaKutusu, KatalogBasligi } from './KatalogBasligi'
import { TUMU_ANAHTARI, aktifSekme, aralikMetni, sekmeModeli } from './katalogVeri'
import { SeciliFis } from './SeciliFis'
import { useKatalogFiltresi } from './useKatalogFiltresi'
import { useRiffle, useSonHazir } from './useRiffle'
import stil from './Katalog.module.css'

const LISTE_SINIRI = 100

function useKatalogListesi(q: string, kategoriId: number | null) {
  const sorgu = useKitaplar({ q: q || undefined, kategoriId: kategoriId ?? undefined, limit: LISTE_SINIRI })
  const hazir = sorgu.isSuccess && !sorgu.isPlaceholderData
  // Ekrandaki veri hangi sekmeye ait: yeni sekmenin verisi gelene dek eskisi kalır.
  const gosterilenKategori = useSonHazir(kategoriId, hazir)
  const veri = sorgu.data
  const durum: ListeDurumu = veri
    ? { tur: 'hazir', kitaplar: veri.veri }
    : sorgu.isError
      ? { tur: 'hata', hata: sorgu.error, yenidenDene: () => void sorgu.refetch() }
      : { tur: 'yukleniyor' }
  return {
    durum,
    liste: veri?.veri,
    toplam: veri ? (veri.meta?.total ?? veri.veri.length) : null,
    gosterilenKategori,
    getiriliyor: sorgu.isFetching && sorgu.isPlaceholderData,
  }
}

export default function KatalogSayfasi() {
  const filtre = useKatalogFiltresi()
  const kategoriler = useKategoriler()
  const sekmeler = useMemo(() => sekmeModeli(kategoriler.data?.veri ?? []), [kategoriler.data])
  const liste = useKatalogListesi(filtre.q, filtre.kategoriId)
  const { secilenKategori, kategoriSec } = filtre
  const kategoriBilinmiyor =
    kategoriler.isSuccess && secilenKategori !== null && !sekmeler.some((s) => s.kategoriId === secilenKategori)

  // Adres çubuğundaki kategori artık yoksa (silinmiş, elle yazılmış) Tümü'ye dön.
  useEffect(() => {
    if (kategoriBilinmiyor) kategoriSec(null)
  }, [kategoriBilinmiyor, kategoriSec])
  const riffle = useRiffle(liste.gosterilenKategori === null ? TUMU_ANAHTARI : `k${liste.gosterilenKategori}`)
  const uygulanan = aktifSekme(sekmeler, liste.gosterilenKategori)

  const seciliId = filtre.kitapId ?? liste.liste?.[0]?.id ?? null
  const listeKitabi = liste.liste?.find((k) => k.id === seciliId)
  const aramaBekliyor = filtre.arama.trim() !== filtre.q || filtre.secilenKategori !== filtre.kategoriId

  return (
    <>
      <UstBar etiket="Çekmece 02 — Katalog">
        <Link className="btn" to="/panel">
          <GeriIkonu />
          Panele dön
        </Link>
      </UstBar>
      <KatalogBasligi toplam={liste.toplam} aralik={aralikMetni(uygulanan)} />
      <AramaKutusu
        deger={filtre.arama}
        onDegis={filtre.aramaDegistir}
        sonuc={liste.toplam}
        araniyor={aramaBekliyor || liste.getiriliyor}
      />
      <div className={stil.izgara}>
        <FisCekmecesi
          sekmeler={sekmeler}
          secilenKategori={filtre.secilenKategori}
          onKategori={filtre.kategoriSec}
          uygulanan={uygulanan}
          durum={liste.durum}
          toplam={liste.toplam}
          seciliId={seciliId}
          onSec={filtre.kitapSec}
          riffle={riffle}
        />
        <SeciliFis
          kitapId={seciliId}
          listeKitabi={listeKitabi}
          listeYukleniyor={liste.durum.tur === 'yukleniyor'}
        />
      </div>
    </>
  )
}
