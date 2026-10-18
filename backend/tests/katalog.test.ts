import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eskiOduncEkle, kitapEkle, testOrtami, uyeEkle } from './yardimci.js'

let ortam: Awaited<ReturnType<typeof testOrtami>>

beforeAll(async () => {
  ortam = await testOrtami()
})
afterAll(() => ortam.kapat())

describe('kategoriler', () => {
  it('kategori ekler ve kitap/kopya sayılarıyla listeler', async () => {
    const ekle = await ortam.api.post('/api/kategoriler', { kod: '900', ad: 'Tarih' })
    expect(ekle.status).toBe(201)
    await kitapEkle(ortam.db, ekle.body.data.id, 3)

    const liste = await ortam.api.get('/api/kategoriler')
    const tarih = liste.body.data.find((k: { kod: string }) => k.kod === '900')
    expect(tarih).toMatchObject({ ad: 'Tarih', kitapSayisi: 1, kopyaSayisi: 3 })
  })

  it('aynı kod ikinci kez eklenemez', async () => {
    const yanit = await ortam.api.post('/api/kategoriler', { kod: '800', ad: 'Yine Edebiyat' })
    expect(yanit.status).toBe(409)
  })
})

describe('kitaplar', () => {
  it('kitabı kopyalarıyla birlikte ekler, barkodlar otomatik üretilir', async () => {
    const yanit = await ortam.api.post('/api/kitaplar', {
      baslik: 'Tutunamayanlar',
      yazar: 'Oğuz Atay',
      yayinevi: 'İletişim Yayınları',
      yerNumarasi: '894.353 ATA·T',
      kategoriId: ortam.kategori.id,
      kopyaSayisi: 3,
      blok: 'B',
      rafNo: 14,
    })

    expect(yanit.status).toBe(201)
    expect(yanit.body.data).toMatchObject({ baslik: 'Tutunamayanlar', yazar: 'Oğuz Atay' })
    expect(yanit.body.data.kopyalar).toHaveLength(3)
    expect(yanit.body.data.kopyalar[0]).toMatchObject({ blok: 'B', rafNo: 14, durum: 'RAFTA' })
    expect(yanit.body.data.kopyalar[0].barkod).toMatch(/^\d{6}$/)
  })

  it('eksik alan 400, olmayan kategori 404 döner', async () => {
    const eksik = await ortam.api.post('/api/kitaplar', { yazar: 'X', kategoriId: ortam.kategori.id })
    const kategoriYok = await ortam.api.post('/api/kitaplar', {
      baslik: 'X',
      yazar: 'Y',
      kategoriId: 9999,
    })
    expect(eksik.status).toBe(400)
    expect(kategoriYok.status).toBe(404)
  })

  it('başlık, yazar veya yer numarasında arar; sayfalama bilgisi döner', async () => {
    const yanit = await ortam.api.get('/api/kitaplar?q=atay')
    expect(yanit.status).toBe(200)
    expect(yanit.body.data).toHaveLength(1)
    expect(yanit.body.data[0]).toMatchObject({
      baslik: 'Tutunamayanlar',
      kopyaSayisi: 3,
      raftakiKopyaSayisi: 3,
      kategori: { kod: '800' },
    })
    expect(yanit.body.meta).toMatchObject({ total: 1, page: 1 })

    const yerNo = await ortam.api.get('/api/kitaplar?q=894.353')
    expect(yerNo.body.data).toHaveLength(1)
  })

  it('arama metnindeki % ve _ joker karakter gibi davranmaz', async () => {
    const yanit = await ortam.api.get('/api/kitaplar?q=%25')
    expect(yanit.body.data).toHaveLength(0)
  })

  it('kategoriye göre filtreler', async () => {
    const yanit = await ortam.api.get(`/api/kitaplar?kategoriId=${ortam.kategori.id}`)
    expect(yanit.body.data.every((k: { kategori: { id: number } }) => k.kategori.id === ortam.kategori.id)).toBe(true)
  })

  it('kitap detayında kopyalar, kimde olduğu ve hareketler görünür', async () => {
    const { kitap, kopyalar } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    const uye = await uyeEkle(ortam.db, { ad: 'Kerem', soyad: 'Yıldız' })
    await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 7 })

    const yanit = await ortam.api.get(`/api/kitaplar/${kitap.id}`)
    expect(yanit.status).toBe(200)
    const [birinci, ikinci] = yanit.body.data.kopyalar
    expect(birinci).toMatchObject({ id: kopyalar[0]!.id, durum: 'ODUNCTE' })
    expect(birinci.aktifOdunc.uye).toMatchObject({ ad: 'Kerem', soyad: 'Yıldız' })
    expect(ikinci).toMatchObject({ durum: 'RAFTA', aktifOdunc: null })
    expect(yanit.body.data.hareketler[0]).toMatchObject({ tip: 'ODUNC', uye: { ad: 'Kerem' } })
  })

  it('olmayan kitap 404, geçersiz id 400 döner', async () => {
    expect((await ortam.api.get('/api/kitaplar/99999')).status).toBe(404)
    expect((await ortam.api.get('/api/kitaplar/abc')).status).toBe(400)
  })

  it('kitap bilgisini günceller', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    const yanit = await ortam.api.patch(`/api/kitaplar/${kitap.id}`, { yerNumarasi: '894.353 YEN·İ' })
    expect(yanit.status).toBe(200)
    expect(yanit.body.data.yerNumarasi).toBe('894.353 YEN·İ')
  })

  it('geçmişi olmayan kitap silinir, geçmişi olan silinemez', async () => {
    const { kitap: bos } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    expect((await ortam.api.delete(`/api/kitaplar/${bos.id}`)).status).toBe(204)
    expect((await ortam.api.get(`/api/kitaplar/${bos.id}`)).status).toBe(404)

    const { kitap: dolu } = await kitapEkle(ortam.db, ortam.kategori.id)
    const uye = await uyeEkle(ortam.db)
    await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: dolu.id, gun: 7 })
    expect((await ortam.api.delete(`/api/kitaplar/${dolu.id}`)).status).toBe(409)
  })
})

describe('kopyalar', () => {
  it('kitaba yeni kopya ekler', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id, 1)
    const yanit = await ortam.api.post(`/api/kitaplar/${kitap.id}/kopyalar`, { adet: 2, blok: 'C', rafNo: 4 })
    expect(yanit.status).toBe(201)
    expect(yanit.body.data).toHaveLength(2)

    const detay = await ortam.api.get(`/api/kitaplar/${kitap.id}`)
    expect(detay.body.data.kopyalar).toHaveLength(3)
  })

  it('kopyanın yerini günceller', async () => {
    const { kopyalar } = await kitapEkle(ortam.db, ortam.kategori.id)
    const yanit = await ortam.api.patch(`/api/kopyalar/${kopyalar[0]!.id}`, { blok: 'A', rafNo: 2 })
    expect(yanit.status).toBe(200)
    expect(yanit.body.data).toMatchObject({ blok: 'A', rafNo: 2 })
  })

  it('raftaki kopya silinir, ödünçteki silinemez', async () => {
    const { kopyalar } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    const uye = await uyeEkle(ortam.db)
    await eskiOduncEkle(ortam.db, uye.id, kopyalar[1]!.id, 5)

    expect((await ortam.api.delete(`/api/kopyalar/${kopyalar[0]!.id}`)).status).toBe(204)
    expect((await ortam.api.delete(`/api/kopyalar/${kopyalar[1]!.id}`)).status).toBe(409)
  })
})
