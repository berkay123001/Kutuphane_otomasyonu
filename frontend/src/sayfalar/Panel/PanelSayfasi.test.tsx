import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
import type { KategoriSayacli, Panel, PanelGeciken } from '../../api/semalar'
import { TemaSaglayici } from '../../tema/TemaSaglayici'
import { BildirimSaglayici } from '../../ui/Bildirim'
import PanelSayfasi from './PanelSayfasi'
import { HATIRLATMA_ANAHTARI } from './panelVeri'

interface SahteSorgu<T> {
  data: { veri: T } | undefined
  isError: boolean
  error: unknown
  refetch: () => Promise<unknown>
}

const sorgular = vi.hoisted(() => ({
  panel: null as unknown,
  kategoriler: null as unknown,
}))

vi.mock('../../api/sorgular', () => ({
  usePanel: () => sorgular.panel,
  useKategoriler: () => sorgular.kategoriler,
}))

function basarili<T>(veri: T): SahteSorgu<T> {
  return { data: { veri }, isError: false, error: null, refetch: vi.fn(() => Promise.resolve()) }
}

function geciken(id: number, uyeId: number, gun: number, baslik: string): PanelGeciken {
  return {
    id,
    uyeId,
    kopyaId: id * 10,
    verilisZamani: '2026-09-20T09:00:00.000Z',
    sonTeslimTarihi: '2026-10-04',
    iadeZamani: null,
    uzatildi: false,
    uye: { id: uyeId, uyeNo: `Ü-${uyeId}`, ad: `Ad${uyeId}`, soyad: 'Soyad' },
    kopya: { id: id * 10, barkod: `B${id}`, kitap: { id: id * 100, baslik, yazar: 'Yazar', yerNumarasi: `894.35 K${id}` } },
    gecikmeGunu: gun,
  }
}

const PANEL: Panel = {
  bugun: { odunc: 48, iade: 31, gecikmis: 12, yeniUye: 5 },
  sonHareketler: [
    {
      id: 1,
      tip: 'ODUNC',
      zaman: '2026-10-17T11:52:00.000Z',
      kitapId: 7,
      kopyaId: 70,
      uyeId: 3,
      uye: { id: 3, uyeNo: 'Ü-2291', ad: 'Elif', soyad: 'Demirci' },
      kitap: { id: 7, baslik: 'Tutunamayanlar', yazar: 'Oğuz Atay', yerNumarasi: '894.353 ATA·T' },
      kopya: { id: 70, barkod: 'K70' },
    },
    {
      id: 2,
      tip: 'GEC_IADE',
      zaman: '2026-10-17T10:58:00.000Z',
      kitapId: 8,
      kopyaId: 80,
      uyeId: 4,
      uye: { id: 4, uyeNo: 'Ü-1630', ad: 'Deniz', soyad: 'Koç' },
      kitap: { id: 8, baslik: 'İnce Memed', yazar: 'Yaşar Kemal', yerNumarasi: null },
      kopya: null,
    },
  ],
  gecikenler: [
    geciken(11, 21, 9, 'Osmanlı İmparatorluğu'),
    geciken(12, 22, 6, 'Memleketimden İnsan Manzaraları'),
    geciken(13, 22, 4, 'Kozmos'),
    geciken(14, 24, 2, 'Sokrates’in Savunması'),
    geciken(15, 25, 1, 'Beşinci fiş'),
  ],
}

const KATEGORILER: KategoriSayacli[] = [
  { id: 1, kod: '000', ad: 'Genel konular', kitapSayisi: 10, kopyaSayisi: 1204 },
  { id: 9, kod: '800', ad: 'Edebiyat', kitapSayisi: 80, kopyaSayisi: 8920 },
  { id: 10, kod: '900', ad: 'Tarih, coğrafya', kitapSayisi: 30, kopyaSayisi: 3978 },
]

function ciz() {
  return render(
    <StrictMode>
      <TemaSaglayici>
        <BildirimSaglayici>
            <MemoryRouter initialEntries={['/panel']}>
              <PanelSayfasi />
            </MemoryRouter>
        </BildirimSaglayici>
      </TemaSaglayici>
    </StrictMode>,
  )
}

