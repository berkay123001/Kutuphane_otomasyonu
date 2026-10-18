import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode, Ref } from 'react'
import { Damga, type Murekkep } from '../../../ui/Damga'
import { useHayaletler, useOdakKurtarici, type IslemAkisi } from '../kancalar'
import ortak from '../ortak.module.css'
import stil from './Defter.module.css'

interface SatirProps {
  readonly id: number
  readonly damga: string | null
  readonly murekkep: Murekkep
  readonly sira: number
  readonly children: ReactNode
  readonly ref?: Ref<HTMLLIElement>
}

/** Kâğıt satır: soldan kayarak gelir, işlem bitince damgalanır, sağa kayarak gider. */
function DefterSatiri({ id, damga, murekkep, sira, children, ref }: SatirProps) {
  const azalt = useReducedMotion()
  return (
    <motion.li
      ref={ref}
      layout
      className={`card ${stil.satir}`}
      data-bitti={damga !== null}
      data-oge={id}
      initial={azalt ? false : { opacity: 0, x: 70, rotate: 1.5 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={azalt ? { opacity: 0 } : { opacity: 0, x: 120, rotate: 4, transition: { duration: 0.4 } }}
      transition={{
        default: { duration: 0.7, ease: [0.2, 0.9, 0.3, 1.15], delay: 0.5 + Math.min(sira, 5) * 0.1 },
        layout: { type: 'spring', stiffness: 320, damping: 32 },
      }}
    >
      {children}
      {damga && (
        <Damga murekkep={murekkep} vur={0} egim={-7} className={stil.sonucDamgasi}>
          {damga}
        </Damga>
      )}
    </motion.li>
  )
}

interface Props<T extends { readonly id: number }> {
  readonly kimlik: string
  readonly baslik: string
  readonly not: string
  readonly ogeler: readonly T[]
  /** İşlem bitince basılan damganın mürekkebi */
  readonly murekkep: Murekkep
  readonly satir: (oge: T, akis: IslemAkisi & { readonly damga: string | null }) => ReactNode
}

/** Boşken görünmeyen, satırları damgalanıp giden küçük defter bölümü. */
export function DefterBolumu<T extends { readonly id: number }>({ kimlik, baslik, not, ogeler, murekkep, satir }: Props<T>) {
  const azalt = useReducedMotion()
  const odak = useOdakKurtarici<HTMLElement>()
  const { liste, damgasi, tut, damgala, birak } = useHayaletler(ogeler, undefined, odak.kurtar)
  return (
    <AnimatePresence initial={false}>
      {liste.length > 0 && (
        <motion.section
          key={kimlik}
          ref={odak.kap}
          className={ortak.bolum}
          aria-labelledby={kimlik}
          initial={azalt ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="sec-head">
            <h2 ref={odak.baslik} tabIndex={-1} className="h2" id={kimlik}>
              {baslik}
            </h2>
            <p className="note">{not}</p>
          </div>
          <ul className={stil.liste}>
            <AnimatePresence mode="popLayout">
              {liste.map((o, i) => (
                <DefterSatiri key={o.id} id={o.id} damga={damgasi(o.id)} murekkep={murekkep} sira={i}>
                  {satir(o, {
                    damga: damgasi(o.id),
                    basla: () => tut(o, i),
                    bitti: (d) => damgala(o.id, d),
                    hata: () => birak(o.id),
                  })}
                </DefterSatiri>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
