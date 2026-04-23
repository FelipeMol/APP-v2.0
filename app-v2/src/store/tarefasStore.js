import { create } from 'zustand';
import tarefasService from '../services/tarefasService';
import toast from 'react-hot-toast';

const useTarefasStore = create((set, get) => ({
  // ==================== ESTADO ====================

  tarefas: [],
  etiquetas: [],
  usuarios: [],
  isLoading: false,
  error: null,

  // Filtros
  filtros: {
    status: null,
    prioridade: null,
    usuario_responsavel_id: null,
    obra_id: null,
    empresa_id: null,
    search: ''
  },

  // ==================== AÇÕES - TAREFAS ====================

  carregarTarefas: async (filtrosCustom = {}) => {
    set({ isLoading: true, error: null });

    try {
      const { filtros } = get();
      const filtrosFinais = { ...filtros, ...filtrosCustom };

      // Remove valores vazios
      Object.keys(filtrosFinais).forEach(key => {
        if (!filtrosFinais[key]) delete filtrosFinais[key];
      });

      const response = await tarefasService.listar(filtrosFinais);

      if (response.sucesso) {
        set({ tarefas: response.dados || [], isLoading: false });
      } else {
        throw new Error(response.mensagem || 'Erro ao carregar tarefas');
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      set({ error: error.message, isLoading: false });
      toast.error('Erro ao carregar tarefas');
    }
  },

  criarTarefa: async (dados) => {
    set({ isLoading: true, error: null });

    try {
      const response = await tarefasService.criar(dados);

      if (response.sucesso) {
        await get().carregarTarefas();
        toast.success('Tarefa criada com sucesso!');
        return response.dados;
      } else {
        throw new Error(response.mensagem || 'Erro ao criar tarefa');
      }
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erro ao criar tarefa');
      throw error;
    }
  },

  atualizarTarefa: async (id, dados) => {
    set({ isLoading: true, error: null });

    try {
      const response = await tarefasService.atualizar(id, dados);

      if (response.sucesso) {
        await get().carregarTarefas();
        toast.success('Tarefa atualizada com sucesso!');
        return response.dados;
      } else {
        throw new Error(response.mensagem || 'Erro ao atualizar tarefa');
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erro ao atualizar tarefa');
      throw error;
    }
  },

  excluirTarefa: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await tarefasService.excluir(id);

      if (response.sucesso) {
        await get().carregarTarefas();
        toast.success('Tarefa excluída com sucesso!');
      } else {
        throw new Error(response.mensagem || 'Erro ao excluir tarefa');
      }
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erro ao excluir tarefa');
      throw error;
    }
  },

  moverTarefa: async (id, novoStatus) => {
    try {
      // Atualização otimista
      const { tarefas } = get();
      const tarefasAtualizadas = tarefas.map(t =>
        t.id === id ? { ...t, status: novoStatus } : t
      );
      set({ tarefas: tarefasAtualizadas });

      const response = await tarefasService.atualizar(id, { status: novoStatus });

      if (!response.sucesso) {
        // Reverte se falhar
        set({ tarefas });
        throw new Error(response.mensagem || 'Erro ao mover tarefa');
      }
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error(error.message || 'Erro ao mover tarefa');
      // Recarrega para sincronizar
      await get().carregarTarefas();
      throw error;
    }
  },

  // ==================== AÇÕES - ETIQUETAS ====================

  carregarEtiquetas: async () => {
    try {
      const response = await tarefasService.listarEtiquetas();

      if (response.sucesso) {
        set({ etiquetas: response.dados || [] });
      }
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast.error('Erro ao carregar etiquetas');
    }
  },

  criarEtiqueta: async (dados) => {
    try {
      const response = await tarefasService.criarEtiqueta(dados);

      if (response.sucesso) {
        await get().carregarEtiquetas();
        toast.success('Etiqueta criada com sucesso!');
        return response.dados;
      } else {
        throw new Error(response.mensagem || 'Erro ao criar etiqueta');
      }
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      toast.error(error.message || 'Erro ao criar etiqueta');
      throw error;
    }
  },

  // ==================== AÇÕES - FILTROS ====================

  setFiltros: (novosFiltros) => {
    set((state) => ({
      filtros: { ...state.filtros, ...novosFiltros }
    }));
  },

  limparFiltros: () => {
    set({
      filtros: {
        status: null,
        prioridade: null,
        usuario_responsavel_id: null,
        obra_id: null,
        empresa_id: null,
        search: ''
      }
    });
  },

  // ==================== AÇÕES - UTILITÁRIOS ====================

  getTarefasPorStatus: (status) => {
    const { tarefas, filtros } = get();
    let tarefasFiltradas = tarefas.filter(t => t.status === status);

    // Aplica search se houver
    if (filtros.search) {
      const searchLower = filtros.search.toLowerCase();
      tarefasFiltradas = tarefasFiltradas.filter(t =>
        t.titulo?.toLowerCase().includes(searchLower) ||
        t.descricao?.toLowerCase().includes(searchLower)
      );
    }

    return tarefasFiltradas;
  },

  getTarefaPorId: (id) => {
    const { tarefas } = get();
    return tarefas.find(t => t.id === id);
  },

  clearError: () => {
    set({ error: null });
  }
}));

export default useTarefasStore;
