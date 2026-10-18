import { AnimatePresence, motion } from 'motion/react'
import { Suspense } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { HataSiniri } from '../ui/HataSiniri'
import { Yukleniyor } from '../ui/Durumlar'
import { Dolap } from './Dolap'
import stil from './Kabuk.module.css'

/** Oturum açıkken ekranların çerçevesi: solda dolap, sağda sayfa (geçişli). */
export function Kabuk() {
  const konum = useLocation()
  const icerik = useOutlet()
  const bolum = konum.pathname.split('/')[1] ?? ''

  return (
    <div className={stil.kabuk}>
      <Dolap />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={bolum}
          id="icerik"
          className={stil.ana}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
        >
          {/* Sayfa paketi yüklenirken dolap yerinde kalsın; hata da yalnızca bu sayfayı etkilesin */}
          <HataSiniri key={bolum}>
            <Suspense fallback={<Yukleniyor metin="Çekmece açılıyor…" />}>{icerik}</Suspense>
          </HataSiniri>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
