import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { KURALLAR } from '../src/kurallar.js'
import { bugun, gunEkle } from '../src/tarih.js'
import { eskiOduncEkle, kitapEkle, testOrtami, uyeEkle } from './yardimci.js'

let ortam: Awaited<ReturnType<typeof testOrtami>>

beforeAll(async () => {
  ortam = await testOrtami()
})
afterAll(() => ortam.kapat())

describe('üyeler', () => {
  it('üye ekler; üye no ve kart geçerliliği otomatik atanır', async () => {
    const yanit = await ortam.api.post('/api/uyeler', {
      ad: 'Elif',
      soyad: 'Demirci',
      tur: 'OGRENCI',
      bolum: 'Yazılım Mühendisliği',
      eposta: 'elif@ornek.edu.tr',
    })

    expect(yanit.status).toBe(201)
    expect(yanit.body.data.uyeNo).toMatch(/^Ü-\d{4,}$/)
    expect(yanit.body.data).toMatchObject({
      ad: 'Elif',
      aktif: true,
      uyelikTarihi: bugun(),
      kartGecerlilik: gunEkle(bugun(), KURALLAR.kartGecerlilikGunu),
    })
  })

  it('geçersiz e-posta ve tür 400 döner', async () => {
    const eposta = await ortam.api.post('/api/uyeler', { ad: 'A', soyad: 'B', tur: 'OGRENCI', eposta: 'olmaz' })
    const tur = await ortam.api.post('/api/uyeler', { ad: 'A', soyad: 'B', tur: 'MISAFIR' })
    expect(eposta.status).toBe(400)
    expect(tur.status).toBe(400)
  })

  it('ad, soyad veya üye numarasıyla arar', async () => {
    const adla = await ortam.api.get('/api/uyeler?q=demir')
    expect(adla.body.data).toHaveLength(1)
    expect(adla.body.data[0]).toMatchObject({ ad: 'Elif', aktifOduncSayisi: 0 })

    const noyla = await ortam.api.get(`/api/uyeler?q=${encodeURIComponent(adla.body.data[0].uyeNo)}`)
    expect(noyla.body.data).toHaveLength(1)
  })

  it('üye detayında elindekiler, gecikme, ceza ve engeller görünür', async () => {
    const uye = await uyeEkle(ortam.db)
    const { kopyalar } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    await eskiOduncEkle(ortam.db, uye.id, kopyalar[0]!.id, -3)
    await eskiOduncEkle(ortam.db, uye.id, kopyalar[1]!.id, 5)

    const yanit = await ortam.api.get(`/api/uyeler/${uye.id}`)
    expect(yanit.status).toBe(200)
    const { data } = yanit.body
    expect(data.aktifOduncler).toHaveLength(2)
    expect(data.aktifOduncler[0]).toMatchObject({ gecikmeGunu: 3, kopya: { kitap: { yazar: 'Test Yazar' } } })
    expect(data.istatistik).toMatchObject({ aktifOduncSayisi: 2, gecikmisOduncSayisi: 1, okunanKitapSayisi: 0 })
    expect(data.oduncEngelleri).toEqual(['Teslim tarihi geçmiş kitabı var'])
  })

  it('üyeyi pasife alır; olmayan üye 404 döner', async () => {
    const uye = await uyeEkle(ortam.db)
    const yanit = await ortam.api.patch(`/api/uyeler/${uye.id}`, { aktif: false })
    expect(yanit.status).toBe(200)
    expect(yanit.body.data.aktif).toBe(false)

    expect((await ortam.api.patch('/api/uyeler/99999', { aktif: false })).status).toBe(404)
    expect((await ortam.api.get('/api/uyeler/99999')).status).toBe(404)
  })
})
