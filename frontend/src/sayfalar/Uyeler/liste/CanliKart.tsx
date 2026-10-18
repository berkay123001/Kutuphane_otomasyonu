import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { basHarfler } from '../../../lib/bicim'
import { bugunIso, gunEkle } from '../../../lib/tarih'
import { Damga } from '../../../ui/Damga'
import { TUR_ETIKETI, barkodCizgileri, gecerlilikMetni, imza, type UyeFormu } from '../uyeVeri'
import stil from './CanliKart.module.css'

export type KartAsamasi = 'taslak' | 'basiliyor' | 'basildi'

interface Props {
  readonly form: UyeFormu
  readonly asama: KartAsamasi
  readonly uyeNo?: string
}

const BOS_CIZGILER = Array.from({ length: 24 }, (_, i) => i)

function Alan({ etiket, deger, bos = '—', imlec = false }: {
  readonly etiket: string
  readonly deger: string
  readonly bos?: string
  readonly imlec?: boolean
}) {
  return (
    <div className={stil.alan}>
      <span className={stil.etiket}>{etiket}</span>
      <span className={stil.deger} data-bos={!deger}>
        {deger || bos}
        {imlec && <span className={stil.imlec} aria-hidden="true" />}
      </span>
    </div>
  )
}

/** Yeni üye formunun yanındaki canlı okuyucu kartı: yazdıkça dolar, kaydedilince basılır,
 *  "Onaylı" damgası vurulur ve kart dönüp arka yüzünü (imza) gösterir. */
export function CanliKart({ form, asama, uyeNo }: Props) {
  const azalt = useReducedMotion()
  const ad = `${form.ad} ${form.soyad}`.trim()
  const harfler = basHarfler(form.ad || ' ', form.soyad)
  const gecerlilik = gecerlilikMetni(gunEkle(bugunIso(), 365))
  const basildi = asama === 'basildi'
  const cizgiler = basildi && uyeNo ? barkodCizgileri(uyeNo) : []

  return (
    <div className={stil.sahne} role="group" aria-label="Kart önizlemesi" aria-live="polite">
      <motion.div
        className={stil.ic}
        animate={{ rotateY: basildi ? 180 : 0, y: basildi ? -6 : 0 }}
        transition={azalt ? { duration: 0 } : { delay: basildi ? 1.55 : 0, duration: 1, ease: [0.3, 1.3, 0.4, 1] }}
      >
        {/* ön yüz */}
        <div className={`${stil.yuz} ${stil.on}`} aria-hidden={basildi}>
          <div className={stil.serit}>
            <span>Merkez Kütüphane</span>
            <b>Okuyucu kartı</b>
          </div>
          <div className={stil.govde}>
            <motion.div
              key={harfler}
              className={stil.foto}
              initial={azalt ? false : { scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              {harfler.trim() || '?'}
            </motion.div>
            <div className={stil.alanlar}>
              <Alan etiket="Ad soyad" deger={ad} bos="Ad Soyad" imlec={asama === 'taslak'} />
              <Alan etiket="Okuyucu no" deger={uyeNo ?? ''} bos="Ü-····" />
              <div className={stil.ikili}>
                <Alan etiket="Tür" deger={TUR_ETIKETI[form.tur]} />
                <Alan etiket="Geçerlilik" deger={gecerlilik} />
              </div>
              <Alan etiket="Bölüm" deger={form.bolum.trim()} />
            </div>
          </div>
          <div className={stil.barkod} aria-hidden="true">
            {basildi
              ? cizgiler.map((c, i) => (
                  <motion.span
                    key={i}
                    className={stil.cizgi}
                    style={{ width: c.genislik, opacity: c.bosluk ? 0 : 1 }}
                    initial={azalt ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.15 + i * 0.018, duration: 0.18 }}
                  />
                ))
              : BOS_CIZGILER.map((i) => <span key={i} className={stil.bosCizgi} />)}
          </div>
          <div className={stil.damgaYeri}>
            {basildi ? (
              <Damga murekkep="v" vur={0.75} egim={-8}>
                Onaylı
              </Damga>
            ) : (
              <Damga murekkep="k" egim={4} className={stil.taslakDamga}>
                Taslak
              </Damga>
            )}
          </div>
          <AnimatePresence>
            {asama === 'basiliyor' && (
              <motion.span
                className={stil.tarama}
                initial={{ x: '-120%' }}
                animate={{ x: '120%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* arka yüz */}
        <div className={`${stil.yuz} ${stil.arka}`} aria-hidden={!basildi}>
          <div className={stil.manyetik} />
          <div className={stil.imzaSeridi}>
            <span className={stil.imza} data-yaz={basildi}>
              {imza(form.ad || ' ', form.soyad || ' ')}
            </span>
          </div>
          <ul className={stil.kurallar}>
            <li>Aynı anda en fazla 5 kitap.</li>
            <li>Ödünç süresi 7, 14 ya da 21 gün.</li>
            <li>Kart başkasına devredilemez.</li>
          </ul>
          <p className={stil.altNot}>Bulunursa Merkez Kütüphane ödünç masasına teslim ediniz.</p>
        </div>
      </motion.div>
      <p className={stil.durum}>
        {asama === 'taslak' && 'Yazdıkça kart dolar'}
        {asama === 'basiliyor' && 'Kart basılıyor…'}
        {basildi && `Kart basıldı · ${uyeNo ?? ''}`}
      </p>
    </div>
  )
}
