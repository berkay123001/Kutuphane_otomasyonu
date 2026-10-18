import { act, renderHook } from '@testing-library/react'
import { hayaletleriKat, siralariYenile, useHayaletler, useOdakKurtarici } from './kancalar'

type Oge = { readonly id: number }
const [a, b, c, d] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

describe('hayaletleriKat / siralariYenile', () => {
  it('sunucudan düşen öğeyi eski sırasına katar', () => {
    expect(hayaletleriKat([a, c], [{ oge: b, sira: 1, damga: 'İade' }])).toEqual([a, b, c])
    expect(hayaletleriKat([], [{ oge: b, sira: 3, damga: null }])).toEqual([b])
  })

  it('sunucuda hâlâ olanı ikinci kez eklemez', () => {
    expect(hayaletleriKat([a, b], [{ oge: b, sira: 0, damga: null }])).toEqual([a, b])
  })

  it('bırakılan hayaletten sonra kalanların sırası görünen listeye göre yenilenir', () => {
    const kalan = siralariYenile([{ oge: c, sira: 2, damga: 'x' }], [b, c, d])
    expect(kalan).toEqual([{ oge: c, sira: 1, damga: 'x' }])
    expect(hayaletleriKat([b, d], kalan)).toEqual([b, c, d])
  })
})

describe('useHayaletler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const kur = (liste: readonly Oge[]) =>
    renderHook(({ l }) => useHayaletler(l, 1000), { initialProps: { l: liste } })

  it('yanıt tazelemeden önce gelirse: sunucudan düşene dek bekler, sonra süre işler', () => {
    const { result, rerender } = kur([a, b, c])
    act(() => result.current.tut(b, 1))
    act(() => result.current.damgala(2, 'Ödendi'))
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.damgasi(2)).toBe('Ödendi')

    rerender({ l: [a, c] })
    expect(result.current.liste).toEqual([a, b, c])
    act(() => vi.advanceTimersByTime(999))
    expect(result.current.liste).toEqual([a, b, c])
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.liste).toEqual([a, c])
    expect(result.current.damgasi(2)).toBeNull()
  })

  it('tazeleme yanıttan önce gelirse de aynı çalışır', () => {
    const { result, rerender } = kur([a, b, c])
    act(() => result.current.tut(b, 1))
    rerender({ l: [a, c] })
    expect(result.current.liste).toEqual([a, b, c])
    act(() => result.current.damgala(2, 'İade alındı'))
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.liste).toEqual([a, c])
  })

  it('birden çok hayalet: önce bırakılan diğerinin yerini kaydırmaz', () => {
    const { result, rerender } = kur([a, b, c, d])
    act(() => {
      result.current.tut(a, 0)
      result.current.tut(c, 2)
    })
    rerender({ l: [b, d] })
    expect(result.current.liste).toEqual([a, b, c, d])
    act(() => result.current.damgala(1, 'x'))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.damgala(3, 'y'))
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.liste).toEqual([b, c, d])
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.liste).toEqual([b, d])
  })

  it('hata olursa öğe hemen bırakılır; bırakmadan önce haber verir', () => {
    const haber = vi.fn()
    const { result, rerender } = renderHook(({ l }) => useHayaletler(l, 1000, haber), {
      initialProps: { l: [a] as readonly Oge[] },
    })
    act(() => result.current.tut(a, 0))
    act(() => result.current.birak(1))
    expect(result.current.damgasi(1)).toBeNull()
    expect(result.current.liste).toEqual([a])

    act(() => result.current.tut(a, 0))
    act(() => result.current.damgala(1, 'x'))
    rerender({ l: [] })
    act(() => vi.advanceTimersByTime(1000))
    expect(haber).toHaveBeenCalledWith(1)
  })
})

describe('useOdakKurtarici', () => {
  it('odak giden satırın içindeyse başlığa taşınır', () => {
    const kap = document.createElement('section')
    kap.innerHTML = '<h2 tabindex="-1">Başlık</h2><article data-oge="5"><button>İade al</button></article>'
    document.body.append(kap)
    const { result } = renderHook(() => useOdakKurtarici<HTMLElement>())
    result.current.kap.current = kap
    result.current.baslik.current = kap.querySelector('h2')

    kap.querySelector('button')?.focus()
    result.current.kurtar(6)
    expect(document.activeElement?.textContent).toBe('İade al')
    result.current.kurtar(5)
    expect(document.activeElement?.textContent).toBe('Başlık')
    kap.remove()
  })
})
