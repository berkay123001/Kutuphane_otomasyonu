// Kullanım: npm run db:seed            → kategoriler + ilk görevli + demo veri
//           npm run db:seed -- --temel → yalnızca kategoriler + ilk görevli
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { ayarlariYukle } from '../config.js'
import { KURALLAR } from '../kurallar.js'
import { bugun, gunEkle } from '../tarih.js'
import { veritabaniBaglan, type Db } from './client.js'
import {
  gorevliler,
  hareketler,
  kategoriler,
  kitaplar,
  kopyalar,
  oduncler,
  rezervasyonlar,
  uyeler,
} from './schema.js'

const ilkGorevliSemasi = z.object({
  ILK_GOREVLI_KULLANICI: z.string().trim().min(3, '.env içinde ILK_GOREVLI_KULLANICI tanımlayın'),
  ILK_GOREVLI_SIFRE: z.string().min(8, '.env içinde en az 8 karakterlik ILK_GOREVLI_SIFRE tanımlayın'),
})

const DEWEY = [
  ['000', 'Genel konular'],
  ['100', 'Felsefe ve psikoloji'],
  ['200', 'Din'],
  ['300', 'Sosyal bilimler'],
  ['400', 'Dil'],
  ['500', 'Fen bilimleri'],
  ['600', 'Teknoloji'],
  ['700', 'Sanat'],
  ['800', 'Edebiyat'],
  ['900', 'Tarih ve coğrafya'],
] as const

// [başlık, yazar, yayınevi, yer no, kategori kodu, kopya, blok, raf]
const DEMO_KITAPLAR = [
  ['Sokrates’in Savunması', 'Platon', 'Türkiye İş Bankası Kültür Yayınları', '184 PLA·S', '100', 2, 'A', 3],
  ['Kozmos', 'Carl Sagan', 'Altın Kitaplar', '520 SAG·K', '500', 1, 'A', 11],
  ['Sanatın Öyküsü', 'E. H. Gombrich', 'Remzi Kitabevi', '709 GOM·S', '700', 1, 'A', 17],
  ['Memleketimden İnsan Manzaraları', 'Nazım Hikmet', 'Yapı Kredi Yayınları', '894.351 NAZ·M', '800', 2, 'B', 8],
  ['Kürk Mantolu Madonna', 'Sabahattin Ali', 'Yapı Kredi Yayınları', '894.353 ALİ·K', '800', 4, 'B', 10],
  ['Puslu Kıtalar Atlası', 'İhsan Oktay Anar', 'İletişim Yayınları', '894.353 ANA·P', '800', 2, 'B', 11],
  ['Aylak Adam', 'Yusuf Atılgan', 'Yapı Kredi Yayınları', '894.353 ATI·A', '800', 2, 'B', 13],
  ['Tutunamayanlar', 'Oğuz Atay', 'İletişim Yayınları', '894.353 ATA·T', '800', 3, 'B', 14],
  ['İnce Memed', 'Yaşar Kemal', 'Yapı Kredi Yayınları', '894.353 KEM·İ', '800', 3, 'B', 15],
  ['Beyaz Kale', 'Orhan Pamuk', 'Yapı Kredi Yayınları', '894.353 PAM·B', '800', 2, 'B', 16],
  ['Saatleri Ayarlama Enstitüsü', 'Ahmet Hamdi Tanpınar', 'Dergâh Yayınları', '894.353 TAN·S', '800', 1, 'B', 18],
  ['Osmanlı İmparatorluğu: Klasik Çağ', 'Halil İnalcık', 'Yapı Kredi Yayınları', '956.1015 İNA·O', '900', 1, 'C', 4],
] as const

// [ad, soyad, tür, bölüm]
const DEMO_UYELER = [
  ['Elif', 'Demirci', 'OGRENCI', 'Yazılım Mühendisliği'],
  ['Kerem', 'Yıldız', 'OGRENCI', 'Bilgisayar Mühendisliği'],
  ['Zeynep', 'Arslan', 'OGRENCI', 'Türk Dili ve Edebiyatı'],
  ['Can', 'Öztürk', 'OGRENCI', 'Tarih'],
  ['Deniz', 'Koç', 'OGRENCI', 'Fizik'],
  ['Burak', 'Şahin', 'PERSONEL', 'Kütüphane ve Dokümantasyon'],
  ['Ayşe', 'Kaya', 'OGRENCI', 'Felsefe'],
  ['Mert', 'Çelik', 'PERSONEL', 'İktisat'],
] as const

// [üye adı, kitap başlığı, kaç gün önce verildi, ödünç süresi]
const DEMO_ODUNCLER = [
  ['Elif', 'Saatleri Ayarlama Enstitüsü', 9, 14],
  ['Elif', 'Sokrates’in Savunması', 16, 14],
  ['Kerem', 'Tutunamayanlar', 7, 14],
  ['Deniz', 'Kozmos', 18, 14],
  ['Ayşe', 'Memleketimden İnsan Manzaraları', 20, 14],
  ['Mert', 'Osmanlı İmparatorluğu: Klasik Çağ', 23, 14],
  ['Can', 'Puslu Kıtalar Atlası', 2, 21],
] as const

