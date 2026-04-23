import { useState, useEffect } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import tarefasService from '@/services/tarefasService';
import usuariosService from '@/services/usuariosService';
import toast from 'react-hot-toast';

const MembrosSection = ({ tarefaId, membros, onUpdate }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await usuariosService.list();
      if (response.sucesso) {
        setUsuarios(response.dados || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleAdicionarMembro = async (usuarioId) => {
    setLoading(true);
    try {
      await tarefasService.adicionarMembro({
        tarefa_id: tarefaId,
        usuario_id: usuarioId,
        papel: 'observador'
      });

      toast.success('Membro adicionado!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast.error('Erro ao adicionar membro');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverMembro = async (membroId) => {
    try {
      await tarefasService.removerMembro(membroId);
      toast.success('Membro removido!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const handleAlterarPapel = async (membroId, novoPapel) => {
    try {
      await tarefasService.atualizarPapelMembro(membroId, novoPapel);
      toast.success('Papel atualizado!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar papel:', error);
      toast.error('Erro ao alterar papel');
    }
  };

  // Usuários disponíveis (que ainda não são membros)
  const usuariosDisponiveis = usuarios.filter(
    u => !membros.find(m => m.usuario_id === u.id)
  );

  const papelConfig = {
    responsavel: { label: 'Responsável', color: 'bg-blue-500' },
    revisor: { label: 'Revisor', color: 'bg-purple-500' },
    observador: { label: 'Observador', color: 'bg-gray-500' }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membros
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-2">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm mb-2">Adicionar membro</h4>
              {usuariosDisponiveis.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {usuariosDisponiveis.map((usuario) => (
                    <button
                      key={usuario.id}
                      onClick={() => handleAdicionarMembro(usuario.id)}
                      disabled={loading}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                        {usuario.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{usuario.nome}</div>
                        <div className="text-xs text-gray-500">{usuario.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">Nenhum usuário disponível</p>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lista de Membros */}
      <div className="space-y-2">
        {membros.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum membro atribuído</p>
        ) : (
          membros.map((membro) => (
            <div
              key={membro.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-white group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                {membro.usuario_nome?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{membro.usuario_nome}</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs">
                      <Badge className={papelConfig[membro.papel]?.color || 'bg-gray-500'}>
                        {papelConfig[membro.papel]?.label || membro.papel}
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => handleAlterarPapel(membro.id, 'responsavel')}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                      >
                        Responsável
                      </button>
                      <button
                        onClick={() => handleAlterarPapel(membro.id, 'revisor')}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                      >
                        Revisor
                      </button>
                      <button
                        onClick={() => handleAlterarPapel(membro.id, 'observador')}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                      >
                        Observador
                      </button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <button
                onClick={() => handleRemoverMembro(membro.id)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MembrosSection;
