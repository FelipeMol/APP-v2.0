import { create } from 'zustand';
import supabase from '../lib/supabase.js';

const STORAGE_KEY = 'selected_tenant';

function readStoredTenantId() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.id || null;
  } catch {
    return null;
  }
}

const useTenantStore = create((set, get) => ({
  selectedTenantId: readStoredTenantId(),
  tenants: [],
  isLoadingTenants: false,
  modulosHabilitados: [],

  // grupoId: ID do grupo detectado pelo hostname (null = sem filtro, ex: dev local)
  loadTenants: async (allowedTenantIds = [], grupoId = null) => {
    set({ isLoadingTenants: true });
    try {
      let query = supabase.from('tenants').select('*').eq('active', true);
      if (allowedTenantIds.length > 0) {
        query = query.in('id', allowedTenantIds);
      }
      // Filtro por grupo: só mostrar tenants do grupo do domínio atual
      if (grupoId !== null) {
        query = query.eq('grupo_id', grupoId);
      }
      const { data: tenantsData, error: tenantsError } = await query.order('name');

      if (tenantsError) throw tenantsError;
      set({ tenants: tenantsData || [], isLoadingTenants: false });
    } catch (err) {
      console.error('❌ Erro ao carregar tenants:', err);
      set({ isLoadingTenants: false });
    }
  },

  // Carrega módulos habilitados para um tenant específico via tenant_modules
  loadModulosDoTenant: async (tenantId) => {
    if (!tenantId) {
      set({ modulosHabilitados: [] });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('module_id')
        .eq('tenant_id', tenantId)
        .eq('enabled', true);

      if (error) throw error;
      const modulosHabilitados = (data || []).map(m => m.module_id);
      set({ modulosHabilitados });
    } catch (err) {
      console.error('❌ Erro ao carregar módulos do tenant:', err);
      // Fallback permissivo: não bloquear acesso em caso de erro
      set({ modulosHabilitados: [] });
    }
  },

  setTenant: (tenantId) => {
    const { tenants } = get();
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: tenantId }));
    set({ selectedTenantId: tenantId });
  },

  clearTenant: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ selectedTenantId: null, modulosHabilitados: [] });
  },

  getTenant: () => {
    const { selectedTenantId, tenants } = get();
    return tenants.find(t => t.id === selectedTenantId) || null;
  },

  isModuleEnabled: (moduleId) => {
    const { modulosHabilitados } = get();
    // Fallback permissivo enquanto a lista ainda não foi carregada
    if (!modulosHabilitados || modulosHabilitados.length === 0) return true;
    return modulosHabilitados.includes(moduleId);
  },
}));

export default useTenantStore;
