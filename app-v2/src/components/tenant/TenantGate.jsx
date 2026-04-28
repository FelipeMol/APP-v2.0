import { useEffect } from 'react';
import useTenantStore from '../../store/tenantStore';
import useGrupoStore from '../../store/grupoStore';
import useAuthStore from '../../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';

export default function TenantGate({ children }) {
  const { selectedTenantId, setTenant, loadModulosDoTenant, loadTenants, isLoadingTenants } = useTenantStore();
  const { grupo, autoTenantId, domainTenants } = useGrupoStore();
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin);
  const location = useLocation();

  useEffect(() => {
    if (isSuperAdmin()) return;
    if (selectedTenantId) return;

    if (autoTenantId && domainTenants.length === 1) {
      setTenant(autoTenantId);
      loadModulosDoTenant(autoTenantId);
      return;
    }

    if (domainTenants.length > 0 && !isLoadingTenants) {
      return;
    }

    const allowedTenants = JSON.parse(localStorage.getItem('allowed_tenants') || '[]');
    const allowedIds = allowedTenants.map(t => t.id ?? t);
    const grupoId = grupo?.id ?? null;
    loadTenants(allowedIds, grupoId, domainTenants, autoTenantId);
  }, [autoTenantId, domainTenants, selectedTenantId, grupo, isSuperAdmin, setTenant, loadModulosDoTenant, loadTenants, isLoadingTenants]);

  if (isSuperAdmin()) return children;

  if (autoTenantId && !selectedTenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!selectedTenantId && location.pathname !== '/selecionar-empresa') {
    return <Navigate to="/selecionar-empresa" replace />;
  }

  return children;
}
