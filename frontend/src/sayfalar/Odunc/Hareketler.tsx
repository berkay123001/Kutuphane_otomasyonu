/** "Fişin hareketleri": son ödünç/iade/ayırtma kayıtları; yeni kayıt üstten kayarak girer. */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { tamAd } from '../../lib/bicim'
import { kisaTarih, zamandanIso } from '../../lib/tarih'
import { HAREKET_ETIKETI, kopyaNumarasi, type KitapHareketi, type KitapKopyasi } from './oduncVeri'
import stil from './Fis.module.css'

const GOSTERILEN = 8

interface Props {
  readonly hareketler: readonly KitapHareketi[]
  readonly kopyalar: readonly KitapKopyasi[]
}

export function Hareketler({ hareketler, kopyalar }: Props) {
  const azalt = useReducedMotion()
  return (
    <section className={`${stil.bolum} ${stil.bolumSik}`} aria-labelledby="h-hareketler">
      <div className="sec-head">
        <h2 className="h2" id="h-hareketler">
          Fişin hareketleri
        </h2>
      </div>
      {hareketler.length === 0 ? (
        <p className="note">Bu fişte henüz hareket yok.</p>
      ) : (
        <ol className={stil.hareketler}>
          <AnimatePresence initial={!azalt}>
            {hareketler.slice(0, GOSTERILEN).map((h, i) => (
              <motion.li
                key={h.id}
                layout={!azalt}
                className={stil.hareket}
                initial={azalt ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26, delay: azalt ? 0 : 1 + i * 0.06 }}
              >
                <span>{kisaTarih(zamandanIso(h.zaman))}</span>
                <span>{kopyaNumarasi(kopyalar, h.kopya?.id ?? h.kopyaId)}</span>
                <span className={stil.hareketKisi}>{tamAd(h.uye)}</span>
                <span className={`${stil.hareketEtiketi} ${h.tip === 'GEC_IADE' ? stil.hareketGec : ''}`}>
                  {HAREKET_ETIKETI[h.tip]}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </section>
  )
}
