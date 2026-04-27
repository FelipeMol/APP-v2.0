import { Navigate } from 'react-router-dom';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';

export function ModuleGuard({ moduleId, children }) {
  const isModuleEnabled = useTenantStore(s => s.isModuleEnabled);
  const isLoadingTenants = useTenantStore(s => s.isLoadingTenants);
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin);

  // Superadmin vê todos os módulos sem restrição
  if (isSuperAdmin()) return children;

  if (isLoadingTenants) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isModuleEnabled(moduleId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ModuleGuard;
