import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'

export class HttpHatasi extends Error {
  readonly durum: number
  readonly detay?: unknown

  constructor(durum: number, mesaj: string, detay?: unknown) {
    super(mesaj)
    this.durum = durum
    this.detay = detay
  }
}

export const bulunamadi = (ne: string) => new HttpHatasi(404, `${ne} bulunamadı`)
export const cakisma = (mesaj: string) => new HttpHatasi(409, mesaj)
export const kuralIhlali = (mesaj: string, detay?: unknown) => new HttpHatasi(422, mesaj, detay)

/** Drizzle, sürücü hatasını `cause` içine sarar; Postgres/ağ hata kodunu ikisinden de okuruz. */
function hataKodu(hata: unknown): string | undefined {
  const adaylar = [hata, (hata as { cause?: unknown })?.cause]
  for (const aday of adaylar) {
    const kod = (aday as { code?: unknown })?.code
    if (typeof kod === 'string') return kod
  }
  return undefined
}

const ULASILAMIYOR: [number, string] = [503, 'Veritabanına şu an ulaşılamıyor, biraz sonra tekrar deneyin']

const BILINEN_HATALAR: Record<string, [number, string]> = {
  '23505': [409, 'Bu kayıt zaten var'],
  '23503': [409, 'Bu kayıt başka kayıtlarla ilişkili olduğu için işlem yapılamadı'],
  '40P01': [409, 'Aynı anda yapılan başka bir işlemle çakıştı, tekrar deneyin'],
  '40001': [409, 'Aynı anda yapılan başka bir işlemle çakıştı, tekrar deneyin'],
  ECONNRESET: ULASILAMIYOR,
  ECONNREFUSED: ULASILAMIYOR,
  ETIMEDOUT: ULASILAMIYOR,
}

export const bulunamayanRota: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, error: 'Böyle bir uç nokta yok' })
}

export const hataYakalayici: ErrorRequestHandler = (hata, _req, res, _next) => {
  if (hata instanceof HttpHatasi) {
    res.status(hata.durum).json({ success: false, error: hata.message, details: hata.detay })
    return
  }
  if (hata instanceof z.ZodError) {
    res.status(400).json({ success: false, error: 'Geçersiz istek', details: z.flattenError(hata) })
    return
  }
  // body-parser hataları (bozuk JSON 400, çok büyük gövde 413, desteklenmeyen karakter seti 415)
  const istemciHatasi = hata as { status?: number; expose?: boolean }
  if (istemciHatasi?.expose && typeof istemciHatasi.status === 'number' && istemciHatasi.status < 500) {
    res.status(istemciHatasi.status).json({ success: false, error: 'İstek gövdesi geçersiz' })
    return
  }
  const bilinen = BILINEN_HATALAR[hataKodu(hata) ?? '']
  if (bilinen) {
    res.status(bilinen[0]).json({ success: false, error: bilinen[1] })
    return
  }
  // Drizzle hatası SQL parametrelerini (kişisel veri) içerir; yalnızca asıl veritabanı hatasını logla.
  console.error('Beklenmeyen hata:', (hata as { cause?: unknown })?.cause ?? hata)
  res.status(500).json({ success: false, error: 'Sunucu hatası' })
}
