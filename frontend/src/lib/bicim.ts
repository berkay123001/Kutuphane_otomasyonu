const sayiBicim = new Intl.NumberFormat('tr-TR')
const paraBicim = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })

export function sayi(n: number): string {
  return sayiBicim.format(n)
}

export function para(n: number): string {
  return paraBicim.format(n)
}

export function basHarfler(ad: string, soyad = ''): string {
  const ilk = (s: string) => s.trim().charAt(0).toLocaleUpperCase('tr')
  return `${ilk(ad)}${ilk(soyad)}`
}

export function tamAd(kisi: { readonly ad: string; readonly soyad: string }): string {
  return `${kisi.ad} ${kisi.soyad}`
}

/** Bir metinden kararlı küçük tam sayı (kitap sırtı rengi, raf dolgusu vb. için). */
export function karma(metin: string): number {
  let h = 2166136261
  for (let i = 0; i < metin.length; i += 1) {
    h ^= metin.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const SIRT_RENKLERI = [
  '#7A2E2A', '#2B4E36', '#27395A', '#B08433', '#5E4630', '#463359', '#CDBE98', '#2F5A5E', '#1E1C18',
] as const

export function sirtRengi(anahtar: string): string {
  return SIRT_RENKLERI[karma(anahtar) % SIRT_RENKLERI.length] ?? SIRT_RENKLERI[0]
}

/** 'Tutunamayanlar' ↔ arama için Türkçe küçük harf. */
export function kucuk(metin: string): string {
  return metin.toLocaleLowerCase('tr')
}
