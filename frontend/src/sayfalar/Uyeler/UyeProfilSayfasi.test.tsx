import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiHatasi } from '../../api/istemci'
import * as sorgular from '../../api/sorgular'
import type { Ceza, Odunc, UyeDetay } from '../../api/semalar'
import { gunEkle, kisaTarih } from '../../lib/tarih'
import { BUGUN, ORNEK_CEZA, ornekUye } from './test/ornekler'
import { ciz, sahteMutasyon } from './test/ortam'
import UyeProfilSayfasi from './UyeProfilSayfasi'

vi.mock('../../api/sorgular', () => ({
  useUye: vi.fn(),
  useUzat: vi.fn(),
  useIade: vi.fn(),
  useCezaOde: vi.fn(),
  useRezervasyonIptal: vi.fn(),
  useKartYenile: vi.fn(),
}))

const m = vi.mocked(sorgular)
type UyeSorgusu = ReturnType<typeof sorgular.useUye>

function uyeDondur(veri: UyeDetay | undefined, ek: Partial<Record<'isError' | 'isPending', boolean>> & { error?: unknown } = {}) {
  const refetch = vi.fn()
  m.useUye.mockReturnValue({
    data: veri ? { veri } : undefined,
    isPending: !veri && !ek.isError,
    isError: false,
    error: null,
    refetch,
    ...ek,
  } as unknown as UyeSorgusu)
  return refetch
}

function mutasyonlar() {
  const uzat = sahteMutasyon<number, { veri: Odunc }>()
  const iade = sahteMutasyon<number, { veri: { odunc: Odunc; ceza: Ceza | null } }>()
  const ode = sahteMutasyon<number, { veri: Ceza }>()
  const iptal = sahteMutasyon<number, unknown>()
  const yenile = sahteMutasyon<{ id: number; kartGecerlilik: string }, unknown>()
  m.useUzat.mockReturnValue(uzat as unknown as ReturnType<typeof sorgular.useUzat>)
  m.useIade.mockReturnValue(iade as unknown as ReturnType<typeof sorgular.useIade>)
  m.useCezaOde.mockReturnValue(ode as unknown as ReturnType<typeof sorgular.useCezaOde>)
  m.useRezervasyonIptal.mockReturnValue(iptal as unknown as ReturnType<typeof sorgular.useRezervasyonIptal>)
  m.useKartYenile.mockReturnValue(yenile as unknown as ReturnType<typeof sorgular.useKartYenile>)
  return { uzat, iade, ode, iptal, yenile }
}

const profiliCiz = (yol = '/uyeler/7') => ciz(<UyeProfilSayfasi />, yol, '/uyeler/:uyeId')
const fis = (baslik: string) => screen.getByRole('article', { name: baslik })

