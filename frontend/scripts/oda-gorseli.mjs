// Tasarımın CSS odasını (src/oda/OdaCizimi.tsx) çizip gündüz/gece arka plan görsellerini üretir.
// Kullanım: node scripts/oda-gorseli.mjs [http://localhost:5173]   (çalışan bir vite sunucusu gerekir)
import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'

const ADRES = process.argv[2] ?? 'http://localhost:5173'
const sistem = ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))
const tarayici = await chromium.launch(sistem ? { executablePath: sistem } : {})

for (const [tema, deger] of [['gunduz', 'day'], ['gece', 'night']]) {
  const sayfa = await tarayici.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 })
  await sayfa.addInitScript((d) => localStorage.setItem('fislik-tema', d), deger)
  await sayfa.goto(`${ADRES}/_oda`, { waitUntil: 'networkidle' })
  await sayfa.evaluate(() => document.fonts.ready)
  // Toz zerreleri uygulamada canlı çizilir; görselde olmasın
  await sayfa.addStyleTag({ content: '[class*="_dust_"]{display:none!important}' })
  await sayfa.waitForTimeout(3200)
  // Tüm animasyonları aynı ana sabitle (bulutlar, perdeler, huzmeler, lamba)
  await sayfa.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 9000 }))
  await sayfa.waitForTimeout(300)
  await sayfa.screenshot({ path: `public/oda/${tema}.jpg`, type: 'jpeg', quality: 86 })
  console.log('üretildi:', `public/oda/${tema}.jpg`)
  await sayfa.close()
}
await tarayici.close()
