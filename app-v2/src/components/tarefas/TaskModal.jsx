import { useEffect, useState } from 'react';
import { X, Edit2, Trash2, Calendar, User, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import tarefasService from '@/services/tarefasService';
import toast from 'react-hot-toast';
import EtiquetasSection from './EtiquetasSection';
import ChecklistSection from './ChecklistSection';
import MembrosSection from './MembrosSection';
import ComentariosSection from './ComentariosSection';
import AnexosSection from './AnexosSection';
import AtividadesSection from './AtividadesSection';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TaskModal = ({ isOpen, tarefaId, onClose, canEdit, canDelete }) => {
  const [tarefa, setTarefa] = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [membros, setMembros] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carregar todos os dados da tarefa
  useEffect(() => {
    if (isOpen && tarefaId) {
      carregarDadosTarefa();
    }
  }, [isOpen, tarefaId]);

  const carregarDadosTarefa = async () => {
    setLoading(true);
    try {
      // Carregar dados em paralelo
      const [
        tarefaRes,
        etiquetasRes,
        checklistsRes,
        membrosRes,
        comentariosRes,
        anexosRes,
        atividadesRes
      ] = await Promise.all([
        tarefasService.buscarPorId(tarefaId),
        tarefasService.listarEtiquetasTarefa(tarefaId),
        tarefasService.listarChecklists(tarefaId),
        tarefasService.listarMembros(tarefaId),
        tarefasService.listarComentarios(tarefaId),
        tarefasService.listarAnexos(tarefaId),
        tarefasService.listarAtividades(tarefaId)
      ]);

      if (tarefaRes.sucesso) setTarefa(tarefaRes.dados);
      // Garantir que sempre sejam arrays
      setEtiquetas(Array.isArray(etiquetasRes?.dados) ? etiquetasRes.dados : []);
      setChecklists(Array.isArray(checklistsRes?.dados?.items) ? checklistsRes.dados.items : []);
      setMembros(Array.isArray(membrosRes?.dados) ? membrosRes.dados : []);
      setComentarios(Array.isArray(comentariosRes?.dados) ? comentariosRes.dados : []);
      setAnexos(Array.isArray(anexosRes?.dados) ? anexosRes.dados : []);
      setAtividades(Array.isArray(atividadesRes?.dados) ? atividadesRes.dados : []);
    } catch (error) {
      console.error('Erro ao carregar dados da tarefa:', error);
      toast.error('Erro ao carregar dados da tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      await tarefasService.excluir(tarefaId);
      toast.success('Tarefa excluída com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  // Não renderizar até ter dados
  if (!tarefa && !loading) return null;

  const statusConfig = {
    novo: { label: 'Pendente', color: 'bg-gray-500' },
    em_andamento: { label: 'Em Progresso', color: 'bg-blue-500' },
    concluido: { label: 'Concluído', color: 'bg-green-500' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500' }
  };

  const prioridadeConfig = {
    urgente: { label: 'Urgente', color: 'bg-red-500' },
    alta: { label: 'Alta', color: 'bg-orange-500' },
    media: { label: 'Média', color: 'bg-green-500' },
    baixa: { label: 'Baixa', color: 'bg-gray-500' }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1180px] h-[90vh] overflow-hidden flex flex-col p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Carregando...</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="px-6 py-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-semibold mb-2">
                    {tarefa.titulo}
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>na lista</span>
                    <Badge className={statusConfig[tarefa.status]?.color}>
                      {statusConfig[tarefa.status]?.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={handleExcluir}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Etiquetas */}
                  <EtiquetasSection
                    tarefaId={tarefaId}
                    etiquetas={etiquetas}
                    onUpdate={carregarDadosTarefa}
                  />

                  {/* Descrição */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      Descrição
                    </h3>
                    <div className="bg-gray-50 rounded p-4 min-h-[100px] text-gray-700 whitespace-pre-wrap">
                      {tarefa.descricao || 'Sem descrição'}
                    </div>
                  </div>

                  {/* Checklist */}
                  <ChecklistSection
                    tarefaId={tarefaId}
                    items={checklists}
                    onUpdate={carregarDadosTarefa}
                  />

                  {/* Anexos */}
                  <AnexosSection
                    tarefaId={tarefaId}
                    anexos={anexos}
                    onUpdate={carregarDadosTarefa}
                  />

                  {/* Atividades */}
                  <AtividadesSection atividades={atividades} />

                  {/* Comentários */}
                  <ComentariosSection
                    tarefaId={tarefaId}
                    comentarios={comentarios}
                    onUpdate={carregarDadosTarefa}
                  />
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Informações */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">Informações</h3>

                    {/* Prioridade */}
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Flag className="w-4 h-4" />
                        <span>Prioridade</span>
                      </div>
                      <Badge className={prioridadeConfig[tarefa.prioridade]?.color}>
                        {prioridadeConfig[tarefa.prioridade]?.label}
                      </Badge>
                    </div>

                    {/* Responsável */}
                    {tarefa.usuario_responsavel_nome && (
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <User className="w-4 h-4" />
                          <span>Responsável</span>
                        </div>
                        <div className="text-sm font-medium">
                          {tarefa.usuario_responsavel_nome}
                        </div>
                      </div>
                    )}

                    {/* Prazo */}
                    {tarefa.data_prazo && (
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>Prazo</span>
                        </div>
                        <div className="text-sm font-medium">
                          {format(new Date(tarefa.data_prazo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Membros */}
                  <MembrosSection
                    tarefaId={tarefaId}
                    membros={membros}
                    onUpdate={carregarDadosTarefa}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;
