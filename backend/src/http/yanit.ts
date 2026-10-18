import type { Response } from 'express'
import { z } from 'zod'

export interface Sayfa {
  page: number
  limit: number
}

export function basarili(res: Response, data: unknown, durum = 200, meta?: Sayfa & { total: number }) {
  res.status(durum).json({ success: true, data, ...(meta ? { meta } : {}) })
}

export const idSemasi = z.coerce.number().int().positive().max(2_147_483_647)

export const sayfaSemasi = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const atla = ({ page, limit }: Sayfa) => (page - 1) * limit

/** Kullanıcı metnini LIKE kalıbına çevirir; % ve _ joker değil, düz karakter sayılır. */
export const likeKalibi = (metin: string) => `%${metin.replace(/[\\%_]/g, '\\$&')}%`

/** İsteğe bağlı metin alanı: boş metin null olur, hiç gönderilmezse undefined kalır. */
export const istegeBagliMetin = (en = 200) =>
  z
    .string()
    .trim()
    .max(en)
    .transform((v) => v || null)
    .nullish()

export const istegeBagliEposta = z.preprocess(
  (v) => (v === '' ? null : v),
  z.email('Geçerli bir e-posta girin').max(200).nullish(),
)

export const zorunluMetin = (en = 200) => z.string().trim().min(1).max(en)

/** PATCH gövdesinde en az bir alan olmalı. */
export const enAzBirAlan = <T extends object>(o: T) => Object.values(o).some((v) => v !== undefined)
