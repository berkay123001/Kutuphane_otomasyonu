import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hareketler, kopyalar, rezervasyonlar } from '../src/db/schema.js'
import { KURALLAR } from '../src/kurallar.js'
import { suresiDolanRezervasyonlariKapat } from '../src/servisler/rezervasyon-servisi.js'
import { bugun, gunEkle } from '../src/tarih.js'
import { eskiOduncEkle, kitapEkle, testOrtami, uyeEkle } from './yardimci.js'

let ortam: Awaited<ReturnType<typeof testOrtami>>

beforeAll(async () => {
  ortam = await testOrtami()
})
afterAll(() => ortam.kapat())

const kopyaDurumu = async (id: number) =>
  (await ortam.db.query.kopyalar.findFirst({ where: eq(kopyalar.id, id) }))!.durum

const rezervasyon = async (id: number) =>
  (await ortam.db.query.rezervasyonlar.findFirst({ where: eq(rezervasyonlar.id, id) }))!

describe('ödünç verme', () => {
  it('raftaki kopyayı verir, son teslim tarihini hesaplar, hareketi kaydeder', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const uye = await uyeEkle(ortam.db)

    const yanit = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 14 })

    expect(yanit.status).toBe(201)
    expect(yanit.body.data).toMatchObject({
      uyeId: uye.id,
      kopyaId: kopya!.id,
      sonTeslimTarihi: gunEkle(bugun(), 14),
      iadeZamani: null,
      uzatildi: false,
    })
    expect(await kopyaDurumu(kopya!.id)).toBe('ODUNCTE')
    const kayit = await ortam.db.query.hareketler.findFirst({ where: eq(hareketler.kitapId, kitap.id) })
    expect(kayit).toMatchObject({ tip: 'ODUNC', uyeId: uye.id, gorevliId: ortam.gorevli.id })
  })

  it('barkodla belirli bir kopyayı verir', async () => {
    const { kopyalar: [, ikinci] } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    const uye = await uyeEkle(ortam.db)

    const yanit = await ortam.api.post('/api/oduncler', { uyeId: uye.id, barkod: ikinci!.barkod, gun: 7 })
    expect(yanit.status).toBe(201)
    expect(yanit.body.data.kopyaId).toBe(ikinci!.id)
  })

  it('izin verilmeyen süre, kitap ve barkodun ikisi birden ya da hiçbiri 400 döner', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const uye = await uyeEkle(ortam.db)

    const sure = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 10 })
    const ikisi = await ortam.api.post('/api/oduncler', {
      uyeId: uye.id,
      kitapId: kitap.id,
      barkod: kopya!.barkod,
      gun: 7,
    })
    const hicbiri = await ortam.api.post('/api/oduncler', { uyeId: uye.id, gun: 7 })
    expect([sure.status, ikisi.status, hicbiri.status]).toEqual([400, 400, 400])
  })

  it('rafta kopya yoksa 409, ödünçteki barkod 409 döner', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    await ortam.api.post('/api/oduncler', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id, gun: 7 })
    const ikinciUye = await uyeEkle(ortam.db)

    const kitapla = await ortam.api.post('/api/oduncler', { uyeId: ikinciUye.id, kitapId: kitap.id, gun: 7 })
    const barkodla = await ortam.api.post('/api/oduncler', { uyeId: ikinciUye.id, barkod: kopya!.barkod, gun: 7 })
    expect(kitapla.status).toBe(409)
    expect(barkodla.status).toBe(409)
  })

  it('aynı üye aynı kitabın ikinci kopyasını alamaz', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    const uye = await uyeEkle(ortam.db)
    await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 7 })

    const yanit = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 7 })
    expect(yanit.status).toBe(409)
  })

  it('kotası dolan üyeye 422 ve sebebini döner', async () => {
    const uye = await uyeEkle(ortam.db)
    for (let i = 0; i < KURALLAR.maksimumOdunc; i++) {
      const { kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
      await eskiOduncEkle(ortam.db, uye.id, kopya!.id, 7)
    }
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)

    const yanit = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 7 })
    expect(yanit.status).toBe(422)
    expect(yanit.body.details).toEqual([`Aynı anda en fazla ${KURALLAR.maksimumOdunc} kitap alınabilir`])
  })

  it('gecikmiş kitabı olan, kartı dolmuş ya da olmayan üyeye verilmez', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    const gecikmeli = await uyeEkle(ortam.db)
    const { kopyalar: [eski] } = await kitapEkle(ortam.db, ortam.kategori.id)
    await eskiOduncEkle(ortam.db, gecikmeli.id, eski!.id, -1)
    const kartiDolmus = await uyeEkle(ortam.db, { kartGecerlilik: gunEkle(bugun(), -1) })

    const istek = (uyeId: number) => ortam.api.post('/api/oduncler', { uyeId, kitapId: kitap.id, gun: 7 })
    expect((await istek(gecikmeli.id)).status).toBe(422)
    expect((await istek(kartiDolmus.id)).status).toBe(422)
    expect((await istek(99999)).status).toBe(404)
  })

  it('olmayan kitap 404 döner', async () => {
    const uye = await uyeEkle(ortam.db)
    const yanit = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: 99999, gun: 7 })
    expect(yanit.status).toBe(404)
  })
})

