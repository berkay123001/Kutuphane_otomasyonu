import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { TemaSaglayici } from '../tema/TemaSaglayici'
import { Dolap } from './Dolap'
import { CEKMECELER, cekmeceBul } from './rotalar'

vi.mock('../oturum/OturumSaglayici', () => ({
  useOturum: () => ({
    gorevli: { id: 1, ad: 'Selin', soyad: 'Aydın', kullaniciAdi: 'selin', aktif: true, eposta: null, telefon: null },
    cikisYap: cikis,
  }),
}))
const cikis = vi.fn()

describe('rotalar', () => {
  it('yolu ve alt yolları çekmeceye eşler', () => {
    expect(cekmeceBul('/katalog')?.no).toBe('02')
    expect(cekmeceBul('/uyeler/3')?.etiket).toBe('Üyeler')
    expect(cekmeceBul('/yok')).toBeUndefined()
  })

  it('dört çekmece tanımlı', () => {
    expect(CEKMECELER.map((c) => c.no)).toEqual(['01', '02', '03', '04'])
  })
})

describe('Dolap', () => {
  it('çekmeceleri, etkin sayfayı, görevliyi ve lamba anahtarını gösterir', async () => {
    render(
      <TemaSaglayici>
          <MemoryRouter initialEntries={['/katalog']}>
            <Dolap />
          </MemoryRouter>
      </TemaSaglayici>,
    )
    expect(screen.getByRole('link', { name: /02\s*Katalog/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Selin Aydın')).toBeInTheDocument()
    const lamba = screen.getByRole('button', { name: 'Lambayı yak, geceye geç' })
    await userEvent.click(lamba)
    expect(lamba).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Oturumu kapat' }))
    expect(cikis).toHaveBeenCalled()
  })
})
