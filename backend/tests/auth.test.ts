import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_SIFRESI, testOrtami } from './yardimci.js'

let ortam: Awaited<ReturnType<typeof testOrtami>>

beforeAll(async () => {
  ortam = await testOrtami()
})
afterAll(() => ortam.kapat())

describe('auth', () => {
  it('doğru bilgilerle token verir, şifre hash’i dönmez', async () => {
    const yanit = await request(ortam.app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'selin', sifre: TEST_SIFRESI })

    expect(yanit.status).toBe(200)
    expect(yanit.body.success).toBe(true)
    expect(yanit.body.data.token).toEqual(expect.any(String))
    expect(yanit.body.data.gorevli).toMatchObject({ kullaniciAdi: 'selin', ad: 'Selin' })
    expect(yanit.body.data.gorevli.sifreHash).toBeUndefined()
  })

  it('yanlış şifre ve olmayan kullanıcı aynı 401 mesajını alır', async () => {
    const yanlisSifre = await request(ortam.app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'selin', sifre: 'yanlis' })
    const yokKullanici = await request(ortam.app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'kimse', sifre: 'yanlis' })

    expect(yanlisSifre.status).toBe(401)
    expect(yokKullanici.status).toBe(401)
    expect(yanlisSifre.body.error).toBe(yokKullanici.body.error)
  })

  it('eksik alanlarda 400 döner', async () => {
    const yanit = await request(ortam.app).post('/api/auth/giris').send({ kullaniciAdi: 'selin' })
    expect(yanit.status).toBe(400)
    expect(yanit.body.success).toBe(false)
  })

  it('bozuk JSON gövdesinde 400 döner', async () => {
    const yanit = await request(ortam.app)
      .post('/api/auth/giris')
      .set('Content-Type', 'application/json')
      .send('{bozuk')
    expect(yanit.status).toBe(400)
  })

  it('token olmadan korumalı uçlara erişilemez', async () => {
    const yok = await request(ortam.app).get('/api/kitaplar')
    const bozuk = await request(ortam.app).get('/api/kitaplar').set('Authorization', 'Bearer abc')
    expect(yok.status).toBe(401)
    expect(bozuk.status).toBe(401)
  })

  it('/auth/ben giriş yapan görevliyi döner', async () => {
    const yanit = await ortam.api.get('/api/auth/ben')
    expect(yanit.status).toBe(200)
    expect(yanit.body.data).toMatchObject({ id: ortam.gorevli.id, kullaniciAdi: 'selin' })
  })

  it('sağlık kontrolü açıktır, bilinmeyen rota 404 döner', async () => {
    expect((await request(ortam.app).get('/api/saglik')).status).toBe(200)
    expect((await ortam.api.get('/api/yok-boyle-bir-sey')).status).toBe(404)
  })
})

describe('görevliler', () => {
  it('yeni görevli ekler; listede şifre hash’i görünmez', async () => {
    const ekle = await ortam.api.post('/api/gorevliler', {
      ad: 'Mert',
      soyad: 'Çelik',
      kullaniciAdi: 'mert',
      sifre: 'en-az-sekiz',
    })
    expect(ekle.status).toBe(201)
    expect(ekle.body.data.sifreHash).toBeUndefined()

    const giris = await request(ortam.app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'mert', sifre: 'en-az-sekiz' })
    expect(giris.status).toBe(200)

    const liste = await ortam.api.get('/api/gorevliler')
    expect(liste.body.data).toHaveLength(2)
    expect(liste.body.data.every((g: object) => !('sifreHash' in g))).toBe(true)
  })

  it('kısa şifre 400, aynı kullanıcı adı 409 döner', async () => {
    const kisa = await ortam.api.post('/api/gorevliler', {
      ad: 'A',
      soyad: 'B',
      kullaniciAdi: 'kisa',
      sifre: '123',
    })
    const ayni = await ortam.api.post('/api/gorevliler', {
      ad: 'A',
      soyad: 'B',
      kullaniciAdi: 'selin',
      sifre: 'en-az-sekiz',
    })
    expect(kisa.status).toBe(400)
    expect(ayni.status).toBe(409)
  })
})

describe('görevli hesabı yönetimi', () => {
  const yeniGorevli = async (kullaniciAdi: string) =>
    (
      await ortam.api.post('/api/gorevliler', {
        ad: 'Geçici',
        soyad: 'Görevli',
        kullaniciAdi,
        sifre: 'gecici-sifre-1',
      })
    ).body.data

  const girisYap = (kullaniciAdi: string, sifre: string) =>
    request(ortam.app).post('/api/auth/giris').send({ kullaniciAdi, sifre })

  it('devre dışı bırakılan görevlinin token’ı anında geçersiz olur, giriş de yapamaz', async () => {
    const gorevli = await yeniGorevli('ayrilan')
    const token = (await girisYap('ayrilan', 'gecici-sifre-1')).body.data.token
    const istek = () => request(ortam.app).get('/api/kitaplar').set('Authorization', `Bearer ${token}`)
    expect((await istek()).status).toBe(200)

    const kapat = await ortam.api.patch(`/api/gorevliler/${gorevli.id}`, { aktif: false })
    expect(kapat.status).toBe(200)

    expect((await istek()).status).toBe(401)
    expect((await girisYap('ayrilan', 'gecici-sifre-1')).status).toBe(401)
  })

  it('kendi hesabını devre dışı bırakamaz', async () => {
    const yanit = await ortam.api.patch(`/api/gorevliler/${ortam.gorevli.id}`, { aktif: false })
    expect(yanit.status).toBe(422)
  })

  it('şifre değiştirme mevcut şifreyi ister; sonra yalnız yeni şifre geçer', async () => {
    await yeniGorevli('degisen')
    const token = (await girisYap('degisen', 'gecici-sifre-1')).body.data.token
    const degistir = (govde: object) =>
      request(ortam.app).post('/api/auth/sifre').set('Authorization', `Bearer ${token}`).send(govde)

    expect((await degistir({ mevcutSifre: 'yanlis', yeniSifre: 'yepyeni-sifre' })).status).toBe(422)
    expect((await degistir({ mevcutSifre: 'gecici-sifre-1', yeniSifre: 'yepyeni-sifre' })).status).toBe(200)

    expect((await girisYap('degisen', 'gecici-sifre-1')).status).toBe(401)
    expect((await girisYap('degisen', 'yepyeni-sifre')).status).toBe(200)
  })

  it('72 bayttan uzun şifre reddedilir (bcrypt kırpmasın)', async () => {
    const yanit = await ortam.api.post('/api/gorevliler', {
      ad: 'A',
      soyad: 'B',
      kullaniciAdi: 'uzunsifre',
      sifre: 'ş'.repeat(37), // 74 bayt
    })
    expect(yanit.status).toBe(400)
  })
})

describe('istemci hataları 500 değil', () => {
  it('çok büyük gövde 413, aralık dışı id 400 döner', async () => {
    const buyuk = await ortam.api.post('/api/kategoriler', { kod: '1', ad: 'x'.repeat(150_000) })
    expect(buyuk.status).toBe(413)
    expect((await ortam.api.get('/api/uyeler/99999999999')).status).toBe(400)
  })
})
