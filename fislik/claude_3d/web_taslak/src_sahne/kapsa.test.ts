import { ekranaCevir, kapsaHesapla } from './kapsa'

const SAHNE = { w: 2560, h: 1440 }

describe('kapsaHesapla', () => {
  it('aynı oranda ekranı tam doldurur', () => {
    const k = kapsaHesapla({ w: 1280, h: 720 }, SAHNE, [1280, 720])
    expect(k).toEqual({ olcek: 0.5, x: 0, y: 0 })
  })

  it('dikey ekranda yüksekliğe göre ölçekler ve odağı ortalar', () => {
    const k = kapsaHesapla({ w: 400, h: 800 }, SAHNE, [1280, 720])
    expect(k.olcek).toBeCloseTo(800 / 1440)
    const [ox] = ekranaCevir([1280, 720], k)
    expect(ox).toBeCloseTo(200)
    expect(k.y).toBe(0)
  })

  it('odak kenardaysa görüntüyü dışarı taşırmaz', () => {
    const k = kapsaHesapla({ w: 400, h: 800 }, SAHNE, [0, 720])
    expect(k.x).toBe(0)
    const sag = kapsaHesapla({ w: 400, h: 800 }, SAHNE, [2560, 720])
    expect(sag.x).toBeCloseTo(400 - 2560 * sag.olcek)
  })

  it('yakınlaşınca odak noktasını ekran ortasına getirir', () => {
    const k = kapsaHesapla({ w: 1280, h: 720 }, SAHNE, [1280, 800], 1.6)
    const [ox, oy] = ekranaCevir([1280, 800], k)
    expect(ox).toBeCloseTo(640)
    expect(oy).toBeCloseTo(360)
  })
})

describe('kapsaHesapla kenar sınırı', () => {
  it('yakınlaşmada bile görüntünün altı boş kalmaz', () => {
    const k = kapsaHesapla({ w: 1280, h: 720 }, SAHNE, [1280, 1400], 1.6)
    expect(k.y).toBeCloseTo(720 - 1440 * k.olcek)
  })
})
