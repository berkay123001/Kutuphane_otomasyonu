import { motion, useReducedMotion } from 'motion/react'
import { useState, type Ref } from 'react'
import { useIade, useUzat } from '../../../api/sorgular'
import { para } from '../../../lib/bicim'
import { kisaTarih } from '../../../lib/tarih'
import { useBildirim } from '../../../ui/Bildirim'
import { Damga } from '../../../ui/Damga'
import type { IslemAkisi } from '../kancalar'
import {
  UZATMA_GUNU, gunGostergesi, gunKareleri, gunModeli, tarihKismi, uzatilabilir,
  type AktifOdunc, type GunModeli, type Kare,
} from '../uyeVeri'
import ortak from '../ortak.module.css'
import stil from './Elindekiler.module.css'

interface Props {
  readonly odunc: AktifOdunc
  readonly sira: number
  readonly bugun: string
  readonly damga: string | null
  readonly iade: IslemAkisi
  readonly ref?: Ref<HTMLElement>
}

function kareSinifi(k: Kare): string {
  return [stil.kare, stil[k.tur], k.bugun ? stil.bugun : '', k.taze ? stil.taze : ''].filter(Boolean).join(' ')
}

function GunKareleri({ m, sira, uzatildi }: { readonly m: GunModeli; readonly sira: number; readonly uzatildi: boolean }) {
  /** İlk çizimdeki gün sayısı; uzatmayla eklenen kareler bunun ardından hızla belirir. */
  const [ilkToplam] = useState(m.toplam)
  return (
    <div className={stil.kareler} aria-hidden="true">
      {gunKareleri(m, { sira, uzatildi, ilkToplam }).map((k, i) => (
        <span key={i} className={kareSinifi(k)} style={{ animationDelay: `${k.gecikmeSn}s` }} />
      ))}
    </div>
  )
}

interface EylemProps {
  readonly odunc: AktifOdunc
  readonly m: GunModeli
  readonly bugun: string
  readonly iadeEdildi: boolean
  /** Bu oturumda uzatıldı; tazeleme gelene dek ikinci kez denenmesin */
  readonly yeniUzatildi: boolean
  readonly iade: IslemAkisi
  readonly onUzatildi: () => void
}

function uzatmaEngeli(odunc: AktifOdunc, uzatOlur: boolean): string | null {
  if (uzatOlur) return null
  return odunc.uzatildi ? 'Bu ödünç bir kez uzatıldı' : 'Gecikmiş ödünç uzatılamaz'
}

function FisEylemleri({ odunc, m, bugun, iadeEdildi, yeniUzatildi, iade, onUzatildi }: EylemProps) {
  const uzat = useUzat()
  const iadeAl = useIade()
  const { bildir, hataBildir } = useBildirim()
  const baslik = odunc.kopya.kitap.baslik
  const uzatOlur = uzatilabilir(odunc, m) && !yeniUzatildi
  const engel = uzatmaEngeli(odunc, uzatilabilir(odunc, m))
  const mesgul = uzat.isPending || iadeAl.isPending
  const uzatKapali = !uzatOlur || mesgul || iadeEdildi
  const iadeKapali = mesgul || iadeEdildi

  const uzatTikla = () => {
    if (uzatKapali) return
    uzat.mutate(odunc.id, {
      onSuccess: (y) => {
        onUzatildi()
        bildir({ tur: 'basari', baslik: `Yeni son gün ${kisaTarih(y.veri.sonTeslimTarihi)}`, ayrinti: [baslik] })
      },
      onError: (h) => hataBildir(h, 'Süre uzatılamadı'),
    })
  }

  const iadeTikla = () => {
    if (iadeKapali) return
    iade.basla()
    iadeAl.mutate(odunc.id, {
      onSuccess: (y) => {
        iade.bitti(`İade alındı · ${kisaTarih(bugun)}`)
        const ceza = y.veri.ceza
        bildir(
          ceza
            ? { tur: 'bilgi', baslik: `Gecikme cezası ${para(ceza.tutar)} yazıldı`, ayrinti: [baslik] }
            : { tur: 'basari', baslik: 'İade alındı', ayrinti: [baslik] },
        )
      },
      onError: (h) => {
        iade.hata()
        hataBildir(h, 'İade alınamadı')
      },
    })
  }

  const uzatEtiketi = uzat.isPending ? 'Uzatılıyor…' : yeniUzatildi ? 'Uzatıldı' : engel ? 'Uzatılamaz' : `${UZATMA_GUNU} gün uzat`
  return (
    <div className={stil.eylemler}>
      <button
        type="button"
        className={`btn ${ortak.murekkepDugme}`}
        onClick={uzatTikla}
        aria-disabled={uzatKapali || undefined}
        aria-busy={uzat.isPending}
        title={engel ?? undefined}
      >
        {uzatEtiketi}
        {engel && (
          <>
            {' '}
            <span className="sr">— {engel}</span>
          </>
        )}
      </button>
      <button
        type="button"
        className={`btn ${ortak.murekkepDugme}`}
        onClick={iadeTikla}
        aria-disabled={iadeKapali || undefined}
        aria-busy={iadeAl.isPending}
      >
        {iadeAl.isPending ? 'İade alınıyor…' : iadeEdildi ? 'İade alındı' : 'İade al'}
      </button>
    </div>
  )
}

