import { ApiHatasi } from '../../api/istemci'
import { gunEkle } from '../../lib/tarih'
import { BUGUN, ornekGecmis, ornekListeUyesi, ornekOdunc, ornekUye, zaman } from './test/ornekler'
import {
  BARKOD_CIZGI_SAYISI, BOS_FORM, aktifFiltresi, altBaslik, barkodCizgileri, basDamgalari, cezaToplami,
  formuCoz, gecerlilikMetni, gunGostergesi, gunKareleri, gunModeli, imza, kartDamgalari, kartDurumu,
  kimlikCoz, kotaDilimleri, oduncleriSirala, rafKitaplari, sirtOlcusu, sirtYaziRengi, sunucuAlanHatalari,
  tarihKismi, uzatilabilir, uyelikAyi,
} from './uyeVeri'

describe('gün modeli', () => {
  it('geçen ve kalan günleri sayar', () => {
    expect(gunModeli(ornekOdunc(1, 'A', -9, 5), BUGUN)).toEqual({ kullanilan: 9, kalan: 5, gecikme: 0, toplam: 14 })
  })

  it('bugün verilen kitapta hiç gün geçmemiştir', () => {
    expect(gunModeli(ornekOdunc(1, 'A', 0, 21), BUGUN)).toEqual({ kullanilan: 0, kalan: 21, gecikme: 0, toplam: 21 })
  })

  it('gecikmede kullanılan toplamı aşmaz, gecikme sunucudan gelir', () => {
    expect(gunModeli(ornekOdunc(1, 'A', -16, -2), BUGUN)).toEqual({ kullanilan: 14, kalan: 0, gecikme: 2, toplam: 14 })
  })

  it('eksi gecikme sıfır sayılır', () => {
    expect(gunModeli({ ...ornekOdunc(1, 'A', -1, 6), gecikmeGunu: -5 }, BUGUN).gecikme).toBe(0)
  })
})

describe('gün kareleri', () => {
  const ayar = { sira: 0, uzatildi: false, ilkToplam: 14 }

  it('her güne bir kare; bugün işaretli, sırayla gecikmeli', () => {
    const kareler = gunKareleri({ kullanilan: 9, kalan: 5, gecikme: 0, toplam: 14 }, ayar)
    expect(kareler).toHaveLength(14)
    expect(kareler.filter((k) => k.tur === 'kullanilan')).toHaveLength(9)
    expect(kareler.filter((k) => k.tur === 'kalan')).toHaveLength(5)
    expect(kareler.findIndex((k) => k.bugun)).toBe(9)
    expect(kareler[0]?.gecikmeSn).toBe(0.8)
    expect(kareler[2]?.gecikmeSn).toBe(0.87)
  })

  it('gecikmiş günler kırmızı eklenir, bugün işareti konmaz', () => {
    const kareler = gunKareleri({ kullanilan: 14, kalan: 0, gecikme: 2, toplam: 14 }, { ...ayar, sira: 2 })
    expect(kareler).toHaveLength(16)
    expect(kareler.slice(14).every((k) => k.tur === 'gecikme')).toBe(true)
    expect(kareler.some((k) => k.bugun)).toBe(false)
    expect(kareler[0]?.gecikmeSn).toBe(1.2)
  })

  it('uzatılan son 7 gün taze; sonradan eklenenler hızla belirir', () => {
    const kareler = gunKareleri({ kullanilan: 9, kalan: 12, gecikme: 0, toplam: 21 }, { ...ayar, uzatildi: true })
    expect(kareler.filter((k) => k.taze)).toHaveLength(7)
    expect(kareler[13]?.taze).toBe(false)
    expect(kareler[14]).toMatchObject({ taze: true, gecikmeSn: 0 })
    expect(kareler[16]?.gecikmeSn).toBe(0.12)
  })
})

describe('gün göstergesi ve uzatma', () => {
  it('gecikmede gecikme günü, yoksa kalan gün; 5 ve altı "yakın"', () => {
    expect(gunGostergesi({ kullanilan: 14, kalan: 0, gecikme: 3, toplam: 14 })).toEqual({ sayi: 3, etiket: 'gün gecikti', ton: 'gec' })
    expect(gunGostergesi({ kullanilan: 9, kalan: 5, gecikme: 0, toplam: 14 })).toEqual({ sayi: 5, etiket: 'gün kaldı', ton: 'yakin' })
    expect(gunGostergesi({ kullanilan: 1, kalan: 13, gecikme: 0, toplam: 14 }).ton).toBe('normal')
  })

  it('bir kez uzatılmış ya da gecikmiş ödünç uzatılamaz', () => {
    const m = { kullanilan: 2, kalan: 12, gecikme: 0, toplam: 14 }
    expect(uzatilabilir({ uzatildi: false }, m)).toBe(true)
    expect(uzatilabilir({ uzatildi: true }, m)).toBe(false)
    expect(uzatilabilir({ uzatildi: false }, { ...m, gecikme: 1 })).toBe(false)
  })

  it('en yeni verilen başa gelir', () => {
    const liste = [ornekOdunc(1, 'Eski', -10, 4), ornekOdunc(2, 'Yeni', 0, 14), ornekOdunc(3, 'Orta', -3, 11)]
    expect(oduncleriSirala(liste).map((o) => o.id)).toEqual([2, 3, 1])
  })
})

