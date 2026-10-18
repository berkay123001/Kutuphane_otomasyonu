/** Takvim tarihleri backend ile aynı: 'YYYY-MM-DD', Europe/Istanbul. Zaman damgaları ISO. */

const SAAT_DILIMI = 'Europe/Istanbul'

export const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
] as const

export const AY_KISA = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'] as const

export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] as const

const isoBicim = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAAT_DILIMI,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const saatBicim = new Intl.DateTimeFormat('tr-TR', {
  timeZone: SAAT_DILIMI,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export interface TarihParcalari {
  readonly yil: number
  readonly ay: number // 1-12
  readonly gun: number
}

export function bugunIso(simdi: Date = new Date()): string {
  return isoBicim.format(simdi)
}

export function zamandanIso(zaman: string): string {
  return isoBicim.format(new Date(zaman))
}

export function parcala(iso: string): TarihParcalari {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!eslesme) throw new Error(`Geçersiz tarih: ${iso}`)
  return { yil: Number(eslesme[1]), ay: Number(eslesme[2]), gun: Number(eslesme[3]) }
}

function utc(iso: string): number {
  const { yil, ay, gun } = parcala(iso)
  return Date.UTC(yil, ay - 1, gun)
}

const GUN_MS = 86_400_000

export function gunEkle(iso: string, gun: number): string {
  return new Date(utc(iso) + gun * GUN_MS).toISOString().slice(0, 10)
}

/** b - a, gün cinsinden (ikisi de takvim tarihi). */
export function gunFarki(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / GUN_MS)
}

export function haftaninGunu(iso: string): string {
  return GUNLER[new Date(utc(iso)).getUTCDay()] ?? ''
}

export function uzunTarih(iso: string): string {
  const { yil, ay, gun } = parcala(iso)
  return `${gun} ${AYLAR[ay - 1]} ${yil}`
}

export function gunAy(iso: string): string {
  const { ay, gun } = parcala(iso)
  return `${gun} ${AYLAR[ay - 1]}`
}

const iki = (n: number) => String(n).padStart(2, '0')

/** '31 EKİ 2026' — damga bantları ve fiş üstü için. */
export function damgaTarihi(iso: string): string {
  const { yil, ay, gun } = parcala(iso)
  return `${iki(gun)} ${AY_KISA[ay - 1]} ${yil}`
}

/** '31.10' */
export function kisaTarih(iso: string): string {
  const { ay, gun } = parcala(iso)
  return `${iki(gun)}.${iki(ay)}`
}

/** '31.10.2026' */
export function noktaliTarih(iso: string): string {
  const { yil, ay, gun } = parcala(iso)
  return `${iki(gun)}.${iki(ay)}.${yil}`
}

/** 'Eyl 2023' */
export function ayYil(iso: string): string {
  const { yil, ay } = parcala(iso)
  const ad = AYLAR[ay - 1] ?? ''
  return `${ad.slice(0, 3)} ${yil}`
}

export function saat(zaman: string): string {
  return saatBicim.format(new Date(zaman))
}
