import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import useTenantStore from '../store/tenantStore';
import useGrupoStore from '../store/grupoStore';
import authService from '../services/authService';
import { Check } from 'lucide-react';
import useTenantBranding from '../hooks/useTenantBranding';

function TenantCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/40 bg-card h-28 sm:h-40 md:h-[360px] animate-pulse" />
  );
}

function TenantCard({ tenant, isSelected, disabled, onSelect }) {
  return (
    <button type="button" disabled={disabled} onClick={onSelect} className="text-left w-full">
      <Card
        className={
          `relative overflow-hidden border-border/40 shadow-sm transition-all ` +
          `hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 ` +
          (disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer') +
          (isSelected ? ' ring-2 ring-foreground/70' : '')
        }
      >
        <div className="h-28 sm:h-40 md:h-[360px] p-5 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              {tenant.short_name || tenant.name}
            </div>
            {isSelected && (
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground/80 bg-muted/40 px-2 py-0.5 rounded-full">
                <Check className="w-3.5 h-3.5" />
                Selecionada
              </div>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function SelecionarEmpresa() {
  const navigate = useNavigate();
  const { selectedTenantId, setTenant, tenants, isLoadingTenants, loadTenants, loadModulosDoTenant } = useTenantStore();
  const { grupo, domainTenants, autoTenantId, isLoadingGrupo, loaded: grupoLoaded } = useGrupoStore();
  const branding = useTenantBranding();

  useEffect(() => {
    // Aguarda o grupoStore terminar antes de carregar tenants
    // evita mostrar todos os tenants enquanto resolve_domain ainda está em andamento
    if (isLoadingGrupo || !grupoLoaded) return;

    const allowedTenants = authService.getAllowedTenants().map(t => t.id ?? t);

    if (autoTenantId && domainTenants.length === 1) {
      // Só faz auto-select se o usuário tiver permissão neste tenant
      const canAccess = allowedTenants.length === 0 || allowedTenants.includes(autoTenantId);
      if (canAccess) {
        setTenant(autoTenantId);
        loadModulosDoTenant(autoTenantId);
        navigate('/dashboard', { replace: true });
        return;
      }
      // Sem permissão: cai para loadTenants que vai retornar lista vazia
    }
    const grupoId = grupo?.id ?? null;
    loadTenants(allowedTenants, grupoId, domainTenants, autoTenantId);
  }, [loadTenants, grupo, domainTenants, autoTenantId, isLoadingGrupo, grupoLoaded, setTenant, loadModulosDoTenant, navigate]);

  const handleSelect = async (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    setTenant(tenantId);
    await loadModulosDoTenant(tenantId);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full blur-3xl" style={{ background: `${branding.corPrimaria}18` }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Escolha a empresa</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Voce precisa selecionar um ambiente para continuar.
            </p>
          </div>

          <div className={`grid gap-6 ${
            (isLoadingTenants || isLoadingGrupo || !grupoLoaded)
              ? 'grid-cols-1 md:grid-cols-3'
              : tenants.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : tenants.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-3'
          }`}>
            {(isLoadingTenants || isLoadingGrupo || !grupoLoaded) ? (
              <>
                <TenantCardSkeleton />
                <TenantCardSkeleton />
                <TenantCardSkeleton />
              </>
            ) : tenants.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                Nenhuma empresa disponivel para sua conta.
              </div>
            ) : (
              tenants.map((t) => (
                <TenantCard
                  key={t.id}
                  tenant={t}
                  isSelected={selectedTenantId === t.id}
                  disabled={false}
                  onSelect={() => handleSelect(t.id)}
                />
              ))
            )}
          </div>

          <div className="mt-10 text-center">
            <Button
              type="button"
              variant="outline"
              className="text-xs"
              onClick={() => navigate('/login', { replace: true })}
              disabled={false}
            >
              Voltar para login
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
