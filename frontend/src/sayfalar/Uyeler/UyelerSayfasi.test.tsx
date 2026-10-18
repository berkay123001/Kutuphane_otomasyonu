import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiHatasi } from '../../api/istemci'
import * as sorgular from '../../api/sorgular'
import type { Uye, UyeListe } from '../../api/semalar'
import type { UyeFiltresi, YeniUye } from '../../api/uclar'
import { gunEkle } from '../../lib/tarih'
import { BUGUN, ornekListeUyesi } from './test/ornekler'
import { ciz, sahteMutasyon } from './test/ortam'
import UyelerSayfasi from './UyelerSayfasi'

vi.mock('../../api/sorgular', () => ({ useUyeler: vi.fn(), useUyeOlustur: vi.fn() }))

const m = vi.mocked(sorgular)
type ListeSorgusu = ReturnType<typeof sorgular.useUyeler>

const ELIF = ornekListeUyesi()
const MERT = ornekListeUyesi({
  id: 8,
  uyeNo: 'Ü-0420',
  ad: 'Mert',
  soyad: 'Kaya',
  tur: 'PERSONEL',
  bolum: null,
  aktif: false,
  kartGecerlilik: gunEkle(BUGUN, -4),
  aktifOduncSayisi: 0,
})

function listeDondur(veri: readonly UyeListe[] | undefined, toplam = veri?.length ?? 0, ek: object = {}) {
  const refetch = vi.fn()
  m.useUyeler.mockImplementation((f: UyeFiltresi) =>
    ({
      data: veri ? { veri: f.page && f.page > 1 ? [] : veri, meta: { page: f.page ?? 1, limit: 24, total: toplam } } : undefined,
      isError: false,
      error: null,
      isPlaceholderData: false,
      refetch,
      ...ek,
    }) as unknown as ListeSorgusu,
  )
  return refetch
}

const listeyiCiz = (yol = '/uyeler') => ciz(<UyelerSayfasi />, yol, '/uyeler')
const sonFiltre = () => m.useUyeler.mock.calls.at(-1)?.[0]