/** Tek ödünç fişi: kitap, kalan gün, gün kareleri, uzat / iade al. */
export function OduncFisi({ odunc, sira, bugun, damga, iade, ref }: Props) {
  const azalt = useReducedMotion()
  const [yeniUzatildi, setYeniUzatildi] = useState(false)
  const m = gunModeli(odunc, bugun)
  const gosterge = gunGostergesi(m)
  const verilis = tarihKismi(odunc.verilisZamani)
  const { kitap } = odunc.kopya
  const iadeEdildi = damga !== null
  const baslikId = `odunc-${odunc.id}`

  return (
    <motion.article
      ref={ref}
      layout
      className={`card ${stil.fis}`}
      data-gitti={iadeEdildi}
      data-oge={odunc.id}
      aria-labelledby={baslikId}
      initial={azalt ? false : { opacity: 0, x: 90, rotate: 2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={azalt ? { opacity: 0 } : { opacity: 0, x: 140, rotate: 5, transition: { duration: 0.45, ease: [0.4, 0, 0.7, 0.2] } }}
      transition={{
        default: { duration: 0.8, ease: [0.2, 0.9, 0.3, 1.15], delay: 0.35 + Math.min(sira, 6) * 0.15 },
        layout: { type: 'spring', stiffness: 320, damping: 32 },
      }}
    >
      <div className={stil.seritler}>
        {verilis === bugun && !iadeEdildi && <Damga murekkep="v">Bugün verildi</Damga>}
        {odunc.uzatildi && (
          <Damga murekkep="k" vur={yeniUzatildi ? 0.1 : false} egim={3}>
            Uzatıldı
          </Damga>
        )}
      </div>
      <div className={stil.fisBas}>
        <div className={stil.kitap}>
          <b id={baslikId}>{kitap.baslik}</b>
          <span>
            {kitap.yazar} · {kitap.yerNumarasi ?? 'yer numarası yok'}
          </span>
        </div>
        <div className={stil.gun} data-ton={gosterge.ton}>
          <b>{gosterge.sayi}</b>
          <span>{gosterge.etiket}</span>
        </div>
      </div>
      <GunKareleri m={m} sira={sira} uzatildi={odunc.uzatildi} />
      <div className={stil.fisAlt}>
        <span className={stil.tarihler}>
          {kisaTarih(verilis)} → {kisaTarih(odunc.sonTeslimTarihi)}
        </span>
        <FisEylemleri
          odunc={odunc}
          m={m}
          bugun={bugun}
          iadeEdildi={iadeEdildi}
          yeniUzatildi={yeniUzatildi}
          iade={iade}
          onUzatildi={() => setYeniUzatildi(true)}
        />
      </div>
      {damga && (
        <Damga murekkep="v" vur={0} egim={-9} className={stil.iadeDamgasi}>
          {damga}
        </Damga>
      )}
    </motion.article>
  )
}
