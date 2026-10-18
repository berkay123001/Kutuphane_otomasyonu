/** React Query kancaları. Yazma işlemleri ilgili listeleri ve detayları tazeler. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as U from './uclar'

export const anahtar = {
  panel: ['panel'] as const,
  kategoriler: ['kategoriler'] as const,
  kitaplar: (f: U.KitapFiltresi) => ['kitaplar', f] as const,
  kitap: (id: number) => ['kitap', id] as const,
  uyeler: (f: U.UyeFiltresi) => ['uyeler', f] as const,
  uye: (id: number) => ['uye', id] as const,
  oduncler: (f: U.OduncFiltresi) => ['oduncler', f] as const,
  cezalar: (f: object) => ['cezalar', f] as const,
}

export const usePanel = () => useQuery({ queryKey: anahtar.panel, queryFn: ({ signal }) => U.paneliGetir(signal) })

export const useKategoriler = () =>
  useQuery({ queryKey: anahtar.kategoriler, queryFn: ({ signal }) => U.kategorileriGetir(signal), staleTime: 5 * 60_000 })

export const useKitaplar = (f: U.KitapFiltresi) =>
  useQuery({
    queryKey: anahtar.kitaplar(f),
    queryFn: ({ signal }) => U.kitaplariGetir(f, signal),
    placeholderData: keepPreviousData,
  })

export const useKitap = (id: number | null) =>
  useQuery({
    queryKey: anahtar.kitap(id ?? 0),
    queryFn: ({ signal }) => U.kitabiGetir(id ?? 0, signal),
    enabled: id !== null && id > 0,
  })

export const useUyeler = (f: U.UyeFiltresi, etkin = true) =>
  useQuery({
    queryKey: anahtar.uyeler(f),
    queryFn: ({ signal }) => U.uyeleriGetir(f, signal),
    placeholderData: keepPreviousData,
    enabled: etkin,
  })

export const useUye = (id: number | null) =>
  useQuery({
    queryKey: anahtar.uye(id ?? 0),
    queryFn: ({ signal }) => U.uyeyiGetir(id ?? 0, signal),
    enabled: id !== null && id > 0,
  })

export const useOduncler = (f: U.OduncFiltresi) =>
  useQuery({ queryKey: anahtar.oduncler(f), queryFn: ({ signal }) => U.oduncleriGetir(f, signal) })

export const useCezalar = (f: { odendi?: boolean; uyeId?: number; limit?: number }) =>
  useQuery({ queryKey: anahtar.cezalar(f), queryFn: ({ signal }) => U.cezalariGetir(f, signal) })

/** Dolaşımı etkileyen her yazmadan sonra tazelenecek sorgular. */
function useDolasimTazele() {
  const qc = useQueryClient()
  return (): void =>
    void Promise.all(
      ['panel', 'kitaplar', 'kitap', 'uyeler', 'uye', 'oduncler', 'cezalar', 'kategoriler'].map((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}

export function useOduncVer() {
  const tazele = useDolasimTazele()
  return useMutation({
    mutationFn: (a: { uyeId: number; gun: U.OduncSuresi; hedef: U.OduncHedefi }) =>
      U.oduncVer(a.uyeId, a.gun, a.hedef),
    onSuccess: tazele,
  })
}

export function useUzat() {
  const tazele = useDolasimTazele()
  return useMutation({ mutationFn: (oduncId: number) => U.oduncUzat(oduncId), onSuccess: tazele })
}

export function useIade() {
  const tazele = useDolasimTazele()
  return useMutation({ mutationFn: (oduncId: number) => U.iadeAl(oduncId), onSuccess: tazele })
}

export function useRezervasyon() {
  const tazele = useDolasimTazele()
  return useMutation({
    mutationFn: (a: { uyeId: number; kitapId: number }) => U.rezervasyonYap(a.uyeId, a.kitapId),
    onSuccess: tazele,
  })
}

export function useRezervasyonIptal() {
  const tazele = useDolasimTazele()
  return useMutation({ mutationFn: (id: number) => U.rezervasyonIptal(id), onSuccess: tazele })
}

export function useCezaOde() {
  const tazele = useDolasimTazele()
  return useMutation({ mutationFn: (id: number) => U.cezaOde(id), onSuccess: tazele })
}

export function useUyeOlustur() {
  const tazele = useDolasimTazele()
  return useMutation({ mutationFn: (u: U.YeniUye) => U.uyeOlustur(u), onSuccess: tazele })
}

export function useKartYenile() {
  const tazele = useDolasimTazele()
  return useMutation({
    mutationFn: (a: { id: number; kartGecerlilik: string }) => U.kartiYenile(a.id, a.kartGecerlilik),
    onSuccess: tazele,
  })
}
