/** Backend yanıt şemaları (backend/src/db/schema.ts ve moduller/*). Bilinmeyen alanlar atılır. */
import { z } from 'zod'

const sayi = z.coerce.number()
const metinYok = z.string().nullish().transform((v) => v ?? null)
const sayiYok = z.coerce.number().nullish().transform((v) => v ?? null)

export const KOPYA_DURUMLARI = ['RAFTA', 'ODUNCTE', 'AYRILDI'] as const
export const REZERVASYON_DURUMLARI = ['BEKLIYOR', 'HAZIR', 'TAMAMLANDI', 'IPTAL'] as const
export const HAREKET_TIPLERI = ['ODUNC', 'IADE', 'GEC_IADE', 'UZATMA', 'AYIRTMA'] as const
export const UYE_TURLERI = ['OGRENCI', 'PERSONEL'] as const

export const metaSema = z.object({ page: sayi, limit: sayi, total: sayi })
export type Meta = z.infer<typeof metaSema>

export const gorevliSema = z.object({
  id: sayi,
  ad: z.string(),
  soyad: z.string(),
  eposta: metinYok,
  telefon: metinYok,
  kullaniciAdi: z.string(),
  aktif: z.boolean(),
})
export type Gorevli = z.infer<typeof gorevliSema>

export const girisSema = z.object({ token: z.string().min(10), gorevli: gorevliSema })

/** Kısa biçimler: U, K, C (backend/src/moduller/ozetler.ts) */
export const uyeOzetSema = z.object({ id: sayi, uyeNo: z.string(), ad: z.string(), soyad: z.string() })
export const kitapOzetSema = z.object({
  id: sayi,
  baslik: z.string(),
  yazar: z.string(),
  yerNumarasi: metinYok,
})
export const kopyaOzetSema = z.object({ id: sayi, barkod: z.string() })
export const kopyaKitapliSema = kopyaOzetSema.extend({ kitap: kitapOzetSema })
export type UyeOzet = z.infer<typeof uyeOzetSema>
export type KitapOzet = z.infer<typeof kitapOzetSema>

export const kategoriSema = z.object({ id: sayi, kod: z.string(), ad: z.string() })
export const kategoriSayacliSema = kategoriSema.extend({ kitapSayisi: sayi, kopyaSayisi: sayi })
export type Kategori = z.infer<typeof kategoriSema>
export type KategoriSayacli = z.infer<typeof kategoriSayacliSema>

export const kitapSema = z.object({
  id: sayi,
  isbn: metinYok,
  baslik: z.string(),
  yazar: z.string(),
  yayinevi: metinYok,
  yayinYili: sayiYok,
  yerNumarasi: metinYok,
  kategoriId: sayi,
})
export const kitapListeSema = kitapSema.extend({
  kategori: kategoriSema,
  kopyaSayisi: sayi,
  raftakiKopyaSayisi: sayi,
})
export type KitapListe = z.infer<typeof kitapListeSema>

export const kopyaSema = z.object({
  id: sayi,
  barkod: z.string(),
  kitapId: sayi,
  blok: metinYok,
  rafNo: sayiYok,
  durum: z.enum(KOPYA_DURUMLARI),
})
export type Kopya = z.infer<typeof kopyaSema>

export const hareketSema = z.object({
  id: sayi,
  tip: z.enum(HAREKET_TIPLERI),
  zaman: z.string(),
  kitapId: sayi,
  kopyaId: sayiYok,
  uyeId: sayi,
})
export type HareketTipi = (typeof HAREKET_TIPLERI)[number]

export const kitapDetaySema = kitapSema.extend({
  kategori: kategoriSema,
  bekleyenRezervasyonSayisi: sayi,
  kopyalar: z.array(
    kopyaSema.extend({
      aktifOdunc: z
        .object({ id: sayi, verilisZamani: z.string(), sonTeslimTarihi: z.string(), uye: uyeOzetSema })
        .nullable(),
      ayrilanRezervasyon: z
        .object({ id: sayi, sonGecerlilik: metinYok, uye: uyeOzetSema })
        .nullable(),
    }),
  ),
  hareketler: z.array(hareketSema.extend({ uye: uyeOzetSema, kopya: kopyaOzetSema.nullable() })),
})
export type KitapDetay = z.infer<typeof kitapDetaySema>

