import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiHatasi } from '../api/istemci'
import { BildirimSaglayici, useBildirim } from './Bildirim'
import { Damga } from './Damga'
import { BosDurum, HataKutusu, Yukleniyor } from './Durumlar'
import { Odometre, haneler } from './Odometre'
import { daktiloKes, useDaktilo } from './useDaktilo'

describe('daktiloKes', () => {
  const satirlar = ['Atay, Oğuz.', 'Tutunamayanlar']

  it('başta boş, imleç ilk satırda', () => {
    expect(daktiloKes(satirlar, 0)).toEqual({ satirlar: ['', ''], aktifSatir: 0, bitti: false })
  })

  it('satır ortasında ve satır geçişinde imleci doğru yere koyar', () => {
    expect(daktiloKes(satirlar, 4).satirlar).toEqual(['Atay', ''])
    expect(daktiloKes(satirlar, 11).aktifSatir).toBe(0)
    const ikinci = daktiloKes(satirlar, 13)
    expect(ikinci.satirlar).toEqual(['Atay, Oğuz.', 'Tu'])
    expect(ikinci.aktifSatir).toBe(1)
  })

  it('tamamlanınca bitti der', () => {
    const son = daktiloKes(satirlar, 99)
    expect(son.bitti).toBe(true)
    expect(son.aktifSatir).toBe(1)
  })
})

describe('useDaktilo', () => {
  afterEach(() => vi.useRealTimers())

  it('beklemeden sonra harf harf yazar', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useDaktilo(['abc'], 100, 10))
    expect(result.current.satirlar[0]).toBe('')
    act(() => vi.advanceTimersByTime(100 + 25))
    expect(result.current.satirlar[0]).toBe('ab')
    act(() => vi.advanceTimersByTime(50))
    expect(result.current.bitti).toBe(true)
  })
})

describe('Odometre', () => {
  it('haneleri gecikmeleriyle üretir', () => {
    expect(haneler(48, 1.2)).toEqual([
      { rakam: '4', gecikme: 1.2 },
      { rakam: '8', gecikme: 1.2 + 0.16 },
    ])
    expect(haneler(-3, 0)).toEqual([{ rakam: '0', gecikme: 0 }])
  })

  it('ekran okuyucuya sayıyı düz metin verir', () => {
    render(<Odometre deger={31} />)
    expect(screen.getByText('31')).toHaveClass('sr')
  })
})

describe('Damga ve durumlar', () => {
  it('damga mürekkep ve vurma sınıflarını taşır', () => {
    render(
      <Damga murekkep="r" vur={0.3} egim={3}>
        Gecikmiş
      </Damga>,
    )
    const d = screen.getByText('Gecikmiş')
    expect(d).toHaveClass('stamp', 'ink-r', 'slam')
    expect(d.style.animationDelay).toBe('0.3s')
  })

  it('yükleniyor, boş ve hata durumlarını gösterir', async () => {
    const yeniden = vi.fn()
    render(
      <>
        <Yukleniyor metin="Bekle" />
        <BosDurum baslik="Fiş yok" aciklama="Aramayı kısalt" />
        <HataKutusu hata={new ApiHatasi(422, 'Verilemez', ['Ödenmemiş cezası var'])} yenidenDene={yeniden} />
      </>,
    )
    expect(screen.getByText('Bekle')).toBeInTheDocument()
    expect(screen.getByText('Fiş yok')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Ödenmemiş cezası var')
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }))
    expect(yeniden).toHaveBeenCalledOnce()
  })
})

describe('Bildirim', () => {
  function Tetik() {
    const { bildir, hataBildir } = useBildirim()
    return (
      <>
        <button type="button" onClick={() => bildir({ tur: 'basari', baslik: 'Kaydedildi' })}>
          iyi
        </button>
        <button type="button" onClick={() => hataBildir(new ApiHatasi(409, 'Kopya ödünçte'))}>
          kötü
        </button>
      </>
    )
  }

  it('başarı ve hata fişlerini gösterir', async () => {
    render(
      <BildirimSaglayici>
        <Tetik />
      </BildirimSaglayici>,
    )
    await userEvent.click(screen.getByText('iyi'))
    await userEvent.click(screen.getByText('kötü'))
    expect(await screen.findByText('Kaydedildi')).toBeInTheDocument()
    expect(await screen.findByText('Kopya ödünçte')).toBeInTheDocument()
  })
})
