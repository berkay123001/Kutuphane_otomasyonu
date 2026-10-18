import { describe, expect, it, vi } from 'vitest'
import { sslAyari } from '../src/db/client.js'
import { hataYakalayici } from '../src/http/hatalar.js'

describe('sslAyari', () => {
  const uzak = 'postgresql://postgres.abc:sifre@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'

  it('uzak sunucuda CA yoksa yine de şifreli bağlanır', () => {
    expect(sslAyari(uzak)).toEqual({ rejectUnauthorized: false })
  })

  it('CA verilirse sertifikayı doğrular', () => {
    expect(sslAyari(uzak, 'package.json')).toEqual({ ca: expect.any(String) })
  })

  it('URL’de sslmode varsa ya da sunucu yereldeyse URL’ye bırakır', () => {
    expect(sslAyari(`${uzak}?sslmode=verify-full`)).toBeUndefined()
    expect(sslAyari('postgresql://postgres:sifre@localhost:5432/fislik')).toBeUndefined()
  })
})

describe('hata yakalayıcı', () => {
  const yakala = (hata: unknown) => {
    const yanit = { durum: 0, govde: undefined as unknown }
    const res = {
      status(kod: number) {
        yanit.durum = kod
        return this
      },
      json(govde: unknown) {
        yanit.govde = govde
      },
    }
    hataYakalayici(hata, {} as never, res as never, () => {})
    return yanit
  }

  it('kopan veritabanı bağlantısı 503 döner, sarılmış hatada da', () => {
    expect(yakala({ code: 'ECONNRESET' }).durum).toBe(503)
    expect(yakala({ message: 'Failed query', cause: { code: 'ETIMEDOUT' } }).durum).toBe(503)
  })

  it('deadlock 409, bilinmeyen hata 500 döner', () => {
    expect(yakala({ cause: { code: '40P01' } }).durum).toBe(409)
    vi.spyOn(console, 'error').mockImplementationOnce(() => {})
    expect(yakala(new Error('beklenmeyen'))).toMatchObject({ durum: 500, govde: { error: 'Sunucu hatası' } })
  })
})
