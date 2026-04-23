import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { Button } from '@/components/ui/button';

const KanbanColumn = ({ status, titulo, cor, icone: Icone, tarefas, onNovaTarefa, onCardClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className="flex flex-col min-w-[320px] w-[320px] bg-gray-50 rounded-lg p-3">
      {/* Header da Coluna */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icone && <Icone className="w-4 h-4" style={{ color: cor }} />}
          <h3 className="font-semibold text-gray-900">{titulo}</h3>
          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {tarefas.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNovaTarefa(status)}
          className="h-6 w-6 p-0 hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Container de Cards */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto min-h-[200px] rounded-lg p-2 transition-colors
          ${isOver ? 'bg-blue-50 border-2 border-blue-300' : 'bg-transparent border-2 border-transparent'}
        `}
        style={{
          maxHeight: 'calc(100vh - 280px)',
        }}
      >
        <SortableContext
          items={tarefas.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tarefas.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhuma tarefa
            </div>
          ) : (
            tarefas.map((tarefa) => (
              <TaskCard
                key={tarefa.id}
                tarefa={tarefa}
                onClick={onCardClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
