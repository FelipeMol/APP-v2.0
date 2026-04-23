import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { Circle, Clock, CheckCircle, XCircle } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import useTarefasStore from '@/store/tarefasStore';

const KanbanBoard = ({ onNovaTarefa, onCardClick }) => {
  const [activeTarefa, setActiveTarefa] = useState(null);
  const { getTarefasPorStatus, moverTarefa } = useTarefasStore();

  // Definição das colunas
  const colunas = [
    {
      status: 'novo',
      titulo: 'Pendente',
      cor: '#94a3b8',
      icone: Circle
    },
    {
      status: 'em_andamento',
      titulo: 'Em Progresso',
      cor: '#3b82f6',
      icone: Clock
    },
    {
      status: 'concluido',
      titulo: 'Concluído',
      cor: '#10b981',
      icone: CheckCircle
    },
    {
      status: 'cancelado',
      titulo: 'Cancelado',
      cor: '#ef4444',
      icone: XCircle
    }
  ];

  // Configurar sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de ativar o drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const tarefaId = active.id;

    // Encontra a tarefa em todas as colunas
    const tarefa = colunas
      .flatMap(col => getTarefasPorStatus(col.status))
      .find(t => t.id === tarefaId);

    setActiveTarefa(tarefa);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveTarefa(null);

    if (!over) return;

    const tarefaId = active.id;
    const novoStatus = over.id;

    // Se o status é uma coluna válida, move a tarefa
    if (colunas.some(col => col.status === novoStatus)) {
      try {
        await moverTarefa(tarefaId, novoStatus);
      } catch (error) {
        console.error('Erro ao mover tarefa:', error);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex gap-4 overflow-x-auto pb-4">
        {colunas.map((coluna) => (
          <KanbanColumn
            key={coluna.status}
            status={coluna.status}
            titulo={coluna.titulo}
            cor={coluna.cor}
            icone={coluna.icone}
            tarefas={getTarefasPorStatus(coluna.status)}
            onNovaTarefa={onNovaTarefa}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* DragOverlay para mostrar o card sendo arrastado */}
      <DragOverlay>
        {activeTarefa ? (
          <div className="rotate-2 scale-105">
            <TaskCard tarefa={activeTarefa} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