describe('uzatma', () => {
  it('bir kez 7 gün uzatır, ikincisinde 422 döner', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    const uye = await uyeEkle(ortam.db)
    const odunc = (await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 14 })).body.data

    const ilk = await ortam.api.post(`/api/oduncler/${odunc.id}/uzat`)
    expect(ilk.status).toBe(200)
    expect(ilk.body.data).toMatchObject({
      uzatildi: true,
      sonTeslimTarihi: gunEkle(bugun(), 14 + KURALLAR.uzatmaGunu),
    })

    const ikinci = await ortam.api.post(`/api/oduncler/${odunc.id}/uzat`)
    expect(ikinci.status).toBe(422)
  })

  it('gecikmiş ödünç uzatılamaz', async () => {
    const { kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const odunc = await eskiOduncEkle(ortam.db, (await uyeEkle(ortam.db)).id, kopya!.id, -2)
    expect((await ortam.api.post(`/api/oduncler/${odunc.id}/uzat`)).status).toBe(422)
  })

  it('kitabı bekleyen varsa uzatılamaz', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    const odunc = (
      await ortam.api.post('/api/oduncler', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id, gun: 7 })
    ).body.data
    await ortam.api.post('/api/rezervasyonlar', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id })

    const yanit = await ortam.api.post(`/api/oduncler/${odunc.id}/uzat`)
    expect(yanit.status).toBe(422)
    expect(yanit.body.error).toBe('Bu kitabı bekleyen başka bir üye var')
  })
})

describe('iade', () => {
  it('zamanında iadede ceza yok, kopya rafa döner', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const odunc = (
      await ortam.api.post('/api/oduncler', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id, gun: 7 })
    ).body.data

    const yanit = await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)
    expect(yanit.status).toBe(200)
    expect(yanit.body.data.odunc.iadeZamani).not.toBeNull()
    expect(yanit.body.data.ceza).toBeNull()
    expect(await kopyaDurumu(kopya!.id)).toBe('RAFTA')

    expect((await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)).status).toBe(409)
  })

  it('geç iadede gün başına ceza kesilir ve GEC_IADE kaydedilir', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const odunc = await eskiOduncEkle(ortam.db, (await uyeEkle(ortam.db)).id, kopya!.id, -3)

    const yanit = await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)
    expect(yanit.body.data.ceza).toMatchObject({
      gecikmeGunu: 3,
      tutar: 3 * KURALLAR.gunlukCezaTl,
      odendi: false,
    })
    const kayit = await ortam.db.query.hareketler.findFirst({ where: eq(hareketler.kitapId, kitap.id) })
    expect(kayit!.tip).toBe('GEC_IADE')
  })

  it('kitabı bekleyen varsa iade edilen kopya ona ayrılır', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const odunc = (
      await ortam.api.post('/api/oduncler', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id, gun: 7 })
    ).body.data
    const bekleyen = await uyeEkle(ortam.db)
    const rez = (await ortam.api.post('/api/rezervasyonlar', { uyeId: bekleyen.id, kitapId: kitap.id })).body.data
    expect(rez.durum).toBe('BEKLIYOR')

    await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)

    expect(await kopyaDurumu(kopya!.id)).toBe('AYRILDI')
    expect(await rezervasyon(rez.id)).toMatchObject({
      durum: 'HAZIR',
      kopyaId: kopya!.id,
      sonGecerlilik: gunEkle(bugun(), KURALLAR.rezervasyonBeklemeGunu),
    })
  })

  it('olmayan ödünç 404 döner', async () => {
    expect((await ortam.api.post('/api/oduncler/99999/iade')).status).toBe(404)
    expect((await ortam.api.post('/api/oduncler/99999/uzat')).status).toBe(404)
  })
})

