import { adimAt, kareNo } from './kareler'
import { kareYolu, merkez, etkilesim, SAHNE } from './veri'

describe('kare oynatıcı hesapları', () => {
  it('hedefe süreye göre yaklaşır ve aşmaz', () => {
    expect(adimAt(0, 1, 400, 800)).toBeCloseTo(0.5)
    expect(adimAt(0.9, 1, 400, 800)).toBe(1)
    expect(adimAt(1, 0, 200, 800)).toBeCloseTo(0.75)
    expect(adimAt(0.1, 0, 400, 800)).toBe(0)
    expect(adimAt(0, 1, 16, 0)).toBe(1)
  })

  it('ilerlemeyi kare numarasına çevirir', () => {
    expect(kareNo(0, 24)).toBe(1)
    expect(kareNo(1, 24)).toBe(24)
    expect(kareNo(0.5, 24)).toBe(13)
    expect(kareNo(2, 24)).toBe(24)
  })
})

describe('sahne verisi', () => {
  it('Blender çıktısı geçerli ve dört etkileşimi içeriyor', () => {
    expect(SAHNE.boyut.w).toBeGreaterThan(0)
    expect(SAHNE.etkilesimler.map((e) => e.id).sort()).toEqual(['cekmece', 'fis', 'kapi', 'kitap'])
    expect(SAHNE.huzme.gunduz.length).toBeGreaterThan(2)
  })

  it('kare yolunu ve merkezi hesaplar', () => {
    expect(kareYolu('cekmece', 'gece', 3)).toBe('/sahne/kareler/cekmece/gece/f03.webp')
    expect(merkez([10, 20, 100, 50])).toEqual([60, 45])
    expect(etkilesim('kapi').etiket).toBeTruthy()
    expect(() => etkilesim('yok' as never)).toThrow()
  })
})
