import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ApiHatasi } from '../../api/istemci'
import type { KitapDetay, KitapListe, Odunc, UyeDetay, UyeListe } from '../../api/semalar'
import {
  useKitap, useKitaplar, useOduncVer, useRezervasyon, useUye, useUyeler,
} from '../../api/sorgular'
import { TemaSaglayici } from '../../tema/TemaSaglayici'
import { BildirimSaglayici } from '../../ui/Bildirim'
import OduncSayfasi from './OduncSayfasi'

vi.mock('../../api/sorgular', async (orijinal) => ({
  ...(await orijinal<typeof import('../../api/sorgular')>()),
  useKitap: vi.fn(),
  useKitaplar: vi.fn(),
  useUye: vi.fn(),
  useUyeler: vi.fn(),
  useOduncVer: vi.fn(),
  useRezervasyon: vi.fn(),
}))

const uyeOzet = { id: 3, uyeNo: 'Ü-1000', ad: 'Kerem', soyad: 'Yıldız' }

const kitap: KitapDetay = {
  id: 1,
  isbn: null,
  baslik: 'Tutunamayanlar',
  yazar: 'Oğuz Atay',
  yayinevi: 'İletişim Yayınları',
  yayinYili: 1972,
  yerNumarasi: '894.353 ATA·T',
  kategoriId: 8,
  kategori: { id: 8, kod: '800–899', ad: 'Edebiyat' },
  bekleyenRezervasyonSayisi: 0,
  kopyalar: [
    { id: 11, barkod: '004217-1', kitapId: 1, blok: 'B', rafNo: 14, durum: 'RAFTA', aktifOdunc: null, ayrilanRezervasyon: null },
    {
      id: 12, barkod: '004217-2', kitapId: 1, blok: 'B', rafNo: 14, durum: 'ODUNCTE', ayrilanRezervasyon: null,
      aktifOdunc: { id: 90, verilisZamani: '2026-10-10T09:00:00Z', sonTeslimTarihi: '2099-10-24', uye: uyeOzet },
    },
  ],
  hareketler: [
    {
      id: 1, tip: 'ODUNC', zaman: '2026-10-10T09:00:00Z', kitapId: 1, kopyaId: 12, uyeId: 3,
      uye: uyeOzet, kopya: { id: 12, barkod: '004217-2' },
    },
  ],
}

const uye: UyeDetay = {
  id: 7, uyeNo: 'Ü-2291', ad: 'Elif', soyad: 'Demirci', eposta: null, telefon: null, tur: 'OGRENCI',
  bolum: 'Yazılım Müh.', uyelikTarihi: '2024-09-01', kartGecerlilik: '2028-09-01', aktif: true,
  aktifOduncler: [], odenmemisCezalar: [], rezervasyonlar: [],
  gecmis: [
    {
      id: 40, uyeId: 7, kopyaId: 30, verilisZamani: '2026-09-07T09:00:00Z', sonTeslimTarihi: '2026-09-21',
      iadeZamani: '2026-09-20T10:00:00Z', uzatildi: false, ceza: null,
      kopya: { id: 30, barkod: 'X-1', kitap: { id: 9, baslik: 'Saatleri Ayarlama Enstitüsü', yazar: 'A. H. Tanpınar', yerNumarasi: null } },
    },
  ],
  istatistik: { aktifOduncSayisi: 2, gecikmisOduncSayisi: 0, okunanKitapSayisi: 5, odenmemisCezaSayisi: 0 },
  oduncEngelleri: [],
}

const uyeListesi: UyeListe[] = [
  { ...uye, aktifOduncSayisi: 2 },
  { ...uye, id: 8, uyeNo: 'Ü-2300', ad: 'Elif', soyad: 'Kara', aktifOduncSayisi: 0 },
]

const odunc: Odunc = {
  id: 417, uyeId: 7, kopyaId: 11, verilisZamani: '2026-10-18T09:00:00Z', sonTeslimTarihi: '2026-11-01',
  iadeZamani: null, uzatildi: false,
}

