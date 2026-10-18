import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemaSaglayici, kayitliTema, temaCoz, useTema } from './TemaSaglayici'

function Gosterge() {
  const { tema, temaDegistir } = useTema()
  return (
    <button type="button" onClick={() => temaDegistir()}>
      {tema}
    </button>
  )
}

describe('tema', () => {
  beforeEach(() => localStorage.clear())

  it('kayıtlı tercihi sistem tercihine üstün tutar', () => {
    expect(kayitliTema('night')).toBe('gece')
    expect(kayitliTema('x')).toBeNull()
    expect(temaCoz('day', true)).toBe('gunduz')
    expect(temaCoz(null, true)).toBe('gece')
    expect(temaCoz(null, false)).toBe('gunduz')
  })

  it('geçiş yapar, kaydeder ve html etiketine yazar', async () => {
    render(
      <TemaSaglayici>
        <Gosterge />
      </TemaSaglayici>,
    )
    const dugme = screen.getByRole('button')
    expect(dugme).toHaveTextContent('gunduz')
    await userEvent.click(dugme)
    expect(dugme).toHaveTextContent('gece')
    expect(localStorage.getItem('fislik-tema')).toBe('night')
    expect(document.documentElement.dataset.tema).toBe('gece')
  })

  it('başka sekmedeki değişikliği izler', () => {
    render(
      <TemaSaglayici>
        <Gosterge />
      </TemaSaglayici>,
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'fislik-tema', newValue: 'night' }))
    })
    expect(screen.getByRole('button')).toHaveTextContent('gece')
  })
})
