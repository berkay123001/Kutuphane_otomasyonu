import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import type { KategoriSayacli } from '../../api/semalar'
import { sayi } from '../../lib/bicim'
import { cekmeceGecikmesi } from './panelVeri'
import ortak from './Panel.module.css'
import stil from './KoleksiyonDolabi.module.css'

const HARFLER = [
  { metin: 'A–F', sinif: stil.harf1 },
  { metin: 'G–M', sinif: stil.harf2 },
  { metin: 'N–Z', sinif: stil.harf3 },
] as const

/** "Fişlere bak →" düğmesi çekmece kaydıktan sonra yaylanarak çıkar (tasarım: goIn .35s). */
const GIT_YAY = { type: 'spring', stiffness: 420, damping: 17, delay: 0.35 } as const

interface Props {
  readonly kategori: KategoriSayacli
  readonly sira: number
  readonly acik: boolean
  readonly onDegistir: () => void
}

export function KategoriCekmecesi({ kategori, sira, acik, onDegistir }: Props) {
  const azalt = useReducedMotion() ?? false
  return (
    <div
      className={`${stil.hucre} ${acik ? stil.acik : ''}`}
      style={{ animationDelay: `${cekmeceGecikmesi(sira)}s` }}
    >
      <div className={stil.kutu} aria-hidden="true">
        <span className={stil.deste} />
        {HARFLER.map((h) => (
          <span key={h.metin} className={`${stil.harf} ${h.sinif}`}>
            {h.metin}
          </span>
        ))}
      </div>
      <button type="button" className={`${stil.cekmece} grain`} onClick={onDegistir} aria-expanded={acik}>
        <span className={`${ortak.plaka} ${ortak.plakaSutun}`}>
          <b>{kategori.kod}</b>
          <span>{kategori.ad}</span>
        </span>
        <span className={stil.sayac}>{sayi(kategori.kopyaSayisi)} fiş</span>
        <span className={ortak.kulp} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {acik && (
          <motion.div
            key="git"
            className={stil.git}
            initial={azalt ? false : { opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={azalt ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8, scale: 0.9, transition: { duration: 0.18 } }}
            transition={azalt ? { duration: 0 } : GIT_YAY}
          >
            {/* Görünen metin adın başında kalır (label-in-name); ok okunmaz. */}
            <Link className="btn btn-v" to={`/katalog?kategori=${kategori.id}`} aria-label={`Fişlere bak — ${kategori.ad}`}>
              Fişlere bak →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
