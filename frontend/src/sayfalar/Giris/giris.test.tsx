import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ApiHatasi } from '../../api/istemci'
import { TemaSaglayici } from '../../tema/TemaSaglayici'
import GirisSayfasi, { girisFormu } from './GirisSayfasi'

const girisYap = vi.fn()
let oturumVar = false

vi.mock('../../oturum/OturumSaglayici', () => ({
  useOturum: () => ({
    oturum: oturumVar ? { token: 't' } : null,
    girisYap,
    sonCikisSebebi: 'sure',
  }),
}))

function kur() {
  return render(
    <TemaSaglayici>
        <MemoryRouter initialEntries={[{ pathname: '/giris', state: { donus: '/katalog' } }]}>
          <Routes>
            <Route path="/giris" element={<GirisSayfasi />} />
            <Route path="/katalog" element={<p>katalog açıldı</p>} />
          </Routes>
        </MemoryRouter>
    </TemaSaglayici>,
  )
}

describe('giriş fişi', () => {
  beforeEach(() => {
    girisYap.mockReset()
    oturumVar = false
  })

  it('form şeması boş alanları reddeder', () => {
    expect(girisFormu.safeParse({ kullaniciAdi: '  ', sifre: 'x' }).success).toBe(false)
    expect(girisFormu.safeParse({ kullaniciAdi: ' admin ', sifre: 'x' })).toMatchObject({
      success: true,
      data: { kullaniciAdi: 'admin' },
    })
  })

  it('süre dolduysa uyarır, boş gönderimde istemciyi çağırmaz', async () => {
    kur()
    expect(screen.getByText(/süresi doldu/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Masayı aç' }))
    expect(girisYap).not.toHaveBeenCalled()
    expect(await screen.findByText('Kullanıcı adını yaz')).toBeInTheDocument()
  })

  it('sunucu reddederse damga ve mesaj gösterir', async () => {
    girisYap.mockRejectedValue(new ApiHatasi(401, 'Kullanıcı adı veya şifre hatalı'))
    kur()
    await userEvent.type(screen.getByLabelText('Kullanıcı adı'), 'admin')
    await userEvent.type(screen.getByLabelText('Şifre'), 'yanlis')
    await userEvent.click(screen.getByRole('button', { name: 'Masayı aç' }))
    expect(await screen.findByText('Kullanıcı adı veya şifre hatalı')).toBeInTheDocument()
    expect(screen.getByText('Reddedildi')).toBeInTheDocument()
  })

  it('onaylanınca damgayı basar ve dönüş adresine gider', async () => {
    girisYap.mockResolvedValue({ ad: 'Selin' })
    kur()
    await userEvent.type(screen.getByLabelText('Kullanıcı adı'), 'selin')
    await userEvent.type(screen.getByLabelText('Şifre'), 'dogru-sifre')
    await userEvent.click(screen.getByRole('button', { name: 'Masayı aç' }))
    expect(girisYap).toHaveBeenCalledWith('selin', 'dogru-sifre')
    expect(await screen.findByText('Giriş onaylandı')).toBeInTheDocument()
    expect(await screen.findByText('katalog açıldı', {}, { timeout: 3000 })).toBeInTheDocument()
  })
})
