import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (existsSync('.env')) process.loadEnvFile('.env')

const url = process.env.DATABASE_URL

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  ...(url ? { dbCredentials: { url } } : {}),
})
