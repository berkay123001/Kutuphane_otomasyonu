/** Blender sahnesinin ölçüleri (fislik/claude_3d/scripts/kt_layout.py) — Three.js koordinatlarında.
 *  Blender (x, y, z) Z-yukarı  →  Three (x, z, -y) Y-yukarı. Kamera odaya -Z yönünde bakar. */

export type V3 = readonly [number, number, number]

export function blenderdan(x: number, y: number, z: number): V3 {
  return [x, z, -y]
}

// ---------- oda ve pencere (Blender ölçüleri) ----------
export const PENCERE = {
  duzlemZ: -2.8, // Blender y = Y_BACK + 0.20
  yariGenislik: 0.825, // iç kasa
  denizlik: 1.225,
  kemerBasi: 3.3,
  kayitlar: { dikey: [-0.3, 0.3], yatay: [1.919, 2.608, 3.3], kemerHalka: [0.4, 0.434] },
  perdeIc: 0.74,
} as const

/** Güneşe doğru birim vektör (kt_light.SUN_DIR, Three'ye çevrilmiş). */
export const GUNES_YONU: V3 = (() => {
  const [x, y, z] = blenderdan(-0.34, 0.72, 0.6)
  const u = Math.hypot(x, y, z)
  return [x / u, y / u, z / u]
})()

// ---------- fişlik dolabı ----------
export const DOLAP = {
  merkez: blenderdan(0, 1.95, 0),
  onYuzZ: -1.507,
  ust: 1.09,
  acilma: 0.42,
} as const

export interface CekmeceTanimi {
  readonly ad: string
  readonly x: number
  readonly y: number // ön yüz merkezi yüksekliği
  /** Bu çekmecedeki Dewey aralığı (kategori kodunun ilk hanesi) */
  readonly aralik: readonly [number, number]
  readonly etiket: string
}

export const CEKMECELER: readonly CekmeceTanimi[] = [
  { ad: 'Cekmece_Ust_Sol', x: -0.553, y: 0.776, aralik: [0, 1], etiket: '000–199' },
  { ad: 'Cekmece_Ust_Orta', x: 0, y: 0.776, aralik: [2, 3], etiket: '200–399' },
  { ad: 'Cekmece_Ust_Sag', x: 0.552, y: 0.776, aralik: [4, 5], etiket: '400–599' },
  { ad: 'Cekmece_Alt_Sol', x: -0.553, y: 0.346, aralik: [6, 7], etiket: '600–799' },
  { ad: 'Cekmece_Alt_Orta', x: 0, y: 0.346, aralik: [8, 8], etiket: '800–899' },
  { ad: 'Cekmece_Alt_Sag', x: 0.552, y: 0.346, aralik: [9, 9], etiket: '900–999' },
]

// ---------- kamera bakışları ----------
export interface Bakis {
  readonly konum: V3
  readonly hedef: V3
  readonly fov: number
}

export const BAKIS_GENEL: Bakis = {
  konum: blenderdan(0, -3.4, 1.45),
  hedef: blenderdan(0, 2.6, 2.05),
  fov: 52,
}

export const BAKIS_DOLAP: Bakis = {
  konum: blenderdan(0, 0.15, 1.22),
  hedef: blenderdan(0, 1.6, 0.62),
  fov: 46,
}

/** Açık çekmecenin üstünden içine bakış. */
export function cekmeceBakisi(c: CekmeceTanimi): Bakis {
  const ustSira = c.y > 0.5
  return {
    konum: blenderdan(c.x, 0.62, ustSira ? 1.48 : 1.12),
    hedef: blenderdan(c.x, 1.45, ustSira ? 0.82 : 0.4),
    fov: 42,
  }
}