const GUN_MS = 24 * 60 * 60 * 1000
const gunOnce = (gun: number) => new Date(Date.now() - gun * GUN_MS)

async function temelVeri(db: Db, gorevli: z.infer<typeof ilkGorevliSemasi>) {
  await db.insert(kategoriler).values(DEWEY.map(([kod, ad]) => ({ kod, ad })))
  const [ilk] = await db
    .insert(gorevliler)
    .values({
      ad: 'Kütüphane',
      soyad: 'Görevlisi',
      kullaniciAdi: gorevli.ILK_GOREVLI_KULLANICI,
      sifreHash: await bcrypt.hash(gorevli.ILK_GOREVLI_SIFRE, 10),
    })
    .returning()
  return ilk!
}

async function demoVeri(db: Db, gorevliId: number) {
  const kategoriListesi = await db.select().from(kategoriler)
  const kategoriId = (kod: string) => kategoriListesi.find((k) => k.kod === kod)!.id
  const bugunTarih = bugun()

  const kitapKopyalari = new Map<string, Array<typeof kopyalar.$inferSelect>>()
  for (const [baslik, yazar, yayinevi, yerNumarasi, kod, adet, blok, rafNo] of DEMO_KITAPLAR) {
    const [kitap] = await db
      .insert(kitaplar)
      .values({ baslik, yazar, yayinevi, yerNumarasi, kategoriId: kategoriId(kod) })
      .returning()
    const liste = await db
      .insert(kopyalar)
      .values(Array.from({ length: adet }, () => ({ kitapId: kitap!.id, blok, rafNo })))
      .returning()
    kitapKopyalari.set(baslik, liste)
  }

  const uyeListesi = await db
    .insert(uyeler)
    .values(
      DEMO_UYELER.map(([ad, soyad, tur, bolum]) => ({
        ad,
        soyad,
        tur,
        bolum,
        eposta: `${ad.toLocaleLowerCase('tr')}.${soyad.toLocaleLowerCase('tr')}@ornek.edu.tr`,
        kartGecerlilik: gunEkle(bugunTarih, KURALLAR.kartGecerlilikGunu),
      })),
    )
    .returning()
  const uyeId = (ad: string) => uyeListesi.find((u) => u.ad === ad)!.id

  for (const [uyeAdi, baslik, gunOnceVerildi, sure] of DEMO_ODUNCLER) {
    // Her kitap listede bir kez geçtiği için ilk kopyası verilir.
    const kopya = kitapKopyalari.get(baslik)![0]!
    const verilisZamani = gunOnce(gunOnceVerildi)
    await db.insert(oduncler).values({
      uyeId: uyeId(uyeAdi),
      kopyaId: kopya.id,
      verilisZamani,
      sonTeslimTarihi: gunEkle(bugunTarih, sure - gunOnceVerildi),
    })
    await db.update(kopyalar).set({ durum: 'ODUNCTE' }).where(eq(kopyalar.id, kopya.id))
    await db.insert(hareketler).values({
      tip: 'ODUNC',
      zaman: verilisZamani,
      kitapId: kopya.kitapId,
      kopyaId: kopya.id,
      uyeId: uyeId(uyeAdi),
      gorevliId,
    })
  }

  // Burak, Sanatın Öyküsü'nü ayırtmış; kopya ödünç masasında onu bekliyor.
  const ayrilan = kitapKopyalari.get('Sanatın Öyküsü')![0]!
  await db.insert(rezervasyonlar).values({
    uyeId: uyeId('Burak'),
    kitapId: ayrilan.kitapId,
    kopyaId: ayrilan.id,
    durum: 'HAZIR',
    sonGecerlilik: gunEkle(bugunTarih, KURALLAR.rezervasyonBeklemeGunu),
  })
  await db.update(kopyalar).set({ durum: 'AYRILDI' }).where(eq(kopyalar.id, ayrilan.id))
  await db.insert(hareketler).values({
    tip: 'AYIRTMA',
    kitapId: ayrilan.kitapId,
    kopyaId: ayrilan.id,
    uyeId: uyeId('Burak'),
    gorevliId,
  })
}

const ayarlar = ayarlariYukle()
const gorevliBilgisi = ilkGorevliSemasi.safeParse(process.env)
if (!gorevliBilgisi.success) {
  console.error(z.prettifyError(gorevliBilgisi.error))
  process.exit(1)
}

const { db, kapat } = await veritabaniBaglan({
  url: ayarlar.DATABASE_URL,
  sslCa: ayarlar.DATABASE_SSL_CA,
  yerelKlasor: ayarlar.YEREL_VERI_KLASORU,
})
try {
  if ((await db.$count(kategoriler)) > 0) {
    console.info('Veritabanında zaten veri var; seed atlandı.')
  } else {
    await db.transaction(async (tx) => {
      const gorevli = await temelVeri(tx, gorevliBilgisi.data)
      if (!process.argv.includes('--temel')) await demoVeri(tx, gorevli.id)
    })
    console.info(`Seed tamam. Giriş: ${gorevliBilgisi.data.ILK_GOREVLI_KULLANICI}`)
  }
} finally {
  await kapat()
}
