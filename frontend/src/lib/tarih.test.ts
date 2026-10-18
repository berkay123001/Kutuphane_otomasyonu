import {
  ayYil, bugunIso, damgaTarihi, gunAy, gunEkle, gunFarki, haftaninGunu, kisaTarih,
  noktaliTarih, parcala, saat, uzunTarih, zamandanIso,
} from './tarih'

describe('tarih', () => {
  it('bugünü İstanbul saatine göre verir', () => {
    // 2026-10-17 21:30 UTC = 18 Ekim 00:30 İstanbul
    expect(bugunIso(new Date('2026-10-17T21:30:00Z'))).toBe('2026-10-18')
    expect(zamandanIso('2026-10-17T20:59:00Z')).toBe('2026-10-17')
  })

  it('gün ekler ve ay/yıl sınırlarını geçer', () => {
    expect(gunEkle('2026-10-17', 14)).toBe('2026-10-31')
    expect(gunEkle('2026-10-17', 21)).toBe('2026-11-07')
    expect(gunEkle('2026-12-30', 3)).toBe('2027-01-02')
    expect(gunEkle('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('gün farkını hesaplar', () => {
    expect(gunFarki('2026-10-08', '2026-10-17')).toBe(9)
    expect(gunFarki('2026-10-17', '2026-10-15')).toBe(-2)
  })

  it('Türkçe biçimler üretir', () => {
    expect(haftaninGunu('2026-10-17')).toBe('Cumartesi')
    expect(uzunTarih('2026-10-17')).toBe('17 Ekim 2026')
    expect(gunAy('2026-10-17')).toBe('17 Ekim')
    expect(damgaTarihi('2026-10-31')).toBe('31 EKİ 2026')
    expect(damgaTarihi('2026-11-07')).toBe('07 KAS 2026')
    expect(kisaTarih('2026-11-07')).toBe('07.11')
    expect(noktaliTarih('2026-10-24')).toBe('24.10.2026')
    expect(ayYil('2023-09-01')).toBe('Eyl 2023')
  })

  it('saati İstanbul saatine göre gösterir', () => {
    expect(saat('2026-10-17T11:52:00Z')).toBe('14:52')
  })

  it('geçersiz tarihte hata verir', () => {
    expect(() => parcala('dün')).toThrow('Geçersiz tarih')
  })
})
