import { useEffect, useState, type RefObject } from 'react'

export interface Kenarlar {
  readonly sol: boolean
  readonly sag: boolean
}

const PAY = 2

/** Yatay kaydırılan şeridin hangi yanında gizli içerik kaldığını izler. */
export function useKaydirmaKenarlari(ref: RefObject<HTMLElement | null>, yenile: unknown): Kenarlar {
  const [kenar, setKenar] = useState<Kenarlar>({ sol: false, sag: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const olc = () => {
      const sol = el.scrollLeft > PAY
      const sag = el.scrollLeft + el.clientWidth < el.scrollWidth - PAY
      setKenar((o) => (o.sol === sol && o.sag === sag ? o : { sol, sag }))
    }
    olc()
    el.addEventListener('scroll', olc, { passive: true })
    const gozcu = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(olc)
    gozcu?.observe(el)
    return () => {
      el.removeEventListener('scroll', olc)
      gozcu?.disconnect()
    }
  }, [ref, yenile])

  return kenar
}
