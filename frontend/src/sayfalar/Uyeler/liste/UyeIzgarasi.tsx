import { useEffect, useRef, useState } from 'react'
import { useUyeler } from '../../../api/sorgular'
import type { UyeListe } from '../../../api/semalar'
import type { UyeFiltresi } from '../../../api/uclar'
import { sayi } from '../../../lib/bicim'
import { bugunIso } from '../../../lib/tarih'
import { BosDurum, HataKutusu, Yukleniyor } from '../../../ui/Durumlar'
import { SAYFA_BOYU } from '../uyeVeri'
import { MiniKart } from './MiniKart'
import stil from './Liste.module.css'

type Filtre = Pick<UyeFiltresi, 'q' | 'aktif'>
type Sorgu = ReturnType<typeof useUyeler>

interface ListeProps {
  readonly uyeler: readonly UyeListe[]
  readonly bugun: string
  /** Bu liste yüklenince ilk karta odaklan ("Daha fazla" düğmesi kaybolduysa) */
  readonly odakla?: boolean
}

function KartListesi({ uyeler, bugun, odakla = false }: ListeProps) {
  const ilk = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (odakla) ilk.current?.focus({ preventScroll: true })
  }, [odakla])
  return (
    <ul className={stil.izgara}>
      {uyeler.map((u, i) => (
        <li key={u.id}>
          <MiniKart ref={i === 0 ? ilk : undefined} uye={u} sira={i} bugun={bugun} />
        </li>
      ))}
    </ul>
  )
}

interface EkSayfaProps {
  readonly filtre: Filtre
  readonly sayfa: number
  readonly bugun: string
  readonly odakla: boolean
}

/** "Daha fazla göster" ile açılan 2., 3. … sayfa; her biri kendi sorgusunu taşır. */
function EkSayfa({ filtre, sayfa, bugun, odakla }: EkSayfaProps) {
  const sorgu = useUyeler({ ...filtre, page: sayfa, limit: SAYFA_BOYU })
  if (sorgu.data) return <KartListesi uyeler={sorgu.data.veri} bugun={bugun} odakla={odakla} />
  if (sorgu.isError) return <HataKutusu hata={sorgu.error} yenidenDene={() => void sorgu.refetch()} />
  return <Yukleniyor metin="Sıradaki kartlar çıkarılıyor…" adet={2} />
}

interface Props {
  readonly filtre: Filtre
  readonly ilk: Sorgu
}

/** Okuyucu kartları: ilk sayfa üstte, istenirse 24'erli ek sayfalar. */
export function UyeIzgarasi({ filtre, ilk }: Props) {
  const anahtar = `${filtre.q ?? ''}|${String(filtre.aktif)}`
  const [acilan, setAcilan] = useState({ anahtar, sayfa: 1 })
  const sayfaSayisi = acilan.anahtar === anahtar ? acilan.sayfa : 1
  const bugun = bugunIso()

  if (!ilk.data) {
    return ilk.isError ? (
      <HataKutusu hata={ilk.error} yenidenDene={() => void ilk.refetch()} />
    ) : (
      <Yukleniyor metin="Okuyucu kartları diziliyor…" />
    )
  }

  const { veri, meta } = ilk.data
  const toplam = meta?.total ?? veri.length
  if (veri.length === 0) {
    return filtre.q || filtre.aktif !== undefined ? (
      <BosDurum baslik="Eşleşen okuyucu yok" aciklama="Aramayı kısaltın ya da başka bir sekmeye bakın." />
    ) : (
      <BosDurum baslik="Dolap boş" aciklama="İlk okuyucuyu “Yeni üye” ile kaydedin." />
    )
  }

  const kalan = Math.max(0, toplam - sayfaSayisi * SAYFA_BOYU)
  return (
    <div className={stil.sayfalar} data-tazeleniyor={ilk.isPlaceholderData}>
      <KartListesi uyeler={veri} bugun={bugun} />
      {Array.from({ length: sayfaSayisi - 1 }, (_, i) => (
        <EkSayfa key={i + 2} filtre={filtre} sayfa={i + 2} bugun={bugun} odakla={i + 2 === sayfaSayisi && kalan === 0} />
      ))}
      {kalan > 0 && !ilk.isPlaceholderData && (
        <button
          type="button"
          className={`btn ${stil.dahaFazla}`}
          onClick={() => setAcilan({ anahtar, sayfa: sayfaSayisi + 1 })}
        >
          Daha fazla göster <span>({sayi(kalan)} kart daha)</span>
        </button>
      )}
    </div>
  )
}
