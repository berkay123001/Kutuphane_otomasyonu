import { gunFarki } from './tarih.js'

export const KURALLAR = {
  maksimumOdunc: 5,
  oduncSureleri: [7, 14, 21],
  uzatmaGunu: 7,
  rezervasyonBeklemeGunu: 3,
  gunlukCezaTl: 2,
  kartGecerlilikGunu: 365,
} as const

export function gecikmeGunu(sonTeslimTarihi: string, bugunTarih: string): number {
  return Math.max(0, gunFarki(sonTeslimTarihi, bugunTarih))
}

export function cezaTutari(gecikme: number): number {
  return gecikme * KURALLAR.gunlukCezaTl
}

export interface UyeDurumu {
  aktif: boolean
  kartGecerlilik: string
  aktifOduncSayisi: number
  gecikmisOduncSayisi: number
  odenmemisCezaSayisi: number
}

/** Üyenin neden ödünç alamadığını listeler; boş liste "alabilir" demektir. */
export function oduncEngelleri(uye: UyeDurumu, bugunTarih: string): string[] {
  const kontroller: Array<[boolean, string]> = [
    [!uye.aktif, 'Üyelik pasif'],
    [uye.kartGecerlilik < bugunTarih, 'Okuyucu kartının süresi dolmuş'],
    [
      uye.aktifOduncSayisi >= KURALLAR.maksimumOdunc,
      `Aynı anda en fazla ${KURALLAR.maksimumOdunc} kitap alınabilir`,
    ],
    [uye.gecikmisOduncSayisi > 0, 'Teslim tarihi geçmiş kitabı var'],
    [uye.odenmemisCezaSayisi > 0, 'Ödenmemiş cezası var'],
  ]
  return kontroller.filter(([engel]) => engel).map(([, mesaj]) => mesaj)
}

/** Rezervasyonda kota dışındaki tüm ödünç engelleri geçerli; kota kitap teslim alınırken bakılır. */
export function rezervasyonEngelleri(uye: UyeDurumu, bugunTarih: string): string[] {
  return oduncEngelleri({ ...uye, aktifOduncSayisi: 0 }, bugunTarih)
}

export interface UzatmaDurumu {
  iadeEdildi: boolean
  uzatildi: boolean
  sonTeslimTarihi: string
  bekleyenRezervasyonVar: boolean
}

export function uzatmaEngeli(odunc: UzatmaDurumu, bugunTarih: string): string | null {
  if (odunc.iadeEdildi) return 'Kitap zaten iade edilmiş'
  if (odunc.uzatildi) return 'Ödünç süresi yalnızca bir kez uzatılabilir'
  if (gecikmeGunu(odunc.sonTeslimTarihi, bugunTarih) > 0) return 'Gecikmiş ödünç uzatılamaz'
  if (odunc.bekleyenRezervasyonVar) return 'Bu kitabı bekleyen başka bir üye var'
  return null
}