describe('okuyucu kartı', () => {
  it('barkod okuyucu numarasından kararlı türer', () => {
    const a = barkodCizgileri('Ü-2291')
    expect(a).toHaveLength(BARKOD_CIZGI_SAYISI)
    expect(barkodCizgileri('Ü-2291')).toEqual(a)
    expect(barkodCizgileri('Ü-0001')).not.toEqual(a)
    expect(a.every((c) => [2.2, 4.4, 6.6, 8.8].includes(c.genislik))).toBe(true)
    expect(a.map((c) => c.bosluk).slice(0, 4)).toEqual([false, true, false, true])
  })

  it('kart geçerliliği: geçerli, 30 gün içinde yaklaşıyor, geçmişse doldu', () => {
    expect(kartDurumu(gunEkle(BUGUN, 31), BUGUN)).toEqual({ durum: 'gecerli', kalanGun: 31 })
    expect(kartDurumu(gunEkle(BUGUN, 30), BUGUN).durum).toBe('yaklasiyor')
    expect(kartDurumu(BUGUN, BUGUN).durum).toBe('yaklasiyor')
    expect(kartDurumu(gunEkle(BUGUN, -1), BUGUN)).toEqual({ durum: 'doldu', kalanGun: -1 })
  })

  it('geçerlilik "AA / YYYY", imza "E. Soyad"', () => {
    expect(gecerlilikMetni('2027-09-30')).toBe('09 / 2027')
    expect(imza('elif', 'Demirci')).toBe('E. Demirci')
    expect(imza(' ', 'Demirci')).toBe('Demirci')
  })

  it('kota dilimleri beşte sınırlıdır', () => {
    expect(kotaDilimleri(3)).toEqual([true, true, true, false, false])
    expect(kotaDilimleri(7)).toEqual([true, true, true, true, true])
    expect(kotaDilimleri(0).some(Boolean)).toBe(false)
  })

  it('ceza toplamı kuruş hatası yapmaz', () => {
    expect(cezaToplami([{ tutar: 0.1 }, { tutar: 0.2 }, { tutar: 4 }])).toBe(4.3)
    expect(cezaToplami([])).toBe(0)
  })
})

describe('metinler ve damgalar', () => {
  it('alt başlık ve üyelik ayı', () => {
    expect(altBaslik(ornekUye())).toBe('Ü-2291 · Öğrenci · Yazılım Mühendisliği · 2023 yılından beri üye')
    expect(altBaslik(ornekUye({ tur: 'PERSONEL', bolum: null }))).toContain('Personel · — ·')
    expect(uyelikAyi('2023-09-12')).toBe('Eyl 2023')
  })

  it('zaman damgası İstanbul gününe, rota parametresi kimliğe çevrilir', () => {
    expect(tarihKismi('2026-10-17')).toBe('2026-10-17')
    expect(tarihKismi('2026-10-16T22:30:00.000Z')).toBe('2026-10-17')
    expect(kimlikCoz('42')).toBe(42)
    expect(kimlikCoz('0')).toBeNull()
    expect(kimlikCoz('abc')).toBeNull()
    expect(kimlikCoz(undefined)).toBeNull()
  })

  it('başlık damgaları: aktif/pasif, gecikme, süresi dolan kart', () => {
    expect(basDamgalari(ornekUye(), BUGUN).map((d) => d.metin)).toEqual(['Aktif', '1 gecikme'])
    const pasif = ornekUye({
      aktif: false,
      kartGecerlilik: gunEkle(BUGUN, -2),
      istatistik: { aktifOduncSayisi: 0, gecikmisOduncSayisi: 0, okunanKitapSayisi: 0, odenmemisCezaSayisi: 0 },
    })
    expect(basDamgalari(pasif, BUGUN)).toEqual([
      { metin: 'Pasif', murekkep: 'lr' },
      { metin: 'Kart süresi doldu', murekkep: 'lr' },
    ])
  })

  it('mini kart damgaları kâğıt mürekkebiyle', () => {
    expect(kartDamgalari(ornekListeUyesi(), BUGUN)).toEqual([])
    expect(kartDamgalari(ornekListeUyesi({ aktif: false, kartGecerlilik: gunEkle(BUGUN, -1) }), BUGUN)).toEqual([
      { metin: 'Kart süresi doldu', murekkep: 'r' },
      { metin: 'Pasif', murekkep: 'r' },
    ])
  })

  it('aktif filtresi yalnızca true/false tanır', () => {
    expect(aktifFiltresi('true')).toBe(true)
    expect(aktifFiltresi('false')).toBe(false)
    expect(aktifFiltresi('evet')).toBeUndefined()
    expect(aktifFiltresi(null)).toBeUndefined()
  })
})

