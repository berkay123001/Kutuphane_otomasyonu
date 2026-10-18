import { oturumOlustur, oturumuOku, oturumuSil, oturumuYaz, tokenBitisi } from './depo'

const gorevli = {
  id: 1, ad: 'Selin', soyad: 'Aydın', eposta: null, telefon: null, kullaniciAdi: 'selin', aktif: true,
}

function jwt(exp: number): string {
  const yuk = btoa(JSON.stringify({ sub: 1, exp })).replace(/=+$/, '')
  return `x.${yuk}.y`
}

describe('oturum deposu', () => {
  beforeEach(() => localStorage.clear())

  it('JWT exp alanından bitişi okur, okunamazsa 8 saat verir', () => {
    expect(tokenBitisi(jwt(2_000_000_000))).toBe(2_000_000_000_000)
    expect(tokenBitisi('bozuk', 1000)).toBe(1000 + 8 * 3600 * 1000)
  })

  it('yazar, okur ve siler', () => {
    const o = oturumOlustur(jwt(2_000_000_000), gorevli)
    oturumuYaz(o)
    expect(oturumuOku()).toEqual(o)
    oturumuSil()
    expect(oturumuOku()).toBeNull()
  })

  it('süresi dolmuş ya da bozuk kaydı atar', () => {
    oturumuYaz(oturumOlustur(jwt(10), gorevli))
    expect(oturumuOku(localStorage, 20_000)).toBeNull()
    expect(localStorage.getItem('fislik-oturum')).toBeNull()
    localStorage.setItem('fislik-oturum', '{bozuk')
    expect(oturumuOku()).toBeNull()
  })
})
