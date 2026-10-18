import {
  SECILI_SIRA, SIRT_SAYISI, aktifSekme, aralikEtiketi, aralikMetni, ayirtmaDamgasi, detayDurumu,
  fisModeli, hareketSatirlari, hedefSira, idCoz, onizlemeModeli, kalanGecikme, kunye, listeDurumu, paramlariGuncelle, rafSirtlari, rafYeri,
  riffleGecikmesi, sekmeModeli, yayinBilgisi, yerNumarasiBol,
} from './katalogVeri'
import { ORNEK_DETAY, ORNEK_KATEGORILER, ORNEK_KITAPLAR } from './ornekVeri'

const KITAP = ORNEK_KITAPLAR[0]!
const KOPYALAR = ORNEK_DETAY.kopyalar

describe('yerNumarasiBol', () => {
  it('ilk boşlukta iki satıra böler', () => {
    expect(yerNumarasiBol('894.353 ATA·T')).toEqual({ ust: '894.353', alt: 'ATA·T' })
    expect(yerNumarasiBol('  956.1015  İNA·O  X ')).toEqual({ ust: '956.1015', alt: 'İNA·O  X' })
  })
  it('boşluksuz ya da boş değerleri karşılar', () => {
    expect(yerNumarasiBol('520')).toEqual({ ust: '520', alt: '' })
    expect(yerNumarasiBol(null)).toEqual({ ust: '—', alt: '' })
    expect(yerNumarasiBol('   ')).toEqual({ ust: '—', alt: '' })
  })
})

describe('listeDurumu', () => {
  it('raftaki kopyaya göre damga verir', () => {
    expect(listeDurumu({ kopyaSayisi: 3, raftakiKopyaSayisi: 1 })).toEqual({ etiket: 'Rafta · 1/3', murekkep: 'v' })
    expect(listeDurumu({ kopyaSayisi: 2, raftakiKopyaSayisi: 0 })).toEqual({ etiket: 'Ödünçte', murekkep: 'k' })
    expect(listeDurumu({ kopyaSayisi: 0, raftakiKopyaSayisi: 0 }).etiket).toBe('Kopyası yok')
  })
})

describe('detayDurumu', () => {
  it('gecikmiş ödünç her şeyin önüne geçer', () => {
    expect(detayDurumu(ORNEK_DETAY, '2026-10-25')).toEqual({ etiket: 'Gecikmiş · 3 gün', murekkep: 'r' })
  })
  it('gecikme yoksa raftaki kopyaları sayar', () => {
    expect(detayDurumu(ORNEK_DETAY, '2026-10-18')).toEqual({ etiket: 'Rafta · 1/3', murekkep: 'v' })
    expect(detayDurumu(ORNEK_DETAY, '2026-10-22').murekkep).toBe('v')
  })
  it('rafta yoksa ayrıldı, o da yoksa en erken iade tarihi', () => {
    const rafsiz = KOPYALAR.filter((k) => k.durum !== 'RAFTA')
    expect(detayDurumu({ kopyalar: rafsiz }, '2026-10-18')).toEqual({ etiket: 'Ayrıldı', murekkep: 'k' })
    const oduncte = KOPYALAR.filter((k) => k.durum === 'ODUNCTE')
    expect(detayDurumu({ kopyalar: oduncte }, '2026-10-18')).toEqual({ etiket: 'Ödünçte · 22.10', murekkep: 'k' })
    expect(detayDurumu({ kopyalar: [] }, '2026-10-18').etiket).toBe('Kopyası yok')
  })
  it('sırada bekleyen ayırtmayı ayrı damga yapar', () => {
    expect(ayirtmaDamgasi({ bekleyenRezervasyonSayisi: 0 })).toBeNull()
    expect(ayirtmaDamgasi({ bekleyenRezervasyonSayisi: 2 })).toBe('Ayırtıldı · 2 sırada')
  })
})

