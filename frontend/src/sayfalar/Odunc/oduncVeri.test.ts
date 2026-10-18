import { ApiHatasi } from '../../api/istemci'
import {
  bulunmaEki, damgaIpucu, ELINDE_VAR, eskiDamgalar, fisNo, idCoz, kayitSatirlari, konumMetni,
  kopyaGorunumu, kopyaNumarasi, kunyeSatiri, listeDamgasi, okuyucuAltSatiri, rezervasyonOnerilir,
  siradaMi, tarihBantlari, tumEngeller, verilecekKopyaId, yerParcalari, type KitapKopyasi,
} from './oduncVeri'

const uyeOzet = (id: number, ad: string, soyad: string) => ({ id, uyeNo: `Ü-${id}`, ad, soyad })

const kopya = (id: number, degisim: Partial<KitapKopyasi> = {}): KitapKopyasi => ({
  id,
  barkod: `004217-${id}`,
  kitapId: 1,
  blok: 'B',
  rafNo: 14,
  durum: 'RAFTA',
  aktifOdunc: null,
  ayrilanRezervasyon: null,
  ...degisim,
})

const oduncte = (id: number, sonTeslimTarihi: string, uyeId = 3): KitapKopyasi =>
  kopya(id, {
    durum: 'ODUNCTE',
    aktifOdunc: { id: 90 + id, verilisZamani: '2026-10-01T09:00:00Z', sonTeslimTarihi, uye: uyeOzet(uyeId, 'Kerem', 'Yıldız') },
  })

const ayrildi = (id: number, uyeId: number, sonGecerlilik: string | null = '2026-10-19'): KitapKopyasi =>
  kopya(id, { durum: 'AYRILDI', ayrilanRezervasyon: { id: 5, sonGecerlilik, uye: uyeOzet(uyeId, 'Ayşe', 'Kaya') } })

describe('idCoz', () => {
  it('yalnızca pozitif tam sayıları kabul eder', () => {
    expect(idCoz('7')).toBe(7)
    expect(idCoz('0')).toBeNull()
    expect(idCoz('-2')).toBeNull()
    expect(idCoz('1.5')).toBeNull()
    expect(idCoz('abc')).toBeNull()
    expect(idCoz(null)).toBeNull()
    expect(idCoz(undefined)).toBeNull()
  })
})

describe('verilecekKopyaId', () => {
  it('raftaki ilk kopyayı id sırasıyla seçer', () => {
    expect(verilecekKopyaId([oduncte(1, '2026-10-24'), kopya(3), kopya(2)], null)).toBe(2)
  })

  it('üyeye ayrılmış kopyayı raftakilere tercih eder', () => {
    expect(verilecekKopyaId([kopya(1), ayrildi(2, 7)], 7)).toBe(2)
  })

  it('başka üyeye ayrılmış kopyayı atlar', () => {
    expect(verilecekKopyaId([ayrildi(1, 4), kopya(2)], 7)).toBe(2)
  })

  it('verilebilecek kopya yoksa null döner', () => {
    expect(verilecekKopyaId([oduncte(1, '2026-10-24'), ayrildi(2, 4)], 7)).toBeNull()
    expect(verilecekKopyaId([], null)).toBeNull()
  })
})

describe('konumMetni', () => {
  it('blok ve rafı birleştirir, eksikleri atlar', () => {
    expect(konumMetni({ blok: 'B', rafNo: 14 })).toBe('B Blok · Raf 14')
    expect(konumMetni({ blok: null, rafNo: 3 })).toBe('Raf 3')
    expect(konumMetni({ blok: null, rafNo: null })).toBe('Konum belirtilmemiş')
  })
})

describe('bulunmaEki', () => {
  it('ünlü uyumu ve sertleşmeye uyar', () => {
    expect(bulunmaEki('Kerem Yıldız')).toBe('Kerem Yıldız’da')
    expect(bulunmaEki('Elif Demirci')).toBe('Elif Demirci’de')
    expect(bulunmaEki('Ayşe Kaya')).toBe('Ayşe Kaya’da')
    expect(bulunmaEki('Burak Şahin')).toBe('Burak Şahin’de')
    expect(bulunmaEki('Ali Öztürk')).toBe('Ali Öztürk’te')
    expect(bulunmaEki('Zeynep Koç')).toBe('Zeynep Koç’ta')
    expect(bulunmaEki('İLKAY IŞIK')).toBe('İLKAY IŞIK’ta')
  })
})

