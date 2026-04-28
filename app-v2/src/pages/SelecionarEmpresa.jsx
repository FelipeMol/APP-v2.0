import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import useTenantStore from '../store/tenantStore';
import useGrupoStore from '../store/grupoStore';
import authService from '../services/authService';
import { Check, HardHat } from 'lucide-react';
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
  const { grupo, domainTenants, autoTenantId } = useGrupoStore();
  const branding = useTenantBranding();

  const [entering, setEntering] = useState(false);
  const [entered, setEntered] = useState(false);
  const [enteringTenant, setEnteringTenant] = useState(null);

  useEffect(() => {
    if (autoTenantId && domainTenants.length === 1) {
      setTenant(autoTenantId);
      loadModulosDoTenant(autoTenantId);
      navigate('/dashboard', { replace: true });
      return;
    }

    const allowedTenants = authService.getAllowedTenants().map(t => t.id ?? t);
    const grupoId = grupo?.id ?? null;
    loadTenants(allowedTenants, grupoId, domainTenants, autoTenantId);
  }, [loadTenants, grupo, domainTenants, autoTenantId, setTenant, loadModulosDoTenant, navigate]);

  const handleSelect = async (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant || entering) return;
    setTenant(tenantId);
    await loadModulosDoTenant(tenantId);
    setEnteringTenant(tenant);
    setEntering(true);
    window.setTimeout(() => {
      setEntered(true);
      window.setTimeout(() => navigate('/dashboard', { replace: true }), 500);
    }, 600);
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
            isLoadingTenants
              ? 'grid-cols-1 md:grid-cols-3'
              : tenants.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : tenants.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-3'
          }`}>
            {isLoadingTenants ? (
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
                  disabled={entering}
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
              disabled={entering}
            >
              Voltar para login
            </Button>
          </div>
        </div>
      </div>

      {entering && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#17273C',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 20,
          animation: 'rr-fade-in 0.55s cubic-bezier(0.4,0,0.2,1) forwards',
          opacity: entered ? 1 : undefined,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'rr-pop-in 0.45s 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <HardHat size={36} color={branding.corAccent || '#E8A628'} strokeWidth={1.5} />
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 600,
            letterSpacing: '-0.01em',
            animation: 'rr-pop-in 0.45s 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            {enteringTenant?.name || branding.nomeExibicao}
          </div>
          <style>{`
            @keyframes rr-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes rr-pop-in  { from { opacity: 0; transform: scale(0.85) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
        </div>
      )}
    </div>
  );
}
