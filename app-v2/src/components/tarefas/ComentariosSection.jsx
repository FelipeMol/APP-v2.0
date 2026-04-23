import { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import tarefasService from '@/services/tarefasService';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ComentariosSection = ({ tarefaId, comentarios, onUpdate }) => {
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleAdicionarComentario = async () => {
    if (!novoComentario.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    setLoading(true);
    try {
      await tarefasService.criarComentario({
        tarefa_id: tarefaId,
        comentario: novoComentario
      });

      toast.success('Comentário adicionado!');
      setNovoComentario('');
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirComentario = async (comentarioId) => {
    if (!confirm('Excluir este comentário?')) return;

    try {
      await tarefasService.excluirComentario(comentarioId);
      toast.success('Comentário excluído!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      toast.error('Erro ao excluir comentário');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Comentários
      </h3>

      {/* Lista de Comentários */}
      <div className="space-y-4 mb-4">
        {comentarios.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum comentário ainda</p>
        ) : (
          comentarios.map((comentario) => (
            <div key={comentario.id} className="flex gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                  {comentario.usuario_nome?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {comentario.usuario_nome}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {comentario.criado_em && formatDistanceToNow(
                          new Date(comentario.criado_em),
                          { addSuffix: true, locale: ptBR }
                        )}
                      </span>
                    </div>
                    {user?.id === comentario.usuario_id && (
                      <button
                        onClick={() => handleExcluirComentario(comentario.id)}
                        className="text-red-500 hover:bg-red-50 rounded p-1"
                        title="Excluir comentário"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {comentario.comentario}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Adicionar Novo Comentário */}
      <div className="flex gap-3">
        {/* Avatar do usuário atual */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Input */}
        <div className="flex-1">
          <textarea
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Escrever um comentário..."
            className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleAdicionarComentario();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              Ctrl+Enter para enviar
            </span>
            <Button
              size="sm"
              onClick={handleAdicionarComentario}
              disabled={loading || !novoComentario.trim()}
            >
              Comentar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComentariosSection;
