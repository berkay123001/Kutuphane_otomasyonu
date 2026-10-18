/** Backend uç noktaları (backend/README.md API tablosu ile birebir). */
import { z } from 'zod'
import { istek } from './istemci'
import {
  cezaListeSema, cezaSema, girisSema, gorevliSema, iadeSonucSema, kategoriSayacliSema,
  kitapDetaySema, kitapListeSema, kopyaSema, oduncListeSema, oduncSema, panelSema,
  rezervasyonListeSema, rezervasyonSema, uyeDetaySema, uyeListeSema, uyeSema,
} from './semalar'

const bos = z.unknown()

export interface Sayfa {
  readonly page?: number
  readonly limit?: number
}

// ---------- oturum ----------
export const girisYap = (kullaniciAdi: string, sifre: string) =>
  istek('/auth/giris', girisSema, { yontem: 'POST', govde: { kullaniciAdi, sifre } })
export const benKimim = () => istek('/auth/ben', gorevliSema)

// ---------- panel / kategori ----------
export const paneliGetir = (sinyal?: AbortSignal) => istek('/panel', panelSema, { sinyal })
export const kategorileriGetir = (sinyal?: AbortSignal) =>
  istek('/kategoriler', z.array(kategoriSayacliSema), { sinyal })

// ---------- kitaplar ----------
export interface KitapFiltresi extends Sayfa {
  readonly q?: string
  readonly kategoriId?: number
}
export const kitaplariGetir = (f: KitapFiltresi = {}, sinyal?: AbortSignal) =>
  istek('/kitaplar', z.array(kitapListeSema), { sorgu: { ...f }, sinyal })
export const kitabiGetir = (id: number, sinyal?: AbortSignal) =>
  istek(`/kitaplar/${id}`, kitapDetaySema, { sinyal })
export const kopyaEkle = (kitapId: number, adet = 1) =>
  istek(`/kitaplar/${kitapId}/kopyalar`, z.array(kopyaSema), { yontem: 'POST', govde: { adet } })

// ---------- üyeler ----------
export interface UyeFiltresi extends Sayfa {
  readonly q?: string
  readonly aktif?: boolean
}
export const uyeleriGetir = (f: UyeFiltresi = {}, sinyal?: AbortSignal) =>
  istek('/uyeler', z.array(uyeListeSema), { sorgu: { ...f }, sinyal })
export const uyeyiGetir = (id: number, sinyal?: AbortSignal) =>
  istek(`/uyeler/${id}`, uyeDetaySema, { sinyal })

export interface YeniUye {
  readonly ad: string
  readonly soyad: string
  readonly tur: 'OGRENCI' | 'PERSONEL'
  readonly eposta?: string
  readonly telefon?: string
  readonly bolum?: string
}
export const uyeOlustur = (uye: YeniUye) => istek('/uyeler', uyeSema, { yontem: 'POST', govde: uye })
export const kartiYenile = (id: number, kartGecerlilik: string) =>
  istek(`/uyeler/${id}`, uyeSema, { yontem: 'PATCH', govde: { kartGecerlilik } })

// ---------- ödünç ----------
export type OduncSuresi = 7 | 14 | 21
export interface OduncFiltresi extends Sayfa {
  readonly durum?: 'aktif' | 'gecikmis' | 'iade'
  readonly uyeId?: number
}
export const oduncleriGetir = (f: OduncFiltresi = {}, sinyal?: AbortSignal) =>
  istek('/oduncler', z.array(oduncListeSema), { sorgu: { ...f }, sinyal })

export type OduncHedefi = { readonly kitapId: number } | { readonly barkod: string }
export const oduncVer = (uyeId: number, gun: OduncSuresi, hedef: OduncHedefi) =>
  istek('/oduncler', oduncSema, { yontem: 'POST', govde: { uyeId, gun, ...hedef } })
export const oduncUzat = (id: number) =>
  istek(`/oduncler/${id}/uzat`, oduncSema, { yontem: 'POST' })
export const iadeAl = (id: number) =>
  istek(`/oduncler/${id}/iade`, iadeSonucSema, { yontem: 'POST' })

// ---------- rezervasyon / ceza ----------
export const rezervasyonlariGetir = (
  f: Sayfa & { durum?: string; uyeId?: number; kitapId?: number } = {},
) => istek('/rezervasyonlar', z.array(rezervasyonListeSema), { sorgu: { ...f } })
export const rezervasyonYap = (uyeId: number, kitapId: number) =>
  istek('/rezervasyonlar', rezervasyonSema, { yontem: 'POST', govde: { uyeId, kitapId } })
export const rezervasyonIptal = (id: number) =>
  istek(`/rezervasyonlar/${id}/iptal`, rezervasyonSema, { yontem: 'POST' })

export const cezalariGetir = (
  f: Sayfa & { odendi?: boolean; uyeId?: number } = {},
  sinyal?: AbortSignal,
) => istek('/cezalar', z.array(cezaListeSema), { sorgu: { ...f }, sinyal })
export const cezaOde = (id: number) => istek(`/cezalar/${id}/ode`, cezaSema, { yontem: 'POST' })

export const saglik = () => istek('/saglik', bos)