describe('ödünç listesi', () => {
  it('gecikmiş filtresi yalnız süresi geçen ve iade edilmemişleri döner', async () => {
    const uye = await uyeEkle(ortam.db)
    const { kopyalar: [a] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const { kopyalar: [b] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const gecikmis = await eskiOduncEkle(ortam.db, uye.id, a!.id, -4)
    await eskiOduncEkle(ortam.db, uye.id, b!.id, 4)

    const yanit = await ortam.api.get(`/api/oduncler?durum=gecikmis&uyeId=${uye.id}`)
    expect(yanit.status).toBe(200)
    expect(yanit.body.data).toHaveLength(1)
    expect(yanit.body.data[0]).toMatchObject({ id: gecikmis.id, gecikmeGunu: 4, uye: { id: uye.id } })

    const aktif = await ortam.api.get(`/api/oduncler?durum=aktif&uyeId=${uye.id}`)
    expect(aktif.body.data).toHaveLength(2)
  })
})

describe('rezervasyon', () => {
  it('rafta kopya varsa hemen ayırır (HAZIR), başkası o kopyayı alamaz', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const sahibi = await uyeEkle(ortam.db)
    const baskasi = await uyeEkle(ortam.db)

    const rez = await ortam.api.post('/api/rezervasyonlar', { uyeId: sahibi.id, kitapId: kitap.id })
    expect(rez.status).toBe(201)
    expect(rez.body.data).toMatchObject({ durum: 'HAZIR', kopyaId: kopya!.id })
    expect(await kopyaDurumu(kopya!.id)).toBe('AYRILDI')

    const kitapla = await ortam.api.post('/api/oduncler', { uyeId: baskasi.id, kitapId: kitap.id, gun: 7 })
    const barkodla = await ortam.api.post('/api/oduncler', { uyeId: baskasi.id, barkod: kopya!.barkod, gun: 7 })
    expect(kitapla.status).toBe(409)
    expect(barkodla.status).toBe(409)

    const sahibine = await ortam.api.post('/api/oduncler', { uyeId: sahibi.id, kitapId: kitap.id, gun: 7 })
    expect(sahibine.status).toBe(201)
    expect(sahibine.body.data.kopyaId).toBe(kopya!.id)
    expect((await rezervasyon(rez.body.data.id)).durum).toBe('TAMAMLANDI')
  })

  it('aynı kitaba ikinci açık rezervasyon 409; elindeki kitap için rezervasyon 409', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    const uye = await uyeEkle(ortam.db)
    await ortam.api.post('/api/rezervasyonlar', { uyeId: uye.id, kitapId: kitap.id })
    expect((await ortam.api.post('/api/rezervasyonlar', { uyeId: uye.id, kitapId: kitap.id })).status).toBe(409)

    const { kitap: elindeki } = await kitapEkle(ortam.db, ortam.kategori.id)
    const okuyan = await uyeEkle(ortam.db)
    await ortam.api.post('/api/oduncler', { uyeId: okuyan.id, kitapId: elindeki.id, gun: 7 })
    expect((await ortam.api.post('/api/rezervasyonlar', { uyeId: okuyan.id, kitapId: elindeki.id })).status).toBe(409)
  })

  it('HAZIR rezervasyon iptal edilince kopya sıradakine geçer, yoksa rafa döner', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const ilk = (await ortam.api.post('/api/rezervasyonlar', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id })).body.data
    const ikinci = (await ortam.api.post('/api/rezervasyonlar', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id })).body.data
    expect([ilk.durum, ikinci.durum]).toEqual(['HAZIR', 'BEKLIYOR'])

    expect((await ortam.api.post(`/api/rezervasyonlar/${ilk.id}/iptal`)).status).toBe(200)
    expect(await rezervasyon(ikinci.id)).toMatchObject({ durum: 'HAZIR', kopyaId: kopya!.id })

    await ortam.api.post(`/api/rezervasyonlar/${ikinci.id}/iptal`)
    expect(await kopyaDurumu(kopya!.id)).toBe('RAFTA')

    expect((await ortam.api.post(`/api/rezervasyonlar/${ikinci.id}/iptal`)).status).toBe(409)
  })

  it('süresi dolan HAZIR rezervasyonlar kapanır, kopya serbest kalır', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const rez = (await ortam.api.post('/api/rezervasyonlar', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id })).body.data

    const kapanan = await suresiDolanRezervasyonlariKapat(
      ortam.db,
      gunEkle(bugun(), KURALLAR.rezervasyonBeklemeGunu + 1),
    )

    expect(kapanan).toBeGreaterThanOrEqual(1)
    expect((await rezervasyon(rez.id)).durum).toBe('IPTAL')
    expect(await kopyaDurumu(kopya!.id)).toBe('RAFTA')
  })

  it('üye kendine ayrılanı değil başka kopyayı alırsa rezervasyon kapanır, ayrılan kopya rafa döner', async () => {
    const { kitap, kopyalar: [ayrilan, diger] } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
    const uye = await uyeEkle(ortam.db)
    const rez = (await ortam.api.post('/api/rezervasyonlar', { uyeId: uye.id, kitapId: kitap.id })).body.data
    expect(rez.kopyaId).toBe(ayrilan!.id)

    const odunc = await ortam.api.post('/api/oduncler', { uyeId: uye.id, barkod: diger!.barkod, gun: 7 })

    expect(odunc.status).toBe(201)
    expect((await rezervasyon(rez.id)).durum).toBe('TAMAMLANDI')
    expect(await kopyaDurumu(ayrilan!.id)).toBe('RAFTA')
  })

  it('kitabı bekleyen varken eklenen yeni kopya bekleyene ayrılır', async () => {
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    await ortam.api.post('/api/oduncler', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id, gun: 7 })
    const rez = (await ortam.api.post('/api/rezervasyonlar', { uyeId: (await uyeEkle(ortam.db)).id, kitapId: kitap.id })).body.data
    expect(rez.durum).toBe('BEKLIYOR')

    const yeni = await ortam.api.post(`/api/kitaplar/${kitap.id}/kopyalar`, { adet: 1 })

    expect(yeni.body.data[0].durum).toBe('AYRILDI')
    expect(await rezervasyon(rez.id)).toMatchObject({ durum: 'HAZIR', kopyaId: yeni.body.data[0].id })
  })

  it('pasif ya da gecikmesi olan üye rezervasyonla raftaki kopyayı tutamaz', async () => {
    const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const pasif = await uyeEkle(ortam.db, { aktif: false })
    const gecikmeli = await uyeEkle(ortam.db)
    const { kopyalar: [eski] } = await kitapEkle(ortam.db, ortam.kategori.id)
    await eskiOduncEkle(ortam.db, gecikmeli.id, eski!.id, -2)

    const istek = (uyeId: number) => ortam.api.post('/api/rezervasyonlar', { uyeId, kitapId: kitap.id })
    expect((await istek(pasif.id)).status).toBe(422)
    const engelli = await istek(gecikmeli.id)
    expect(engelli.status).toBe(422)
    expect(engelli.body.details).toEqual(['Teslim tarihi geçmiş kitabı var'])
    expect(await kopyaDurumu(kopya!.id)).toBe('RAFTA')
  })

  it('kotası dolu üye rezervasyon yapabilir', async () => {
    const uye = await uyeEkle(ortam.db)
    for (let i = 0; i < KURALLAR.maksimumOdunc; i++) {
      const { kopyalar: [k] } = await kitapEkle(ortam.db, ortam.kategori.id)
      await eskiOduncEkle(ortam.db, uye.id, k!.id, 7)
    }
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    expect((await ortam.api.post('/api/rezervasyonlar', { uyeId: uye.id, kitapId: kitap.id })).status).toBe(201)
  })

  it('üye ve duruma göre listeler', async () => {
    const uye = await uyeEkle(ortam.db)
    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    await ortam.api.post('/api/rezervasyonlar', { uyeId: uye.id, kitapId: kitap.id })

    const yanit = await ortam.api.get(`/api/rezervasyonlar?uyeId=${uye.id}&durum=HAZIR`)
    expect(yanit.body.data).toHaveLength(1)
    expect(yanit.body.data[0]).toMatchObject({ kitap: { id: kitap.id }, uye: { id: uye.id } })
  })
})

describe('cezalar', () => {
  it('ödenmemiş cezalar listelenir, ödenince kapanır ve üye tekrar alabilir', async () => {
    const uye = await uyeEkle(ortam.db)
    const { kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
    const odunc = await eskiOduncEkle(ortam.db, uye.id, kopya!.id, -2)
    const ceza = (await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)).body.data.ceza

    const liste = await ortam.api.get(`/api/cezalar?odendi=false&uyeId=${uye.id}`)
    expect(liste.body.data).toHaveLength(1)
    expect(liste.body.data[0]).toMatchObject({ id: ceza.id, odunc: { uye: { id: uye.id } } })

    const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id)
    const engelli = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 7 })
    expect(engelli.body.details).toEqual(['Ödenmemiş cezası var'])

    const ode = await ortam.api.post(`/api/cezalar/${ceza.id}/ode`)
    expect(ode.status).toBe(200)
    expect(ode.body.data.odendi).toBe(true)
    expect((await ortam.api.post(`/api/cezalar/${ceza.id}/ode`)).status).toBe(409)

    const serbest = await ortam.api.post('/api/oduncler', { uyeId: uye.id, kitapId: kitap.id, gun: 7 })
    expect(serbest.status).toBe(201)
  })
})
