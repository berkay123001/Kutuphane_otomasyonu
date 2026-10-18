/** Çekmece riffle'ını yeniden oynatmak için anahtar: tasarımdaki A/B kare adı takası yerine
 *  React key'i değişir, yığın yeniden kurulur. Gösterilen verinin sekmesi değiştiğinde ilerler
 *  (yer tutucu veri ekrandayken değil), böylece fişler yeni veriyle birlikte düşer. */
import { useMemo, useState } from 'react'

export interface Riffle {
  readonly anahtar: string
  /** Tasarımdaki riffleA / riffleB: eğim yönü her turda değişir */
  readonly yon: 'sol' | 'sag'
  /** İlk açılışta çekmece çekilirken bekler, sonraki turlarda hemen başlar (sn) */
  readonly taban: number
  /** Turun başladığı an (performance.now, ms); geç gelen fişler kalan süreyi bekler */
  readonly baslangic: number
}

const ILK_TABAN = 0.9
const SONRAKI_TABAN = 0.08

const simdi = () => performance.now()

/** Hazır olduğu son değeri tutar (yer tutucu veri gösterilirken eski anahtar kalır). */
export function useSonHazir<T>(deger: T, hazir: boolean): T {
  const [son, setSon] = useState(deger)
  if (hazir && !Object.is(son, deger)) setSon(deger)
  return hazir ? deger : son
}

export function useRiffle(sekmeAnahtari: string): Riffle {
  const [durum, setDurum] = useState(() => ({ sekme: sekmeAnahtari, tur: 0, baslangic: simdi() }))
  if (durum.sekme !== sekmeAnahtari) {
    setDurum({ sekme: sekmeAnahtari, tur: durum.tur + 1, baslangic: simdi() })
  }
  return useMemo(
    () => ({
      anahtar: `${durum.sekme}-${durum.tur}`,
      yon: durum.tur % 2 === 0 ? 'sol' : 'sag',
      taban: durum.tur === 0 ? ILK_TABAN : SONRAKI_TABAN,
      baslangic: durum.baslangic,
    }),
    [durum],
  )
}
