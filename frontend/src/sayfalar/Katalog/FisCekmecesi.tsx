/** Kart kataloğu çekmecesi: ayraç sekmeleri, ahşap kutu içinde eğik fiş yığını, ön levha. */
import { useId, type KeyboardEvent } from 'react'
import type { KitapListe } from '../../api/semalar'
import { HataKutusu, Yukleniyor } from '../../ui/Durumlar'
import { KatalogFisi } from './KatalogFisi'
import { KategoriSekmeleri, sekmeId } from './KategoriSekmeleri'
import { aralikMetni, hedefSira, type Sekme } from './katalogVeri'
import type { Riffle } from './useRiffle'
import stil from './Cekmece.module.css'

export type ListeDurumu =
  | { readonly tur: 'yukleniyor' }
  | { readonly tur: 'hata'; readonly hata: unknown; readonly yenidenDene: () => void }
  | { readonly tur: 'hazir'; readonly kitaplar: readonly KitapListe[] }

interface Props {
  readonly sekmeler: readonly Sekme[]
  /** Sekmelerde anında görünen seçim */
  readonly secilenKategori: number | null
  readonly onKategori: (id: number | null) => void
  /** Ekrandaki verinin ait olduğu sekme (ön levha) */
  readonly uygulanan: Sekme
  readonly durum: ListeDurumu
  readonly toplam: number | null
  readonly seciliId: number | null
  readonly onSec: (id: number) => void
  readonly riffle: Riffle
}

function YiginIcerigi({ durum, seciliId, onSec, riffle }: Pick<Props, 'durum' | 'seciliId' | 'onSec' | 'riffle'>) {
  if (durum.tur === 'yukleniyor') {
    return (
      <div className={stil.durumAlani}>
        <Yukleniyor />
      </div>
    )
  }
  if (durum.tur === 'hata') {
    return (
      <div className={stil.durumAlani}>
        <HataKutusu hata={durum.hata} yenidenDene={durum.yenidenDene} />
      </div>
    )
  }
  if (durum.kitaplar.length === 0) {
    return (
      <div className={`${stil.bosFis} card`}>
        Bu çekmecede eşleşen fiş yok.
        <br />
        Başka bir sekmeye bak ya da aramayı kısalt.
      </div>
    )
  }
  // Tek sekme durağı: seçili fiş (listede yoksa ilki); aralarında oklarla gezilir.
  const durak = durum.kitaplar.some((k) => k.id === seciliId) ? seciliId : durum.kitaplar[0]?.id
  return durum.kitaplar.map((k, i) => (
    <KatalogFisi
      key={k.id}
      kitap={k}
      sira={i}
      secili={k.id === seciliId}
      durak={k.id === durak}
      riffle={riffle}
      onSec={onSec}
    />
  ))
}

function yiginTusu(e: KeyboardEvent<HTMLDivElement>) {
  const fisler = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-fis]')]
  const simdiki = fisler.findIndex((f) => f === e.target)
  const hedef = simdiki === -1 ? null : hedefSira(e.key, simdiki, fisler.length, 'dikey')
  if (hedef === null) return
  e.preventDefault()
  fisler[hedef]?.focus()
}

export function FisCekmecesi(p: Props) {
  const kok = useId()
  const panelId = `${kok}-panel`
  const gorunen = p.sekmeler.find((s) => s.kategoriId === p.secilenKategori)
  const levha = aralikMetni(p.uygulanan)
  const gosterilen = p.durum.tur === 'hazir' ? p.durum.kitaplar.length : 0
  const kesik = p.toplam !== null && p.toplam > gosterilen && gosterilen > 0

  return (
    <section className={stil.cekmece} aria-labelledby={`${kok}-baslik`}>
      <h2 className="sr" id={`${kok}-baslik`}>
        Çekmecedeki fişler
      </h2>
      <p className="sr">Fişler arasında yukarı ve aşağı oklarla gezin, Enter ile seçin.</p>
      <KategoriSekmeleri
        sekmeler={p.sekmeler}
        secili={p.secilenKategori}
        onSec={p.onKategori}
        panelId={panelId}
        idOnEki={kok}
      />
      <div
        className={stil.kutu}
        id={panelId}
        role="tabpanel"
        aria-labelledby={gorunen ? sekmeId(kok, gorunen) : undefined}
        aria-label={gorunen ? undefined : 'Çekmecedeki fişler'}
        aria-busy={p.durum.tur === 'yukleniyor'}
      >
        <div className={stil.pencere}>
          <div className={stil.yigin} key={p.riffle.anahtar} onKeyDown={yiginTusu}>
            <YiginIcerigi durum={p.durum} seciliId={p.seciliId} onSec={p.onSec} riffle={p.riffle} />
          </div>
        </div>
      </div>
      <div className={`${stil.onYuz} grain`}>
        <span className={stil.levha}>
          <span className={stil.levhaMetin} key={levha}>
            {levha}
          </span>
        </span>
        {kesik && (
          <span className={stil.onNot}>
            İlk {gosterilen} fiş gösteriliyor · aramayı daralt
          </span>
        )}
        <span className={stil.kulp} aria-hidden="true" />
      </div>
    </section>
  )
}
