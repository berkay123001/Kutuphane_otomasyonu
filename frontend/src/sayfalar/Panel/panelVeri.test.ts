import {
  HATIRLATMA_ANAHTARI,
  cekmeceGecikmesi,
  defterNo,
  defterNotu,
  desteKartlari,
  enEskiGecikme,
  gecikenToplami,
  gecikmeAyrintisi,
  hareketDamgasi,
  hatirlatilanlariOku,
  hatirlatilanlariYaz,
  hatirlatmaDegistir,
  hatirlatmaDurumu,
  otomatikKategori,
  ozetCumlesi,
  satirZamani,
  sayacFisleri,
  toplamKopya,
} from './panelVeri'

const bugun = { odunc: 48, iade: 31, gecikmis: 12, yeniUye: 5 }

describe('hareket damgaları', () => {
  it('her hareket tipini doğru metin ve mürekkeple eşler', () => {
    expect(hareketDamgasi('ODUNC')).toEqual({ metin: 'Ödünç', murekkep: 'v' })
    expect(hareketDamgasi('IADE')).toEqual({ metin: 'İade', murekkep: 'k' })
    expect(hareketDamgasi('GEC_IADE')).toEqual({ metin: 'Geç iade', murekkep: 'r' })
    expect(hareketDamgasi('UZATMA')).toEqual({ metin: 'Uzatma', murekkep: 'v' })
    expect(hareketDamgasi('AYIRTMA')).toEqual({ metin: 'Ayırtma', murekkep: 'k' })
  })

  it('satır zamanlaması tasarımdaki adımları izler ve eğimler döner', () => {
    expect(satirZamani(0)).toEqual({ satir: 1.7, damga: 2.15, egim: -4 })
    expect(satirZamani(1)).toEqual({ satir: 1.92, damga: 2.37, egim: 3 })
    expect(satirZamani(6).egim).toBe(-4)
  })

  it('defter notu satır sayısını söyler', () => {
    expect(defterNotu(6)).toBe('Son 6 hareket · en yenisi üstte')
    expect(defterNotu(0)).toBe('Henüz hareket yok')
  })

  it('defter numarası yılın kaçıncı günü, dört hane', () => {
    expect(defterNo('2026-01-01')).toBe('0001')
    expect(defterNo('2026-10-18')).toBe('0291')
    expect(defterNo('2024-12-31')).toBe('0366')
  })
})

describe('bugünün çekmecesi', () => {
  it('daktilo cümlesini kurar', () => {
    expect(ozetCumlesi(bugun)).toBe('Bugün 48 fiş kesildi, 31 kitap döndü.')
  })

  it('en eski gecikmeyi bulur, liste boşsa yok der', () => {
    expect(enEskiGecikme([{ gecikmeGunu: 2 }, { gecikmeGunu: 9 }, { gecikmeGunu: 4 }])).toBe(9)
    expect(enEskiGecikme([])).toBeNull()
    expect(gecikmeAyrintisi([{ gecikmeGunu: 9 }])).toBe('en eskisi 9 gün')
    expect(gecikmeAyrintisi([])).toBe('gecikme yok')
  })

  it('geciken toplamı sayaç ile listenin büyüğüdür', () => {
    expect(gecikenToplami({ bugun, gecikenler: [] })).toBe(12)
    expect(gecikenToplami({ bugun: { ...bugun, gecikmis: 0 }, gecikenler: [{ gecikmeGunu: 1 }] })).toBe(1)
  })

  it('dört sayaç fişini doğru hedeflerle üretir', () => {
    const fisler = sayacFisleri({ bugun, gecikenler: [{ gecikmeGunu: 9 }] })
    expect(fisler.map((f) => f.deger)).toEqual([48, 31, 12, 5])
    expect(fisler.map((f) => f.hedef)).toEqual([
      { tur: 'rota', yol: '/odunc' },
      { tur: 'rota', yol: '/katalog' },
      { tur: 'capa', id: 'gecikenler' },
      { tur: 'rota', yol: '/uyeler' },
    ])
    expect(fisler[2]).toMatchObject({ kirmizi: true, ayrinti: 'en eskisi 9 gün' })
  })
})

