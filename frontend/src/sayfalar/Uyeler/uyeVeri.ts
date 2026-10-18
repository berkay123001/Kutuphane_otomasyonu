/** Üye ekranlarının saf türetmeleri (fislik/Uye.dc.html mantığı, gerçek veriye uyarlanmış). */
import { z } from 'zod'
import { ApiHatasi } from '../../api/istemci'
import { UYE_TURLERI, type UyeDetay, type UyeListe } from '../../api/semalar'
import type { YeniUye } from '../../api/uclar'
import type { Murekkep } from '../../ui/Damga'
import { karma, sirtRengi } from '../../lib/bicim'
import { ayYil, gunFarki, parcala, zamandanIso } from '../../lib/tarih'

export const KOTA = 5
export const UZATMA_GUNU = 7
export const KART_UYARI_GUNU = 30
export const KART_YENILEME_GUNU = 365
export const SAYFA_BOYU = 24

export type AktifOdunc = UyeDetay['aktifOduncler'][number]
export type GecmisOdunc = UyeDetay['gecmis'][number]
export type OdenmemisCeza = UyeDetay['odenmemisCezalar'][number]
export type AcikRezervasyon = UyeDetay['rezervasyonlar'][number]
type UyeTuru = UyeListe['tur']

const iki = (n: number) => String(n).padStart(2, '0')
const yuvarla = (n: number) => Math.round(n * 100) / 100

/** 'YYYY-MM-DD' ya da ISO zaman damgası → İstanbul takvim günü. */
export function tarihKismi(deger: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(deger) ? deger : zamandanIso(deger)
}

