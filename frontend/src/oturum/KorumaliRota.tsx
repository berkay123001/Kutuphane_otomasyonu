import { Navigate, Outlet, useLocation } from 'react-router'
import { useOturum } from './OturumSaglayici'

/** Oturum yoksa giriş fişine gönderir; dönüşte kaldığı yere getirmek için konumu saklar. */
export function KorumaliRota() {
  const { oturum } = useOturum()
  const konum = useLocation()
  if (!oturum) return <Navigate to="/giris" replace state={{ donus: konum.pathname + konum.search }} />
  return <Outlet />
}
