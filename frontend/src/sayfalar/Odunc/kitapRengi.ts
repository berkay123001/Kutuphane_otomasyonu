/** 3B kitabın kapak, sırt ve arka yüz renkleri; açık kapaklarda yaldız koyu mürekkebe döner. */
import type { CSSProperties } from 'react'

type Rgb = readonly [number, number, number]

function kanallar(hex: string): Rgb {
  const temiz = hex.replace('#', '')
  const tam = temiz.length === 3 ? [...temiz].map((c) => c + c).join('') : temiz.padEnd(6, '0')
  const al = (i: number) => Number.parseInt(tam.slice(i, i + 2), 16) || 0
  return [al(0), al(2), al(4)]
}

const onaltilik = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')

/** Rengi verilen oranda karartır: koyulastir('#7A2E2A', 0.13) ≈ tasarımdaki sırt rengi. */
export function koyulastir(hex: string, oran: number): string {
  return `#${kanallar(hex).map((c) => onaltilik(c * (1 - oran))).join('')}`
}

const dogrusal = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Göreli parlaklık (0-1, WCAG yaklaşımı). */
export function parlaklik(hex: string): number {
  const [r, g, b] = kanallar(hex)
  return 0.2126 * dogrusal(r) + 0.7152 * dogrusal(g) + 0.0722 * dogrusal(b)
}

export function acikRenk(hex: string): boolean {
  return parlaklik(hex) > 0.2
}

/** Kitap yüzleri için CSS değişkenleri (Kitap.module.css .yuz kuralları okur). */
export function kapakDegiskenleri(kapak: string): CSSProperties {
  const acik = acikRenk(kapak)
  const degiskenler: Record<string, string> = {
    '--kapak': kapak,
    '--sirt': koyulastir(kapak, 0.13),
    '--arka': koyulastir(kapak, 0.23),
    '--yaldiz': acik ? '#2a1a0a' : '#e8c46a',
    '--yaldiz-cizgi': acik ? '#7a5a22' : '#d9b45f',
  }
  return degiskenler as CSSProperties
}
