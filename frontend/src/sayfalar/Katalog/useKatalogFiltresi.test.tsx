import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, useLocation } from 'react-router'
import { useKatalogFiltresi } from './useKatalogFiltresi'

function Kosum() {
  const f = useKatalogFiltresi()
  const konum = useLocation()
  return (
    <>
      <input aria-label="ara" value={f.arama} onChange={(e) => f.aramaDegistir(e.target.value)} />
      <button type="button" onClick={() => f.kategoriSec(3)}>
        kategori
      </button>
      <output data-testid="adres">{konum.search}</output>
      <Link to="/katalog">menü</Link>
    </>
  )
}

const adres = () => screen.getByTestId('adres').textContent

function kur(baslangic = '/katalog?kitap=7') {
  render(
    <MemoryRouter initialEntries={[baslangic]}>
      <Kosum />
    </MemoryRouter>,
  )
}

const bekle = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

describe('useKatalogFiltresi', () => {
  it('aramayı ve sekmeyi gecikmeli, diğer parametreleri koruyarak yazar', async () => {
    const kullanici = userEvent.setup()
    kur()
    await kullanici.type(screen.getByRole('textbox', { name: 'ara' }), ' ata ')
    await kullanici.click(screen.getByRole('button', { name: 'kategori' }))
    expect(adres()).toBe('?kitap=7')
    await waitFor(() => expect(adres()).toBe('?kitap=7&q=ata&kategori=3'))
    expect(screen.getByRole('textbox', { name: 'ara' })).toHaveValue(' ata ')
  })

  it('dışarıdan gezinmeyi benimser, eski aramayı geri yazmaz', async () => {
    const kullanici = userEvent.setup()
    kur('/katalog?q=atay')
    expect(screen.getByRole('textbox', { name: 'ara' })).toHaveValue('atay')
    await kullanici.click(screen.getByRole('link', { name: 'menü' }))
    expect(adres()).toBe('')
    expect(screen.getByRole('textbox', { name: 'ara' })).toHaveValue('')
    await bekle(400)
    expect(adres()).toBe('')
  })
})
