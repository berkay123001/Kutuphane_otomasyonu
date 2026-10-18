import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eskiOduncEkle, kitapEkle, testOrtami, uyeEkle } from './yardimci.js'

let ortam: Awaited<ReturnType<typeof testOrtami>>

beforeAll(async () => {
  ortam = await testOrtami()
})
afterAll(() => ortam.kapat())

describe('panel', () => {
  it('bugünün sayılarını, son hareketleri ve gecikenleri döner', async () => {
    const elif = await uyeEkle(ortam.db, { ad: 'Elif' })
    const kerem = await uyeEkle(ortam.db, { ad: 'Kerem' })
    const { kitap: a } = await kitapEkle(ortam.db, ortam.kategori.id)
    const { kitap: b } = await kitapEkle(ortam.db, ortam.kategori.id)
    const { kopyalar: [gecKopya] } = await kitapEkle(ortam.db, ortam.kategori.id)

    const odunc = (await ortam.api.post('/api/oduncler', { uyeId: elif.id, kitapId: a.id, gun: 7 })).body.data
    await ortam.api.post('/api/oduncler', { uyeId: kerem.id, kitapId: b.id, gun: 14 })
    await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)
    await eskiOduncEkle(ortam.db, kerem.id, gecKopya!.id, -6)

    const yanit = await ortam.api.get('/api/panel')

    expect(yanit.status).toBe(200)
    expect(yanit.body.data.bugun).toEqual({ odunc: 2, iade: 1, gecikmis: 1, yeniUye: 2 })
    expect(yanit.body.data.sonHareketler[0]).toMatchObject({
      tip: 'IADE',
      uye: { ad: 'Elif' },
      kitap: { id: a.id },
    })
    expect(yanit.body.data.gecikenler).toHaveLength(1)
    expect(yanit.body.data.gecikenler[0]).toMatchObject({ gecikmeGunu: 6, uye: { ad: 'Kerem' } })
  })
})
