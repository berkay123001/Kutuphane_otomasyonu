import bcrypt from 'bcryptjs'
import { asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { gorevliler } from '../db/schema.js'
import { bulunamadi, kuralIhlali } from '../http/hatalar.js'
import { gorevliId } from '../http/kimlik.js'
import {
  basarili,
  enAzBirAlan,
  idSemasi,
  istegeBagliEposta,
  istegeBagliMetin,
  zorunluMetin,
} from '../http/yanit.js'
import { BCRYPT_TURU, gorevliOzeti, sifreSemasi } from './auth.js'

const bilgiSemasi = z.object({
  ad: zorunluMetin(100),
  soyad: zorunluMetin(100),
  eposta: istegeBagliEposta,
  telefon: istegeBagliMetin(30),
})

const yeniGorevliSemasi = bilgiSemasi.extend({
  kullaniciAdi: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Kullanıcı adında yalnızca harf, rakam, . _ - olabilir'),
  sifre: sifreSemasi,
})

// İşten ayrılan görevli silinmez (hareket kayıtlarında adı geçer), aktif: false yapılır.
const gorevliGuncellemeSemasi = bilgiSemasi
  .partial()
  .extend({ aktif: z.boolean().optional() })
  .refine(enAzBirAlan, 'Güncellenecek alan yok')

export function gorevliRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (_req, res) => {
    const liste = await db.query.gorevliler.findMany({
      columns: { sifreHash: false },
      orderBy: asc(gorevliler.id),
    })
    basarili(res, liste)
  })

  rota.post('/', async (req, res) => {
    const { sifre, ...bilgi } = yeniGorevliSemasi.parse(req.body)
    const [gorevli] = await db
      .insert(gorevliler)
      .values({ ...bilgi, sifreHash: await bcrypt.hash(sifre, BCRYPT_TURU) })
      .returning()
    basarili(res, gorevliOzeti(gorevli!), 201)
  })

  rota.patch('/:id', async (req, res) => {
    const id = idSemasi.parse(req.params.id)
    const degisiklik = gorevliGuncellemeSemasi.parse(req.body)
    if (degisiklik.aktif === false && id === gorevliId(res)) {
      throw kuralIhlali('Kendi hesabınızı devre dışı bırakamazsınız')
    }

    const [gorevli] = await db.update(gorevliler).set(degisiklik).where(eq(gorevliler.id, id)).returning()
    if (!gorevli) throw bulunamadi('Görevli')
    basarili(res, gorevliOzeti(gorevli))
  })

  return rota
}
