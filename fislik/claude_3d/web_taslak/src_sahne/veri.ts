/** Blender'dan üretilen sahne verisi (fislik/claude_3d/scripts/kt_web.py → sahne.json). */
import { z } from 'zod'
import type { Tema } from '../tema/TemaSaglayici'
import ham from './sahne.json'

export const ETKILESIMLER = ['cekmece', 'kitap', 'fis', 'kapi'] as const
export type EtkilesimId = (typeof ETKILESIMLER)[number]

const dortlu = z.tuple([z.number(), z.number(), z.number(), z.number()])
const nokta = z.tuple([z.number(), z.number()])

const sahneSema = z.object({
  boyut: z.object({ w: z.number(), h: z.number() }),
  kareSayisi: z.number().int().positive(),
  temalar: z.object({ gunduz: z.string(), gece: z.string() }),
  kareYolu: z.string(),
  etkilesimler: z.array(
    z.object({ id: z.enum(ETKILESIMLER), etiket: z.string(), alan: dortlu, nokta: dortlu }),
  ),
  huzme: z.object({ gunduz: z.array(nokta), gece: z.array(nokta) }),
})

export type SahneVerisi = z.infer<typeof sahneSema>
export type Etkilesim = SahneVerisi['etkilesimler'][number]
export type Dikdortgen = Etkilesim['alan']
export type Nokta = readonly [number, number]

export const SAHNE: SahneVerisi = sahneSema.parse(ham)

export function kareYolu(id: EtkilesimId, tema: Tema, n: number): string {
  return SAHNE.kareYolu
    .replace('{id}', id)
    .replace('{tema}', tema)
    .replace('{n}', String(n).padStart(2, '0'))
}

/** Arka plan kipi için önceden bulanıklaştırılıp karartılmış görsel (canlı CSS filtresi yerine). */
export function arkaGorseli(tema: Tema): string {
  return SAHNE.temalar[tema].replace(/\.webp$/, '_arka.webp')
}

export function etkilesim(id: EtkilesimId): Etkilesim {
  const e = SAHNE.etkilesimler.find((x) => x.id === id)
  if (!e) throw new Error(`Sahnede '${id}' etkileşimi yok`)
  return e
}

export function merkez([x, y, w, h]: Dikdortgen): Nokta {
  return [x + w / 2, y + h / 2]
}
