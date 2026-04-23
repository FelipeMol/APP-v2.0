import { create } from 'zustand';
import { differenceInDays, parseISO } from 'date-fns';
import relatoriosService from '@/services/relatoriosService';

const useCronogramaStore = create((set, get) => ({
  // Estado
  items: [],
  expandedIds: new Set(), // IDs expandidos
  editingCell: null, // { id, field }
  isLoading: false,
  isSaving: false,
  obraId: null,
  hasChanges: false,

  // Configurações de visualização
  zoomLevel: 'month', // 'week' | 'month' | 'quarter'

  // Ações principais
  carregarCronograma: async (obraId) => {
    set({ isLoading: true, obraId });
    try {
      const response = await relatoriosService.getCronograma(obraId);
      const sucesso = response?.sucesso ?? response?.data?.sucesso;
      if (sucesso === false) {
        throw new Error(response?.mensagem || response?.data?.mensagem || 'Falha ao carregar cronograma');
      }

      const items = Array.isArray(response?.dados)
        ? response?.dados
        : Array.isArray(response?.data?.dados)
          ? response?.data?.dados
          : Array.isArray(response)
            ? response
            : [];

      const normalized = items.map((item) => ({
        ...item,
        id: item.id !== null && item.id !== undefined && item.id !== '' ? Number(item.id) : null,
        parent_id:
          item.parent_id === null || item.parent_id === undefined || item.parent_id === '' || Number(item.parent_id) === 0
            ? null
            : Number(item.parent_id),
        nivel: Number(item.nivel ?? 0),
        progresso: Number(item.progresso ?? 0),
        ordem: Number(item.ordem ?? 0),
        isNew: false,
      }));

      set({ items: normalized, isLoading: false, hasChanges: false });
    } catch (error) {
      console.error('Erro ao carregar cronograma:', error);
      set({ isLoading: false });
    }
  },

  adicionarCategoria: (data = {}) => {
    const { items } = get();
    const maxId = Math.max(...items.map(i => (typeof i.id === 'number' ? i.id : 0)), 0);
    const maxOrdem = Math.max(...items.filter(i => i.parent_id === null).map(i => i.ordem), 0);

    const novaCategoria = {
      id: `temp-${maxId + 1}-${Date.now()}`,
      parent_id: null,
      nivel: 0,
      fase: data.fase || 'Nova Categoria',
      descricao: data.descricao || '',
      ordem: maxOrdem + 1,
      data_inicio_planejada: data.data_inicio_planejada || new Date().toISOString().split('T')[0],
      data_fim_planejada: data.data_fim_planejada || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      data_inicio_real: null,
      data_fim_real: null,
      progresso: 0,
      status: 'pendente',
      cor: '#6366f1',
      isNew: true,
    };

    set({
      items: [...items, novaCategoria],
      hasChanges: true,
      editingCell: { id: novaCategoria.id, field: 'fase' }
    });

    return novaCategoria;
  },

  adicionarSubcategoria: (parentId, data = {}) => {
    const { items, expandedIds } = get();
    const parent = items.find(i => i.id === parentId);
    if (!parent) return null;

    const maxId = Math.max(...items.map(i => (typeof i.id === 'number' ? i.id : 0)), 0);
    const siblings = items.filter(i => i.parent_id === parentId);
    const maxOrdem = Math.max(...siblings.map(i => i.ordem), 0);

    const novaSubcategoria = {
      id: `temp-${maxId + 1}-${Date.now()}`,
      parent_id: parentId,
      nivel: parent.nivel + 1,
      fase: data.fase || 'Nova Subcategoria',
      descricao: data.descricao || '',
      ordem: maxOrdem + 1,
      data_inicio_planejada: data.data_inicio_planejada || parent.data_inicio_planejada,
      data_fim_planejada: data.data_fim_planejada || parent.data_fim_planejada,
      data_inicio_real: null,
      data_fim_real: null,
      progresso: 0,
      status: 'pendente',
      cor: parent.cor,
      isNew: true,
    };

    // Expande o pai se não estiver expandido
    const newExpandedIds = new Set(expandedIds);
    newExpandedIds.add(parentId);

    set({
      items: [...items, novaSubcategoria],
      expandedIds: newExpandedIds,
      hasChanges: true,
      editingCell: { id: novaSubcategoria.id, field: 'fase' }
    });

    return novaSubcategoria;
  },

  atualizarItem: (id, campo, valor) => {
    const { items } = get();
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [campo]: valor };

        // Auto-atualiza status baseado no progresso
        if (campo === 'progresso') {
          if (valor === 100) {
            updated.status = 'concluida';
          } else if (valor > 0) {
            updated.status = 'em_andamento';
          } else {
            updated.status = 'pendente';
          }
        }

        return updated;
      }
      return item;
    });

    set({ items: updatedItems, hasChanges: true, editingCell: null });
  },

  excluirItem: (id) => {
    const { items } = get();
    // Remove o item e todos os filhos
    const idsToRemove = new Set([id]);

    // Encontra todos os descendentes
    const findDescendants = (parentId) => {
      items.forEach(item => {
        if (item.parent_id === parentId) {
          idsToRemove.add(item.id);
          findDescendants(item.id);
        }
      });
    };
    findDescendants(id);

    const filteredItems = items.filter(item => !idsToRemove.has(item.id));
    set({ items: filteredItems, hasChanges: true });
  },

  // UI Actions
  toggleExpand: (id) => {
    const { expandedIds } = get();
    const newExpandedIds = new Set(expandedIds);

    if (newExpandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }

    set({ expandedIds: newExpandedIds });
  },

  expandAll: () => {
    const { items } = get();
    const parentIds = items.filter(i => items.some(c => c.parent_id === i.id)).map(i => i.id);
    set({ expandedIds: new Set(parentIds) });
  },

  collapseAll: () => {
    set({ expandedIds: new Set() });
  },

  setEditingCell: (id, field) => {
    set({ editingCell: id && field ? { id, field } : null });
  },

  setZoom: (level) => {
    set({ zoomLevel: level });
  },

  // Helpers
  buildTree: () => {
    const { items, expandedIds } = get();
    const itemMap = new Map();
    const roots = [];

    // Cria mapa de items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Constrói árvore
    items.forEach(item => {
      const node = itemMap.get(item.id);
      if (item.parent_id === null) {
        roots.push(node);
      } else {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Ordena por ordem
    const sortByOrdem = (arr) => {
      arr.sort((a, b) => a.ordem - b.ordem);
      arr.forEach(item => {
        if (item.children.length > 0) {
          sortByOrdem(item.children);
        }
      });
    };
    sortByOrdem(roots);

    // Flattens tree para renderização, respeitando expanded
    const flatList = [];
    const flatten = (items, level = 0) => {
      items.forEach(item => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedIds.has(item.id);

        flatList.push({
          ...item,
          level,
          hasChildren,
          isExpanded,
        });

        if (hasChildren && isExpanded) {
          flatten(item.children, level + 1);
        }
      });
    };
    flatten(roots);

    return flatList;
  },

  getItemById: (id) => {
    const { items } = get();
    return items.find(item => item.id === id);
  },

  calcularDuracao: (inicio, fim) => {
    if (!inicio || !fim) return 0;
    try {
      return differenceInDays(parseISO(fim), parseISO(inicio)) + 1;
    } catch {
      return 0;
    }
  },

  getDateRange: () => {
    const { items } = get();
    if (items.length === 0) {
      return {
        start: new Date(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };
    }

    const dates = items
      .flatMap(item => [
        item.data_inicio_planejada,
        item.data_fim_planejada,
        item.data_inicio_real,
        item.data_fim_real,
      ])
      .filter(Boolean)
      .map((d) => {
        try {
          return parseISO(d);
        } catch {
          return null;
        }
      })
      .filter((d) => d && !isNaN(d));

    if (dates.length === 0) {
      return {
        start: new Date(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };
    }

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Adiciona margem
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);

    return { start: minDate, end: maxDate };
  },

  // Salvar alterações
  salvarAlteracoes: async () => {
    const { items, obraId } = get();
    set({ isSaving: true });

    try {
      const payload = items.map((item) => {
        const numericId = typeof item.id === 'string' && /^\d+$/.test(item.id) ? Number(item.id) : item.id;
        const numericParentId =
          item.parent_id === null || item.parent_id === undefined || item.parent_id === '' || Number(item.parent_id) === 0
            ? null
            : (typeof item.parent_id === 'string' && /^\d+$/.test(item.parent_id) ? Number(item.parent_id) : item.parent_id);

        return {
          ...item,
          parent_id: numericParentId,
          client_id: item.id,
          id: typeof numericId === 'number' ? numericId : null,
        };
      });

      const response = await relatoriosService.salvarCronograma(obraId, payload);
      const sucesso = response?.sucesso ?? response?.data?.sucesso;
      if (sucesso === false) {
        throw new Error(response?.mensagem || response?.data?.mensagem || 'Falha ao salvar cronograma');
      }

      let itemsAtualizados = Array.isArray(response?.dados?.items)
        ? response?.dados?.items
        : Array.isArray(response?.dados)
          ? response?.dados
          : Array.isArray(response?.data?.dados?.items)
            ? response?.data?.dados?.items
            : Array.isArray(response?.data?.dados)
              ? response?.data?.dados
              : null;

      if (!Array.isArray(itemsAtualizados)) {
        const refresh = await relatoriosService.getCronograma(obraId);
        const refreshSucesso = refresh?.sucesso ?? refresh?.data?.sucesso;
        if (refreshSucesso === false) {
          throw new Error(refresh?.mensagem || refresh?.data?.mensagem || 'Resposta inválida ao salvar cronograma');
        }
        itemsAtualizados = Array.isArray(refresh?.dados)
          ? refresh?.dados
          : Array.isArray(refresh?.data?.dados)
            ? refresh?.data?.dados
            : Array.isArray(refresh)
              ? refresh
              : null;
      }

      if (!Array.isArray(itemsAtualizados)) {
        throw new Error('Resposta inválida ao salvar cronograma');
      }

      const normalized = itemsAtualizados.map((item) => ({
        ...item,
        id: item.id !== null && item.id !== undefined && item.id !== '' ? Number(item.id) : null,
        parent_id:
          item.parent_id === null || item.parent_id === undefined || item.parent_id === '' || Number(item.parent_id) === 0
            ? null
            : Number(item.parent_id),
        nivel: Number(item.nivel ?? 0),
        progresso: Number(item.progresso ?? 0),
        ordem: Number(item.ordem ?? 0),
        isNew: false,
      }));

      set({ items: normalized, isSaving: false, hasChanges: false, editingCell: null });
      return true;
    } catch (error) {
      console.error('Erro ao salvar cronograma:', error);
      set({ isSaving: false });
      return false;
    }
  },

  // Reset
  reset: () => {
    set({
      items: [],
      expandedIds: new Set(),
      editingCell: null,
      isLoading: false,
      isSaving: false,
      obraId: null,
      hasChanges: false,
      zoomLevel: 'month',
    });
  },
}));

export default useCronogramaStore;
