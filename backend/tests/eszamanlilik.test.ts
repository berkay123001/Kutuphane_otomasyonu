import { eq, inArray, isNull } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { kopyalar, oduncler, rezervasyonlar } from '../src/db/schema.js'
import { KURALLAR } from '../src/kurallar.js'
import { GERCEK_POSTGRES, eskiOduncEkle, kitapEkle, testOrtami, uyeEkle } from './yardimci.js'

// PGlite işlemleri sırayla yürüttüğü için yarış durumları yalnızca gerçek Postgres'te sınanabilir:
//   npm run test:postgres
const TUR = 5
// Yarış penceresi dar olan senaryolarda ikinci istek her turda biraz daha geç gönderilir (ms).
const GECIKMELER = Array.from({ length: 11 }, (_, i) => i * 40)
const bekle = (ms: number) => new Promise((coz) => setTimeout(coz, ms))

describe.skipIf(!GERCEK_POSTGRES)('eş zamanlı işlemler (gerçek Postgres)', () => {
  let ortam: Awaited<ReturnType<typeof testOrtami>>

  beforeAll(async () => {
    ortam = await testOrtami()
  })
  afterAll(() => ortam?.kapat())

  /** Her kopyanın durumu, ona bağlı aktif ödünç ve HAZIR rezervasyon kayıtlarıyla çelişmemeli. */
  async function tutarliOlmali(kitapId: number) {
    const liste = await ortam.db.query.kopyalar.findMany({
      where: eq(kopyalar.kitapId, kitapId),
      with: {
        oduncler: { where: isNull(oduncler.iadeZamani), columns: { id: true } },
        rezervasyonlar: { where: eq(rezervasyonlar.durum, 'HAZIR'), columns: { id: true } },
      },
    })
    for (const kopya of liste) {
      const odunc = kopya.oduncler.length
      const ayrilan = kopya.rezervasyonlar.length
      const beklenen =
        odunc === 1 && ayrilan === 0 ? 'ODUNCTE'
        : odunc === 0 && ayrilan === 1 ? 'AYRILDI'
        : odunc === 0 && ayrilan === 0 ? 'RAFTA'
        : 'TUTARSIZ'
      expect(kopya.durum, `kopya ${kopya.id}`).toBe(beklenen)
    }
    return liste
  }

  const yeniUyeId = async () => (await uyeEkle(ortam.db)).id
  const oduncIstegi = (uyeId: number, kitapId: number) =>
    ortam.api.post('/api/oduncler', { uyeId, kitapId, gun: 7 })
  const rezerveEt = async (kitapId: number, uyeId?: number) =>
    (await ortam.api.post('/api/rezervasyonlar', { uyeId: uyeId ?? (await yeniUyeId()), kitapId })).body.data
  const rezervasyonlariGetir = (idler: number[]) =>
    ortam.db.query.rezervasyonlar.findMany({ where: inArray(rezervasyonlar.id, idler) })
  const durumlar = (yanitlar: Array<{ status: number }>) => yanitlar.map((y) => y.status).sort()

  it('aynı anda iade edilen iki kopya, bekleyen iki farklı üyeye ayrılır', async () => {
    for (let tur = 0; tur < TUR; tur++) {
      const { kitap, kopyalar: [a, b] } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
      const oduncA = await eskiOduncEkle(ortam.db, await yeniUyeId(), a!.id, 5)
      const oduncB = await eskiOduncEkle(ortam.db, await yeniUyeId(), b!.id, 5)
      const ilk = await rezerveEt(kitap.id)
      const ikinci = await rezerveEt(kitap.id)

      const yanitlar = await Promise.all([
        ortam.api.post(`/api/oduncler/${oduncA.id}/iade`),
        ortam.api.post(`/api/oduncler/${oduncB.id}/iade`),
      ])

      expect(durumlar(yanitlar)).toEqual([200, 200])
      const rez = await rezervasyonlariGetir([ilk.id, ikinci.id])
      expect(rez.map((r) => r.durum)).toEqual(['HAZIR', 'HAZIR'])
      expect(new Set(rez.map((r) => r.kopyaId)).size).toBe(2)
      await tutarliOlmali(kitap.id)
    }
  })

  it('aynı anda iade edilen iki kopya, tek bekleyen varsa biri ona ayrılır, diğeri rafa döner', async () => {
    for (let tur = 0; tur < TUR; tur++) {
      const { kitap, kopyalar: [a, b] } = await kitapEkle(ortam.db, ortam.kategori.id, 2)
      const oduncA = await eskiOduncEkle(ortam.db, await yeniUyeId(), a!.id, 5)
      const oduncB = await eskiOduncEkle(ortam.db, await yeniUyeId(), b!.id, 5)
      const bekleyen = await rezerveEt(kitap.id)

      await Promise.all([
        ortam.api.post(`/api/oduncler/${oduncA.id}/iade`),
        ortam.api.post(`/api/oduncler/${oduncB.id}/iade`),
      ])

      const [rez] = await rezervasyonlariGetir([bekleyen.id])
      expect(rez!.durum).toBe('HAZIR')
      const liste = await tutarliOlmali(kitap.id)
      expect(liste.map((k) => k.durum).sort()).toEqual(['AYRILDI', 'RAFTA'])
    }
  })

  it('son kopyayı iki üye aynı anda isterse yalnızca biri alır', async () => {
    for (let tur = 0; tur < TUR; tur++) {
      const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id, 1)
      const yanitlar = await Promise.all([
        oduncIstegi(await yeniUyeId(), kitap.id),
        oduncIstegi(await yeniUyeId(), kitap.id),
      ])

      expect(durumlar(yanitlar)).toEqual([201, 409])
      await tutarliOlmali(kitap.id)
    }
  })

  it('kotanın son hakkı için aynı anda iki ödünç verilirse kota aşılmaz', async () => {
    for (let tur = 0; tur < TUR; tur++) {
      const uyeId = await yeniUyeId()
      for (let i = 0; i < KURALLAR.maksimumOdunc - 1; i++) {
        const { kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
        await eskiOduncEkle(ortam.db, uyeId, kopya!.id, 7)
      }
      const { kitap: x } = await kitapEkle(ortam.db, ortam.kategori.id)
      const { kitap: y } = await kitapEkle(ortam.db, ortam.kategori.id)

      const yanitlar = await Promise.all([oduncIstegi(uyeId, x.id), oduncIstegi(uyeId, y.id)])

      expect(durumlar(yanitlar)).toEqual([201, 422])
      const aktif = await ortam.db.$count(oduncler, eq(oduncler.uyeId, uyeId))
      expect(aktif).toBe(KURALLAR.maksimumOdunc)
    }
  })

  it('bekleyen rezervasyon iptali ile iade aynı anda olursa iptal edilen rezervasyon canlanmaz', async () => {
    for (const gecikme of GECIKMELER) {
      const { kitap, kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id, 1)
      const odunc = await eskiOduncEkle(ortam.db, await yeniUyeId(), kopya!.id, 5)
      const bekleyen = await rezerveEt(kitap.id)

      const yanitlar = await Promise.all([
        ortam.api.post(`/api/oduncler/${odunc.id}/iade`),
        bekle(gecikme).then(() => ortam.api.post(`/api/rezervasyonlar/${bekleyen.id}/iptal`)),
      ])

      expect(durumlar(yanitlar)).toEqual([200, 200])
      const [rez] = await rezervasyonlariGetir([bekleyen.id])
      expect(rez!.durum).toBe('IPTAL')
      const [son] = await tutarliOlmali(kitap.id)
      expect(son!.durum).toBe('RAFTA')
    }
  })

  it('ayrılan kopyanın iptali ile sahibine ödünç aynı anda olursa kopya iki kişiye birden gitmez', async () => {
    for (const gecikme of GECIKMELER) {
      const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id, 1)
      const sahibi = await yeniUyeId()
      const hazir = await rezerveEt(kitap.id, sahibi)
      const sirada = await rezerveEt(kitap.id)
      expect([hazir.durum, sirada.durum]).toEqual(['HAZIR', 'BEKLIYOR'])

      const yanitlar = await Promise.all([
        oduncIstegi(sahibi, kitap.id),
        bekle(gecikme).then(() => ortam.api.post(`/api/rezervasyonlar/${hazir.id}/iptal`)),
      ])

      // Ya ödünç önce olur (201 + iptal 409), ya iptal önce olur (200 + ödünç 409).
      expect(yanitlar.filter((y) => y.status < 300)).toHaveLength(1)
      await tutarliOlmali(kitap.id)
    }
  })

  it('raftaki son kopyaya aynı anda iki rezervasyon gelirse biri HAZIR, diğeri BEKLIYOR olur', async () => {
    for (let tur = 0; tur < TUR; tur++) {
      const { kitap } = await kitapEkle(ortam.db, ortam.kategori.id, 1)
      const [a, b] = await Promise.all([rezerveEt(kitap.id), rezerveEt(kitap.id)])

      expect([a.durum, b.durum].sort()).toEqual(['BEKLIYOR', 'HAZIR'])
      await tutarliOlmali(kitap.id)
    }
  })

  it('aynı ceza aynı anda iki kez ödenemez', async () => {
    for (let tur = 0; tur < TUR; tur++) {
      const { kopyalar: [kopya] } = await kitapEkle(ortam.db, ortam.kategori.id)
      const odunc = await eskiOduncEkle(ortam.db, await yeniUyeId(), kopya!.id, -3)
      const ceza = (await ortam.api.post(`/api/oduncler/${odunc.id}/iade`)).body.data.ceza

      const yanitlar = await Promise.all([
        ortam.api.post(`/api/cezalar/${ceza.id}/ode`),
        ortam.api.post(`/api/cezalar/${ceza.id}/ode`),
      ])
      expect(durumlar(yanitlar)).toEqual([200, 409])
    }
  })
})