describe('okuma rafı', () => {
  it('iade edilmişleri eskiden yeniye dizer, ay/yıl ve renk verir', () => {
    const raf = rafKitaplari([
      ornekGecmis(2, 'Kara Kitap', '2024-01-10T10:00:00.000Z'),
      { ...ornekGecmis(3, 'Yarım', zaman(0)), iadeZamani: null },
      ornekGecmis(1, 'Beyaz Kale', '2023-09-20T10:00:00.000Z'),
    ])
    expect(raf.map((k) => k.baslik)).toEqual(['Beyaz Kale', 'Kara Kitap'])
    expect(raf[0]).toMatchObject({ id: 1, kitapId: 501, tarih: 'Eyl 2023', gecikmeSn: 0.7 })
    expect(raf[1]?.gecikmeSn).toBe(0.77)
    expect(raf[0]?.renk).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('sırt ölçüleri tasarımdaki dört boy/en arasından', () => {
    const { yukseklik, genislik } = sirtOlcusu('Huzur#4')
    expect([196, 214, 232, 178]).toContain(yukseklik)
    expect([34, 42, 50, 30]).toContain(genislik)
    expect(sirtOlcusu('Huzur#4')).toEqual({ yukseklik, genislik })
  })

  it('sırt yazısı zemine göre okunur renk seçer', () => {
    expect(sirtYaziRengi('#CDBE98')).toBe('#1D1B16')
    expect(sirtYaziRengi('#27395A')).toBe('#EAD9A4')
    expect(sirtYaziRengi('#1E1C18')).toBe('#D9B45F')
  })
})

describe('yeni üye formu', () => {
  it('geçerli formu kırpar, boş isteğe bağlı alanları göndermez', () => {
    const sonuc = formuCoz({ ...BOS_FORM, ad: '  Can ', soyad: 'Yılmaz', eposta: ' can@ornek.tr ' })
    expect(sonuc).toEqual({ tamam: true, veri: { ad: 'Can', soyad: 'Yılmaz', tur: 'OGRENCI', eposta: 'can@ornek.tr' } })
  })

  it('zorunlu alanları, e-postayı ve uzunlukları denetler', () => {
    const sonuc = formuCoz({ ...BOS_FORM, ad: ' ', eposta: 'can@', telefon: '1'.repeat(31), bolum: 'b'.repeat(101) })
    expect(sonuc).toEqual({
      tamam: false,
      hatalar: {
        ad: 'Ad gerekli',
        soyad: 'Soyad gerekli',
        bolum: 'Bölüm en fazla 100 karakter olabilir',
        eposta: 'Geçerli bir e-posta girin',
        telefon: 'Telefon en fazla 30 karakter olabilir',
      },
    })
  })

  it('ad 100 karakteri aşamaz', () => {
    const sonuc = formuCoz({ ...BOS_FORM, ad: 'a'.repeat(101), soyad: 'B' })
    expect(sonuc.tamam).toBe(false)
    if (!sonuc.tamam) expect(sonuc.hatalar.ad).toBe('Ad en fazla 100 karakter olabilir')
  })

  it('sunucunun 400 alan hatalarını forma taşır', () => {
    const hata = new ApiHatasi(400, 'Geçersiz istek', {
      formErrors: [],
      fieldErrors: { eposta: ['Geçerli bir e-posta girin'], bilinmeyen: ['x'] },
    })
    expect(sunucuAlanHatalari(hata)).toEqual({ eposta: 'Geçerli bir e-posta girin' })
    expect(sunucuAlanHatalari(new ApiHatasi(422, 'Kural'))).toEqual({})
    expect(sunucuAlanHatalari(new Error('x'))).toEqual({})
  })
})
