import { create } from 'zustand';

// Sempre obrigar a escolher: não vamos auto-redirecionar para dashboard
// sem passar pelo seletor. Persistimos apenas para mostrar "selecionada"
// e para configurar a API / tema após escolher.

const STORAGE_KEY = 'selected_tenant';

export const TENANTS = {
  construtora: {
    id: 'construtora',
    name: 'Construtora Ramdy Raydan',
    shortName: 'Ramdy Raydan',
    logoSrc: new URL('../../public/logo.png', import.meta.url).toString(),
    accent: {
      from: 'from-slate-900',
      via: 'via-slate-700',
      to: 'to-slate-500',
    },
  },
  workmall: {
    id: 'workmall',
    name: 'WorkMall',
    shortName: 'WorkMall',
    logoSrc: new URL('../../public/workmall.png', import.meta.url).toString(),
    accent: {
      from: 'from-violet-700',
      via: 'via-fuchsia-600',
      to: 'to-rose-500',
    },
  },
  houseclub: {
    id: 'houseclub',
    name: 'Houseclub',
    shortName: 'Houseclub',
    logoSrc: new URL('../../public/houseclub.png', import.meta.url).toString(),
    accent: {
      from: 'from-emerald-700',
      via: 'via-emerald-600',
      to: 'to-teal-500',
    },
  },
};

function readStoredTenant() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return TENANTS[parsed.id] ? parsed.id : null;
  } catch {
    return null;
  }
}

const useTenantStore = create((set, get) => ({
  selectedTenantId: readStoredTenant(),

  setTenant: (tenantId) => {
    if (!TENANTS[tenantId]) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: tenantId }));
    set({ selectedTenantId: tenantId });
  },

  clearTenant: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ selectedTenantId: null });
  },

  getTenant: () => {
    const { selectedTenantId } = get();
    return selectedTenantId ? TENANTS[selectedTenantId] : null;
  },
}));

export default useTenantStore;