describe('Üye profili', () => {
  let mut: ReturnType<typeof mutasyonlar>
  beforeEach(() => {
    mut = mutasyonlar()
  })

  it('başlığı, okuyucu kartını, kotayı ve bilgileri gösterir', () => {
    uyeDondur(ornekUye())
    profiliCiz()
    expect(m.useUye).toHaveBeenCalledWith(7)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Elif Demirci')
    expect(screen.getByText('Ü-2291 · Öğrenci · Yazılım Mühendisliği · 2023 yılından beri üye')).toBeInTheDocument()
    expect(screen.getByText('Aktif')).toHaveClass('stamp', 'ink-lv', 'slam')
    expect(screen.getByText('1 gecikme')).toHaveClass('ink-lr')
    expect(screen.getByText('Okuyucu no').nextElementSibling).toHaveTextContent('Ü-2291')
    expect(screen.getByText('Onaylı')).toBeInTheDocument()
    expect(screen.getByText('E. Demirci')).toBeInTheDocument()
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
    expect(screen.getByText('47 kitap')).toBeInTheDocument()
    expect(screen.getByText('Eyl 2023')).toBeInTheDocument()
    expect(screen.getByText('Ödenmemiş ceza').nextElementSibling).toHaveTextContent('₺4,00')
    expect(screen.queryByRole('button', { name: 'Kartı yenile' })).not.toBeInTheDocument()
  })

  it('ödünç ver ve tüm üyeler bağlantıları', () => {
    uyeDondur(ornekUye())
    profiliCiz()
    const ver = screen.getByRole('link', { name: 'Bu üyeye ödünç ver' })
    expect(ver).toHaveAttribute('href', '/odunc?uye=7')
    expect(ver).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('link', { name: 'Tüm üyeler' })).toHaveAttribute('href', '/uyeler')
  })

  it('elindekiler: kalan gün, gecikme, bugün verildi, en yeni üstte', () => {
    uyeDondur(ornekUye())
    profiliCiz()
    const fisler = screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))
    expect(fisler).toEqual(['odunc-101', 'odunc-102', 'odunc-103'])

    const yeni = within(fis('Tutunamayanlar'))
    expect(yeni.getByText('Bugün verildi')).toBeInTheDocument()
    expect(yeni.getByText('14')).toBeInTheDocument()

    const orta = within(fis('Saatleri Ayarlama Enstitüsü'))
    expect(orta.getByText('gün kaldı').parentElement).toHaveAttribute('data-ton', 'yakin')
    expect(orta.getByText('5')).toBeInTheDocument()
    expect(orta.getByText(`${kisaTarih(gunEkle(BUGUN, -9))} → ${kisaTarih(gunEkle(BUGUN, 5))}`)).toBeInTheDocument()

    const gec = within(fis('Sokrates’in Savunması'))
    expect(gec.getByText('gün gecikti').parentElement).toHaveAttribute('data-ton', 'gec')
    expect(gec.getByRole('button', { name: 'Uzatılamaz — Gecikmiş ödünç uzatılamaz' })).toHaveAttribute('aria-disabled', 'true')
    expect(fis('Sokrates’in Savunması').querySelectorAll('[class*="gecikme"]')).toHaveLength(2)
  })

  it('7 gün uzatır ve yeni son günü bildirir', async () => {
    const uye = ornekUye()
    uyeDondur(uye)
    profiliCiz()
    await userEvent.click(within(fis('Saatleri Ayarlama Enstitüsü')).getByRole('button', { name: '7 gün uzat' }))
    expect(mut.uzat.mutate).toHaveBeenCalledWith(102, expect.anything())
    const yeniSon = gunEkle(BUGUN, 12)
    const odunc = uye.aktifOduncler[2]
    if (!odunc) throw new Error('örnek eksik')
    act(() => mut.uzat.basar({ veri: { ...odunc, sonTeslimTarihi: yeniSon, uzatildi: true } }))
    expect(await screen.findByText(`Yeni son gün ${kisaTarih(yeniSon)}`)).toBeInTheDocument()
    const dugme = within(fis('Saatleri Ayarlama Enstitüsü')).getByRole('button', { name: 'Uzatıldı' })
    expect(dugme).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(dugme)
    expect(mut.uzat.mutate).toHaveBeenCalledTimes(1)
  })

  it('uzatılmış ödünçte Uzatıldı damgası ve kapalı düğme', () => {
    const uye = ornekUye()
    uyeDondur({ ...uye, aktifOduncler: uye.aktifOduncler.map((o) => (o.id === 101 ? { ...o, uzatildi: true } : o)) })
    profiliCiz()
    const yeni = within(fis('Tutunamayanlar'))
    expect(yeni.getByText('Uzatıldı')).toBeInTheDocument()
    expect(yeni.getByRole('button', { name: 'Uzatılamaz — Bu ödünç bir kez uzatıldı' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('iade alır: damga basar, cezayı bildirir, tazelemeden sonra da fiş kısa süre kalır', async () => {
    const uye = ornekUye()
    uyeDondur(uye)
    const { yeniden } = profiliCiz()
    const sokrates = () => fis('Sokrates’in Savunması')
    await userEvent.click(within(sokrates()).getByRole('button', { name: 'İade al' }))
    expect(mut.iade.mutate).toHaveBeenCalledWith(103, expect.anything())

    const odunc = uye.aktifOduncler[0]
    if (!odunc) throw new Error('örnek eksik')
    const ceza: Ceza = { ...ORNEK_CEZA, id: 99, oduncId: 103 }
    act(() => mut.iade.basar({ veri: { odunc, ceza } }))
    expect(within(sokrates()).getByText(`İade alındı · ${kisaTarih(BUGUN)}`)).toBeInTheDocument()
    expect(sokrates()).toHaveAttribute('data-gitti', 'true')
    expect(within(sokrates()).getByRole('button', { name: 'İade alındı' })).toHaveAttribute('aria-disabled', 'true')
    expect(await screen.findByText('Gecikme cezası ₺4,00 yazıldı')).toBeInTheDocument()

    uyeDondur({ ...uye, aktifOduncler: uye.aktifOduncler.filter((o) => o.id !== 103) })
    yeniden()
    expect(within(sokrates()).getByText(`İade alındı · ${kisaTarih(BUGUN)}`)).toBeInTheDocument()
  })

  it('iade hatasında fiş yerinde kalır ve hata bildirilir', async () => {
    uyeDondur(ornekUye())
    profiliCiz()
    await userEvent.click(within(fis('Tutunamayanlar')).getByRole('button', { name: 'İade al' }))
    act(() => mut.iade.bozul(new ApiHatasi(409, 'Bu ödünç zaten iade edilmiş')))
    expect(await screen.findByText('Bu ödünç zaten iade edilmiş')).toBeInTheDocument()
    expect(fis('Tutunamayanlar')).toHaveAttribute('data-gitti', 'false')
  })

  it('cezayı öder ve ayırtmaları gösterip iptal eder', async () => {
    uyeDondur(ornekUye())
    profiliCiz()
    expect(screen.getByRole('heading', { name: 'Ödenmemiş cezalar' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Öde · Huzur' }))
    expect(mut.ode.mutate).toHaveBeenCalledWith(55, expect.anything())
    act(() => mut.ode.basar({ veri: { ...ORNEK_CEZA, odendi: true } }))
    expect(screen.getAllByText('Ödendi').some((e) => e.classList.contains('stamp'))).toBe(true)
    expect(await screen.findByText('₺4,00 ceza ödendi')).toBeInTheDocument()

    expect(screen.getByText(`Rafta bekliyor · son gün ${kisaTarih(gunEkle(BUGUN, 2))}`)).toHaveClass('ink-v')
    expect(screen.getByText('Sırada')).toHaveClass('ink-k')
    await userEvent.click(screen.getByRole('button', { name: 'İptal · İnce Memed' }))
    expect(mut.iptal.mutate).toHaveBeenCalledWith(72, expect.anything())
    act(() => mut.iptal.basar({}))
    expect(screen.getByRole('button', { name: 'İptal edildi · İnce Memed' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('okuma rafı: eskiden yeniye sırtlar katalog bağlantısıdır', () => {
    uyeDondur(ornekUye())
    profiliCiz()
    const raf = screen.getByRole('list', { name: 'Son okuduğu kitaplar' })
    const sirtlar = within(raf).getAllByRole('link')
    expect(sirtlar).toHaveLength(2)
    expect(sirtlar[0]).toHaveAccessibleName('Beyaz Kale · Eyl 2023')
    expect(sirtlar[1]).toHaveAccessibleName('Kara Kitap · Oca 2024')
    expect(sirtlar[0]).toHaveAttribute('href', '/katalog?kitap=700')
    expect(screen.getByText('Son okuduğu 2 kitap · sırta gel, tarihi görünsün')).toBeInTheDocument()
  })

  it('kartı çevirir: yüzlerin aria-hidden değerleri yer değiştirir', async () => {
    uyeDondur(ornekUye())
    profiliCiz()
    const on = screen.getByText('Merkez Kütüphane').closest('[aria-hidden]')
    const arka = screen.getByText('E. Demirci').closest('[aria-hidden]')
    expect(on).toHaveAttribute('aria-hidden', 'false')
    expect(arka).toHaveAttribute('aria-hidden', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Kartı çevir' }))
    expect(screen.getByRole('button', { name: 'Ön yüze çevir' })).toHaveAttribute('aria-pressed', 'true')
    expect(on).toHaveAttribute('aria-hidden', 'true')
    expect(arka).toHaveAttribute('aria-hidden', 'false')
  })

  it('süresi dolmuş kart: damgalar ve yenileme', async () => {
    uyeDondur(ornekUye({ kartGecerlilik: gunEkle(BUGUN, -3) }))
    profiliCiz()
    expect(screen.getByText('Kart süresi doldu')).toHaveClass('ink-lr')
    expect(screen.getByText('Süresi doldu')).toHaveClass('ink-r')
    expect(screen.getByText('Kartın süresi 3 gün önce doldu.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Kartı yenile' }))
    expect(mut.yenile.mutate).toHaveBeenCalledWith({ id: 7, kartGecerlilik: gunEkle(BUGUN, 365) }, expect.anything())
    act(() => mut.yenile.basar({}))
    expect(screen.getByRole('button', { name: 'Kart yenilendi' })).toHaveAttribute('aria-disabled', 'true')
    expect(await screen.findByText(/tarihine kadar geçerli/)).toBeInTheDocument()
  })

  it('ödünç engeli varsa bağlantı kapalı ve nedenler yazılı', async () => {
    uyeDondur(ornekUye({ oduncEngelleri: ['Ödenmemiş cezası var'] }))
    profiliCiz()
    const ver = screen.getByRole('link', { name: 'Bu üyeye ödünç ver' })
    expect(ver).toHaveAttribute('aria-disabled', 'true')
    expect(ver).not.toHaveAttribute('href')
    expect(ver).toHaveAccessibleDescription(/Ödenmemiş cezası var/)
    expect(screen.getByRole('list', { name: 'Ödünç engelleri' })).toHaveTextContent('Ödenmemiş cezası var')
    await userEvent.click(ver)
    expect(screen.getByTestId('konum')).toHaveTextContent('/uyeler/7')
  })

  it('boş üye: elinde kitap yok, raf boş, boş bölümler gizli', () => {
    uyeDondur(ornekUye({ aktifOduncler: [], gecmis: [], odenmemisCezalar: [], rezervasyonlar: [] }))
    profiliCiz()
    expect(screen.getByText('Elinde kitap yok')).toBeInTheDocument()
    expect(screen.getByText('Raf henüz boş')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ödenmemiş cezalar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ayırttıkları' })).not.toBeInTheDocument()
  })

  it('yüklenirken ve hata durumunda', async () => {
    uyeDondur(undefined)
    const { unmount } = profiliCiz()
    expect(screen.getByText('Okuyucu kartı dolaptan çıkarılıyor…')).toBeInTheDocument()
    unmount()

    const yenidenDene = uyeDondur(undefined, { isError: true, error: new ApiHatasi(404, 'Üye bulunamadı') })
    profiliCiz()
    expect(screen.getByRole('alert')).toHaveTextContent('Üye bulunamadı')
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }))
    expect(yenidenDene).toHaveBeenCalled()
  })

  it('geçersiz adreste sorgu atmaz', () => {
    uyeDondur(undefined)
    profiliCiz('/uyeler/abc')
    expect(m.useUye).toHaveBeenLastCalledWith(null)
    expect(screen.getByText('Böyle bir okuyucu yok')).toBeInTheDocument()
  })
})
