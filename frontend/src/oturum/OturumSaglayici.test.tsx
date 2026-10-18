import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { istek } from '../api/istemci'
import { oturumOlustur, oturumuYaz } from './depo'
import { OturumSaglayici, useOturum } from './OturumSaglayici'

const gorevli = {
  id: 1, ad: 'Selin', soyad: 'Aydın', eposta: null, telefon: null, kullaniciAdi: 'selin', aktif: true,
}

function jwt(exp: number): string {
  return `x.${btoa(JSON.stringify({ sub: 1, exp })).replace(/=+$/, '')}.y`
}

function Gosterge() {
  const { gorevli: g, sonCikisSebebi, girisYap, cikisYap } = useOturum()
  return (
    <div>
      <p data-testid="durum">{g ? `açık:${g.ad}` : `kapalı:${sonCikisSebebi ?? '-'}`}</p>
      <button type="button" onClick={() => void girisYap('selin', 'dogru-sifre')}>giriş</button>
      <button type="button" onClick={() => cikisYap()}>çıkış</button>
    </div>
  )
}

function kur() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OturumSaglayici>
        <Gosterge />
      </OturumSaglayici>
    </QueryClientProvider>,
  )
}

const durum = () => screen.getByTestId('durum').textContent

describe('OturumSaglayici', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('giriş yapar, oturumu saklar ve istemciye token verir', async () => {
    const fetchSahte = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { token: jwt(4_000_000_000), gorevli } })),
    )
    vi.stubGlobal('fetch', fetchSahte)
    kur()
    expect(durum()).toBe('kapalı:-')
    await userEvent.click(screen.getByText('giriş'))
    expect(durum()).toBe('açık:Selin')
    expect(localStorage.getItem('fislik-oturum')).toContain('selin')

    fetchSahte.mockResolvedValue(new Response(JSON.stringify({ success: true, data: null })))
    await istek('/panel', z.unknown())
    const init = fetchSahte.mock.calls.at(-1)?.[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer x\./)
  })

  it('kullanıcı çıkışında depoyu temizler', async () => {
    oturumuYaz(oturumOlustur(jwt(4_000_000_000), gorevli))
    kur()
    expect(durum()).toBe('açık:Selin')
    await userEvent.click(screen.getByText('çıkış'))
    expect(durum()).toBe('kapalı:kullanici')
    expect(localStorage.getItem('fislik-oturum')).toBeNull()
  })

  it('geçerli token ile 401 gelirse süre doldu diye çıkar', async () => {
    oturumuYaz(oturumOlustur(jwt(4_000_000_000), gorevli))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'x' }), { status: 401 })),
    )
    kur()
    await act(async () => {
      await istek('/panel', z.unknown()).catch(() => undefined)
    })
    expect(durum()).toBe('kapalı:sure')
  })

  it('token süresi dolunca kendiliğinden çıkar', () => {
    vi.useFakeTimers()
    const simdi = Date.now()
    oturumuYaz(oturumOlustur(jwt(Math.floor(simdi / 1000) + 60), gorevli))
    kur()
    expect(durum()).toBe('açık:Selin')
    act(() => vi.advanceTimersByTime(61_000))
    expect(durum()).toBe('kapalı:sure')
  })

  it('başka sekmede çıkış yapılınca bu sekme de kapanır', () => {
    oturumuYaz(oturumOlustur(jwt(4_000_000_000), gorevli))
    kur()
    localStorage.removeItem('fislik-oturum')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'fislik-oturum', newValue: null }))
    })
    expect(durum()).toBe('kapalı:baska-sekme')
  })
})
