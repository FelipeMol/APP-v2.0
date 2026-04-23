import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, AlignLeft, CheckSquare, MessageSquare, Paperclip, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TaskCard = ({ tarefa, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tarefa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    rotate: isDragging ? '2deg' : '0deg'
  };

  // Cores de prioridade
  const prioridadeCores = {
    urgente: 'bg-red-500',
    alta: 'bg-orange-500',
    media: 'bg-green-500',
    baixa: 'bg-gray-400'
  };

  // Função para verificar status do prazo
  const getPrazoStatus = () => {
    if (!tarefa.data_prazo) return null;

    const prazo = new Date(tarefa.data_prazo);

    if (tarefa.status === 'concluido') {
      return { icon: '✅', color: 'text-green-600 bg-green-50', text: 'Concluído' };
    }

    if (isPast(prazo) && !isToday(prazo)) {
      return { icon: '⚠️', color: 'text-red-600 bg-red-50', text: format(prazo, 'dd MMM', { locale: ptBR }) };
    }

    if (isToday(prazo)) {
      return { icon: '⏰', color: 'text-orange-600 bg-orange-50', text: 'Hoje' };
    }

    if (isTomorrow(prazo)) {
      return { icon: '📅', color: 'text-blue-600 bg-blue-50', text: 'Amanhã' };
    }

    return { icon: '📅', color: 'text-gray-600 bg-gray-50', text: format(prazo, 'dd MMM', { locale: ptBR }) };
  };

  const prazoStatus = getPrazoStatus();

  // Membros da tarefa (limitado a 5)
  const membrosVisiveis = tarefa.membros?.slice(0, 5) || [];
  const membrosExtras = (tarefa.membros?.length || 0) - 5;

  // Primeira imagem dos anexos como capa
  const capa = tarefa.anexos?.find(a => a.tipo_mime?.startsWith('image/'));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Não abre modal se estiver arrastando
        if (!isDragging) {
          onClick(tarefa);
        }
      }}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3 cursor-pointer
        hover:shadow-md hover:border-blue-300 transition-all duration-200
        ${isDragging ? 'shadow-2xl z-50' : ''}
      `}
    >
      {/* Capa (se houver imagem) */}
      {capa && (
        <div className="mb-3 -mx-3 -mt-3 rounded-t-lg overflow-hidden">
          <img
            src={capa.caminho}
            alt="Capa"
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Indicador de Prioridade */}
      <div className="absolute top-2 right-2">
        <div className={`w-2 h-2 rounded-full ${prioridadeCores[tarefa.prioridade] || 'bg-gray-400'}`} />
      </div>

      {/* Etiquetas */}
      {tarefa.etiquetas && tarefa.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tarefa.etiquetas.map((etiqueta) => (
            <Badge
              key={etiqueta.id}
              style={{ backgroundColor: etiqueta.cor }}
              className="text-white text-xs px-2 py-0.5"
            >
              {etiqueta.nome}
            </Badge>
          ))}
        </div>
      )}

      {/* Título */}
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {tarefa.titulo}
      </h4>

      {/* Badges de informações */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        {/* Prazo */}
        {prazoStatus && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${prazoStatus.color}`}>
            <span>{prazoStatus.icon}</span>
            <span className="font-medium">{prazoStatus.text}</span>
          </div>
        )}

        {/* Descrição */}
        {tarefa.descricao && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50">
            <AlignLeft className="w-3 h-3" />
          </div>
        )}

        {/* Checklist */}
        {tarefa.checklist_items > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50">
            <CheckSquare className="w-3 h-3" />
            <span>
              {tarefa.checklist_concluidos}/{tarefa.checklist_items}
            </span>
          </div>
        )}

        {/* Comentários */}
        {tarefa.comments_count > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50">
            <MessageSquare className="w-3 h-3" />
            <span>{tarefa.comments_count}</span>
          </div>
        )}

        {/* Anexos */}
        {tarefa.anexos && tarefa.anexos.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50">
            <Paperclip className="w-3 h-3" />
            <span>{tarefa.anexos.length}</span>
          </div>
        )}
      </div>

      {/* Membros */}
      {tarefa.membros && tarefa.membros.length > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {membrosVisiveis.map((membro) => (
            <div
              key={membro.id}
              className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium"
              title={membro.usuario_nome}
            >
              {membro.usuario_nome?.charAt(0).toUpperCase()}
            </div>
          ))}
          {membrosExtras > 0 && (
            <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-medium">
              +{membrosExtras}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