describe('kopyaGorunumu', () => {
  const bugun = '2026-10-18'

  it('raftaki kopya mor "Rafta" damgası ve konumla görünür', () => {
    expect(kopyaGorunumu(kopya(1), bugun, null)).toEqual({
      satir: 'B Blok · Raf 14', damga: 'Rafta', murekkep: 'v', soluk: false, vur: false,
    })
  })

  it('ödünçteki kopya kimde olduğunu ve son günü gösterir', () => {
    const g = kopyaGorunumu(oduncte(2, '2026-10-24'), bugun, null)
    expect(g).toMatchObject({ satir: 'Kerem Yıldız’da', damga: 'Ödünçte · 24.10', murekkep: 'k', soluk: true })
  })

  it('son günü geçmiş kopya kırmızı "Gecikmiş" damgası alır', () => {
    expect(kopyaGorunumu(oduncte(2, '2026-10-17'), bugun, null)).toMatchObject({
      damga: 'Gecikmiş · 17.10', murekkep: 'r',
    })
    expect(kopyaGorunumu(oduncte(2, '2026-10-18'), bugun, null).murekkep).toBe('k')
  })

  it('ayrılmış kopya kimin adına ve ne zamana kadar olduğunu gösterir', () => {
    expect(kopyaGorunumu(ayrildi(3, 4), bugun, null)).toMatchObject({
      satir: 'Ayşe Kaya adına', damga: 'Ayrıldı · 19.10', murekkep: 'k', soluk: true,
    })
    expect(kopyaGorunumu(ayrildi(3, 4, null), bugun, null).damga).toBe('Ayrıldı')
  })

  it('az önce verilen kopya yeni son günle mor damga vurur', () => {
    const verilen = { kopyaId: 1, sonGun: '2026-11-01' }
    expect(kopyaGorunumu(oduncte(1, '2026-11-01'), bugun, verilen)).toEqual({
      satir: 'B Blok · Raf 14', damga: 'Ödünçte · 01.11', murekkep: 'v', soluk: false, vur: 1.05,
    })
    expect(kopyaGorunumu(kopya(2), bugun, verilen).damga).toBe('Rafta')
  })
})

describe('tarihBantlari', () => {
  it('günü onlar/birler, ayı sıra olarak verir', () => {
    expect(tarihBantlari('2026-10-31')).toEqual({ onlar: 3, birler: 1, ayIndex: 9, yil: 2026 })
    expect(tarihBantlari('2026-11-07')).toEqual({ onlar: 0, birler: 7, ayIndex: 10, yil: 2026 })
    expect(tarihBantlari('2027-01-20')).toEqual({ onlar: 2, birler: 0, ayIndex: 0, yil: 2027 })
  })
})

describe('kayitSatirlari ve künye', () => {
  const kitap = {
    baslik: 'Tutunamayanlar',
    yazar: 'Oğuz Atay',
    yayinevi: 'İletişim Yayınları',
    yayinYili: 1972,
    kategori: { id: 8, kod: '800', ad: 'Türk edebiyatı' },
  }

  it('fişin üç satırını üretir', () => {
    expect(kayitSatirlari(kitap)).toEqual([
      'Oğuz Atay.',
      'Tutunamayanlar / Oğuz Atay. — İletişim Yayınları, 1972.',
      '1. Türk edebiyatı.  I. Başlık.',
    ])
  })

  it('eksik yayın bilgisini ve çift noktayı temizler', () => {
    const satirlar = kayitSatirlari({ ...kitap, yazar: 'A. B. Yazar.', yayinevi: null, yayinYili: null })
    expect(satirlar[0]).toBe('A. B. Yazar.')
    expect(satirlar[1]).toBe('Tutunamayanlar / A. B. Yazar.')
  })

  it('künye satırı yazar, yayınevi ve kopya sayısını birleştirir', () => {
    expect(kunyeSatiri({ yazar: 'Oğuz Atay', yayinevi: 'İletişim', kopyalar: [kopya(1), kopya(2)] })).toBe(
      'Oğuz Atay · İletişim · 2 kopya',
    )
    expect(kunyeSatiri({ yazar: 'Oğuz Atay', yayinevi: null, kopyalar: [] })).toBe('Oğuz Atay · 0 kopya')
  })

  it('yer numarasını iki satıra böler', () => {
    expect(yerParcalari('894.353 ATA·T')).toEqual(['894.353', 'ATA·T'])
    expect(yerParcalari('894.353')).toEqual(['894.353', ''])
    expect(yerParcalari(null)).toEqual(['—', ''])
  })
})

