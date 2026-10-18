import cors from 'cors'
import express, { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import type { Db } from './db/client.js'
import { bulunamayanRota, hataYakalayici } from './http/hatalar.js'
import { kimlikDogrula } from './http/kimlik.js'
import { basarili } from './http/yanit.js'
import { authRotalari } from './moduller/auth.js'
import { cezaRotalari } from './moduller/cezalar.js'
import { gorevliRotalari } from './moduller/gorevliler.js'
import { kategoriRotalari } from './moduller/kategoriler.js'
import { kitapRotalari } from './moduller/kitaplar.js'
import { kopyaRotalari } from './moduller/kopyalar.js'
import { oduncRotalari } from './moduller/oduncler.js'
import { panelRotalari } from './moduller/panel.js'
import { rezervasyonRotalari } from './moduller/rezervasyonlar.js'
import { uyeRotalari } from './moduller/uyeler.js'

export interface UygulamaAyarlari {
  jwtGizli: string
  /** Frontend adresi; verilmezse her kaynağa izin verilir (token header'da taşındığı için çerez riski yok). */
  corsOrigin?: string
  /** Önünde kaç reverse proxy var (Render, nginx vb.); rate limit gerçek IP'yi görsün diye. */
  proxySayisi?: number
}

export function uygulamaOlustur(db: Db, ayarlar: UygulamaAyarlari) {
  const app = express()
  if (ayarlar.proxySayisi) app.set('trust proxy', ayarlar.proxySayisi)

  app.use(helmet())
  app.use(cors({ origin: ayarlar.corsOrigin ?? true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }))

  app.get('/api/saglik', (_req, res) => basarili(res, { durum: 'ayakta' }))
  const girisKontrolu = kimlikDogrula(db, ayarlar.jwtGizli)
  app.use('/api/auth', authRotalari(db, ayarlar.jwtGizli, girisKontrolu))

  const korumali = Router()
  korumali.use(girisKontrolu)
  korumali.use('/gorevliler', gorevliRotalari(db))
  korumali.use('/kategoriler', kategoriRotalari(db))
  korumali.use('/kitaplar', kitapRotalari(db))
  korumali.use('/kopyalar', kopyaRotalari(db))
  korumali.use('/uyeler', uyeRotalari(db))
  korumali.use('/oduncler', oduncRotalari(db))
  korumali.use('/rezervasyonlar', rezervasyonRotalari(db))
  korumali.use('/cezalar', cezaRotalari(db))
  korumali.use('/panel', panelRotalari(db))
  app.use('/api', korumali)

  app.use(bulunamayanRota)
  app.use(hataYakalayici)
  return app
}
