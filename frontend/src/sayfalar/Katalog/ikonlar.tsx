/** Katalog ekranındaki çizgi ikonlar (tasarımdaki SVG'ler). */
const ORTAK = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function GeriIkonu() {
  return (
    <svg width="18" height="18" strokeWidth="2" {...ORTAK}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function IleriIkonu() {
  return (
    <svg width="18" height="18" strokeWidth="2" {...ORTAK}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function SagIkonu() {
  return (
    <svg width="16" height="16" strokeWidth="2.4" {...ORTAK}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function BuyutecIkonu({ boyut = 24 }: { readonly boyut?: number }) {
  return (
    <svg width={boyut} height={boyut} strokeWidth="2.2" {...ORTAK}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  )
}