describe('Üye listesi', () => {
  let olustur: ReturnType<typeof sahteMutasyon<YeniUye, { veri: Uye }>>
  beforeEach(() => {
    olustur = sahteMutasyon<YeniUye, { veri: Uye }>()
    m.useUyeOlustur.mockReturnValue(olustur as unknown as ReturnType<typeof sorgular.useUyeOlustur>)
  })

  it('mini kartları, sayacı ve damgaları gösterir', () => {
    listeDondur([ELIF, MERT], 2)
    listeyiCiz()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Üyeler')
    expect(screen.getByText('okuyucu').parentElement).toHaveTextContent('2okuyucu')
    expect(sonFiltre()).toEqual({ q: undefined, aktif: undefined, page: 1, limit: 24 })

    const elif = screen.getByRole('link', { name: /Elif Demirci/ })
    expect(elif).toHaveAttribute('href', '/uyeler/7')
    expect(within(elif).getByText('Ü-2291')).toBeInTheDocument()
    expect(within(elif).getByText('2 / 5 ödünç')).toBeInTheDocument()
    expect(within(elif).queryByText('Pasif')).not.toBeInTheDocument()

    const mert = screen.getByRole('link', { name: /Mert Kaya/ })
    expect(within(mert).getByText('Personel · —')).toBeInTheDocument()
    expect(within(mert).getByText('Pasif')).toHaveClass('stamp', 'ink-r')
    expect(within(mert).getByText('Kart süresi doldu')).toHaveClass('ink-r')
  })

  it('arama 250 ms bekleyip adrese ve sorguya yazılır', async () => {
    listeDondur([ELIF])
    listeyiCiz()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Okuyucu ara' }), 'eli ')
    expect(screen.getByTestId('konum')).toHaveTextContent(/^\/uyeler$/)
    await waitFor(() => expect(screen.getByTestId('konum')).toHaveTextContent('/uyeler?q=eli'))
    expect(sonFiltre()).toMatchObject({ q: 'eli', page: 1 })
    expect(screen.getByRole('searchbox')).toHaveValue('eli ')
    expect(screen.getByText('1 sonuç')).toBeInTheDocument()
  })

  it('adres güncellendikten sonra yazmaya devam edilince harf kaybolmaz; Esc temizler', async () => {
    listeDondur([ELIF])
    listeyiCiz()
    const kutu = screen.getByRole('searchbox', { name: 'Okuyucu ara' })
    await userEvent.type(kutu, 'el')
    await waitFor(() => expect(screen.getByTestId('konum')).toHaveTextContent('/uyeler?q=el'))
    await userEvent.type(kutu, 'if')
    expect(kutu).toHaveValue('elif')
    await waitFor(() => expect(screen.getByTestId('konum')).toHaveTextContent('/uyeler?q=elif'))
    await userEvent.keyboard('{Escape}')
    expect(kutu).toHaveValue('')
    await waitFor(() => expect(screen.getByTestId('konum')).toHaveTextContent(/^\/uyeler$/))
  })

  it('adresteki filtreyle açılır; sekmeler aktif parametresini değiştirir', async () => {
    listeDondur([MERT], 1)
    listeyiCiz('/uyeler?q=mert&aktif=false')
    expect(screen.getByRole('searchbox')).toHaveValue('mert')
    expect(screen.getByRole('button', { name: /Pasif/ })).toHaveAttribute('aria-pressed', 'true')
    expect(sonFiltre()).toEqual({ q: 'mert', aktif: false, page: 1, limit: 24 })

    await userEvent.click(screen.getByRole('button', { name: /Aktif/ }))
    expect(screen.getByTestId('konum')).toHaveTextContent('/uyeler?q=mert&aktif=true')
    expect(sonFiltre()).toMatchObject({ aktif: true })

    await userEvent.click(screen.getByRole('button', { name: /Tümü/ }))
    expect(screen.getByTestId('konum')).toHaveTextContent(/^\/uyeler\?q=mert$/)
  })

  it('24 kartı aşınca "Daha fazla göster" ikinci sayfayı ister', async () => {
    listeDondur([ELIF, MERT], 30)
    listeyiCiz()
    await userEvent.click(screen.getByRole('button', { name: 'Daha fazla göster (6 kart daha)' }))
    expect(m.useUyeler).toHaveBeenCalledWith({ q: undefined, aktif: undefined, page: 2, limit: 24 })
    expect(screen.queryByRole('button', { name: /Daha fazla göster/ })).not.toBeInTheDocument()
  })

  it('son sayfa gelince odak ilk yeni karta geçer', async () => {
    const CAN = ornekListeUyesi({ id: 42, uyeNo: 'Ü-0042', ad: 'Can', soyad: 'Yılmaz' })
    m.useUyeler.mockImplementation(
      (f: UyeFiltresi) =>
        ({
          data: { veri: f.page === 2 ? [CAN] : [ELIF, MERT], meta: { page: f.page ?? 1, limit: 24, total: 25 } },
          isError: false,
          isPlaceholderData: false,
          refetch: vi.fn(),
        }) as unknown as ListeSorgusu,
    )
    listeyiCiz()
    await userEvent.click(screen.getByRole('button', { name: 'Daha fazla göster (1 kart daha)' }))
    expect(screen.getByRole('link', { name: /Can Yılmaz/ })).toHaveFocus()
  })

  it('yeni filtre yüklenirken eski toplamla sayfa eklenmez', () => {
    listeDondur([ELIF, MERT], 30, { isPlaceholderData: true })
    listeyiCiz()
    expect(screen.queryByRole('button', { name: /Daha fazla göster/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tümü' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('boş, aramada eşleşme yok, yükleniyor ve hata durumları', async () => {
    listeDondur([], 0)
    const { unmount } = listeyiCiz()
    expect(screen.getByText('Dolap boş')).toBeInTheDocument()
    unmount()

    listeDondur([], 0)
    const ikinci = listeyiCiz('/uyeler?q=zzz')
    expect(screen.getByText('Eşleşen okuyucu yok')).toBeInTheDocument()
    ikinci.unmount()

    listeDondur(undefined)
    const ucuncu = listeyiCiz()
    expect(screen.getByText('Okuyucu kartları diziliyor…')).toBeInTheDocument()
    expect(screen.getByText('okuyucu').parentElement).toHaveTextContent('…')
    ucuncu.unmount()

    const yenidenDene = listeDondur(undefined, 0, { isError: true, error: new ApiHatasi(0, 'Sunucuya ulaşılamıyor.') })
    listeyiCiz()
    expect(screen.getByRole('alert')).toHaveTextContent('Sunucuya ulaşılamıyor.')
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }))
    expect(yenidenDene).toHaveBeenCalled()
  })
})