describe('sekmeler', () => {
  it('yüzlük kodları aralığa çevirir', () => {
    expect(aralikEtiketi('800')).toBe('800–899')
    expect(aralikEtiketi('000')).toBe('000–099')
    expect(aralikEtiketi('956')).toBe('956')
    expect(aralikEtiketi('TR')).toBe('TR')
  })
  it('Tümü sekmesi toplamı taşır, kategoriler koda göre sıralanır', () => {
    const sekmeler = sekmeModeli(ORNEK_KATEGORILER)
    expect(sekmeler.map((s) => s.etiket)).toEqual(['Tümü', 'Felsefe', 'Edebiyat', 'Osmanlı Tarihi'])
    expect(sekmeler[0]).toMatchObject({ kategoriId: null, aralik: '000–999', sayi: 12 })
    expect(sekmeler[2]).toMatchObject({ kategoriId: 1, aralik: '800–899', sayi: 9 })
    expect(sekmeModeli([])[0]?.sayi).toBeNull()
  })
  it('aktif sekmeyi ve etiketini bulur', () => {
    const sekmeler = sekmeModeli(ORNEK_KATEGORILER)
    expect(aralikMetni(aktifSekme(sekmeler, null))).toBe('000–999 · Tüm koleksiyon')
    expect(aralikMetni(aktifSekme(sekmeler, 1))).toBe('800–899 · Edebiyat')
    expect(aktifSekme(sekmeler, 99)).toMatchObject({ kategoriId: 99, etiket: 'Kategori' })
    expect(aktifSekme([], null).etiket).toBe('Tümü')
  })
  it('klavyeyle sekmeler ve fişler arasında döner', () => {
    expect(hedefSira('ArrowRight', 3, 4, 'yatay')).toBe(0)
    expect(hedefSira('ArrowLeft', 0, 4, 'yatay')).toBe(3)
    expect(hedefSira('Home', 2, 4, 'yatay')).toBe(0)
    expect(hedefSira('End', 0, 4, 'dikey')).toBe(3)
    expect(hedefSira('ArrowDown', 1, 4, 'dikey')).toBe(2)
    expect(hedefSira('ArrowDown', 1, 4, 'yatay')).toBeNull()
    expect(hedefSira('Enter', 0, 4, 'yatay')).toBeNull()
    expect(hedefSira('ArrowRight', 0, 0, 'yatay')).toBeNull()
  })
})

describe('fiş metinleri', () => {
  it('liste fişini kurar', () => {
    expect(fisModeli(KITAP)).toEqual({
      yer: { ust: '894.353', alt: 'ATA·T' },
      damga: { etiket: 'Rafta · 1/3', murekkep: 'v' },
      yayin: 'İletişim Yayınları, 1972',
      konu: 'Edebiyat',
      ozet: '3 kopya · 1 rafta',
    })
    expect(fisModeli({ ...KITAP, yayinevi: null, yayinYili: null }).yayin).toBe('Yayın bilgisi yok')
  })
  it('künyeyi katalog fişi biçiminde yazar', () => {
    expect(kunye(KITAP)).toEqual({
      bas: 'Oğuz Atay.',
      satir: 'Tutunamayanlar / Oğuz Atay. — İletişim Yayınları, 1972.',
      konu: '1. Edebiyat. I. Başlık.',
    })
    expect(kunye({ ...KITAP, yayinevi: null, yayinYili: null }).satir).toBe('Tutunamayanlar / Oğuz Atay.')
    expect(yayinBilgisi(null, 1999)).toBe('1999')
    expect(kunye({ ...KITAP, yayinevi: 'Can Yayınları A.Ş.', yayinYili: null }).satir).toBe(
      'Tutunamayanlar / Oğuz Atay. — Can Yayınları A.Ş.',
    )
  })
  it('raf yerini raftaki kopyadan, yoksa ilk kopyadan alır', () => {
    expect(rafYeri(KOPYALAR)).toBe('B Blok · Raf 15')
    expect(rafYeri(KOPYALAR.slice(0, 1))).toBe('B Blok · Raf 14')
    expect(rafYeri(KOPYALAR.slice(2))).toBe('Yer bilgisi yok')
    expect(rafYeri([])).toBe('Yer bilgisi yok')
  })
  it('hareketleri kısa satırlara çevirir', () => {
    const satirlar = hareketSatirlari(ORNEK_DETAY.hareketler)
    expect(satirlar[0]).toEqual({ id: 301, tarih: '01.10', barkod: '004217', uye: 'Selin Aydın', tip: 'Ödünç', gec: false })
    expect(satirlar[1]).toMatchObject({ barkod: '—', tip: 'Geç iade', gec: true })
    expect(hareketSatirlari(ORNEK_DETAY.hareketler, 1)).toHaveLength(1)
  })
})

