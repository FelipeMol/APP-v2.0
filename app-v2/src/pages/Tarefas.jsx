import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import KanbanBoard from '@/components/tarefas/KanbanBoard';
import TaskModal from '@/components/tarefas/TaskModal';
import TaskFormModal from '@/components/tarefas/TaskFormModal';
import useTarefasStore from '@/store/tarefasStore';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

const Tarefas = () => {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [tarefaAtualId, setTarefaAtualId] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('novo');

  const { hasPermission } = useAuthStore();
  const { carregarTarefas, carregarEtiquetas, filtros, setFiltros, limparFiltros } = useTarefasStore();

  // Permissões
  const canView = hasPermission('tarefas', 'visualizar');
  const canCreate = hasPermission('tarefas', 'criar');
  const canEdit = hasPermission('tarefas', 'editar');
  const canDelete = hasPermission('tarefas', 'excluir');

  useEffect(() => {
    if (canView) {
      carregarTarefas();
      carregarEtiquetas();
    }
  }, [canView]);

  const handleNovaTarefa = (status = 'novo') => {
    if (!canCreate) {
      toast.error('Você não tem permissão para criar tarefas');
      return;
    }

    setNewTaskStatus(status);
    setIsFormModalOpen(true);
  };

  const handleCardClick = (tarefa) => {
    setTarefaAtualId(tarefa.id);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setTarefaAtualId(null);
    // Recarregar tarefas ao fechar modal (para refletir mudanças)
    carregarTarefas();
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
  };

  const handleFormSuccess = () => {
    carregarTarefas();
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você não tem permissão para visualizar tarefas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
            <p className="text-gray-600 text-sm mt-1">Gerencie suas tarefas em quadros Kanban</p>
          </div>
          {canCreate && (
            <Button onClick={() => handleNovaTarefa('novo')} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Nova Tarefa
            </Button>
          )}
        </div>

        {/* Filtros e Search */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar tarefas..."
                value={filtros.search || ''}
                onChange={(e) => setFiltros({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2">
            <select
              value={filtros.prioridade || ''}
              onChange={(e) => setFiltros({ prioridade: e.target.value || null })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as prioridades</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>

            {filtros.search || filtros.prioridade ? (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Kanban Board - Ocupa toda a altura restante */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <KanbanBoard
          onNovaTarefa={handleNovaTarefa}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Modal de Visualização de Tarefa */}
      {isViewModalOpen && tarefaAtualId && (
        <TaskModal
          isOpen={isViewModalOpen}
          tarefaId={tarefaAtualId}
          onClose={handleCloseViewModal}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Modal de Criação de Tarefa */}
      {isFormModalOpen && (
        <TaskFormModal
          isOpen={isFormModalOpen}
          initialStatus={newTaskStatus}
          onClose={handleCloseFormModal}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default Tarefas;
