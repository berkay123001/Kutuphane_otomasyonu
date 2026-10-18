import { z } from 'zod'
import { ApiHatasi, durumMesaji, istek, istemciyiBagla, sorguMetni } from './istemci'

function yanitla(durum: number, govde: unknown, metin = false) {
  return vi.fn().mockResolvedValue(
    new Response(metin ? String(govde) : JSON.stringify(govde), { status: durum }),
  )
}

describe('istemci', () => {
  const yetkisizde = vi.fn()

  beforeEach(() => {
    istemciyiBagla({ tokenAl: () => 'tkn', yetkisizde })
    yetkisizde.mockReset()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sorgu metnini boş değerleri atarak kurar', () => {
    expect(sorguMetni({ q: 'kürk mantolu', page: 2, x: undefined, y: '' })).toBe(
      '?q=k%C3%BCrk%20mantolu&page=2',
    )
    expect(sorguMetni(undefined)).toBe('')
  })

  it('zarfı açar, şemayla doğrular ve meta döndürür', async () => {
    const f = yanitla(200, { success: true, data: [{ id: '3' }], meta: { page: 1, limit: 20, total: 7 } })
    vi.stubGlobal('fetch', f)
    const sonuc = await istek('/x', z.array(z.object({ id: z.coerce.number() })), { sorgu: { q: 'a' } })
    expect(sonuc.veri).toEqual([{ id: 3 }])
    expect(sonuc.meta?.total).toBe(7)
    const [url, init] = f.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/x?q=a')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tkn')
  })

  it('422 gerekçelerini hataya taşır', async () => {
    vi.stubGlobal(
      'fetch',
      yanitla(422, { success: false, error: 'Bu üyeye ödünç verilemez', details: ['Ödenmemiş cezası var'] }),
    )
    const hata = await istek('/oduncler', z.unknown(), { yontem: 'POST', govde: {} }).catch((e) => e)
    expect(hata).toBeInstanceOf(ApiHatasi)
    expect(hata.durum).toBe(422)
    expect(hata.message).toBe('Bu üyeye ödünç verilemez')
    expect(hata.gerekceler).toEqual(['Ödenmemiş cezası var'])
  })

  it('400 alan hatalarını düzleştirir', () => {
    const h = new ApiHatasi(400, 'Geçersiz istek', {
      formErrors: ['Tek biri olmalı'],
      fieldErrors: { ad: ['Çok kısa'] },
    })
    expect(h.gerekceler).toEqual(['Tek biri olmalı', 'Çok kısa'])
  })

  it('401 alınca oturumu kapatır', async () => {
    vi.stubGlobal('fetch', yanitla(401, { success: false, error: 'Oturum geçersiz' }))
    await expect(istek('/panel', z.unknown())).rejects.toThrow('Oturum geçersiz')
    expect(yetkisizde).toHaveBeenCalledOnce()
  })

  it('HTML hata sayfasını kullanıcıya göstermez', async () => {
    vi.stubGlobal('fetch', yanitla(502, '<html><body>Bad Gateway stack…</body></html>', true))
    const hata = await istek('/panel', z.unknown()).catch((e) => e)
    expect(hata.message).toBe('Sunucu şu an yanıt veremiyor, biraz sonra yeniden dene')
    expect(durumMesaji(404)).toBe('İstenen kayıt bulunamadı')
  })

  it('eski token ile gelen 401 yeni oturumu kapatmaz', async () => {
    let suanki = 'eski'
    istemciyiBagla({ tokenAl: () => suanki, yetkisizde })
    let coz: (r: Response) => void = () => undefined
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((c) => { coz = c })))
    const beklenen = istek('/panel', z.unknown()).catch((e) => e)
    suanki = 'yeni'
    coz(new Response(JSON.stringify({ success: false, error: 'Oturum geçersiz' }), { status: 401 }))
    await beklenen
    expect(yetkisizde).not.toHaveBeenCalled()
  })

  it('düz metin 429 yanıtını anlaşılır hataya çevirir', async () => {
    vi.stubGlobal('fetch', yanitla(429, 'Too many requests', true))
    await expect(istek('/panel', z.unknown())).rejects.toThrow('Çok fazla istek')
  })

  it('ağ hatasını yakalar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    await expect(istek('/panel', z.unknown())).rejects.toThrow('Sunucuya ulaşılamıyor')
  })

  it('şemaya uymayan yanıtı reddeder', async () => {
    vi.stubGlobal('fetch', yanitla(200, { success: true, data: { id: 'x' } }))
    await expect(istek('/x', z.object({ id: z.number() }))).rejects.toThrow('beklenmeyen biçimde')
  })

  it('204 yanıtını boş veri olarak kabul eder', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const s = await istek('/kitaplar/1', z.null(), { yontem: 'DELETE' })
    expect(s.veri).toBeNull()
  })
})