/** Pazar, 18 Ekim 2026 — İstanbul'da öğlen; gece yarısı oynaklığı olmasın. */
const SIMDI = new Date('2026-10-18T09:00:00.000Z')

function saatiSabitle(ekstra: ('setTimeout' | 'clearTimeout')[] = []) {
  vi.useFakeTimers({ toFake: ['Date', ...ekstra] })
  vi.setSystemTime(SIMDI)
}

const gecikenBolumu = () => within(document.getElementById('gecikenler') as HTMLElement)

beforeEach(() => {
  saatiSabitle()
  sorgular.panel = basarili(PANEL)
  sorgular.kategoriler = basarili(KATEGORILER)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PanelSayfasi', () => {
  it('bugünü, sayaç fişlerini, defteri, desteyi ve dolabı gerçek veriden çizer', () => {
    ciz()
    const baslik = screen.getByRole('heading', { level: 1 })
    expect(baslik).toHaveTextContent('Pazar,')
    expect(baslik).toHaveTextContent('18 Ekim.')
    expect(screen.getByText('Bugün 48 fiş kesildi, 31 kitap döndü.')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Katalogda ara' })).toHaveAttribute('href', '/katalog')
    expect(screen.getByRole('link', { name: /Hızlı ödünç/ })).toHaveAttribute('href', '/odunc')

    expect(screen.getByRole('link', { name: /Ödünç.*48.*fiş kesildi/ })).toHaveAttribute('href', '/odunc')
    const gecikenFisi = screen.getByRole('link', { name: /Geciken.*12.*en eskisi 9 gün/ })
    expect(gecikenFisi).toHaveAttribute('href', '#gecikenler')
    expect(within(gecikenFisi).getByText('Gecikmiş')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Yeni üye.*5/ })).toHaveAttribute('href', '/uyeler')

    const defter = within(screen.getByRole('list'))
    expect(defter.getAllByRole('listitem')).toHaveLength(2)
    expect(defter.getByText('14:52')).toBeInTheDocument()
    expect(defter.getAllByText('17.10')).toHaveLength(2)
    expect(screen.getByText('No. 0291 · 18.10.2026')).toBeInTheDocument()
    expect(screen.getByText('Son 2 hareket · en yenisi üstte')).toBeInTheDocument()
    expect(defter.getByText('Ödünç')).toBeInTheDocument()
    expect(defter.getByText('Geç iade')).toBeInTheDocument()
    expect(defter.getByRole('link', { name: 'Elif Demirci' })).toHaveAttribute('href', '/uyeler/3')
    expect(defter.getByRole('link', { name: 'Tutunamayanlar' })).toHaveAttribute('href', '/odunc/7')

    const gecikenler = gecikenBolumu()
    expect(gecikenler.getByText('12 fiş · desteyi aç')).toBeInTheDocument()
    expect(gecikenler.queryByText('Beşinci fiş')).not.toBeInTheDocument()
    expect(gecikenler.getByRole('link', { name: /Osmanlı İmparatorluğu/ })).toHaveAttribute('href', '/uyeler/21')

    expect(screen.getByText(/Bir çekmeceye tıkla, dışarı kaysın · 14\.102 fiş/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /800.*Edebiyat.*8\.920 fiş/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('hatırlatma işaretini fişlere vurur, saklar ve geri alır', async () => {
    const kullanici = userEvent.setup()
    ciz()
    const dugme = screen.getByRole('button', { name: '3 kişiyi hatırlatıldı olarak işaretle' })
    await kullanici.click(dugme)

    expect(await screen.findAllByText('Hatırlatıldı')).toHaveLength(4)
    expect(JSON.parse(localStorage.getItem(HATIRLATMA_ANAHTARI) ?? '[]')).toEqual([14, 13, 12, 11])
    expect(dugme).toHaveTextContent('İşaretleri kaldır')
    expect(screen.getByText('3 kişi hatırlatıldı olarak işaretlendi')).toBeInTheDocument()

    await kullanici.click(dugme)
    expect(JSON.parse(localStorage.getItem(HATIRLATMA_ANAHTARI) ?? '[]')).toEqual([])
    expect(dugme).toHaveTextContent('3 kişiyi hatırlatıldı olarak işaretle')
  })

  it('çekmeceyi tıklayınca açar ve kataloğa bağlar', async () => {
    const kullanici = userEvent.setup()
    ciz()
    const cekmece = screen.getByRole('button', { name: /000.*Genel konular/ })
    await kullanici.click(cekmece)
    expect(cekmece).toHaveAttribute('aria-expanded', 'true')
    const git = screen.getByRole('link', { name: 'Fişlere bak — Genel konular' })
    expect(git).toHaveAttribute('href', '/katalog?kategori=1')

    git.focus()
    await kullanici.keyboard('{Escape}')
    expect(cekmece).toHaveAttribute('aria-expanded', 'false')
    expect(cekmece).toHaveFocus()
  })

  it('dokunulmazsa 3,6 sn sonra en dolu çekmeceyi kendiliğinden açar', () => {
    saatiSabitle(['setTimeout', 'clearTimeout'])
    ciz()
    const edebiyat = screen.getByRole('button', { name: /800.*Edebiyat/ })
    act(() => vi.advanceTimersByTime(3599))
    expect(edebiyat).toHaveAttribute('aria-expanded', 'false')
    act(() => vi.advanceTimersByTime(1))
    expect(edebiyat).toHaveAttribute('aria-expanded', 'true')
  })

  it('panel alınamazsa hata kutusu gösterir ve yeniden dener', async () => {
    const kullanici = userEvent.setup()
    const refetch = vi.fn(() => Promise.resolve())
    sorgular.panel = { data: undefined, isError: true, error: new Error('x'), refetch }
    ciz()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hareket defteri' })).not.toBeInTheDocument()
    await kullanici.click(screen.getByRole('button', { name: 'Yeniden dene' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('önceden işaretlenmiş fişleri hatırlar, kalanları sayar', async () => {
    localStorage.setItem(HATIRLATMA_ANAHTARI, '[11]')
    const kullanici = userEvent.setup()
    ciz()
    expect(screen.getAllByText('Hatırlatıldı')).toHaveLength(1)
    await kullanici.click(screen.getByRole('button', { name: '2 kişiyi hatırlatıldı olarak işaretle' }))
    expect(JSON.parse(localStorage.getItem(HATIRLATMA_ANAHTARI) ?? '[]')).toEqual([11, 14, 13, 12])
  })

  it('geciken fişi gecikenler destesine götürür', async () => {
    const kullanici = userEvent.setup()
    ciz()
    await kullanici.click(screen.getByRole('link', { name: /Geciken.*12/ }))
    expect(document.getElementById('gecikenler')).toHaveFocus()
  })

  it('kategoriler alınamazsa yalnızca dolapta hata gösterir', () => {
    sorgular.kategoriler = { data: undefined, isError: true, error: new Error('x'), refetch: vi.fn() }
    ciz()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hareket defteri' })).toBeInTheDocument()
    expect(screen.getByText('Bir çekmeceye tıkla, dışarı kaysın')).toBeInTheDocument()
  })

  it('defter boşsa boş satır basar', () => {
    sorgular.panel = basarili({ ...PANEL, sonHareketler: [] })
    ciz()
    expect(screen.getByText('— Deftere henüz hareket yazılmadı —')).toBeInTheDocument()
    expect(screen.getByText('Henüz hareket yok')).toBeInTheDocument()
  })

  it('geciken yoksa boş durumu gösterir', () => {
    sorgular.panel = basarili({ ...PANEL, gecikenler: [], bugun: { ...PANEL.bugun, gecikmis: 0 } })
    ciz()
    expect(screen.getByText('Geciken fiş yok')).toBeInTheDocument()
    expect(screen.queryByText('Gecikmiş')).not.toBeInTheDocument()
    expect(screen.getByText('gecikme yok')).toBeInTheDocument()
  })
})
