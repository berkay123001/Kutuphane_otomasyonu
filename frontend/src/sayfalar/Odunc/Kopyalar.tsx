/** Kopya kartları: verilecek kopya mor halkayla işaretlenir, damgası ödünçten sonra değişir. */
import { BosDurum } from '../../ui/Durumlar'
import { Damga } from '../../ui/Damga'
import { kopyaGorunumu, type KitapKopyasi, type VerilenKopya } from './oduncVeri'
import stil from './Fis.module.css'

interface KartProps {
  readonly kopya: KitapKopyasi
  readonly sira: number
  readonly halkali: boolean
  readonly verildi: boolean
  readonly bugun: string
  readonly verilen: VerilenKopya | null
}

function KopyaKarti({ kopya, sira, halkali, verildi, bugun, verilen }: KartProps) {
  const g = kopyaGorunumu(kopya, bugun, verilen)
  const siniflar = [stil.kopya, g.soluk && !halkali ? stil.soluk : '', halkali ? stil.halkali : '']
    .filter(Boolean)
    .join(' ')
  return (
    <li className={siniflar} style={{ animationDelay: `${0.9 + Math.min(sira, 8) * 0.1}s` }}>
      {halkali && <span className={stil.bayrak}>{verildi ? 'Verildi' : 'Veriliyor'}</span>}
      <span className={stil.kopyaNo}>K.{sira + 1}</span>
      <span className={stil.barkod}>{kopya.barkod}</span>
      <span className={stil.kopyaSatir}>{g.satir}</span>
      <Damga key={g.damga} murekkep={g.murekkep} vur={g.vur} className={stil.kopyaDamga}>
        {g.damga}
      </Damga>
    </li>
  )
}

function bolumNotu(
  kopyalar: readonly KitapKopyasi[],
  halkaliId: number | null,
  uyeId: number | null,
  verilen: VerilenKopya | null,
): string {
  const sira = kopyalar.findIndex((k) => k.id === halkaliId)
  const halkali = kopyalar[sira]
  if (!halkali) return 'Rafta verilebilecek kopya yok'
  if (verilen?.kopyaId === halkali.id) return `K.${sira + 1} okuyucuya verildi`
  if (halkali.durum === 'AYRILDI' && halkali.ayrilanRezervasyon?.uye.id === uyeId) {
    return 'Bu okuyucuya ayrılan kopya seçildi'
  }
  return 'Rafta olan kopya otomatik seçilir'
}

interface Props {
  readonly kopyalar: readonly KitapKopyasi[]
  readonly halkaliId: number | null
  readonly uyeId: number | null
  readonly verilen: VerilenKopya | null
  readonly bugun: string
}

export function Kopyalar({ kopyalar, halkaliId, uyeId, verilen, bugun }: Props) {
  return (
    <section className={stil.bolum} aria-labelledby="h-kopyalar">
      <div className="sec-head">
        <h2 className="h2" id="h-kopyalar">
          Kopyalar
        </h2>
        <p className="note">{kopyalar.length > 0 ? bolumNotu(kopyalar, halkaliId, uyeId, verilen) : 'Henüz kopya yok'}</p>
      </div>
      {kopyalar.length === 0 ? (
        <BosDurum baslik="Bu fişin rafta kopyası yok" aciklama="Kopya eklenince burada görünür." />
      ) : (
        <ul className={stil.kopyalar}>
          {kopyalar.map((k, i) => (
            <KopyaKarti
              key={k.id}
              kopya={k}
              sira={i}
              halkali={k.id === halkaliId}
              verildi={verilen?.kopyaId === k.id}
              bugun={bugun}
              verilen={verilen}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
