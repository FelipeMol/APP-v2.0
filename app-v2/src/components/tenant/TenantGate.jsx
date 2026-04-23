import useTenantStore from '../../store/tenantStore';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Sempre obrigar selecionar empresa após login.
 * Se estiver autenticado e não tiver tenant => manda para /selecionar-empresa
 */
export default function TenantGate({ children }) {
  const tenantId = useTenantStore((s) => s.selectedTenantId);
  const location = useLocation();

  // Evitar loop caso já esteja no seletor
  if (!tenantId && location.pathname !== '/selecionar-empresa') {
    return <Navigate to="/selecionar-empresa" replace />;
  }

  return children;
}
