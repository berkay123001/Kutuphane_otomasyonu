/** Üye ekranlarının küçük kancaları: iz bırakan liste, odak kurtarma, kart eğimi. */
import {
  useMotionTemplate, useMotionValue, useReducedMotion, useSpring, type MotionValue,
} from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

// ---------- iz bırakan liste ----------

/** Bir satırdaki yazma işleminin (iade, ödeme, iptal) aşamaları. */
export interface IslemAkisi {
  /** Tıklanınca: öğe sunucu listesinden düşse de yerinde tutulur */
  readonly basla: () => void
  /** Başarı: öğeye damga basılır; sunucudan düştükten kısa süre sonra çıkar */
  readonly bitti: (damga: string) => void
  readonly hata: () => void
}

export interface Hayalet<T> {
  readonly oge: T
  /** Görünen listedeki sırası */
  readonly sira: number
  /** İşlem bitince basılan damga ('İade alındı · 17.10'); null = işlem sürüyor */
  readonly damga: string | null
}

/** Sunucudan düşmüş ama damgası görünsün diye tutulan öğeleri eski yerlerine katar. */
export function hayaletleriKat<T extends { readonly id: number }>(
  sunucu: readonly T[],
  hayaletler: readonly Hayalet<T>[],
): readonly T[] {
  const varolan = new Set(sunucu.map((o) => o.id))
  return [...hayaletler]
    .filter((h) => !varolan.has(h.oge.id))
    .sort((a, b) => a.sira - b.sira)
    .reduce<readonly T[]>((liste, h) => [...liste.slice(0, h.sira), h.oge, ...liste.slice(h.sira)], sunucu)
}

/** Bir hayalet bırakılınca kalanların sırası görünen (bırakılan çıkarılmış) listeye göre yenilenir. */
export function siralariYenile<T extends { readonly id: number }>(
  hayaletler: readonly Hayalet<T>[],
  gorunen: readonly { readonly id: number }[],
): readonly Hayalet<T>[] {
  return hayaletler.map((h) => {
    const yeni = gorunen.findIndex((o) => o.id === h.oge.id)
    return yeni < 0 ? h : { ...h, sira: yeni }
  })
}

/**
 * İade / ödeme / iptal edilen öğe tıklandığı andan itibaren listede tutulur; damgası basılır,
 * sunucu listesinden düştükten `sureMs` sonra çıkış animasyonuyla gider. Mutasyon yanıtı ile
 * liste tazelemesi hangi sırayla gelirse gelsin aynı çalışır.
 */
export function useHayaletler<T extends { readonly id: number }>(
  sunucu: readonly T[],
  sureMs = 1700,
  onBirak?: (id: number) => void,
) {
  const [hayaletler, setHayaletler] = useState<readonly Hayalet<T>[]>([])
  const saatler = useRef(new Map<number, number>())
  const liste = useMemo(() => hayaletleriKat(sunucu, hayaletler), [sunucu, hayaletler])
  const son = useRef({ liste, onBirak })

  useEffect(() => {
    son.current = { liste, onBirak }
  })

  useEffect(() => {
    const kayit = saatler.current
    return () => {
      kayit.forEach((z) => window.clearTimeout(z))
      kayit.clear()
    }
  }, [])

  const birak = useCallback((id: number) => {
    window.clearTimeout(saatler.current.get(id))
    saatler.current.delete(id)
    const gorunen = son.current.liste.filter((o) => o.id !== id)
    setHayaletler((h) => siralariYenile(h.filter((x) => x.oge.id !== id), gorunen))
  }, [])

  useEffect(() => {
    const sunucuda = new Set(sunucu.map((o) => o.id))
    hayaletler.forEach(({ oge, damga }) => {
      if (damga === null || sunucuda.has(oge.id) || saatler.current.has(oge.id)) return
      const zaman = window.setTimeout(() => {
        son.current.onBirak?.(oge.id)
        birak(oge.id)
      }, sureMs)
      saatler.current.set(oge.id, zaman)
    })
  }, [sunucu, hayaletler, birak, sureMs])

  const tut = useCallback((oge: T, sira: number) => {
    setHayaletler((h) => [...h.filter((x) => x.oge.id !== oge.id), { oge, sira, damga: null }])
  }, [])

  const damgala = useCallback((id: number, damga: string) => {
    setHayaletler((h) => h.map((x) => (x.oge.id === id ? { ...x, damga } : x)))
  }, [])

  const damgasi = useCallback(
    (id: number) => hayaletler.find((x) => x.oge.id === id)?.damga ?? null,
    [hayaletler],
  )

  return { liste, damgasi, tut, damgala, birak }
}

/**
 * Satır listeden çıkarken odak onun içindeyse bölüm başlığına (tabIndex=-1) taşınır;
 * satırlar `data-oge={id}` taşır.
 */
export function useOdakKurtarici<K extends HTMLElement>() {
  const kap = useRef<K>(null)
  const baslik = useRef<HTMLHeadingElement>(null)
  const kurtar = useCallback((id: number) => {
    const satir = kap.current?.querySelector(`[data-oge="${id}"]`)
    if (satir?.contains(document.activeElement)) baslik.current?.focus({ preventScroll: true })
  }, [])
  return { kap, baslik, kurtar }
}

// ---------- kart eğimi ----------

export interface KartEgimi {
  readonly egim: { readonly rotateX: MotionValue<number>; readonly rotateY: MotionValue<number> }
  readonly parlama: { readonly opacity: MotionValue<number>; readonly background: MotionValue<string> }
  readonly izle: (e: MouseEvent<HTMLElement>) => void
  readonly birak: () => void
}

const YAY = { stiffness: 210, damping: 20, mass: 0.6 } as const

/** Fare kartın üstünde gezdikçe yaylı eğim + parıltı (tasarım: .lc-tilt, .glare). */
export function useKartEgimi(gucX = 14, gucY = 20): KartEgimi {
  const azalt = useReducedMotion()
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const gx = useMotionValue(30)
  const gy = useMotionValue(20)
  const isik = useMotionValue(0)
  const rotateX = useSpring(rx, YAY)
  const rotateY = useSpring(ry, YAY)
  const opacity = useSpring(isik, { stiffness: 160, damping: 26 })
  const background = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.5), rgba(255,255,255,0) 55%)`

  const izle = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (azalt) return
      const r = e.currentTarget.getBoundingClientRect()
      if (!r.width || !r.height) return
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      rx.set((0.5 - y) * gucX)
      ry.set((x - 0.5) * gucY)
      gx.set(Math.round(x * 100))
      gy.set(Math.round(y * 100))
      isik.set(1)
    },
    [azalt, gucX, gucY, rx, ry, gx, gy, isik],
  )

  const birak = useCallback(() => {
    rx.set(0)
    ry.set(0)
    isik.set(0)
  }, [rx, ry, isik])

  return { egim: { rotateX, rotateY }, parlama: { opacity, background }, izle, birak }
}
