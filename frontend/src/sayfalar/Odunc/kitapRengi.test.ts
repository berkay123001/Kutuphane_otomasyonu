import { SIRT_RENKLERI } from '../../lib/bicim'
import { acikRenk, kapakDegiskenleri, koyulastir } from './kitapRengi'

describe('kitapRengi', () => {
  it('rengi oranla karartır', () => {
    expect(koyulastir('#7A2E2A', 0.13)).toBe('#6a2825')
    expect(koyulastir('#ffffff', 0)).toBe('#ffffff')
    expect(koyulastir('#fff', 1)).toBe('#000000')
  })

  it('açık kapakları ayırt eder', () => {
    expect(acikRenk('#CDBE98')).toBe(true)
    expect(acikRenk('#B08433')).toBe(true)
    expect(acikRenk('#7A2E2A')).toBe(false)
    expect(SIRT_RENKLERI.filter(acikRenk)).toEqual(['#B08433', '#CDBE98'])
  })

  it('açık kapakta yaldız koyu mürekkebe döner', () => {
    expect(kapakDegiskenleri('#CDBE98')).toMatchObject({ '--kapak': '#CDBE98', '--yaldiz': '#2a1a0a' })
    expect(kapakDegiskenleri('#7A2E2A')).toMatchObject({ '--sirt': '#6a2825', '--yaldiz': '#e8c46a' })
  })
})
