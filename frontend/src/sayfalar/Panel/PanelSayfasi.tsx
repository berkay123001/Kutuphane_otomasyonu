import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useKategoriler, usePanel } from '../../api/sorgular'
import { UstBar } from '../../kabuk/UstBar'
import { sayi } from '../../lib/bicim'
import { bugunIso } from '../../lib/tarih'
import { BosDurum, HataKutusu, Yukleniyor } from '../../ui/Durumlar'
import { Bolum } from './Bolum'
import { BugununCekmecesi } from './BugununCekmecesi'
import { GecikenDestesi } from './GecikenDestesi'
import { HareketDefteri } from './HareketDefteri'
import { ArtiIkonu, AramaIkonu } from './Ikonlar'
import { Kahraman } from './Kahraman'
import { KoleksiyonDolabi } from './KoleksiyonDolabi'
import { GECIKENLER_CAPASI, defterNotu, gecikenToplami, ozetCumlesi, toplamKopya } from './panelVeri'
import ortak from './Panel.module.css'

interface SorguDurumu {
  readonly isError: boolean
  readonly error: unknown
  readonly refetch: () => Promise<unknown>
}

/** Veri yokken bölümün yerine: hata kutusu (yeniden dene) ya da nefes alan boş fişler. */
function yedek(sorgu: SorguDurumu, metin: string, adet = 3): ReactNode {
  if (sorgu.isError) return <HataKutusu hata={sorgu.error} yenidenDene={() => void sorgu.refetch()} />
  return <Yukleniyor metin={metin} adet={adet} />
}

const DOLAP_NOTU = 'Bir çekmeceye tıkla, dışarı kaysın'

/** Çekmece 01 — Panel: bugünün özeti, hareket defteri, gecikenler ve koleksiyon dolabı. */
export default function PanelSayfasi() {
  const bugun = bugunIso()
  const panel = usePanel()
  const kategoriSorgusu = useKategoriler()
  const veri = panel.data?.veri
  const kategoriler = kategoriSorgusu.data?.veri
  const ozet = veri ? ozetCumlesi(veri.bugun) : panel.isError ? 'Bugünün sayıları alınamadı.' : null
  const sutunlarGorunur = veri !== undefined || !panel.isError
  const gecikenSayisi = veri ? gecikenToplami(veri) : 0

  return (
    <>
      <UstBar etiket="Çekmece 01 — Panel">
        <Link className="ibtn" to="/katalog" aria-label="Katalogda ara">
          <AramaIkonu />
        </Link>
        <Link className="btn btn-v" to="/odunc">
          <ArtiIkonu />
          Hızlı ödünç
        </Link>
      </UstBar>

      <Kahraman bugun={bugun} ozet={ozet} />

      <Bolum baslikId="h-bugun" baslik="Bugünün çekmecesi" not="Bir fişin üstüne gel — çekmeceden yukarı çıkar.">
        {veri ? <BugununCekmecesi bugun={bugun} veri={veri} /> : yedek(panel, 'Bugünün fişleri sayılıyor…', 4)}
      </Bolum>

      {sutunlarGorunur && (
        <div className={ortak.sutunlar}>
          <Bolum
            className={ortak.solSutun}
            baslikId="h-defter"
            baslik="Hareket defteri"
            not={veri ? defterNotu(veri.sonHareketler.length) : undefined}
          >
            {veri ? (
              <HareketDefteri bugun={bugun} hareketler={veri.sonHareketler} />
            ) : (
              <Yukleniyor metin="Defter yazdırılıyor…" adet={2} />
            )}
          </Bolum>

          <Bolum
            id={GECIKENLER_CAPASI}
            className={ortak.sagSutun}
            baslikId="h-gecikenler"
            baslik="Gecikenler"
            not={veri && gecikenSayisi > 0 ? `${sayi(gecikenSayisi)} fiş · desteyi aç` : undefined}
          >
            {!veri && <Yukleniyor metin="Geciken fişler ayıklanıyor…" adet={2} />}
            {veri && veri.gecikenler.length === 0 && (
              <BosDurum baslik="Geciken fiş yok" aciklama="Bütün ödünçler süresi içinde." />
            )}
            {veri && veri.gecikenler.length > 0 && <GecikenDestesi gecikenler={veri.gecikenler} />}
          </Bolum>
        </div>
      )}

      <Bolum
        baslikId="h-dolap"
        baslik="Koleksiyon dolabı"
        not={kategoriler ? `${DOLAP_NOTU} · ${sayi(toplamKopya(kategoriler))} fiş` : DOLAP_NOTU}
      >
        {kategoriler && kategoriler.length > 0 && <KoleksiyonDolabi kategoriler={kategoriler} />}
        {kategoriler && kategoriler.length === 0 && (
          <BosDurum baslik="Dolap boş" aciklama="Henüz kategori tanımlanmamış." />
        )}
        {!kategoriler && yedek(kategoriSorgusu, 'Çekmeceler sayılıyor…')}
      </Bolum>
    </>
  )
}
