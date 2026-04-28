import { create } from 'zustand';
import supabase from '../lib/supabase.js';

const useGrupoStore = create((set, get) => ({
  grupo: null,
  domainTenants: [],
  autoTenantId: null,
  isLoadingGrupo: false,
  loaded: false,
  grupoError: null,

  loadGrupo: async () => {
    if (get().loaded || get().isLoadingGrupo) return;
    set({ isLoadingGrupo: true, grupoError: null });
    try {
      const hostname = window.location.hostname;
      const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
      if (isDev) {
        set({
          grupo: { id: null, nome: 'Dev', dominio: hostname, cor_primaria: '#3b82f6', cor_secundaria: '#1e293b', cor_accent: '#f59e0b', nome_exibicao: 'Dev', subtitulo: 'Ambiente de desenvolvimento', rodape_texto: '' },
          domainTenants: [],
          autoTenantId: null,
          isLoadingGrupo: false,
          loaded: true,
        });
        return;
      }

      const { data, error } = await supabase.rpc('resolve_domain', { p_hostname: hostname });

      if (error || !data?.found) {
        console.warn('[grupoStore] Dominio nao encontrado:', hostname);
        set({ grupo: null, domainTenants: [], autoTenantId: null, isLoadingGrupo: false, loaded: true, grupoError: 'Grupo nao encontrado para este dominio.' });
        return;
      }

      const grupo = data.grupo;
      const tenants = data.tenants || [];
      const autoTenantId = tenants.length === 1 ? tenants[0].id : null;

      if (grupo.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = grupo.favicon_url;
        document.head.appendChild(link);
      }
      if (grupo.nome_exibicao) {
        document.title = grupo.nome_exibicao;
      }

      set({ grupo, domainTenants: tenants, autoTenantId, isLoadingGrupo: false, loaded: true });
    } catch (err) {
      console.error('[grupoStore] Erro ao carregar grupo:', err);
      set({ grupoError: err.message, isLoadingGrupo: false, loaded: true });
    }
  },
}));

export default useGrupoStore;
