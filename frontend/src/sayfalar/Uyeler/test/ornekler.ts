/** Testler için bugüne göre kurulan örnek üyeler (saat dilimi: Europe/Istanbul). */
import type { UyeDetay, UyeListe } from '../../../api/semalar'
import { bugunIso, gunEkle } from '../../../lib/tarih'
import type { AcikRezervasyon, AktifOdunc, GecmisOdunc, OdenmemisCeza } from '../uyeVeri'

export const BUGUN = bugunIso()

/** Bugünden `gun` gün sonrası (eksi: önce), İstanbul öğle saati. */
export const zaman = (gun: number) => `${gunEkle(BUGUN, gun)}T09:00:00.000Z`

const kitap = (id: number, baslik: string, yazar = 'Oğuz Atay') => ({
  id,
  baslik,
  yazar,
  yerNumarasi: '894.353 ATA·T',
})

export function ornekOdunc(id: number, baslik: string, verilisGunu: number, sonGunu: number): AktifOdunc {
  return {
    id,
    uyeId: 7,
    kopyaId: id + 1000,
    verilisZamani: zaman(verilisGunu),
    sonTeslimTarihi: gunEkle(BUGUN, sonGunu),
    iadeZamani: null,
    uzatildi: false,
    gecikmeGunu: Math.max(0, -sonGunu),
    kopya: { id: id + 1000, barkod: `B-${id}`, kitap: kitap(id + 500, baslik) },
  }
}

export function ornekGecmis(id: number, baslik: string, iadeZamani: string): GecmisOdunc {
  return {
    id,
    uyeId: 7,
    kopyaId: id + 1000,
    verilisZamani: '2023-09-01T09:00:00.000Z',
    sonTeslimTarihi: '2023-09-15',
    iadeZamani,
    uzatildi: false,
    kopya: { id: id + 1000, barkod: `B-${id}`, kitap: kitap(id + 500, baslik, 'Orhan Pamuk') },
    ceza: null,
  }
}

export const ORNEK_CEZA: OdenmemisCeza = {
  id: 55,
  oduncId: 90,
  gecikmeGunu: 2,
  tutar: 4,
  odendi: false,
  odemeZamani: null,
  olusturmaZamani: zaman(-3),
  odunc: { id: 90, kopya: { id: 1090, barkod: 'B-90', kitap: kitap(590, 'Huzur', 'Ahmet Hamdi Tanpınar') } },
}

export const ORNEK_REZERVASYONLAR: readonly AcikRezervasyon[] = [
  {
    id: 71,
    uyeId: 7,
    kitapId: 601,
    kopyaId: 1601,
    olusturmaZamani: zaman(-4),
    sonGecerlilik: gunEkle(BUGUN, 2),
    durum: 'HAZIR',
    kitap: kitap(601, 'Kürk Mantolu Madonna', 'Sabahattin Ali'),
  },
  {
    id: 72,
    uyeId: 7,
    kitapId: 602,
    kopyaId: null,
    olusturmaZamani: zaman(-1),
    sonGecerlilik: null,
    durum: 'BEKLIYOR',
    kitap: kitap(602, 'İnce Memed', 'Yaşar Kemal'),
  },
]

export function ornekUye(degisim: Partial<UyeDetay> = {}): UyeDetay {
  return {
    id: 7,
    uyeNo: 'Ü-2291',
    ad: 'Elif',
    soyad: 'Demirci',
    eposta: 'elif@ornek.tr',
    telefon: null,
    tur: 'OGRENCI',
    bolum: 'Yazılım Mühendisliği',
    uyelikTarihi: '2023-09-12',
    kartGecerlilik: gunEkle(BUGUN, 300),
    aktif: true,
    aktifOduncler: [
      ornekOdunc(103, 'Sokrates’in Savunması', -16, -2),
      ornekOdunc(101, 'Tutunamayanlar', 0, 14),
      ornekOdunc(102, 'Saatleri Ayarlama Enstitüsü', -9, 5),
    ],
    gecmis: [
      ornekGecmis(201, 'Kara Kitap', '2024-01-10T10:00:00.000Z'),
      ornekGecmis(200, 'Beyaz Kale', '2023-09-20T10:00:00.000Z'),
    ],
    odenmemisCezalar: [ORNEK_CEZA],
    rezervasyonlar: [...ORNEK_REZERVASYONLAR],
    istatistik: { aktifOduncSayisi: 3, gecikmisOduncSayisi: 1, okunanKitapSayisi: 47, odenmemisCezaSayisi: 1 },
    oduncEngelleri: [],
    ...degisim,
  }
}

export function ornekListeUyesi(degisim: Partial<UyeListe> = {}): UyeListe {
  return {
    id: 7,
    uyeNo: 'Ü-2291',
    ad: 'Elif',
    soyad: 'Demirci',
    eposta: null,
    telefon: null,
    tur: 'OGRENCI',
    bolum: 'Yazılım Mühendisliği',
    uyelikTarihi: '2023-09-12',
    kartGecerlilik: gunEkle(BUGUN, 300),
    aktif: true,
    aktifOduncSayisi: 2,
    ...degisim,
  }
}
