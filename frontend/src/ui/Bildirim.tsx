import { AnimatePresence, motion } from 'motion/react'
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { ApiHatasi } from '../api/istemci'
import { Damga } from './Damga'
import stil from './ui.module.css'

export type BildirimTuru = 'basari' | 'hata' | 'bilgi'

export interface Bildirim {
  readonly id: number
  readonly tur: BildirimTuru
  readonly baslik: string
  readonly ayrinti?: readonly string[]
}

interface BildirimBaglami {
  readonly bildir: (b: Omit<Bildirim, 'id'>) => void
  readonly hataBildir: (hata: unknown, varsayilan?: string) => void
}

const Baglam = createContext<BildirimBaglami | null>(null)
const DAMGA: Record<BildirimTuru, { metin: string; murekkep: 'v' | 'r' | 'k' }> = {
  basari: { metin: 'Tamam', murekkep: 'v' },
  hata: { metin: 'Olmadı', murekkep: 'r' },
  bilgi: { metin: 'Not', murekkep: 'k' },
}
export const BEKLEME_MS: Record<BildirimTuru, number> = { basari: 4200, bilgi: 5200, hata: 8000 }

let sayac = 0

interface FisProps {
  readonly bildirim: Bildirim
  readonly kapat: (id: number) => void
}

/** Tek bildirim fişi: üzerine gelince ya da odaklanınca kapanma zamanlayıcısı durur. */
function BildirimFisi({ bildirim: b, kapat }: FisProps) {
  const zamanlayici = useRef(0)
  const baslat = useCallback(() => {
    window.clearTimeout(zamanlayici.current)
    zamanlayici.current = window.setTimeout(() => kapat(b.id), BEKLEME_MS[b.tur])
  }, [b.id, b.tur, kapat])
  const durdur = () => window.clearTimeout(zamanlayici.current)

  useEffect(() => {
    baslat()
    return () => window.clearTimeout(zamanlayici.current)
  }, [baslat])

  return (
    <motion.div
      className={`${stil.bildirim} card`}
      role={b.tur === 'hata' ? 'alert' : 'status'}
      onMouseEnter={durdur}
      onMouseLeave={baslat}
      onFocus={durdur}
      onBlur={baslat}
      initial={{ opacity: 0, y: 40, rotate: 4 }}
      animate={{ opacity: 1, y: 0, rotate: -1.2 }}
      exit={{ opacity: 0, x: 120, rotate: 8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Damga murekkep={DAMGA[b.tur].murekkep} vur={0.15}>
        {DAMGA[b.tur].metin}
      </Damga>
      <span className={stil.bildirimMetin}>
        <strong>{b.baslik}</strong>
        {b.ayrinti?.map((a, i) => (
          <span key={`${i}-${a}`}>— {a}</span>
        ))}
      </span>
      <button type="button" className={stil.bildirimKapat} onClick={() => kapat(b.id)} aria-label="Bildirimi kapat">
        ×
      </button>
    </motion.div>
  )
}

/** Sağ altta beliren, damgalı küçük fiş bildirimleri. */
export function BildirimSaglayici({ children }: { readonly children: ReactNode }) {
  const [liste, setListe] = useState<readonly Bildirim[]>([])

  const kapat = useCallback((id: number) => setListe((l) => l.filter((b) => b.id !== id)), [])

  const bildir = useCallback((b: Omit<Bildirim, 'id'>) => {
    sayac += 1
    const id = sayac
    setListe((l) => [...l.slice(-3), { ...b, id }])
  }, [])

  const hataBildir = useCallback(
    (hata: unknown, varsayilan = 'İşlem tamamlanamadı') => {
      if (hata instanceof ApiHatasi) {
        bildir({ tur: 'hata', baslik: hata.message, ayrinti: hata.gerekceler })
      } else {
        bildir({ tur: 'hata', baslik: varsayilan })
      }
    },
    [bildir],
  )

  const deger = useMemo(() => ({ bildir, hataBildir }), [bildir, hataBildir])

  return (
    <Baglam.Provider value={deger}>
      {children}
      <div className={stil.bildirimler}>
        <AnimatePresence initial={false}>
          {liste.map((b) => (
            <BildirimFisi key={b.id} bildirim={b} kapat={kapat} />
          ))}
        </AnimatePresence>
      </div>
    </Baglam.Provider>
  )
}

export function useBildirim(): BildirimBaglami {
  const b = useContext(Baglam)
  if (!b) throw new Error('useBildirim, BildirimSaglayici içinde kullanılmalı')
  return b
}
