/** Sahne görüntüsünü ekranı tamamen kaplayacak şekilde ölçekler (object-fit: cover) ve
 *  istenen odak noktasını ekranın ortasına olabildiğince yaklaştırır. */
import type { Nokta } from './veri'

export interface Boyut {
  readonly w: number
  readonly h: number
}

export interface Kapsa {
  readonly olcek: number
  readonly x: number
  readonly y: number
}

const sinirla = (v: number, alt: number, ust: number) => Math.min(ust, Math.max(alt, v))

export function kapsaHesapla(ekran: Boyut, sahne: Boyut, odak: Nokta, yakinlik = 1): Kapsa {
  const olcek = Math.max(ekran.w / sahne.w, ekran.h / sahne.h) * yakinlik
  const genislik = sahne.w * olcek
  const yukseklik = sahne.h * olcek
  const x = sinirla(ekran.w / 2 - odak[0] * olcek, ekran.w - genislik, 0)
  const y = sinirla(ekran.h / 2 - odak[1] * olcek, ekran.h - yukseklik, 0)
  return { olcek, x, y }
}

export function ekranaCevir(p: Nokta, k: Kapsa): Nokta {
  return [p[0] * k.olcek + k.x, p[1] * k.olcek + k.y]
}
