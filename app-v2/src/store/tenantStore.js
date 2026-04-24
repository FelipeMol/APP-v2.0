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

  loadTenants: async (allowedTenantIds = []) => {
    set({ isLoadingTenants: true });
    try {
      let query = supabase.from('tenants').select('*').eq('active', true);
      if (allowedTenantIds.length > 0) {
        query = query.in('id', allowedTenantIds);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      set({ tenants: data || [], isLoadingTenants: false });
    } catch (err) {
      console.error('❌ Erro ao carregar tenants:', err);
      set({ isLoadingTenants: false });
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
    set({ selectedTenantId: null });
  },

  getTenant: () => {
    const { selectedTenantId, tenants } = get();
    return tenants.find(t => t.id === selectedTenantId) || null;
  },

  isModuleEnabled: (_moduleId) => {
    return true;
  },
}));

export default useTenantStore;