describe('onizlemeModeli', () => {
  it('ayrıntı yokken liste satırından kurar', () => {
    const m = onizlemeModeli(KITAP, undefined, '2026-10-18')
    expect(m).toMatchObject({
      id: 7,
      yer: { ust: '894.353', alt: 'ATA·T' },
      damga: { etiket: 'Rafta · 1/3', murekkep: 'v' },
      ayirtma: null,
      demirbas: '—',
      ozet: '3 kopya · 1 rafta',
      rafYeri: null,
    })
    expect(onizlemeModeli(undefined, undefined, '2026-10-18')).toBeNull()
  })
  it('ayrıntı gelince kopyalardan durum, yer ve demirbaş türetir', () => {
    const m = onizlemeModeli(KITAP, { ...ORNEK_DETAY, bekleyenRezervasyonSayisi: 1 }, '2026-10-24')
    expect(m).toMatchObject({
      damga: { etiket: 'Gecikmiş · 2 gün', murekkep: 'r' },
      ayirtma: 'Ayırtıldı · 1 sırada',
      demirbas: '004217',
      ozet: '3 kopya · 1 rafta',
      rafYeri: 'B Blok · Raf 15',
    })
  })
})

describe('mini raf', () => {
  it('seçili sırtı ortaya koyar, komşuları yaslar, kimlikten kararlı üretir', () => {
    const sirtlar = rafSirtlari(7)
    expect(sirtlar).toHaveLength(SIRT_SAYISI)
    expect(sirtlar[SECILI_SIRA]).toMatchObject({ secili: true, yukseklik: 94, genislik: 46 })
    expect(sirtlar[SECILI_SIRA - 1]?.yan).toBe('sol')
    expect(sirtlar[SECILI_SIRA + 1]?.yan).toBe('sag')
    expect(sirtlar.filter((s) => s.yan !== null)).toHaveLength(2)
    expect(rafSirtlari(7)).toEqual(sirtlar)
    expect(rafSirtlari(8)).not.toEqual(sirtlar)
    sirtlar.filter((s) => !s.secili).forEach((s) => {
      expect(s.yukseklik).toBeGreaterThanOrEqual(60)
      expect(s.yukseklik).toBeLessThan(90)
      expect(s.genislik).toBeGreaterThanOrEqual(16)
      expect(s.genislik).toBeLessThan(30)
    })
  })
})

describe('adres çubuğu ve zamanlama', () => {
  it('kimlikleri doğrular', () => {
    expect(idCoz('12')).toBe(12)
    expect(idCoz('0')).toBeNull()
    expect(idCoz('-3')).toBeNull()
    expect(idCoz('1e3')).toBeNull()
    expect(idCoz('99999999999999999999')).toBeNull()
    expect(idCoz(null)).toBeNull()
  })
  it('parametreleri değiştirmeden yenisini kurar', () => {
    const eski = new URLSearchParams('q=atay&kitap=7')
    const yeni = paramlariGuncelle(eski, { q: '', kategori: 3 })
    expect(yeni.toString()).toBe('kitap=7&kategori=3')
    expect(eski.toString()).toBe('q=atay&kitap=7')
  })
  it('riffle gecikmesini sınırlar', () => {
    expect(riffleGecikmesi(0, 0.9)).toBe(0.9)
    expect(riffleGecikmesi(2, 0.9)).toBe(1.02)
    expect(riffleGecikmesi(80, 0)).toBe(riffleGecikmesi(16, 0))
  })
  it('geç kurulan fiş kalan süreyi bekler, sırası geçtiyse hemen düşer', () => {
    expect(kalanGecikme(0, 0.9, 0.4)).toBe(0.5)
    expect(kalanGecikme(2, 0.08, 5)).toBeCloseTo(0.06)
    expect(kalanGecikme(30, 0.08, 5)).toBeCloseTo(0.24)
  })
})
