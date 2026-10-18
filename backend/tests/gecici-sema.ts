import { readFileSync, readdirSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { sslAyari, type Baglanti } from '../src/db/client.js'
import * as schema from '../src/db/schema.js'

const MIGRATION_KLASORU = new URL('../drizzle/', import.meta.url)

/**
 * Gerçek Postgres'te (ör. Supabase) bu test dosyasına özel geçici bir şema açar ve migration'ları oraya uygular.
 * Bağlantılar search_path ile o şemaya yönlenir; public'teki gerçek veriye dokunulmaz. Kapanışta şema silinir.
 */
export async function geciciSemayaBaglan(url: string): Promise<Baglanti> {
  const sema = `test_${process.pid}_${Date.now()}`
  const havuz = new pg.Pool({ connectionString: url, ssl: sslAyari(url), max: 4, keepAlive: true })
  havuz.on('error', () => {})
  havuz.on('connect', (istemci) => {
    istemci.query(`set search_path to "${sema}"`).catch(() => {})
  })

  await havuz.query(`create schema "${sema}"`)
  const dosyalar = readdirSync(MIGRATION_KLASORU).filter((d) => d.endsWith('.sql')).sort()
  for (const dosya of dosyalar) {
    const sql = readFileSync(new URL(dosya, MIGRATION_KLASORU), 'utf8').replaceAll('"public".', `"${sema}".`)
    for (const ifade of sql.split('--> statement-breakpoint')) {
      if (ifade.trim()) await havuz.query(ifade)
    }
  }

  return {
    db: drizzle(havuz, { schema, casing: 'snake_case' }),
    kapat: async () => {
      await havuz.query(`drop schema "${sema}" cascade`)
      await havuz.end()
    },
  }
}
