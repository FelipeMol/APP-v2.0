// src/store/grupoStore.js
// Store Zustand para detecção do grupo a partir do domínio atual.
// Carregado uma vez no App.jsx ao iniciar o app.

import { create } from 'zustand';
import supabase from '../lib/supabase.js';

const useGrupoStore = create((set, get) => ({
  grupo: null,
  isLoadingGrupo: false,
  loaded: false,
  grupoError: null,

  loadGrupo: async () => {
    if (get().loaded || get().isLoadingGrupo) return;
    set({ isLoadingGrupo: true, grupoError: null });
    try {
      const hostname = window.location.hostname;
      // Fallback dev: localhost não filtra por grupo
      const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
      if (isDev) {
        set({ grupo: { id: null, nome: 'Dev', dominio: hostname }, isLoadingGrupo: false, loaded: true });
        return;
      }

      const { data, error } = await supabase
        .from('grupos')
        .select('id, nome, dominio, logo_url')
        .eq('dominio', hostname)
        .eq('ativo', true)
        .single();

      if (error || !data) {
        console.warn('[grupoStore] Domínio não encontrado no banco:', hostname);
        set({ grupo: null, isLoadingGrupo: false, loaded: true, grupoError: 'Grupo não encontrado para este domínio.' });
        return;
      }
      set({ grupo: data, isLoadingGrupo: false, loaded: true });
    } catch (err) {
      console.error('[grupoStore] Erro ao carregar grupo:', err);
      set({ grupoError: err.message, isLoadingGrupo: false, loaded: true });
    }
  },
}));

export default useGrupoStore;