const listeKitabi: KitapListe = {
  id: 1, isbn: null, baslik: 'Tutunamayanlar', yazar: 'Oğuz Atay', yayinevi: 'İletişim', yayinYili: 1972,
  yerNumarasi: '894.353 ATA·T', kategoriId: 8, kategori: kitap.kategori, kopyaSayisi: 3, raftakiKopyaSayisi: 1,
}

function sorgu<T>(veri: T | undefined, hata: unknown = null) {
  return {
    data: veri === undefined ? undefined : { veri },
    error: hata,
    isError: hata !== null,
    isPending: veri === undefined && hata === null,
    isFetching: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
  }
}

type Mutasyon = { mutate: ReturnType<typeof vi.fn>; isPending: boolean; reset: ReturnType<typeof vi.fn> }
const mutasyon = (): Mutasyon => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() })

let oduncMutasyonu: Mutasyon
let rezervasyonMutasyonu: Mutasyon
let sorguIstemcisi: QueryClient

function kur(adres: string, kitapSonucu = sorgu(kitap)) {
  vi.mocked(useKitap).mockReturnValue(kitapSonucu as unknown as ReturnType<typeof useKitap>)
  vi.mocked(useUye).mockImplementation(
    (id) => sorgu(id === 7 ? uye : undefined) as unknown as ReturnType<typeof useUye>,
  )
  vi.mocked(useUyeler).mockReturnValue(sorgu(uyeListesi) as unknown as ReturnType<typeof useUyeler>)
  vi.mocked(useKitaplar).mockReturnValue(sorgu([listeKitabi]) as unknown as ReturnType<typeof useKitaplar>)
  vi.mocked(useOduncVer).mockReturnValue(oduncMutasyonu as unknown as ReturnType<typeof useOduncVer>)
  vi.mocked(useRezervasyon).mockReturnValue(rezervasyonMutasyonu as unknown as ReturnType<typeof useRezervasyon>)
  return render(
    <QueryClientProvider client={sorguIstemcisi}>
      <TemaSaglayici>
        <BildirimSaglayici>
            <MemoryRouter initialEntries={[adres]}>
              <Routes>
                <Route path="/odunc" element={<OduncSayfasi />} />
                <Route path="/odunc/:kitapId" element={<OduncSayfasi />} />
              </Routes>
            </MemoryRouter>
        </BildirimSaglayici>
      </TemaSaglayici>
    </QueryClientProvider>,
  )
}

