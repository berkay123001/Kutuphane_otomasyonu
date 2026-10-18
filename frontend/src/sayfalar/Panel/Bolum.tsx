import type { ReactNode } from 'react'
import ortak from './Panel.module.css'

interface Props {
  /** Pirinç plaka başlığın kimliği (aria-labelledby) */
  readonly baslikId: string
  readonly baslik: string
  /** Başlığın yanındaki daktilo notu */
  readonly not?: string
  readonly id?: string
  readonly className?: string
  readonly children: ReactNode
}

/** Pirinç plaka başlıklı panel bölümü (tasarım: .sec-head + .h2 + .note). */
export function Bolum({ baslikId, baslik, not, id, className, children }: Props) {
  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      className={`${ortak.bolum} ${className ?? ''}`}
      aria-labelledby={baslikId}
    >
      <div className="sec-head">
        <h2 className="h2" id={baslikId}>
          {baslik}
        </h2>
        {not && <p className="note">{not}</p>}
      </div>
      {children}
    </section>
  )
}
