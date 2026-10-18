/** Katalog testleri için örnek backend verisi (yalnızca testlerde içe aktarılır). */
import type { KategoriSayacli, KitapDetay, KitapListe, UyeListe } from '../../api/semalar'

export const ORNEK_KATEGORILER: readonly KategoriSayacli[] = [
  { id: 1, kod: '800', ad: 'Edebiyat', kitapSayisi: 9, kopyaSayisi: 20 },
  { id: 2, kod: '100', ad: 'Felsefe', kitapSayisi: 1, kopyaSayisi: 2 },
  { id: 3, kod: '956', ad: 'Osmanlı Tarihi', kitapSayisi: 2, kopyaSayisi: 2 },
]

const EDEBIYAT = { id: 1, kod: '800', ad: 'Edebiyat' }

export const ORNEK_KITAPLAR: readonly KitapListe[] = [
  {
    id: 7,
    isbn: null,
    baslik: 'Tutunamayanlar',
    yazar: 'Oğuz Atay',
    yayinevi: 'İletişim Yayınları',
    yayinYili: 1972,
    yerNumarasi: '894.353 ATA·T',
    kategoriId: 1,
    kategori: EDEBIYAT,
    kopyaSayisi: 3,
    raftakiKopyaSayisi: 1,
  },
  {
    id: 11,
    isbn: null,
    baslik: 'Saatleri Ayarlama Enstitüsü',
    yazar: 'Ahmet Hamdi Tanpınar',
    yayinevi: 'Dergâh Yayınları',
    yayinYili: null,
    yerNumarasi: null,
    kategoriId: 1,
    kategori: EDEBIYAT,
    kopyaSayisi: 1,
    raftakiKopyaSayisi: 0,
  },
]

const UYE = { id: 4, uyeNo: 'Ü-0004', ad: 'Selin', soyad: 'Aydın' }

export const ORNEK_DETAY: KitapDetay = {
  id: 7,
  isbn: null,
  baslik: 'Tutunamayanlar',
  yazar: 'Oğuz Atay',
  yayinevi: 'İletişim Yayınları',
  yayinYili: 1972,
  yerNumarasi: '894.353 ATA·T',
  kategoriId: 1,
  kategori: EDEBIYAT,
  bekleyenRezervasyonSayisi: 0,
  kopyalar: [
    {
      id: 21, barkod: '004217', kitapId: 7, blok: 'B', rafNo: 14, durum: 'ODUNCTE',
      aktifOdunc: { id: 90, verilisZamani: '2026-10-01T09:00:00Z', sonTeslimTarihi: '2026-10-22', uye: UYE },
      ayrilanRezervasyon: null,
    },
    { id: 22, barkod: '004218', kitapId: 7, blok: 'B', rafNo: 15, durum: 'RAFTA', aktifOdunc: null, ayrilanRezervasyon: null },
    { id: 23, barkod: '004219', kitapId: 7, blok: null, rafNo: null, durum: 'AYRILDI', aktifOdunc: null, ayrilanRezervasyon: null },
  ],
  hareketler: [
    {
      id: 301, tip: 'ODUNC', zaman: '2026-10-01T09:00:00Z', kitapId: 7, kopyaId: 21, uyeId: 4,
      uye: UYE, kopya: { id: 21, barkod: '004217' },
    },
    {
      id: 300, tip: 'GEC_IADE', zaman: '2026-09-20T13:30:00Z', kitapId: 7, kopyaId: 22, uyeId: 4,
      uye: UYE, kopya: null,
    },
  ],
}

export const ORNEK_UYELER: readonly UyeListe[] = [
  {
    id: 4, uyeNo: 'Ü-0004', ad: 'Selin', soyad: 'Aydın', eposta: null, telefon: null, tur: 'PERSONEL',
    bolum: null, uyelikTarihi: '2024-01-10', kartGecerlilik: '2027-01-10', aktif: true, aktifOduncSayisi: 1,
  },
]
