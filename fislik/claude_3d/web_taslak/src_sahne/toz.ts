/** Işık huzmesindeki toz zerreleri: saf hesaplar (çizim TozKatmani.tsx'te). */
import type { Nokta } from './veri'

export interface Zerre {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly r: number
  readonly faz: number
  readonly yas: number
  readonly omur: number
}

export type Rastgele = () => number

export function poligondaMi([px, py]: Nokta, poligon: readonly Nokta[]): boolean {
  let icinde = false
  for (let i = 0, j = poligon.length - 1; i < poligon.length; j = i, i += 1) {
    const [xi, yi] = poligon[i] as Nokta
    const [xj, yj] = poligon[j] as Nokta
    const kesisir = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (kesisir) icinde = !icinde
  }
  return icinde
}

export function sinirKutusu(poligon: readonly Nokta[]) {
  const xs = poligon.map((p) => p[0])
  const ys = poligon.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function noktaSec(poligon: readonly Nokta[], rnd: Rastgele): Nokta {
  const k = sinirKutusu(poligon)
  for (let deneme = 0; deneme < 60; deneme += 1) {
    const p: Nokta = [k.x + rnd() * k.w, k.y + rnd() * k.h]
    if (poligondaMi(p, poligon)) return p
  }
  return [k.x + k.w / 2, k.y + k.h / 2]
}

/** Huzme boyunca yavaşça aşağı süzülen, Brown hareketli bir zerre. */
export function zerreDogur(poligon: readonly Nokta[], rnd: Rastgele, yasBasi = 0): Zerre {
  const [x, y] = noktaSec(poligon, rnd)
  return {
    x,
    y,
    vx: (rnd() - 0.5) * 9,
    vy: 3 + rnd() * 7,
    r: 0.8 + rnd() ** 2 * 2.6,
    faz: rnd() * Math.PI * 2,
    yas: yasBasi,
    omur: 9 + rnd() * 14,
  }
}

export function zerreIlerlet(z: Zerre, dt: number, rnd: Rastgele): Zerre {
  return {
    ...z,
    x: z.x + z.vx * dt,
    y: z.y + z.vy * dt,
    vx: z.vx * 0.985 + (rnd() - 0.5) * 6 * dt,
    vy: z.vy * 0.99 + (rnd() - 0.45) * 4 * dt,
    yas: z.yas + dt,
  }
}

/** 0..1 parlaklık: doğarken/ölürken yumuşak, ışıkta pırıldar. */
export function parlaklik(z: Zerre, t: number): number {
  const giris = Math.min(1, z.yas / 2.2)
  const cikis = Math.min(1, (z.omur - z.yas) / 2.2)
  const pirilti = 0.55 + 0.45 * Math.sin(t * 1.7 + z.faz)
  return Math.max(0, Math.min(giris, cikis)) * pirilti
}

export function yenilenmeli(z: Zerre, poligon: readonly Nokta[]): boolean {
  return z.yas >= z.omur || !poligondaMi([z.x, z.y], poligon)
}

/** Tekrarlanabilir küçük rastgele üreteç (testler ve kararlı başlangıç için). */
export function tohumluRastgele(tohum: number): Rastgele {
  let s = tohum >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