describe('OduncSayfasi', () => {
  beforeEach(() => {
    oduncMutasyonu = mutasyon()
    rezervasyonMutasyonu = mutasyon()
    sorguIstemcisi = new QueryClient()
  })

  it('kitabın fişini, kopyalarını ve seçili okuyucuyu gösterir; damgalayınca makbuz açılır', async () => {
    oduncMutasyonu.mutate.mockImplementation((_degisken: unknown, ayar: { onSuccess: (y: { veri: Odunc }) => void }) =>
      ayar.onSuccess({ veri: odunc }),
    )
    kur('/odunc/1?uye=7')

    expect(screen.getByRole('heading', { level: 1, name: 'Tutunamayanlar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Katalog' })).toHaveAttribute('href', '/katalog?kitap=1')
    expect(screen.getByText('Oğuz Atay · İletişim Yayınları · 2 kopya')).toBeInTheDocument()
    expect(screen.getByText('Kerem Yıldız’da')).toBeInTheDocument()
    expect(screen.getByText('Veriliyor')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('Ü-2291')
    expect(screen.getByText('Uygun')).toBeInTheDocument()
    expect(screen.getByText('21 EYL 2026')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '7 gün' }))
    expect(screen.getByRole('button', { name: '7 gün' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /Damgala ve ödünç ver/ }))
    expect(oduncMutasyonu.mutate).toHaveBeenCalledWith(
      { uyeId: 7, gun: 7, hedef: { kitapId: 1 } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(screen.getByText('Kayıt açıldı')).toBeInTheDocument()
    expect(screen.getByText('Fiş 0417 · Elif Demirci · 7 gün · son gün 01.11')).toBeInTheDocument()
    expect(screen.getByText('Ödünçte · 01.11')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Okuyucu profiline git' })).toHaveAttribute('href', '/uyeler/7')
    expect(screen.getByRole('button', { name: '7 gün' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Yeni ödünç' }))
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(screen.getByRole('button', { name: /Damgala ve ödünç ver/ })).toBeDisabled()
    expect(screen.getByText('Önce okuyucuyu seç.')).toBeInTheDocument()
  })

  it('rafta kopya yok hatasında bu üye için ayırtmayı teklif eder', async () => {
    oduncMutasyonu.mutate.mockImplementation((_d: unknown, ayar: { onError: (h: unknown) => void }) =>
      ayar.onError(new ApiHatasi(409, 'Rafta uygun kopya yok; rezervasyon yapabilirsiniz')),
    )
    const tazele = vi.spyOn(sorguIstemcisi, 'invalidateQueries')
    kur('/odunc/1?uye=7')

    await userEvent.click(screen.getByRole('button', { name: /Damgala ve ödünç ver/ }))
    expect(await screen.findByText('Rafta uygun kopya yok; rezervasyon yapabilirsiniz')).toBeInTheDocument()
    expect(tazele).toHaveBeenCalledWith({ queryKey: ['kitap', 1] })
    await userEvent.click(screen.getByRole('button', { name: 'Bu üye için ayırt' }))
    expect(rezervasyonMutasyonu.mutate).toHaveBeenCalledWith({ uyeId: 7, kitapId: 1 }, expect.anything())
  })

  it('okuyucuyu arama kutusunda klavyeyle seçer', async () => {
    kur('/odunc/1')
    const kutu = screen.getByRole('combobox')
    expect(screen.getByText('Önce okuyucuyu seç.')).toBeInTheDocument()

    await userEvent.type(kutu, 'Elif')
    const liste = await screen.findByRole('listbox', { name: 'Bulunan okuyucular' })
    expect(within(liste).getAllByRole('option')).toHaveLength(2)
    expect(kutu).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('{ArrowDown}{ArrowUp}')
    expect(within(liste).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Enter}')

    expect(kutu).toHaveValue('Ü-2291')
    expect(kutu).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Elif Demirci/ })).toHaveAttribute('href', '/uyeler/7')
    expect(screen.getByRole('button', { name: /Damgala ve ödünç ver/ })).toBeEnabled()
  })

  it('istek yoldayken okuyucu ve süre kilitlenir, düğme odağı korur', () => {
    oduncMutasyonu.isPending = true
    kur('/odunc/1?uye=7')
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByRole('button', { name: '14 gün' })).toBeDisabled()
    const dugme = screen.getByRole('button', { name: /Damgalanıyor/ })
    expect(dugme).toBeEnabled()
    expect(dugme).toHaveAttribute('aria-disabled', 'true')
  })

  it('kitap seçicide sonuçlar ?uye= korunarak ödünç masasına bağlanır', () => {
    kur('/odunc?uye=7')
    expect(screen.getByRole('heading', { level: 1, name: 'Ödünç ver' })).toBeInTheDocument()
    expect(screen.getByText('Elif Demirci için bir kitap seç')).toBeInTheDocument()
    const liste = screen.getByRole('list', { name: 'Bulunan kitaplar' })
    expect(within(liste).getByRole('link')).toHaveAttribute('href', '/odunc/1?uye=7')
    expect(within(liste).getByText('Rafta · 1/3')).toBeInTheDocument()
  })

  it('bulunamayan kitapta kataloğa dönüş önerir', () => {
    kur('/odunc/99', sorgu<KitapDetay>(undefined, new ApiHatasi(404, 'Kitap bulunamadı')))
    expect(screen.getByText('Bu fiş çekmecede yok')).toBeInTheDocument()
    const donusler = screen.getAllByRole('link', { name: /Kataloğa dön/ })
    expect(donusler.every((l) => l.getAttribute('href') === '/katalog')).toBe(true)
  })
})
