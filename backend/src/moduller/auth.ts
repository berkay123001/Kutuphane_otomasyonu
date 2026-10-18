import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { Router, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { gorevliler } from '../db/schema.js'
import { HttpHatasi, bulunamadi } from '../http/hatalar.js'
import { gorevliId, tokenUret } from '../http/kimlik.js'
import { basarili, zorunluMetin } from '../http/yanit.js'

export const BCRYPT_TURU = 10

/** bcrypt yalnızca ilk 72 baytı kullanır; daha uzun şifre sessizce kırpılmasın diye sınırlıyoruz. */
export const sifreSemasi = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .refine((s) => Buffer.byteLength(s) <= 72, 'Şifre çok uzun (en fazla 72 bayt)')

const girisSemasi = z.object({
  kullaniciAdi: zorunluMetin(50),
  sifre: z.string().min(1).max(200),
})

const sifreDegistirmeSemasi = z.object({
  mevcutSifre: z.string().min(1).max(200),
  yeniSifre: sifreSemasi,
})

// Kullanıcı yoksa da hash karşılaştırılır; yanıt süresinden kullanıcı adı tahmin edilemesin.
const SAHTE_HASH = bcrypt.hashSync('kullanici-yok', BCRYPT_TURU)

export const gorevliOzeti = ({ sifreHash: _, ...gorevli }: typeof gorevliler.$inferSelect) => gorevli

export function authRotalari(db: Db, jwtGizli: string, girisKontrolu: RequestHandler) {
  const rota = Router()

  const girisLimiti = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: 'Çok fazla deneme yapıldı, 15 dakika sonra tekrar deneyin' },
  })

  rota.post('/giris', girisLimiti, async (req, res) => {
    const { kullaniciAdi, sifre } = girisSemasi.parse(req.body)
    const gorevli = await db.query.gorevliler.findFirst({ where: eq(gorevliler.kullaniciAdi, kullaniciAdi) })
    const sifreDogru = await bcrypt.compare(sifre, gorevli?.sifreHash ?? SAHTE_HASH)
    if (!gorevli || !sifreDogru || !gorevli.aktif) {
      throw new HttpHatasi(401, 'Kullanıcı adı veya şifre hatalı')
    }

    basarili(res, { token: tokenUret(gorevli, jwtGizli), gorevli: gorevliOzeti(gorevli) })
  })

  rota.get('/ben', girisKontrolu, async (_req, res) => {
    const gorevli = await db.query.gorevliler.findFirst({ where: eq(gorevliler.id, gorevliId(res)) })
    if (!gorevli) throw bulunamadi('Görevli')
    basarili(res, gorevliOzeti(gorevli))
  })

  rota.post('/sifre', girisLimiti, girisKontrolu, async (req, res) => {
    const { mevcutSifre, yeniSifre } = sifreDegistirmeSemasi.parse(req.body)
    const gorevli = await db.query.gorevliler.findFirst({ where: eq(gorevliler.id, gorevliId(res)) })
    if (!gorevli || !(await bcrypt.compare(mevcutSifre, gorevli.sifreHash))) {
      throw new HttpHatasi(422, 'Mevcut şifre hatalı')
    }

    await db
      .update(gorevliler)
      .set({ sifreHash: await bcrypt.hash(yeniSifre, BCRYPT_TURU) })
      .where(eq(gorevliler.id, gorevli.id))
    basarili(res, { degisti: true })
  })

  return rota
}
