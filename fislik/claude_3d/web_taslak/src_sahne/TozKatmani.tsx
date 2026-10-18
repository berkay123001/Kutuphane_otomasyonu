import { useEffect, useMemo, useRef } from 'react'
import type { Tema } from '../tema/TemaSaglayici'
import { parlaklik, sinirKutusu, tohumluRastgele, yenilenmeli, zerreDogur, zerreIlerlet, type Zerre } from './toz'
import { SAHNE, type Nokta } from './veri'
import stil from './Sahne.module.css'

const AYAR: Record<Tema, { sayi: number; renk: string; guc: number }> = {
  gunduz: { sayi: 110, renk: '255,238,204', guc: 1 },
  gece: { sayi: 60, renk: '196,214,255', guc: 0.65 },
}
/** Tuval yarım çözünürlükte çizilir (zerreler zaten yumuşak), kare hızı 30'a sabitlenir:
 *  GPU'ya her karede gönderilen doku dörtte bire, güncelleme sayısı yarıya iner. */
const COZUNURLUK = 0.5
const KARE_ARALIGI = 1 / 34

function zerreResmi(renk: string): HTMLCanvasElement {
  const boyut = 32
  const c = document.createElement('canvas')
  c.width = boyut
  c.height = boyut
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(boyut / 2, boyut / 2, 0, boyut / 2, boyut / 2, boyut / 2)
    grad.addColorStop(0, `rgba(${renk},1)`)
    grad.addColorStop(0.35, `rgba(${renk},.55)`)
    grad.addColorStop(1, `rgba(${renk},0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, boyut, boyut)
  }
  return c
}

/** Huzmenin ekrandaki şekli içinde süzülen toz. Hareket azaltılmışsa durağan çizer. */
export function TozKatmani({ tema, durgun = false }: { readonly tema: Tema; readonly durgun?: boolean }) {
  const tuval = useRef<HTMLCanvasElement>(null)
  const poligon = SAHNE.huzme[tema] as readonly Nokta[]
  const kutu = useMemo(() => sinirKutusu(poligon), [poligon])
  const yerel = useMemo<readonly Nokta[]>(
    () => poligon.map(([x, y]) => [x - kutu.x, y - kutu.y] as const),
    [poligon, kutu],
  )

  useEffect(() => {
    const c = tuval.current?.getContext('2d')
    if (!c) return undefined
    c.setTransform(COZUNURLUK, 0, 0, COZUNURLUK, 0, 0)
    const { sayi, renk, guc } = AYAR[tema]
    const resim = zerreResmi(renk)
    const rnd = tohumluRastgele(tema === 'gece' ? 7 : 3)
    let zerreler: readonly Zerre[] = Array.from({ length: sayi }, () =>
      zerreDogur(yerel, rnd, rnd() * 8),
    )
    const azalt = durgun || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    let son = performance.now()
    let biriken = 0
    let istek = 0

    const ciz = (t: number) => {
      c.clearRect(0, 0, kutu.w, kutu.h)
      c.globalCompositeOperation = 'lighter'
      for (const z of zerreler) {
        const a = parlaklik(z, t) * guc
        if (a <= 0.01) continue
        c.globalAlpha = a
        const d = z.r * 6
        c.drawImage(resim, z.x - d / 2, z.y - d / 2, d, d)
      }
      c.globalAlpha = 1
    }

    const kare = (simdi: number) => {
      biriken += (simdi - son) / 1000
      son = simdi
      istek = requestAnimationFrame(kare)
      if (biriken < KARE_ARALIGI) return
      const dt = Math.min(0.08, biriken)
      biriken = 0
      zerreler = zerreler.map((z) => {
        const s = zerreIlerlet(z, dt, rnd)
        return yenilenmeli(s, yerel) ? zerreDogur(yerel, rnd) : s
      })
      ciz(simdi / 1000)
    }

    if (azalt) {
      ciz(1.3)
      return undefined
    }
    istek = requestAnimationFrame(kare)
    return () => cancelAnimationFrame(istek)
  }, [tema, durgun, yerel, kutu])

  return (
    <canvas
      ref={tuval}
      className={stil.toz}
      width={Math.ceil(kutu.w * COZUNURLUK)}
      height={Math.ceil(kutu.h * COZUNURLUK)}
      style={{ left: kutu.x, top: kutu.y, width: kutu.w, height: kutu.h }}
      aria-hidden="true"
    />
  )
}