describe('Yeni üye fişi', () => {
  let olustur: ReturnType<typeof sahteMutasyon<YeniUye, { veri: Uye }>>
  beforeEach(() => {
    // motion'ın yerleşim ölçümü jsdom'da olmayan window.scrollTo'yu çağırır
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    olustur = sahteMutasyon<YeniUye, { veri: Uye }>()
    m.useUyeOlustur.mockReturnValue(olustur as unknown as ReturnType<typeof sorgular.useUyeOlustur>)
    listeDondur([ELIF])
  })

  async function formuAc() {
    listeyiCiz()
    const dugme = screen.getByRole('button', { name: 'Yeni üye' })
    await userEvent.click(dugme)
    expect(dugme).toHaveAttribute('aria-expanded', 'true')
    return screen.getByRole('form', { name: 'Yeni okuyucu fişi' })
  }

  it('istemcide doğrular, ilk hatalı alana odaklanır', async () => {
    const form = await formuAc()
    expect(within(form).getByLabelText(/^Ad/)).toHaveFocus()
    await userEvent.type(within(form).getByLabelText('E-posta'), 'can@')
    await userEvent.click(within(form).getByRole('button', { name: 'Kaydet ve kartı bas' }))
    expect(within(form).getByText('Ad gerekli')).toBeInTheDocument()
    expect(within(form).getByText('Soyad gerekli')).toBeInTheDocument()
    expect(within(form).getByText('Geçerli bir e-posta girin')).toBeInTheDocument()
    expect(within(form).getByLabelText(/^Ad/)).toHaveAttribute('aria-invalid', 'true')
    expect(within(form).getByLabelText(/^Ad/)).toHaveFocus()
    expect(olustur.mutate).not.toHaveBeenCalled()
  })

  it('canlı kart yazdıkça dolar', async () => {
    const form = await formuAc()
    expect(screen.getByText('Yazdıkça kart dolar')).toBeInTheDocument()
    await userEvent.type(within(form).getByLabelText(/^Ad/), 'Elif')
    await userEvent.type(within(form).getByLabelText(/^Soyad/), 'Demirci')
    const kart = screen.getByRole('group', { name: 'Kart önizlemesi' })
    expect(within(kart).getByText('Elif Demirci')).toBeInTheDocument()
    expect(within(kart).getByText('ED')).toBeInTheDocument()
  })

  it('kaydeder, bildirir ve yeni profile gider', async () => {
    const form = await formuAc()
    await userEvent.type(within(form).getByLabelText(/^Ad/), 'Can')
    await userEvent.type(within(form).getByLabelText(/^Soyad/), ' Yılmaz ')
    await userEvent.click(within(form).getByRole('radio', { name: 'Personel' }))
    await userEvent.type(within(form).getByLabelText('E-posta'), 'can@ornek.tr')
    await userEvent.click(within(form).getByRole('button', { name: 'Kaydet ve kartı bas' }))
    expect(olustur.mutate).toHaveBeenCalledWith(
      { ad: 'Can', soyad: 'Yılmaz', tur: 'PERSONEL', eposta: 'can@ornek.tr' },
      expect.anything(),
    )
    const yeni: Uye = { ...ornekListeUyesi({ id: 42, uyeNo: 'Ü-0042', ad: 'Can', soyad: 'Yılmaz' }) }
    act(() => olustur.basar({ veri: yeni }))
    // Kart önce basılır (numara, Onaylı damgası), animasyon bitince profile gidilir
    expect(screen.getByText('Kart basıldı · Ü-0042')).toBeInTheDocument()
    expect(screen.getByText('Onaylı')).toBeInTheDocument()
    expect(screen.getByText('Can Yılmaz kaydedildi')).toBeInTheDocument()
    expect(await screen.findByText('Gidilen sayfa /uyeler/42', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('sunucu alan hatalarını alanın altına yazar', async () => {
    const form = await formuAc()
    await userEvent.type(within(form).getByLabelText(/^Ad/), 'Can')
    await userEvent.type(within(form).getByLabelText(/^Soyad/), 'Yılmaz')
    await userEvent.click(within(form).getByRole('button', { name: 'Kaydet ve kartı bas' }))
    act(() =>
      olustur.bozul(new ApiHatasi(400, 'Geçersiz istek', { formErrors: [], fieldErrors: { telefon: ['Telefon geçersiz'] } })),
    )
    expect(within(form).getByText('Telefon geçersiz')).toBeInTheDocument()
    expect(within(form).getByLabelText('Telefon')).toHaveAccessibleDescription('Telefon geçersiz')
    expect(await screen.findByText('Geçersiz istek')).toBeInTheDocument()
  })

  it('Esc ya da Vazgeç fişi kapatır, odak düğmeye döner', async () => {
    await formuAc()
    await userEvent.keyboard('{Escape}')
    const dugme = screen.getByRole('button', { name: 'Yeni üye' })
    expect(dugme).toHaveAttribute('aria-expanded', 'false')
    expect(dugme).toHaveFocus()
  })
})
