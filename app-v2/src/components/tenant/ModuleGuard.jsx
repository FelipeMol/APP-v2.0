import { Navigate } from 'react-router-dom';
import useTenantStore from '../../store/tenantStore';

export function ModuleGuard({ moduleId, children }) {
  const isModuleEnabled = useTenantStore(s => s.isModuleEnabled);
  const isLoadingTenants = useTenantStore(s => s.isLoadingTenants);

  // Estado: loading
  if (isLoadingTenants) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Estado: módulo inativo → redirecionar
  if (!isModuleEnabled(moduleId)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Estado: módulo ativo → renderizar
  return children;
}

export default ModuleGuard;
