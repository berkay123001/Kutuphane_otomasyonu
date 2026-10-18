import { useEffect, useMemo, useState } from 'react'

export interface DaktiloDurumu {
  readonly satirlar: readonly string[]
  readonly aktifSatir: number
  readonly bitti: boolean
}

/** Toplam karakter sayısına göre satırların görünen kısmını verir. */
export function daktiloKes(satirlar: readonly string[], yazilan: number): DaktiloDurumu {
  let kalan = yazilan
  let aktif = 0
  const gorunen = satirlar.map((s, i) => {
    const parca = s.slice(0, Math.max(0, kalan))
    if (kalan > 0 && kalan <= s.length) aktif = i
    if (kalan > s.length) aktif = Math.min(i + 1, satirlar.length - 1)
    kalan -= s.length
    return parca
  })
  const toplam = satirlar.reduce((n, s) => n + s.length, 0)
  return { satirlar: gorunen, aktifSatir: aktif, bitti: yazilan >= toplam }
}

/** Fiş kaydını daktilo gibi harf harf yazar (tasarım: Kitap.dc.html, 900 ms bekle, 24 ms/harf). */
export function useDaktilo(satirlar: readonly string[], gecikmeMs = 900, harfMs = 24): DaktiloDurumu {
  const anahtar = satirlar.join('\n')
  const toplam = useMemo(() => anahtar.replace(/\n/g, '').length, [anahtar])
  const azalt = typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const [yazilan, setYazilan] = useState(azalt ? toplam : 0)

  useEffect(() => {
    if (azalt) {
      setYazilan(toplam)
      return undefined
    }
    setYazilan(0)
    let aralik = 0
    const bekle = window.setTimeout(() => {
      aralik = window.setInterval(() => {
        setYazilan((n) => {
          if (n + 1 >= toplam) window.clearInterval(aralik)
          return Math.min(toplam, n + 1)
        })
      }, harfMs)
    }, gecikmeMs)
    return () => {
      window.clearTimeout(bekle)
      window.clearInterval(aralik)
    }
  }, [anahtar, toplam, gecikmeMs, harfMs, azalt])

  return daktiloKes(anahtar.split('\n'), yazilan)
}
