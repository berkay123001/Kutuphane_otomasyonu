// Tarihler veritabanında ve kurallarda 'YYYY-MM-DD' metni olarak dolaşır.
// Gün hesapları UTC gece yarısı üzerinden yapılır, böylece yaz saati kayması olmaz.

const SAAT_DILIMI = 'Europe/Istanbul'
const GUN_MS = 24 * 60 * 60 * 1000

const gunBicimi = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAAT_DILIMI,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const geceYarisi = (tarih: string): number => Date.parse(`${tarih}T00:00:00Z`)

export function bugun(simdi: Date = new Date()): string {
  return gunBicimi.format(simdi)
}

export function gunEkle(tarih: string, gun: number): string {
  return new Date(geceYarisi(tarih) + gun * GUN_MS).toISOString().slice(0, 10)
}

export function gunFarki(baslangic: string, bitis: string): number {
  return Math.round((geceYarisi(bitis) - geceYarisi(baslangic)) / GUN_MS)
}
