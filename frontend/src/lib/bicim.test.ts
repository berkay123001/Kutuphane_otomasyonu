import { SIRT_RENKLERI, basHarfler, karma, kucuk, para, sayi, sirtRengi, tamAd } from './bicim'

describe('biçim', () => {
  it('sayıları Türkçe biçimler', () => {
    expect(sayi(33774)).toBe('33.774')
    expect(para(12)).toMatch(/12,00/)
  })

  it('baş harfleri Türkçe büyük harfle verir', () => {
    expect(basHarfler('elif', 'demirci')).toBe('ED')
    expect(basHarfler('ilker', 'şahin')).toBe('İŞ')
    expect(basHarfler('Selin')).toBe('S')
  })

  it('tam ad üretir', () => {
    expect(tamAd({ ad: 'Elif', soyad: 'Demirci' })).toBe('Elif Demirci')
  })

  it('karma kararlıdır ve sırt rengi paletten gelir', () => {
    expect(karma('Tutunamayanlar')).toBe(karma('Tutunamayanlar'))
    expect(karma('a')).not.toBe(karma('b'))
    expect(SIRT_RENKLERI).toContain(sirtRengi('Kozmos'))
  })

  it('Türkçe küçük harfe çevirir', () => {
    expect(kucuk('İNCE MEMED')).toBe('ince memed')
  })
})