/** Rota parametresi → pozitif tam sayı kimlik. */
export function kimlikCoz(param: string | undefined): number | null {
  if (!param || !/^\d+$/.test(param)) return null
  const n = Number(param)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export const TUR_ETIKETI: Readonly<Record<UyeTuru, string>> = { OGRENCI: 'Öğrenci', PERSONEL: 'Personel' }

/** 'Ü-2291 · Öğrenci · Yazılım Mühendisliği · 2023 yılından beri üye' */
export function altBaslik(uye: Pick<UyeListe, 'uyeNo' | 'tur' | 'bolum' | 'uyelikTarihi'>): string {
  const yil = parcala(tarihKismi(uye.uyelikTarihi)).yil
  return `${uye.uyeNo} · ${TUR_ETIKETI[uye.tur]} · ${uye.bolum ?? '—'} · ${yil} yılından beri üye`
}

export function uyelikAyi(uyelikTarihi: string): string {
  return ayYil(tarihKismi(uyelikTarihi))
}

// ---------- ödünç gün kareleri ----------

export interface GunModeli {
  readonly kullanilan: number
  readonly kalan: number
  readonly gecikme: number
  readonly toplam: number
}

type GunGirdisi = Pick<AktifOdunc, 'verilisZamani' | 'sonTeslimTarihi' | 'gecikmeGunu'>

export function gunModeli(odunc: GunGirdisi, bugun: string): GunModeli {
  const verilis = tarihKismi(odunc.verilisZamani)
  const toplam = Math.max(0, gunFarki(verilis, odunc.sonTeslimTarihi))
  const kullanilan = Math.min(toplam, Math.max(0, gunFarki(verilis, bugun)))
  return { toplam, kullanilan, kalan: toplam - kullanilan, gecikme: Math.max(0, odunc.gecikmeGunu) }
}

export type KareTuru = 'kullanilan' | 'kalan' | 'gecikme'

export interface Kare {
  readonly tur: KareTuru
  readonly bugun: boolean
  /** Uzatmayla eklenen 7 gün (kesik mor kenar) */
  readonly taze: boolean
  /** pop animasyonu gecikmesi, saniye */
  readonly gecikmeSn: number
}

export interface KareAyari {
  /** Fişin listedeki sırası (giriş gecikmesi) */
  readonly sira: number
  readonly uzatildi: boolean
  /** Fiş ilk çizildiğinde kaç gün vardı; sonradan eklenen kareler hızlı sırayla belirir */
  readonly ilkToplam: number
}

/** Her kare bir gün: mor geçti, boş kaldı, kırmızı gecikti (tasarım: .sq). */
export function gunKareleri(m: GunModeli, a: KareAyari): readonly Kare[] {
  const uzatmaBasi = a.uzatildi ? m.toplam - UZATMA_GUNU : Number.POSITIVE_INFINITY
  return Array.from({ length: m.toplam + m.gecikme }, (_, i) => {
    const sonradan = i >= a.ilkToplam && i < m.toplam
    const gecikmeSn = sonradan ? (i - a.ilkToplam) * 0.06 : 0.8 + a.sira * 0.2 + i * 0.035
    return {
      tur: i < m.kullanilan ? 'kullanilan' : i < m.toplam ? 'kalan' : 'gecikme',
      bugun: i === m.kullanilan && m.gecikme === 0,
      taze: i >= uzatmaBasi && i < m.toplam,
      gecikmeSn: yuvarla(gecikmeSn),
    }
  })
}

export interface GunGostergesi {
  readonly sayi: number
  readonly etiket: string
  readonly ton: 'gec' | 'yakin' | 'normal'
}

export function gunGostergesi(m: GunModeli): GunGostergesi {
  if (m.gecikme > 0) return { sayi: m.gecikme, etiket: 'gün gecikti', ton: 'gec' }
  return { sayi: m.kalan, etiket: 'gün kaldı', ton: m.kalan <= 5 ? 'yakin' : 'normal' }
}

export function uzatilabilir(odunc: Pick<AktifOdunc, 'uzatildi'>, m: GunModeli): boolean {
  return !odunc.uzatildi && m.gecikme === 0
}

/** En yeni verilen üstte (tasarımdaki sıra). */
export function oduncleriSirala<T extends Pick<AktifOdunc, 'id' | 'verilisZamani'>>(liste: readonly T[]): readonly T[] {
  return [...liste].sort(
    (a, b) => new Date(b.verilisZamani).getTime() - new Date(a.verilisZamani).getTime() || b.id - a.id,
  )
}

// ---------- okuyucu kartı ----------

export interface BarkodCizgisi {
  readonly genislik: number
  readonly bosluk: boolean
}

export const BARKOD_CIZGI_SAYISI = 32

/** Basit doğrusal eşlik üreteci; aynı tohum hep aynı diziyi verir. */
function tohumDizisi(tohum: number, adet: number): readonly number[] {
  return Array.from({ length: adet }).reduce<readonly number[]>((dizi) => {
    const onceki = dizi[dizi.length - 1] ?? (tohum || 1)
    return [...dizi, (Math.imul(onceki, 1103515245) + 12345) >>> 0]
  }, [])
}

/** Okuyucu numarasından kararlı barkod: çizgi/boşluk sırayla, 1–4 birim (×2.2 px). */
export function barkodCizgileri(uyeNo: string): readonly BarkodCizgisi[] {
  return tohumDizisi(karma(uyeNo), BARKOD_CIZGI_SAYISI).map((t, i) => ({
    genislik: yuvarla(((1 + ((t >>> 16) % 4)) * 2.2)),
    bosluk: i % 2 === 1,
  }))
}

export type KartDurumuTuru = 'gecerli' | 'yaklasiyor' | 'doldu'

export interface KartDurumu {
  readonly durum: KartDurumuTuru
  readonly kalanGun: number
}

export function kartDurumu(kartGecerlilik: string, bugun: string): KartDurumu {
  const kalanGun = gunFarki(bugun, tarihKismi(kartGecerlilik))
  const durum: KartDurumuTuru = kalanGun < 0 ? 'doldu' : kalanGun <= KART_UYARI_GUNU ? 'yaklasiyor' : 'gecerli'
  return { durum, kalanGun }
}

/** '09 / 2027' */
export function gecerlilikMetni(kartGecerlilik: string): string {
  const { yil, ay } = parcala(tarihKismi(kartGecerlilik))
  return `${iki(ay)} / ${yil}`
}

/** 'E. Demirci' */
export function imza(ad: string, soyad: string): string {
  const ilk = ad.trim().charAt(0).toLocaleUpperCase('tr')
  return ilk ? `${ilk}. ${soyad}` : soyad
}

export function kotaDilimleri(aktif: number, sinir = KOTA): readonly boolean[] {
  return Array.from({ length: sinir }, (_, i) => i < aktif)
}

export function cezaToplami(cezalar: readonly { readonly tutar: number }[]): number {
  return yuvarla(cezalar.reduce((t, c) => t + c.tutar, 0))
}

// ---------- damgalar ----------

export interface DamgaBilgisi {
  readonly metin: string
  readonly murekkep: Murekkep
}

/** Başlık altındaki durum damgaları (koyu zemin: açık mürekkepler). */
export function basDamgalari(uye: UyeDetay, bugun: string): readonly DamgaBilgisi[] {
  const gecikmis = uye.istatistik.gecikmisOduncSayisi
  return [
    uye.aktif ? { metin: 'Aktif', murekkep: 'lv' } : { metin: 'Pasif', murekkep: 'lr' },
    ...(gecikmis > 0 ? [{ metin: `${gecikmis} gecikme`, murekkep: 'lr' } as const] : []),
    ...(kartDurumu(uye.kartGecerlilik, bugun).durum === 'doldu'
      ? [{ metin: 'Kart süresi doldu', murekkep: 'lr' } as const]
      : []),
  ]
}

/** Mini kart üstündeki kırmızı damgalar (kâğıt zemin). */
export function kartDamgalari(uye: Pick<UyeListe, 'aktif' | 'kartGecerlilik'>, bugun: string): readonly DamgaBilgisi[] {
  return [
    ...(kartDurumu(uye.kartGecerlilik, bugun).durum === 'doldu'
      ? [{ metin: 'Kart süresi doldu', murekkep: 'r' } as const]
      : []),
    ...(uye.aktif ? [] : [{ metin: 'Pasif', murekkep: 'r' } as const]),
  ]
}

/** ?aktif=true|false → filtre; diğer her şey 'Tümü'. */
export function aktifFiltresi(param: string | null): boolean | undefined {
  if (param === 'true') return true
  if (param === 'false') return false
  return undefined
}

// ---------- okuma rafı ----------

const SIRT_BOYLARI = [196, 214, 232, 178] as const
const SIRT_ENLERI = [34, 42, 50, 30] as const

export interface RafKitabi {
  readonly id: number
  readonly kitapId: number
  readonly baslik: string
  readonly tarih: string
  readonly renk: string
  readonly yazi: string
  readonly yukseklik: number
  readonly genislik: number
  readonly gecikmeSn: number
}

export function sirtOlcusu(anahtar: string): { readonly yukseklik: number; readonly genislik: number } {
  const h = karma(anahtar)
  return { yukseklik: SIRT_BOYLARI[h % 4] ?? 196, genislik: SIRT_ENLERI[(h >>> 5) % 4] ?? 34 }
}

/** Koyu sırta açık, açık sırta koyu yazı; neredeyse siyah sırta yaldız (tasarım: .c1–.c9). */
export function sirtYaziRengi(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const isik = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (isik > 0.42) return '#1D1B16'
  return isik < 0.12 ? '#D9B45F' : '#EAD9A4'
}

/** Geçmiş ödünçler → soldan sağa eskiden yeniye sırtlar. */
export function rafKitaplari(gecmis: readonly GecmisOdunc[]): readonly RafKitabi[] {
  return gecmis
    .flatMap((o) => (o.iadeZamani ? [{ o, iade: o.iadeZamani }] : []))
    .sort((a, b) => new Date(a.iade).getTime() - new Date(b.iade).getTime())
    .map(({ o, iade }, i) => {
      const { baslik, id: kitapId } = o.kopya.kitap
      const renk = sirtRengi(baslik)
      return {
        id: o.id,
        kitapId,
        baslik,
        tarih: ayYil(zamandanIso(iade)),
        renk,
        yazi: sirtYaziRengi(renk),
        ...sirtOlcusu(`${baslik}#${o.id}`),
        gecikmeSn: yuvarla(0.7 + i * 0.07),
      }
    })
}

// ---------- yeni üye formu ----------

export const FORM_ALANLARI = ['ad', 'soyad', 'tur', 'bolum', 'eposta', 'telefon'] as const
export type FormAlani = (typeof FORM_ALANLARI)[number]

export interface UyeFormu {
  readonly ad: string
  readonly soyad: string
  readonly tur: UyeTuru
  readonly bolum: string
  readonly eposta: string
  readonly telefon: string
}

export const BOS_FORM: UyeFormu = { ad: '', soyad: '', tur: 'OGRENCI', bolum: '', eposta: '', telefon: '' }

const epostaMi = (v: string) => z.email().safeParse(v).success

export const uyeFormSemasi = z.object({
  ad: z.string().trim().min(1, 'Ad gerekli').max(100, 'Ad en fazla 100 karakter olabilir'),
  soyad: z.string().trim().min(1, 'Soyad gerekli').max(100, 'Soyad en fazla 100 karakter olabilir'),
  tur: z.enum(UYE_TURLERI, 'Öğrenci ya da personel seçin'),
  bolum: z.string().trim().max(100, 'Bölüm en fazla 100 karakter olabilir'),
  eposta: z
    .string()
    .trim()
    .max(200, 'E-posta en fazla 200 karakter olabilir')
    .refine((v) => v === '' || epostaMi(v), 'Geçerli bir e-posta girin'),
  telefon: z.string().trim().max(30, 'Telefon en fazla 30 karakter olabilir'),
})

export type FormHatalari = Partial<Record<FormAlani, string>>

export type FormSonucu =
  | { readonly tamam: true; readonly veri: YeniUye }
  | { readonly tamam: false; readonly hatalar: FormHatalari }

function ilkHatalar(alanlar: Partial<Record<string, readonly string[]>>): FormHatalari {
  return Object.fromEntries(
    FORM_ALANLARI.flatMap((a) => {
      const mesaj = alanlar[a]?.[0]
      return mesaj ? [[a, mesaj] as const] : []
    }),
  )
}

/** İstemci doğrulaması; boş isteğe bağlı alanlar gönderilmez. */
export function formuCoz(form: UyeFormu): FormSonucu {
  const sonuc = uyeFormSemasi.safeParse(form)
  if (!sonuc.success) return { tamam: false, hatalar: ilkHatalar(z.flattenError(sonuc.error).fieldErrors) }
  const { ad, soyad, tur, bolum, eposta, telefon } = sonuc.data
  return {
    tamam: true,
    veri: {
      ad,
      soyad,
      tur,
      ...(bolum ? { bolum } : {}),
      ...(eposta ? { eposta } : {}),
      ...(telefon ? { telefon } : {}),
    },
  }
}

const sunucuHataSemasi = z.object({ fieldErrors: z.record(z.string(), z.array(z.string())) })

/** 400 yanıtındaki alan hataları (backend: z.flattenError) → forma. */
export function sunucuAlanHatalari(hata: unknown): FormHatalari {
  if (!(hata instanceof ApiHatasi) || hata.durum !== 400) return {}
  const sonuc = sunucuHataSemasi.safeParse(hata.ayrinti)
  return sonuc.success ? ilkHatalar(sonuc.data.fieldErrors) : {}
}
