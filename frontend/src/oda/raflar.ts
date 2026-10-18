/** Arka plandaki raf ve kitapların tohumlu üretimi — tasarımdaki roomData() ile birebir aynı
 *  (fislik/Main.dc.html), böylece her açılışta aynı raflar çıkar. */

export interface RafKitabi {
  readonly renk: number // 1..9 → .k1 … .k9
  readonly yukseklik: number // yüzde
  readonly genislik: number // piksel
  readonly egik: boolean
  readonly bosluk: boolean
}

export type Raf = readonly RafKitabi[]
export type Unite = readonly Raf[]

export function rafUret(tohum = 11, uniteSayisi = 7, rafSayisi = 13): readonly Unite[] {
  let s = tohum
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  return Array.from({ length: uniteSayisi }, () =>
    Array.from({ length: rafSayisi }, () => {
      const kitaplar: RafKitabi[] = []
      let w = 0
      for (let k = 0; k < 30; k += 1) {
        const genislik = 12 + Math.floor(rnd() * 15)
        if (w + genislik > 212) break
        const bosluk = rnd() < 0.05
        const egik = !bosluk && rnd() < 0.05
        kitaplar.push({
          renk: 1 + Math.floor(rnd() * 9),
          yukseklik: 64 + Math.floor(rnd() * 32),
          genislik,
          egik,
          bosluk,
        })
        w += genislik + 2 + (egik ? 12 : 0)
      }
      return kitaplar
    }),
  )
}
