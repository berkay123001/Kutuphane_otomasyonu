import { describe, expect, it } from 'vitest'
import { bugun, gunEkle, gunFarki } from '../src/tarih.js'
import {
  KURALLAR,
  cezaTutari,
  gecikmeGunu,
  oduncEngelleri,
  rezervasyonEngelleri,
  uzatmaEngeli,
  type UyeDurumu,
} from '../src/kurallar.js'

describe('tarih', () => {
  it('bugünü İstanbul saatine göre YYYY-MM-DD verir', () => {
    // UTC 22:30 → İstanbul'da ertesi gün 01:30
    expect(bugun(new Date('2026-10-17T22:30:00Z'))).toBe('2026-10-18')
    expect(bugun(new Date('2026-10-17T20:00:00Z'))).toBe('2026-10-17')
  })

  it('gün ekler; ay ve yıl geçişlerini doğru yapar', () => {
    expect(gunEkle('2026-10-17', 14)).toBe('2026-10-31')
    expect(gunEkle('2026-10-25', 7)).toBe('2026-11-01')
    expect(gunEkle('2026-12-30', 3)).toBe('2027-01-02')
    expect(gunEkle('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('iki tarih arasındaki gün farkını verir', () => {
    expect(gunFarki('2026-10-15', '2026-10-17')).toBe(2)
    expect(gunFarki('2026-10-17', '2026-10-15')).toBe(-2)
    expect(gunFarki('2026-10-17', '2026-10-17')).toBe(0)
  })
})

describe('gecikme ve ceza', () => {
  it('son teslim günü geçmediyse gecikme 0', () => {
    expect(gecikmeGunu('2026-10-20', '2026-10-17')).toBe(0)
    expect(gecikmeGunu('2026-10-17', '2026-10-17')).toBe(0)
  })

  it('son teslimden sonraki her gün gecikme sayılır', () => {
    expect(gecikmeGunu('2026-10-15', '2026-10-17')).toBe(2)
  })

  it('ceza gecikme günü × günlük ücret', () => {
    expect(cezaTutari(0)).toBe(0)
    expect(cezaTutari(4)).toBe(4 * KURALLAR.gunlukCezaTl)
  })
})

describe('oduncEngelleri', () => {
  const temiz: UyeDurumu = {
    aktif: true,
    kartGecerlilik: '2027-09-01',
    aktifOduncSayisi: 0,
    gecikmisOduncSayisi: 0,
    odenmemisCezaSayisi: 0,
  }
  const bugunTarih = '2026-10-17'

  it('her şey yolundaysa engel yok', () => {
    expect(oduncEngelleri(temiz, bugunTarih)).toEqual([])
  })

  it('pasif üye alamaz', () => {
    expect(oduncEngelleri({ ...temiz, aktif: false }, bugunTarih)).toHaveLength(1)
  })

  it('kartı dolmuş üye alamaz, son gün hâlâ geçerlidir', () => {
    expect(oduncEngelleri({ ...temiz, kartGecerlilik: '2026-10-16' }, bugunTarih)).toHaveLength(1)
    expect(oduncEngelleri({ ...temiz, kartGecerlilik: '2026-10-17' }, bugunTarih)).toEqual([])
  })

  it('kota doluysa alamaz', () => {
    const dolu = { ...temiz, aktifOduncSayisi: KURALLAR.maksimumOdunc }
    expect(oduncEngelleri(dolu, bugunTarih)).toHaveLength(1)
    const birEksik = { ...temiz, aktifOduncSayisi: KURALLAR.maksimumOdunc - 1 }
    expect(oduncEngelleri(birEksik, bugunTarih)).toEqual([])
  })

  it('gecikmiş kitabı veya ödenmemiş cezası varsa alamaz', () => {
    expect(oduncEngelleri({ ...temiz, gecikmisOduncSayisi: 1 }, bugunTarih)).toHaveLength(1)
    expect(oduncEngelleri({ ...temiz, odenmemisCezaSayisi: 1 }, bugunTarih)).toHaveLength(1)
  })

  it('birden fazla engeli birlikte listeler', () => {
    const kotu = { ...temiz, aktif: false, gecikmisOduncSayisi: 2, odenmemisCezaSayisi: 1 }
    expect(oduncEngelleri(kotu, bugunTarih)).toHaveLength(3)
  })
})

describe('rezervasyonEngelleri', () => {
  const dolu: UyeDurumu = {
    aktif: true,
    kartGecerlilik: '2027-09-01',
    aktifOduncSayisi: KURALLAR.maksimumOdunc,
    gecikmisOduncSayisi: 0,
    odenmemisCezaSayisi: 0,
  }

  it('kotası dolu üye rezervasyon yapabilir', () => {
    expect(rezervasyonEngelleri(dolu, '2026-10-17')).toEqual([])
  })

  it('gecikmesi ya da cezası olan yapamaz', () => {
    expect(rezervasyonEngelleri({ ...dolu, gecikmisOduncSayisi: 1 }, '2026-10-17')).toHaveLength(1)
    expect(rezervasyonEngelleri({ ...dolu, odenmemisCezaSayisi: 1 }, '2026-10-17')).toHaveLength(1)
  })
})

describe('uzatmaEngeli', () => {
  const uygun = {
    iadeEdildi: false,
    uzatildi: false,
    sonTeslimTarihi: '2026-10-20',
    bekleyenRezervasyonVar: false,
  }
  const bugunTarih = '2026-10-17'

  it('uygun ödünç uzatılabilir', () => {
    expect(uzatmaEngeli(uygun, bugunTarih)).toBeNull()
  })

  it('son teslim günü bugünse hâlâ uzatılabilir', () => {
    expect(uzatmaEngeli({ ...uygun, sonTeslimTarihi: bugunTarih }, bugunTarih)).toBeNull()
  })

  it.each([
    ['iade edilmiş', { iadeEdildi: true }],
    ['daha önce uzatılmış', { uzatildi: true }],
    ['gecikmiş', { sonTeslimTarihi: '2026-10-16' }],
    ['bekleyen rezervasyon var', { bekleyenRezervasyonVar: true }],
  ])('%s ise uzatılamaz', (_ad, degisiklik) => {
    expect(uzatmaEngeli({ ...uygun, ...degisiklik }, bugunTarih)).toEqual(expect.any(String))
  })
})