export const uyeSema = z.object({
  id: sayi,
  uyeNo: z.string(),
  ad: z.string(),
  soyad: z.string(),
  eposta: metinYok,
  telefon: metinYok,
  tur: z.enum(UYE_TURLERI),
  bolum: metinYok,
  uyelikTarihi: z.string(),
  kartGecerlilik: z.string(),
  aktif: z.boolean(),
})
export type Uye = z.infer<typeof uyeSema>
export const uyeListeSema = uyeSema.extend({ aktifOduncSayisi: sayi })
export type UyeListe = z.infer<typeof uyeListeSema>

export const oduncSema = z.object({
  id: sayi,
  uyeId: sayi,
  kopyaId: sayi,
  verilisZamani: z.string(),
  sonTeslimTarihi: z.string(),
  iadeZamani: metinYok,
  uzatildi: z.boolean(),
})
export type Odunc = z.infer<typeof oduncSema>

export const cezaSema = z.object({
  id: sayi,
  oduncId: sayi,
  gecikmeGunu: sayi,
  tutar: sayi,
  odendi: z.boolean(),
  odemeZamani: metinYok,
  olusturmaZamani: z.string(),
})
export type Ceza = z.infer<typeof cezaSema>

export const rezervasyonSema = z.object({
  id: sayi,
  uyeId: sayi,
  kitapId: sayi,
  kopyaId: sayiYok,
  olusturmaZamani: z.string(),
  sonGecerlilik: metinYok,
  durum: z.enum(REZERVASYON_DURUMLARI),
})
export type Rezervasyon = z.infer<typeof rezervasyonSema>

export const uyeDetaySema = uyeSema.extend({
  aktifOduncler: z.array(oduncSema.extend({ kopya: kopyaKitapliSema, gecikmeGunu: sayi })),
  gecmis: z.array(oduncSema.extend({ kopya: kopyaKitapliSema, ceza: cezaSema.nullable() })),
  odenmemisCezalar: z.array(
    cezaSema.extend({ odunc: z.object({ id: sayi, kopya: kopyaKitapliSema }) }),
  ),
  rezervasyonlar: z.array(rezervasyonSema.extend({ kitap: kitapOzetSema })),
  istatistik: z.object({
    aktifOduncSayisi: sayi,
    gecikmisOduncSayisi: sayi,
    okunanKitapSayisi: sayi,
    odenmemisCezaSayisi: sayi,
  }),
  oduncEngelleri: z.array(z.string()),
})
export type UyeDetay = z.infer<typeof uyeDetaySema>

export const oduncListeSema = oduncSema.extend({
  uye: uyeOzetSema,
  kopya: kopyaKitapliSema,
  ceza: cezaSema.nullable(),
  gecikmeGunu: sayi,
})
export type OduncListe = z.infer<typeof oduncListeSema>

export const rezervasyonListeSema = rezervasyonSema.extend({
  uye: uyeOzetSema,
  kitap: kitapOzetSema,
  kopya: kopyaOzetSema.nullable(),
})
export type RezervasyonListe = z.infer<typeof rezervasyonListeSema>

export const cezaListeSema = cezaSema.extend({
  odunc: z.object({
    id: sayi,
    sonTeslimTarihi: z.string(),
    iadeZamani: metinYok,
    uye: uyeOzetSema,
    kopya: kopyaKitapliSema,
  }),
})
export type CezaListe = z.infer<typeof cezaListeSema>

export const iadeSonucSema = z.object({ odunc: oduncSema, ceza: cezaSema.nullable() })

export const panelSema = z.object({
  bugun: z.object({ odunc: sayi, iade: sayi, gecikmis: sayi, yeniUye: sayi }),
  sonHareketler: z.array(
    hareketSema.extend({ uye: uyeOzetSema, kitap: kitapOzetSema, kopya: kopyaOzetSema.nullable() }),
  ),
  gecikenler: z.array(
    oduncSema.extend({ uye: uyeOzetSema, kopya: kopyaKitapliSema, gecikmeGunu: sayi }),
  ),
})
export type Panel = z.infer<typeof panelSema>
export type PanelHareket = Panel['sonHareketler'][number]
export type PanelGeciken = Panel['gecikenler'][number]