describe('gecikenler destesi', () => {
  it('ilk dört fişi alır, en çok geciken en önde (sonda) durur', () => {
    expect(desteKartlari([9, 6, 4, 2, 1])).toEqual([2, 4, 6, 9])
    expect(desteKartlari([3])).toEqual([3])
  })

  it('işaretleri değiştirir: hepsi işaretliyse kaldırır, değilse ekler', () => {
    const gecerli = [1, 2, 3, 4, 5]
    expect(hatirlatmaDegistir([], [1, 2], gecerli)).toEqual([1, 2])
    expect(hatirlatmaDegistir([1], [1, 2], gecerli)).toEqual([1, 2])
    expect(hatirlatmaDegistir([1, 2, 5], [1, 2], gecerli)).toEqual([5])
  })

  it('artık gecikmede olmayan ödünçleri ayıklar', () => {
    expect(hatirlatmaDegistir([7, 8], [1], [1, 8])).toEqual([8, 1])
  })

  it('düğme etiketi bekleyen farklı kişileri sayar', () => {
    const kartlar = [
      { id: 1, uyeId: 10 },
      { id: 2, uyeId: 10 },
      { id: 3, uyeId: 11 },
    ]
    expect(hatirlatmaDurumu(kartlar, [])).toEqual({
      hepsiIsaretli: false,
      kisiSayisi: 2,
      etiket: '2 kişiyi hatırlatıldı olarak işaretle',
    })
    expect(hatirlatmaDurumu(kartlar, [1, 2]).kisiSayisi).toBe(1)
    expect(hatirlatmaDurumu(kartlar, [1, 2, 3])).toMatchObject({ hepsiIsaretli: true, etiket: 'İşaretleri kaldır' })
    expect(hatirlatmaDurumu([], []).hepsiIsaretli).toBe(false)
  })

  it('işaretleri depoya yazar ve geri okur', () => {
    expect(hatirlatilanlariYaz(localStorage, [3, 4])).toBe(true)
    expect(localStorage.getItem(HATIRLATMA_ANAHTARI)).toBe('[3,4]')
    expect(hatirlatilanlariOku(localStorage)).toEqual([3, 4])
  })

  it('bozuk ya da şemaya uymayan kayıtları yok sayar', () => {
    localStorage.setItem(HATIRLATMA_ANAHTARI, '{bozuk')
    expect(hatirlatilanlariOku(localStorage)).toEqual([])
    localStorage.setItem(HATIRLATMA_ANAHTARI, '["a", -1]')
    expect(hatirlatilanlariOku(localStorage)).toEqual([])
    expect(hatirlatilanlariOku(null)).toEqual([])
    expect(hatirlatilanlariYaz(null, [1])).toBe(false)
  })

  it('depo hata fırlatırsa sessizce vazgeçer', () => {
    const bozukDepo = {
      getItem: () => {
        throw new Error('erişim yok')
      },
      setItem: () => {
        throw new Error('dolu')
      },
    }
    expect(hatirlatilanlariOku(bozukDepo)).toEqual([])
    expect(hatirlatilanlariYaz(bozukDepo, [1])).toBe(false)
  })
})

describe('koleksiyon dolabı', () => {
  const kategoriler = [
    { id: 1, kopyaSayisi: 120 },
    { id: 9, kopyaSayisi: 892 },
    { id: 4, kopyaSayisi: 892 },
  ]

  it('en çok kopyalı çekmeceyi seçer, eşitlikte ilkini', () => {
    expect(otomatikKategori(kategoriler)).toBe(9)
  })

  it('boş ya da kopyasız dolapta seçim yapmaz', () => {
    expect(otomatikKategori([])).toBeNull()
    expect(otomatikKategori([{ id: 1, kopyaSayisi: 0 }])).toBeNull()
  })

  it('toplam kopyayı sayar', () => {
    expect(toplamKopya(kategoriler)).toBe(1904)
  })

  it('çapraz dalga gecikmesi', () => {
    expect(cekmeceGecikmesi(0)).toBe(1.3)
    expect(cekmeceGecikmesi(4)).toBe(1.58)
    expect(cekmeceGecikmesi(5)).toBe(1.37)
    expect(cekmeceGecikmesi(9)).toBe(1.65)
  })
})
