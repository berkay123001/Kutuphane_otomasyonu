import { existsSync } from 'node:fs'
import { z } from 'zod'

const bosIseYok = (v: unknown) => (v === '' ? undefined : v)

const ortamSemasi = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.preprocess(bosIseYok, z.url().optional()),
  DATABASE_SSL_CA: z.preprocess(bosIseYok, z.string().optional()),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalı'),
  CORS_ORIGIN: z.preprocess(bosIseYok, z.string().optional()),
  YEREL_VERI_KLASORU: z.string().default('./.veri'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
})

export type Ayarlar = z.infer<typeof ortamSemasi>

export function ayarlariYukle(): Ayarlar {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const sonuc = ortamSemasi.safeParse(process.env)
  if (!sonuc.success) {
    throw new Error(`.env ayarları hatalı:\n${z.prettifyError(sonuc.error)}`)
  }
  return sonuc.data
}
