import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import pg from 'pg'
import * as schema from './schema.js'

/** Hem Supabase (node-postgres) hem PGlite bağlantısı bu tipe uyar; transaction nesnesi de. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export interface Baglanti {
  db: Db
  kapat: () => Promise<void>
}

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))
const ortak = { schema, casing: 'snake_case' } as const
const YEREL_HOSTLAR = ['localhost', '127.0.0.1', '::1']

/**
 * Uzak veritabanı (Supabase) bağlantısı her zaman şifrelenir.
 * - CA sertifikası verilirse sunucu kimliği de doğrulanır (önerilen).
 * - Verilmezse bağlantı yine şifreli olur ama sertifika doğrulanmaz.
 * URL'de sslmode yazıyorsa ya da sunucu yereldeyse URL'ye dokunulmaz.
 */
export function sslAyari(url: string, caYolu?: string): pg.PoolConfig['ssl'] {
  const { hostname, searchParams } = new URL(url)
  if (searchParams.has('sslmode') || YEREL_HOSTLAR.includes(hostname)) return undefined
  if (caYolu) return { ca: readFileSync(caYolu, 'utf8') }
  return { rejectUnauthorized: false }
}

/**
 * `url` verilirse gerçek Postgres'e (Supabase) bağlanır.
 * Verilmezse gömülü PGlite kullanılır: `yerelKlasor` varsa oraya yazar, yoksa bellekte çalışır (testler).
 * Her iki durumda da bekleyen migration'lar uygulanır.
 */
export async function veritabaniBaglan(secenek: {
  url?: string
  sslCa?: string
  yerelKlasor?: string
}): Promise<Baglanti> {
  if (secenek.url) {
    const havuz = new pg.Pool({
      connectionString: secenek.url,
      ssl: sslAyari(secenek.url, secenek.sslCa),
      max: 5,
      keepAlive: true,
      connectionTimeoutMillis: 10_000,
    })
    // Supabase boşta kalan bağlantıyı kapatırsa pg havuzda 'error' yayar; dinlenmezse süreç çöker.
    havuz.on('error', (hata) => console.error('Veritabanı bağlantısı koptu, havuz yenisini açacak:', hata.message))
    const db = drizzlePg(havuz, ortak)
    await migratePg(db, { migrationsFolder })
    return { db, kapat: () => havuz.end() }
  }

  const istemci = new PGlite(secenek.yerelKlasor)
  const db = drizzlePglite(istemci, ortak)
  await migratePglite(db, { migrationsFolder })
  return { db, kapat: () => istemci.close() }
}
