import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/** Uçtan uca testler çalışan bir backend ister (varsayılan http://localhost:3000, FISLIK_API ile değişir).
 *  Giriş bilgileri: FISLIK_KULLANICI / FISLIK_SIFRE ortam değişkenleri. */
const sistemChromium = ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 900 },
        launchOptions: sistemChromium ? { executablePath: sistemChromium } : {},
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
