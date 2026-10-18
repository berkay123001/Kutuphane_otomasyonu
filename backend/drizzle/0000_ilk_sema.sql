CREATE TYPE "public"."hareket_tipi" AS ENUM('ODUNC', 'IADE', 'GEC_IADE', 'UZATMA', 'AYIRTMA');--> statement-breakpoint
CREATE TYPE "public"."kopya_durumu" AS ENUM('RAFTA', 'ODUNCTE', 'AYRILDI');--> statement-breakpoint
CREATE TYPE "public"."rezervasyon_durumu" AS ENUM('BEKLIYOR', 'HAZIR', 'TAMAMLANDI', 'IPTAL');--> statement-breakpoint
CREATE TYPE "public"."uye_turu" AS ENUM('OGRENCI', 'PERSONEL');--> statement-breakpoint
CREATE TABLE "cezalar" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cezalar_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"odunc_id" integer NOT NULL,
	"gecikme_gunu" integer NOT NULL,
	"tutar" numeric(10, 2) NOT NULL,
	"odendi" boolean DEFAULT false NOT NULL,
	"odeme_zamani" timestamp with time zone,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cezalar_oduncId_unique" UNIQUE("odunc_id")
);
--> statement-breakpoint
ALTER TABLE "cezalar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gorevliler" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gorevliler_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ad" text NOT NULL,
	"soyad" text NOT NULL,
	"eposta" text,
	"telefon" text,
	"kullanici_adi" text NOT NULL,
	"sifre_hash" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gorevliler_kullaniciAdi_unique" UNIQUE("kullanici_adi")
);
--> statement-breakpoint
ALTER TABLE "gorevliler" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hareketler" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hareketler_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tip" "hareket_tipi" NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"kitap_id" integer NOT NULL,
	"kopya_id" integer,
	"uye_id" integer NOT NULL,
	"gorevli_id" integer
);
--> statement-breakpoint
ALTER TABLE "hareketler" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kategoriler" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kategoriler_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kod" text NOT NULL,
	"ad" text NOT NULL,
	CONSTRAINT "kategoriler_kod_unique" UNIQUE("kod")
);
--> statement-breakpoint
ALTER TABLE "kategoriler" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kitaplar" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kitaplar_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"isbn" text,
	"baslik" text NOT NULL,
	"yazar" text NOT NULL,
	"yayinevi" text,
	"yayin_yili" integer,
	"yer_numarasi" text,
	"kategori_id" integer NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitaplar_isbn_unique" UNIQUE("isbn")
);
--> statement-breakpoint
ALTER TABLE "kitaplar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kopyalar" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kopyalar_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"barkod" text GENERATED ALWAYS AS (lpad("id"::text, greatest(6, length("id"::text)), '0')) STORED NOT NULL,
	"kitap_id" integer NOT NULL,
	"blok" text,
	"raf_no" integer,
	"durum" "kopya_durumu" DEFAULT 'RAFTA' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kopyalar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oduncler" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "oduncler_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uye_id" integer NOT NULL,
	"kopya_id" integer NOT NULL,
	"verilis_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"son_teslim_tarihi" date NOT NULL,
	"iade_zamani" timestamp with time zone,
	"uzatildi" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oduncler" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rezervasyonlar" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rezervasyonlar_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uye_id" integer NOT NULL,
	"kitap_id" integer NOT NULL,
	"kopya_id" integer,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"son_gecerlilik" date,
	"durum" "rezervasyon_durumu" DEFAULT 'BEKLIYOR' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rezervasyonlar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "uyeler" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "uyeler_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uye_no" text GENERATED ALWAYS AS ('Ü-' || lpad("id"::text, greatest(4, length("id"::text)), '0')) STORED NOT NULL,
	"ad" text NOT NULL,
	"soyad" text NOT NULL,
	"eposta" text,
	"telefon" text,
	"tur" "uye_turu" NOT NULL,
	"bolum" text,
	"uyelik_tarihi" date DEFAULT (now() at time zone 'Europe/Istanbul')::date NOT NULL,
	"kart_gecerlilik" date NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uyeler" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cezalar" ADD CONSTRAINT "cezalar_odunc_id_oduncler_id_fk" FOREIGN KEY ("odunc_id") REFERENCES "public"."oduncler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareketler" ADD CONSTRAINT "hareketler_kitap_id_kitaplar_id_fk" FOREIGN KEY ("kitap_id") REFERENCES "public"."kitaplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareketler" ADD CONSTRAINT "hareketler_kopya_id_kopyalar_id_fk" FOREIGN KEY ("kopya_id") REFERENCES "public"."kopyalar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareketler" ADD CONSTRAINT "hareketler_uye_id_uyeler_id_fk" FOREIGN KEY ("uye_id") REFERENCES "public"."uyeler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareketler" ADD CONSTRAINT "hareketler_gorevli_id_gorevliler_id_fk" FOREIGN KEY ("gorevli_id") REFERENCES "public"."gorevliler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitaplar" ADD CONSTRAINT "kitaplar_kategori_id_kategoriler_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategoriler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kopyalar" ADD CONSTRAINT "kopyalar_kitap_id_kitaplar_id_fk" FOREIGN KEY ("kitap_id") REFERENCES "public"."kitaplar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oduncler" ADD CONSTRAINT "oduncler_uye_id_uyeler_id_fk" FOREIGN KEY ("uye_id") REFERENCES "public"."uyeler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oduncler" ADD CONSTRAINT "oduncler_kopya_id_kopyalar_id_fk" FOREIGN KEY ("kopya_id") REFERENCES "public"."kopyalar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervasyonlar" ADD CONSTRAINT "rezervasyonlar_uye_id_uyeler_id_fk" FOREIGN KEY ("uye_id") REFERENCES "public"."uyeler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervasyonlar" ADD CONSTRAINT "rezervasyonlar_kitap_id_kitaplar_id_fk" FOREIGN KEY ("kitap_id") REFERENCES "public"."kitaplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervasyonlar" ADD CONSTRAINT "rezervasyonlar_kopya_id_kopyalar_id_fk" FOREIGN KEY ("kopya_id") REFERENCES "public"."kopyalar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hareketler_zaman_index" ON "hareketler" USING btree ("zaman");--> statement-breakpoint
CREATE INDEX "hareketler_kitap_id_index" ON "hareketler" USING btree ("kitap_id");--> statement-breakpoint
CREATE INDEX "kitaplar_kategori_id_index" ON "kitaplar" USING btree ("kategori_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kopyalar_barkod_index" ON "kopyalar" USING btree ("barkod");--> statement-breakpoint
CREATE INDEX "kopyalar_kitap_id_index" ON "kopyalar" USING btree ("kitap_id");--> statement-breakpoint
CREATE INDEX "oduncler_uye_id_index" ON "oduncler" USING btree ("uye_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oduncler_aktif_kopya" ON "oduncler" USING btree ("kopya_id") WHERE iade_zamani is null;--> statement-breakpoint
CREATE INDEX "rezervasyonlar_kitap_id_index" ON "rezervasyonlar" USING btree ("kitap_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rezervasyonlar_acik_uye_kitap" ON "rezervasyonlar" USING btree ("uye_id","kitap_id") WHERE durum in ('BEKLIYOR', 'HAZIR');--> statement-breakpoint
CREATE UNIQUE INDEX "uyeler_uye_no_index" ON "uyeler" USING btree ("uye_no");