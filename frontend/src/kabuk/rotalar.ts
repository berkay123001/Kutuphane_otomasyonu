export interface Cekmece {
  readonly no: string
  readonly etiket: string
  readonly yol: string
}

/** Dolaptaki menü çekmeceleri (tasarım: 01 Panel / 02 Katalog / 03 Ödünç ver / 04 Üyeler). */
export const CEKMECELER: readonly Cekmece[] = [
  { no: '01', etiket: 'Panel', yol: '/panel' },
  { no: '02', etiket: 'Katalog', yol: '/katalog' },
  { no: '03', etiket: 'Ödünç ver', yol: '/odunc' },
  { no: '04', etiket: 'Üyeler', yol: '/uyeler' },
]

export function cekmeceBul(yol: string): Cekmece | undefined {
  return CEKMECELER.find((c) => yol === c.yol || yol.startsWith(`${c.yol}/`))
}