describe('eskiDamgalar', () => {
  it('son dört iadeyi eskiden yeniye, sırayla mürekkep ve eğimle dizer', () => {
    const gecmis = ['2026-09-21', '2026-08-29', '2026-07-03', '2026-06-12', '2026-05-01'].map((t, i) => ({
      id: i + 1,
      sonTeslimTarihi: t,
    }))
    const damgalar = eskiDamgalar(gecmis)
    expect(damgalar.map((d) => d.metin)).toEqual(['12 HAZ 2026', '03 TEM 2026', '29 AĞU 2026', '21 EYL 2026'])
    expect(damgalar.map((d) => d.murekkep)).toEqual(['k', 'v', 'k', 'v'])
    expect(damgalar[0]).toMatchObject({ anahtar: 4, egim: -3, saydamlik: 0.5 })
    expect(gecmis[0]?.sonTeslimTarihi).toBe('2026-09-21')
  })

  it('geçmiş boşsa damga yok', () => {
    expect(eskiDamgalar([])).toEqual([])
  })
})

describe('engeller ve rezervasyon', () => {
  it('kitabın bir kopyası üyedeyse engel ekler', () => {
    expect(tumEngeller({ id: 3, oduncEngelleri: [] }, [oduncte(1, '2026-10-24', 3)])).toEqual([ELINDE_VAR])
    expect(tumEngeller({ id: 7, oduncEngelleri: ['Ödenmemiş cezası var'] }, [oduncte(1, '2026-10-24', 3)])).toEqual([
      'Ödenmemiş cezası var',
    ])
  })

  it('üyenin bu kitap için açık rezervasyonunu bulur', () => {
    const r = { id: 1, uyeId: 7, kitapId: 1, kopyaId: null, olusturmaZamani: '', sonGecerlilik: null, durum: 'BEKLIYOR' as const }
    const rezervasyonlar = [{ ...r, kitap: { id: 1, baslik: 'T', yazar: 'Y', yerNumarasi: null } }]
    expect(siradaMi({ rezervasyonlar }, 1)).toBe(true)
    expect(siradaMi({ rezervasyonlar }, 2)).toBe(false)
  })

  it('yalnızca 409 rezervasyon önerisinde ayırtma teklif eder', () => {
    expect(rezervasyonOnerilir(new ApiHatasi(409, 'Rafta uygun kopya yok; rezervasyon yapabilirsiniz'))).toBe(true)
    expect(rezervasyonOnerilir(new ApiHatasi(409, 'Üyenin elinde bu kitabın bir kopyası zaten var'))).toBe(false)
    expect(rezervasyonOnerilir(new ApiHatasi(422, 'Bu üyeye ödünç verilemez'))).toBe(false)
    expect(rezervasyonOnerilir(new Error('rezervasyon'))).toBe(false)
  })
})

describe('küçük biçimler', () => {
  it('okuyucu alt satırı', () => {
    expect(okuyucuAltSatiri({ tur: 'OGRENCI', bolum: 'Yazılım Müh.', istatistik: { aktifOduncSayisi: 2 } })).toBe(
      'Öğrenci · Yazılım Müh. · elinde 2 kitap',
    )
    expect(okuyucuAltSatiri({ tur: 'PERSONEL', bolum: null, istatistik: { aktifOduncSayisi: 0 } })).toBe(
      'Personel · elinde 0 kitap',
    )
  })

  it('damga ipucu düğmenin neden kapalı olduğunu söyler', () => {
    expect(damgaIpucu({ okuyucu: 'yok', engelSayisi: 0, verilecek: 'K.1' })).toBe('Önce okuyucuyu seç.')
    expect(damgaIpucu({ okuyucu: 'hazir', engelSayisi: 1, verilecek: 'K.1' })).toMatch(/Engeller/)
    expect(damgaIpucu({ okuyucu: 'hazir', engelSayisi: 0, verilecek: null })).toBe('Rafta verilebilecek kopya yok.')
    expect(damgaIpucu({ okuyucu: 'hazir', engelSayisi: 0, verilecek: 'K.1 · 004217-1' })).toBe(
      'K.1 · 004217-1 verilecek.',
    )
  })

  it('kopya numarası, liste damgası ve fiş numarası', () => {
    expect(kopyaNumarasi([kopya(5), kopya(9)], 9)).toBe('K.2')
    expect(kopyaNumarasi([kopya(5)], null)).toBe('—')
    expect(listeDamgasi({ kopyaSayisi: 3, raftakiKopyaSayisi: 1 })).toEqual({ metin: 'Rafta · 1/3', murekkep: 'v' })
    expect(listeDamgasi({ kopyaSayisi: 2, raftakiKopyaSayisi: 0 })).toEqual({ metin: 'Ödünçte', murekkep: 'k' })
    expect(listeDamgasi({ kopyaSayisi: 0, raftakiKopyaSayisi: 0 }).metin).toBe('Kopyasız')
    expect(fisNo(417)).toBe('0417')
    expect(fisNo(12345)).toBe('12345')
  })
})
