import type { ReactNode } from 'react'
import { TemaAnahtari } from './TemaAnahtari'
import stil from './Kabuk.module.css'

interface Props {
  /** 'Çekmece 01 — Panel' gibi üst etiket */
  readonly etiket: string
  /** Sağdaki ekrana özel düğmeler */
  readonly children?: ReactNode
}

export function UstBar({ etiket, children }: Props) {
  return (
    <div className={stil.ustBar}>
      <p className="eyebrow">{etiket}</p>
      <div className={stil.ustBarDugmeler}>
        <TemaAnahtari />
        {children}
      </div>
    </div>
  )
}
