import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { PanelGeciken } from '../../api/semalar'
import { tamAd } from '../../lib/bicim'
import { useBildirim } from '../../ui/Bildirim'
import { Damga } from '../../ui/Damga'
import { GonderIkonu } from './Ikonlar'
import { DESTE_BOYU, desteKartlari, hatirlatmaDurumu } from './panelVeri'
import { useHatirlatilanlar } from './useHatirlatilanlar'
import stil from './GecikenDestesi.module.css'

/** Tasarımdaki deste yüksekliği (4 fiş) ve fişler arası basamak (px). */
const DESTE_YUKSEKLIGI = 400
const BASAMAK = 46
/** Damga vuruşu (s): sayfa açılışında fişler dağıtıldıktan sonra, tıklamada hemen. */
const ACILIS_VURUSU = 2.3
const TIKLAMA_VURUSU = 0.05
const VURUS_ARALIGI = 0.15

/** Gecikme damga takıldığı anda sabitlenir; sonradan değişen prop vuruşu yeniden oynatmaz. */
function HatirlatmaDamgasi({ vurus }: { readonly vurus: number }) {
  const azalt = useReducedMotion() ?? false
  const [vur] = useState(vurus)
  return (
    <motion.span
      className={stil.damga}
      exit={azalt ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 12 }}
      transition={{ duration: azalt ? 0 : 0.25 }}
    >
      <Damga murekkep="v" vur={vur} egim={-10}>
        Hatırlatıldı
      </Damga>
    </motion.span>
  )
}

interface FisProps {
  readonly geciken: PanelGeciken
  readonly hatirlatildi: boolean
  /** Damganın vuruş gecikmesi (s) */
  readonly vurus: number
}

function GecikenFisi({ geciken, hatirlatildi, vurus }: FisProps) {
  const { kopya, uye } = geciken
  return (
    <Link to={`/uyeler/${uye.id}`} className={`${stil.fis} card`}>
      <div className={stil.ust}>
        <span>{kopya.kitap.yerNumarasi ?? kopya.barkod}</span>
        <span className={stil.gun}>
          {geciken.gecikmeGunu} <span>gün</span>
        </span>
      </div>
      <p className={stil.kitap}>{kopya.kitap.baslik}</p>
      <p className={stil.kim}>
        {tamAd(uye)} · {uye.uyeNo}
      </p>
      <AnimatePresence>{hatirlatildi && <HatirlatmaDamgasi key="hatirlatildi" vurus={vurus} />}</AnimatePresence>
    </Link>
  )
}

interface Props {
  /** En çok gecikenden başlayarak (arka uç sırası) */
  readonly gecikenler: readonly PanelGeciken[]
}

/** Masaya dağıtılan geciken fiş destesi + yerel "hatırlatıldı" işareti (ileti gönderilmez). */
export function GecikenDestesi({ gecikenler }: Props) {
  const kartlar = useMemo(() => desteKartlari(gecikenler), [gecikenler])
  const gecerliIdler = useMemo(() => gecikenler.map((g) => g.id), [gecikenler])
  const { isaretli, degistir } = useHatirlatilanlar(gecerliIdler)
  const { bildir } = useBildirim()
  const [dokunuldu, setDokunuldu] = useState(false)
  const durum = hatirlatmaDurumu(kartlar, isaretli)
  const isaretKumesi = new Set(isaretli)
  const taban = dokunuldu ? TIKLAMA_VURUSU : ACILIS_VURUSU

  const tikla = () => {
    setDokunuldu(true)
    const kaydedildi = degistir(kartlar.map((k) => k.id))
    const not = kaydedildi
      ? 'İşaret yalnızca bu tarayıcıda tutulur; ileti gönderilmez.'
      : 'Tarayıcı deposuna yazılamadı; işaret sayfa yenilenince kaybolur.'
    bildir(
      durum.hepsiIsaretli
        ? { tur: 'bilgi', baslik: 'Hatırlatma işaretleri kaldırıldı' }
        : { tur: kaydedildi ? 'basari' : 'bilgi', baslik: `${durum.kisiSayisi} kişi hatırlatıldı olarak işaretlendi`, ayrinti: [not] },
    )
  }

  return (
    <>
      <div className={stil.yelpaze} style={{ height: DESTE_YUKSEKLIGI - (DESTE_BOYU - kartlar.length) * BASAMAK }}>
        {kartlar.map((g, i) => (
          <GecikenFisi
            key={g.id}
            geciken={g}
            hatirlatildi={isaretKumesi.has(g.id)}
            vurus={taban + i * VURUS_ARALIGI}
          />
        ))}
      </div>
      {/* Etiket durumu taşır ("…işaretle" ↔ "İşaretleri kaldır"); aria-pressed ile çift okunmaz. */}
      <button type="button" className={`btn btn-v ${stil.dugme}`} onClick={tikla}>
        <GonderIkonu />
        {durum.etiket}
      </button>
    </>
  )
}
