import { eq } from 'drizzle-orm'
import type { RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Db } from '../db/client.js'
import { gorevliler } from '../db/schema.js'
import { HttpHatasi } from './hatalar.js'

const TOKEN_SURESI = '8h'
const GECERSIZ_OTURUM = 'Oturum geçersiz ya da süresi dolmuş'

export function tokenUret(gorevli: { id: number; kullaniciAdi: string }, gizli: string): string {
  return jwt.sign({ kullaniciAdi: gorevli.kullaniciAdi }, gizli, {
    subject: String(gorevli.id),
    expiresIn: TOKEN_SURESI,
  })
}

function tokendakiId(token: string, gizli: string): number {
  try {
    const yuk = jwt.verify(token, gizli, { algorithms: ['HS256'] })
    const id = Number(typeof yuk === 'object' ? yuk.sub : undefined)
    if (Number.isInteger(id)) return id
  } catch {
    // aşağıda 401
  }
  throw new HttpHatasi(401, GECERSIZ_OTURUM)
}

/** Token'ı doğrular ve görevlinin hâlâ aktif olduğunu kontrol eder (devre dışı bırakılan anında düşer). */
export function kimlikDogrula(db: Db, gizli: string): RequestHandler {
  return async (req, res, next) => {
    const [tur, token] = (req.headers.authorization ?? '').split(' ')
    if (tur !== 'Bearer' || !token) throw new HttpHatasi(401, 'Giriş yapmanız gerekiyor')

    const id = tokendakiId(token, gizli)
    const gorevli = await db.query.gorevliler.findFirst({
      columns: { aktif: true },
      where: eq(gorevliler.id, id),
    })
    if (!gorevli?.aktif) throw new HttpHatasi(401, GECERSIZ_OTURUM)

    res.locals.gorevliId = id
    next()
  }
}

export const gorevliId = (res: Response): number => res.locals.gorevliId as number
