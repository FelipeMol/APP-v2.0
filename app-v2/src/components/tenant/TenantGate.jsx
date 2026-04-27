import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Sempre obrigar selecionar empresa após login.
 * Se estiver autenticado e não tiver tenant => manda para /selecionar-empresa.
 * Superadmin é dispensado pois opera globalmente.
 */
export default function TenantGate({ children }) {
  const tenantId = useTenantStore((s) => s.selectedTenantId);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const location = useLocation();

  // Superadmin opera globalmente, sem necessidade de tenant
  if (isSuperAdmin()) return children;

  // Evitar loop caso já esteja no seletor
  if (!tenantId && location.pathname !== '/selecionar-empresa') {
    return <Navigate to="/selecionar-empresa" replace />;
  }

  return children;
}
