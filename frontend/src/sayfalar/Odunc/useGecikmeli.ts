import { useEffect, useState } from 'react'

/** Değeri, verilen süre boyunca değişmezse yansıtır (arama kutuları için). */
export function useGecikmeli<T>(deger: T, ms = 250): T {
  const [gecikmeli, setGecikmeli] = useState(deger)
  useEffect(() => {
    const zamanlayici = window.setTimeout(() => setGecikmeli(deger), ms)
    return () => window.clearTimeout(zamanlayici)
  }, [deger, ms])
  return gecikmeli
}
