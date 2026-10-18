import {
  noktaSec, parlaklik, poligondaMi, sinirKutusu, tohumluRastgele, yenilenmeli, zerreDogur, zerreIlerlet,
} from './toz'
import type { Nokta } from './veri'

const KARE: Nokta[] = [[0, 0], [100, 0], [100, 100], [0, 100]]
const UCGEN: Nokta[] = [[0, 0], [100, 0], [0, 100]]

describe('toz', () => {
  it('poligon içini doğru sınar', () => {
    expect(poligondaMi([50, 50], KARE)).toBe(true)
    expect(poligondaMi([150, 50], KARE)).toBe(false)
    expect(poligondaMi([20, 20], UCGEN)).toBe(true)
    expect(poligondaMi([80, 80], UCGEN)).toBe(false)
  })

  it('sınır kutusunu verir', () => {
    expect(sinirKutusu(UCGEN)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
  })

  it('noktaları hep poligon içinden seçer', () => {
    const rnd = tohumluRastgele(42)
    for (let i = 0; i < 200; i += 1) expect(poligondaMi(noktaSec(UCGEN, rnd), UCGEN)).toBe(true)
  })

  it('zerre ilerler ama özgün nesne değişmez', () => {
    const rnd = tohumluRastgele(1)
    const z = zerreDogur(KARE, rnd)
    const sonraki = zerreIlerlet(z, 0.5, rnd)
    expect(sonraki).not.toBe(z)
    expect(sonraki.yas).toBe(0.5)
    expect(z.yas).toBe(0)
  })

  it('doğarken sönük başlar, ömrü bitince ya da dışarı çıkınca yenilenir', () => {
    const z = zerreDogur(KARE, tohumluRastgele(3))
    expect(parlaklik(z, 0)).toBe(0)
    expect(parlaklik({ ...z, yas: 4 }, 1)).toBeGreaterThan(0)
    expect(yenilenmeli({ ...z, yas: z.omur }, KARE)).toBe(true)
    expect(yenilenmeli({ ...z, x: -5 }, KARE)).toBe(true)
    expect(yenilenmeli({ ...z, x: 50, y: 50, yas: 1 }, KARE)).toBe(false)
  })

  it('tohumlu üreteç tekrarlanabilir', () => {
    const a = tohumluRastgele(9)
    const b = tohumluRastgele(9)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})
