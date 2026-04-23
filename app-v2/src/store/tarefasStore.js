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

      const tarefas = await tarefasService.listar(filtrosFinais);
      set({ tarefas, isLoading: false });
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      set({ error: error.message, isLoading: false });
      toast.error('Erro ao carregar tarefas');
    }
  },

  criarTarefa: async (dados) => {
    set({ isLoading: true, error: null });

    try {
      const tarefa = await tarefasService.criar(dados);
      await get().carregarTarefas();
      toast.success('Tarefa criada com sucesso!');
      set({ isLoading: false });
      return tarefa;
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
      const tarefa = await tarefasService.atualizar(id, dados);
      await get().carregarTarefas();
      toast.success('Tarefa atualizada com sucesso!');
      set({ isLoading: false });
      return tarefa;
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
      await tarefasService.excluir(id);
      await get().carregarTarefas();
      toast.success('Tarefa excluída com sucesso!');
      set({ isLoading: false });
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

      // service throws on error — catch block handles revert
      await tarefasService.atualizar(id, { status: novoStatus });
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
      const etiquetas = await tarefasService.listarEtiquetas();
      set({ etiquetas });
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast.error('Erro ao carregar etiquetas');
    }
  },

  criarEtiqueta: async (dados) => {
    try {
      const etiqueta = await tarefasService.criarEtiqueta(dados);
      await get().carregarEtiquetas();
      toast.success('Etiqueta criada com sucesso!');
      return etiqueta;
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
