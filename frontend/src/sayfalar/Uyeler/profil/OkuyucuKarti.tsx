import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useKartYenile } from '../../../api/sorgular'
import type { UyeDetay } from '../../../api/semalar'
import { basHarfler, tamAd } from '../../../lib/bicim'
import { bugunIso, gunEkle, noktaliTarih } from '../../../lib/tarih'
import { useBildirim } from '../../../ui/Bildirim'
import { Damga } from '../../../ui/Damga'
import { useKartEgimi, type KartEgimi } from '../kancalar'
import {
  KART_YENILEME_GUNU, KOTA, TUR_ETIKETI, barkodCizgileri, gecerlilikMetni, imza, kartDurumu,
  type KartDurumu,
} from '../uyeVeri'
import ortak from '../ortak.module.css'
import stil from './OkuyucuKarti.module.css'

interface YuzProps {
  readonly uye: UyeDetay
  readonly gizli: boolean
}

function OnYuz({ uye, gizli, doldu, muhurGecikmesi, parlama }: YuzProps & {
  readonly doldu: boolean
  readonly muhurGecikmesi: number
  readonly parlama: KartEgimi['parlama']
}) {
  const cizgiler = useMemo(() => barkodCizgileri(uye.uyeNo), [uye.uyeNo])
  return (
    <div className={`${stil.yuz} ${stil.on}`} aria-hidden={gizli}>
      <div className={stil.serit}>
        <span>Merkez Kütüphane</span>
        <b>Okuyucu kartı</b>
      </div>
      <div className={stil.govde}>
        <div className={stil.foto} aria-hidden="true">
          {basHarfler(uye.ad, uye.soyad)}
        </div>
        <dl className={stil.alanlar}>
          <div className={stil.genis}>
            <dt>Ad soyad</dt>
            <dd>{tamAd(uye)}</dd>
          </div>
          <div>
            <dt>Okuyucu no</dt>
            <dd>{uye.uyeNo}</dd>
          </div>
          <div>
            <dt>Tür</dt>
            <dd>{TUR_ETIKETI[uye.tur]}</dd>
          </div>
          <div>
            <dt>Bölüm</dt>
            <dd title={uye.bolum ?? undefined}>{uye.bolum ?? '—'}</dd>
          </div>
          <div>
            <dt>Geçerlilik</dt>
            <dd data-doldu={doldu}>{gecerlilikMetni(uye.kartGecerlilik)}</dd>
          </div>
        </dl>
      </div>
      <div className={stil.barkod} aria-hidden="true">
        {cizgiler.map((c, i) => (
          <span key={i} className={c.bosluk ? stil.bosluk : stil.cizgi} style={{ width: `${c.genislik}px` }} />
        ))}
      </div>
      <Damga
        key={`${doldu}-${uye.kartGecerlilik}`}
        murekkep={doldu ? 'r' : 'v'}
        vur={muhurGecikmesi}
        egim={-12}
        className={stil.muhur}
      >
        {doldu ? 'Süresi doldu' : 'Onaylı'}
      </Damga>
      <motion.span className={stil.parilti} aria-hidden="true" style={parlama} />
    </div>
  )
}

function ArkaYuz({ uye, gizli }: YuzProps) {
  return (
    <div className={`${stil.yuz} ${stil.arka}`} aria-hidden={gizli}>
      <div className={stil.manyetik} />
      <p className={stil.imza}>{imza(uye.ad, uye.soyad)}</p>
      <ul className={stil.kurallar}>
        <li>Aynı anda en fazla {KOTA} kitap.</li>
        <li>Ödünç süresi 7, 14 ya da 21 gün.</li>
        <li>Kart başkasına devredilemez.</li>
      </ul>
      <p className={stil.kayip}>Bulunursa Merkez Kütüphane ödünç masasına teslim ediniz.</p>
    </div>
  )
}

function CevirIkonu() {
  return (
    <svg className={stil.cevirIkonu} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function kartNotu(k: KartDurumu): string {
  if (k.durum === 'doldu') return `Kartın süresi ${-k.kalanGun} gün önce doldu.`
  if (k.durum === 'yaklasiyor') return k.kalanGun === 0 ? 'Kart bugün doluyor.' : `Kart ${k.kalanGun} gün sonra doluyor.`
  return 'Kartın üstünde gezin — eğilir.'
}

/**
 * Kart yenileme kartın kendisinde tutulur (her zaman takılı): yanıt, tazeleme ve düğmenin
 * görünürlüğü hangi sırayla gelirse gelsin bildirim kaybolmaz; düğme odak kaybolmasın diye kalır.
 */
function useKartYenileme(uyeId: number, onYenilendi: () => void) {
  const yenile = useKartYenile()
  const { bildir, hataBildir } = useBildirim()
  const [yenilendi, setYenilendi] = useState(false)
  const kapali = yenile.isPending || yenilendi
  const tikla = () => {
    if (kapali) return
    const kartGecerlilik = gunEkle(bugunIso(), KART_YENILEME_GUNU)
    yenile.mutate(
      { id: uyeId, kartGecerlilik },
      {
        onSuccess: () => {
          setYenilendi(true)
          onYenilendi()
          bildir({ tur: 'basari', baslik: 'Kart yenilendi', ayrinti: [`${noktaliTarih(kartGecerlilik)} tarihine kadar geçerli`] })
        },
        onError: (h) => hataBildir(h, 'Kart yenilenemedi'),
      },
    )
  }
  const etiket = yenile.isPending ? 'Yenileniyor…' : yenilendi ? 'Kart yenilendi' : 'Kartı yenile'
  return { tikla, kapali, bekliyor: yenile.isPending, yenilendi, etiket }
}

/** Okuyucu kartı: masaya dağıtılır, fareyle eğilir, düğmeyle arkası çevrilir. */
export function OkuyucuKarti({ uye, bugun }: { readonly uye: UyeDetay; readonly bugun: string }) {
  const [cevrik, setCevrik] = useState(false)
  const [muhurGecikmesi, setMuhurGecikmesi] = useState(1.35)
  const { egim, parlama, izle, birak } = useKartEgimi()
  const kart = kartDurumu(uye.kartGecerlilik, bugun)
  const yenileme = useKartYenileme(uye.id, () => {
    setCevrik(false)
    setMuhurGecikmesi(0.2)
  })

  return (
    <>
      <div className={stil.sahne} onMouseMove={izle} onMouseLeave={birak}>
        <motion.div className={stil.egim} style={egim}>
          <div className={stil.ic} data-cevrik={cevrik}>
            <OnYuz uye={uye} gizli={cevrik} doldu={kart.durum === 'doldu'} muhurGecikmesi={muhurGecikmesi} parlama={parlama} />
            <ArkaYuz uye={uye} gizli={!cevrik} />
          </div>
        </motion.div>
      </div>
      <div className={stil.eylemler}>
        <button type="button" className="btn" onClick={() => setCevrik((c) => !c)} aria-pressed={cevrik}>
          <CevirIkonu />
          {cevrik ? 'Ön yüze çevir' : 'Kartı çevir'}
        </button>
        {(kart.durum !== 'gecerli' || yenileme.yenilendi) && (
          <button
            type="button"
            className={`btn btn-v ${ortak.dugme}`}
            onClick={yenileme.tikla}
            aria-disabled={yenileme.kapali || undefined}
            aria-busy={yenileme.bekliyor}
          >
            {yenileme.etiket}
          </button>
        )}
        <p className={`note ${kart.durum === 'gecerli' ? '' : stil.uyari}`}>{kartNotu(kart)}</p>
      </div>
    </>
  )
}
