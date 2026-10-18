/** Başlık satırı ve arama kutusu (tasarım: .head, .count, .search). */
import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { sayi } from '../../lib/bicim'
import { BuyutecIkonu } from './ikonlar'
import stil from './Katalog.module.css'

const YAY = { type: 'spring', stiffness: 420, damping: 24 } as const

function SayacSayisi({ deger }: { readonly deger: number | null }) {
  const azalt = useReducedMotion() ?? false
  const metin = deger === null ? '—' : sayi(deger)
  return (
    <motion.b
      key={metin}
      className={stil.sayacSayi}
      initial={azalt ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={YAY}
    >
      {metin}
    </motion.b>
  )
}

export function KatalogBasligi({ toplam, aralik }: { readonly toplam: number | null; readonly aralik: string }) {
  return (
    <header className={stil.bas}>
      <h1 className={`h1 ${stil.baslik}`}>
        <span className={stil.satir}>
          <span>Katalog</span>
        </span>
      </h1>
      <p className={stil.sayac} aria-live="polite">
        <SayacSayisi deger={toplam} />
        <span>fiş · {aralik}</span>
      </p>
    </header>
  )
}

interface AramaProps {
  readonly deger: string
  readonly onDegis: (metin: string) => void
  readonly sonuc: number | null
  readonly araniyor: boolean
}

export function AramaKutusu({ deger, onDegis, sonuc, araniyor }: AramaProps) {
  const girdiId = useId()
  return (
    <div className={stil.arama} role="search">
      <label className="eyebrow" htmlFor={girdiId}>
        Fiş ara
      </label>
      <div className={stil.aramaKutu}>
        <BuyutecIkonu />
        <input
          id={girdiId}
          className={stil.aramaGirdi}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Başlık, yazar, yer numarası ya da ISBN"
          value={deger}
          onChange={(e) => onDegis(e.target.value)}
        />
        <span className={stil.aramaSonuc} data-araniyor={araniyor} aria-hidden="true">
          {sonuc === null ? '…' : `${sayi(sonuc)} sonuç`}
        </span>
      </div>
    </div>
  )
}
