import type { CSSProperties, ReactNode } from 'react'

export type Murekkep = 'v' | 'r' | 'k' | 'lv' | 'lr'

interface Props {
  readonly children: ReactNode
  readonly murekkep?: Murekkep
  /** Vurma (slam) animasyonu; saniye cinsinden gecikme verilirse oynar. */
  readonly vur?: number | false
  readonly egim?: number
  readonly className?: string
  readonly style?: CSSProperties
}

/** Lastik damga: kenarlıklı, eğik, daktilo harfli (tasarım: .stamp, .slam). */
export function Damga({ children, murekkep = 'v', vur = false, egim, className, style }: Props) {
  const siniflar = ['stamp', `ink-${murekkep}`, vur !== false ? 'slam' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <span
      className={siniflar}
      style={{
        ...(vur !== false ? { animationDelay: `${vur}s` } : null),
        ...(egim !== undefined ? { rotate: `${egim}deg` } : null),
        ...style,
      }}
    >
      {children}
    </span>
  )
}
