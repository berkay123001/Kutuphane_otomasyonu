import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SahneSaglayici, useSahneEylem } from '../../sahne/SahneSaglayici'
import { TemaSaglayici } from '../../tema/TemaSaglayici'
import { useEffect } from 'react'
import OdaSayfasi from './OdaSayfasi'

vi.mock('../../oturum/OturumSaglayici', () => ({
  useOturum: () => ({
    gorevli: { id: 1, ad: 'Selin', soyad: 'Aydın', kullaniciAdi: 'selin', aktif: true, eposta: null, telefon: null },
    cikisYap: vi.fn(),
  }),
}))
vi.mock('../../api/sorgular', () => ({
  usePanel: () => ({ data: { veri: { bugun: { odunc: 3, iade: 2, gecikmis: 1, yeniUye: 0 } } } }),
}))

/** Testte Sahne bileşeni yok; kapsama bilgisini elle bildirir. */
function KapsaVer() {
  const { kapsaBildir } = useSahneEylem()
  useEffect(() => kapsaBildir({ olcek: 0.5, x: 0, y: 0 }), [kapsaBildir])
  return null
}

function kur() {
  return render(
    <TemaSaglayici>
      <SahneSaglayici>
        <KapsaVer />
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<OdaSayfasi />} />
            <Route path="/katalog" element={<p>katalog ekranı</p>} />
          </Routes>
        </MemoryRouter>
      </SahneSaglayici>
    </TemaSaglayici>,
  )
}

describe('oda', () => {
  it('günün özetini ve dört nesneyi gösterir', () => {
    kur()
    expect(screen.getByText(/Bugün 3 ödünç · 2 iade/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Katalog çekmecesi — Katalog ekranını aç/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /ekranını aç/ })).toHaveLength(4)
  })

  it('nesne seçilince açılır, yaklaşır ve ekrana gider', async () => {
    kur()
    await userEvent.click(screen.getByRole('button', { name: /02\s*Katalog/ }))
    expect(await screen.findByText('katalog ekranı', {}, { timeout: 3000 })).toBeInTheDocument()
  })
})
