import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { KitapFiltresi } from '../../api/uclar'
import { useKitaplar } from '../../api/sorgular'
import { TemaSaglayici } from '../../tema/TemaSaglayici'
import { BildirimSaglayici } from '../../ui/Bildirim'
import KatalogSayfasi from './KatalogSayfasi'
import { ORNEK_DETAY, ORNEK_KATEGORILER, ORNEK_KITAPLAR, ORNEK_UYELER } from './ornekVeri'

const ayirt = vi.fn()

vi.mock('../../api/sorgular', () => ({
  useKategoriler: () => ({ data: { veri: ORNEK_KATEGORILER }, isSuccess: true }),
  useKitaplar: vi.fn((f: KitapFiltresi) => {
    const veri = ORNEK_KITAPLAR.filter((k) => f.kategoriId === undefined || k.kategoriId === f.kategoriId)
    return {
      data: { veri, meta: { page: 1, limit: 100, total: veri.length } },
      isSuccess: true,
      isPlaceholderData: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }
  }),
  useKitap: (id: number | null) => ({
    data: id === ORNEK_DETAY.id ? { veri: ORNEK_DETAY } : undefined,
    isError: false,
    refetch: vi.fn(),
  }),
  useUyeler: (_f: unknown, etkin: boolean) => ({
    data: etkin ? { veri: ORNEK_UYELER } : undefined,
    isError: false,
  }),
  useRezervasyon: () => ({ mutateAsync: ayirt, isPending: false }),
}))

function kur(adres = '/katalog') {
  return render(
    <MemoryRouter initialEntries={[adres]}>
      <TemaSaglayici>
          <BildirimSaglayici>
            <KatalogSayfasi />
          </BildirimSaglayici>
      </TemaSaglayici>
    </MemoryRouter>,
  )
}

const kart = (baslik: RegExp) => screen.getByRole('button', { name: baslik })

describe('KatalogSayfasi', () => {
  beforeEach(() => {
    ayirt.mockReset()
    vi.mocked(useKitaplar).mockClear()
  })

  it('çekmeceyi, sekmeleri ve ilk fişin ayrıntısını gösterir', () => {
    kur()
    expect(screen.getByRole('heading', { level: 1, name: 'Katalog' })).toBeInTheDocument()
    expect(screen.getByText('fiş · 000–999 · Tüm koleksiyon')).toBeInTheDocument()

    const sekmeler = within(screen.getByRole('tablist', { name: 'Kategoriler' })).getAllByRole('tab')
    expect(sekmeler.map((s) => s.textContent)).toEqual(['Tümü 12', 'Felsefe 1', 'Edebiyat 9', 'Osmanlı Tarihi 2'])
    expect(sekmeler[0]).toHaveAttribute('aria-selected', 'true')

    expect(kart(/^894\.353 ATA·T/)).toHaveAttribute('aria-pressed', 'true')
    expect(kart(/Saatleri Ayarlama/)).toHaveAttribute('aria-pressed', 'false')
    expect(within(kart(/Saatleri Ayarlama/)).getByText('Ödünçte')).toBeInTheDocument()

    const fis = screen.getByRole('article', { name: 'Tutunamayanlar katalog fişi' })
    expect(within(fis).getByText('Tutunamayanlar / Oğuz Atay. — İletişim Yayınları, 1972.')).toBeInTheDocument()
    expect(within(fis).getByText('Demirbaş 004217')).toBeInTheDocument()
    expect(screen.getByText('B Blok · Raf 15')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fişi aç, ödünç ver/ })).toHaveAttribute('href', '/odunc/7')
    expect(screen.getByRole('link', { name: /Panele dön/ })).toHaveAttribute('href', '/panel')
    expect(screen.getByText('Geç iade')).toBeInTheDocument()
  })

  it('fiş seçer, sekmeyi klavyeyle değiştirir ve sorguyu gecikmeli uygular', async () => {
    const kullanici = userEvent.setup()
    kur()
    await kullanici.click(kart(/Saatleri Ayarlama/))
    expect(kart(/Saatleri Ayarlama/)).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByText('Saatleri Ayarlama Enstitüsü / Ahmet Hamdi Tanpınar. — Dergâh Yayınları.'),
    ).toBeInTheDocument()

    const tumu = screen.getByRole('tab', { name: /Tümü/ })
    tumu.focus()
    await kullanici.keyboard('{ArrowRight}')
    const felsefe = screen.getByRole('tab', { name: /Felsefe/ })
    expect(felsefe).toHaveAttribute('aria-selected', 'true')
    expect(felsefe).toHaveFocus()
    await waitFor(() =>
      expect(vi.mocked(useKitaplar)).toHaveBeenLastCalledWith(expect.objectContaining({ kategoriId: 2 })),
    )
    expect(await screen.findByText('Bu çekmecede eşleşen fiş yok.', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('fiş · 100–199 · Felsefe')).toBeInTheDocument()
  })

  it('fişler tek Tab durağıdır, oklarla gezilir, Enter ile seçilir', async () => {
    const kullanici = userEvent.setup()
    kur()
    const ilk = kart(/^894\.353 ATA·T/)
    const ikinci = kart(/Saatleri Ayarlama/)
    expect(ilk).toHaveAttribute('tabindex', '0')
    expect(ikinci).toHaveAttribute('tabindex', '-1')
    ilk.focus()
    await kullanici.keyboard('{ArrowDown}')
    expect(ikinci).toHaveFocus()
    await kullanici.keyboard('{Enter}')
    expect(ikinci).toHaveAttribute('aria-pressed', 'true')
    expect(ikinci).toHaveAttribute('tabindex', '0')
    await kullanici.keyboard('{Home}')
    expect(ilk).toHaveFocus()
  })

  it('üye seçip kitabı ayırtır ve bildirir', async () => {
    ayirt.mockResolvedValue({ veri: { durum: 'HAZIR' } })
    const kullanici = userEvent.setup()
    kur('/katalog?kitap=7')
    await kullanici.click(screen.getByRole('button', { name: 'Bu kitabı ayırt' }))
    const secici = screen.getByRole('group', { name: 'Tutunamayanlar için üye seç' })
    await kullanici.type(within(secici).getByRole('searchbox'), 'Se')
    await kullanici.click(await within(secici).findByRole('button', { name: /Ü-0004/ }))
    expect(ayirt).toHaveBeenCalledWith({ uyeId: 4, kitapId: 7 })
    expect(await screen.findByText('Selin Aydın için ayırtıldı')).toBeInTheDocument()
    expect(screen.getByText('— Rafta hazır')).toBeInTheDocument()
  })
})
