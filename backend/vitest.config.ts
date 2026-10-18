import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// `npm run test:postgres`: testler .env'deki DATABASE_URL veritabanında, her dosyaya özel geçici şemada çalışır.
if (process.env.TEST_POSTGRES && existsSync('.env')) {
  process.loadEnvFile('.env')
  process.env.TEST_DATABASE_URL ??= process.env.DATABASE_URL
}
const gercekPostgres = Boolean(process.env.TEST_DATABASE_URL)

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Gerçek Postgres'te dosyalar sırayla çalışsın; Supabase'in bağlantı sınırı aşılmasın.
    fileParallelism: !gercekPostgres,
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/db/seed.ts'],
    },
  },
})
