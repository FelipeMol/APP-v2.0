import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import tarefasService from '@/services/tarefasService';
import useTarefasStore from '@/store/tarefasStore';
import toast from 'react-hot-toast';

const EtiquetasSection = ({ tarefaId, etiquetas, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [novaNome, setNovaNome] = useState('');
  const [novaCor, setNovaCor] = useState('#3b82f6');
  const { etiquetas: todasEtiquetas, carregarEtiquetas } = useTarefasStore();

  // Cores padrão do Trello
  const coresPadrao = [
    '#61bd4f', // Verde
    '#f2d600', // Amarelo
    '#ff9f1a', // Laranja
    '#eb5a46', // Vermelho
    '#c377e0', // Roxo
    '#0079bf', // Azul
    '#00c2e0', // Ciano
    '#51e898', // Verde claro
    '#ff78cb', // Rosa
    '#344563'  // Cinza escuro
  ];

  const handleAdicionarEtiqueta = async (etiquetaId) => {
    try {
      await tarefasService.associarEtiqueta(tarefaId, etiquetaId);
      toast.success('Etiqueta adicionada!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar etiqueta:', error);
      toast.error('Erro ao adicionar etiqueta');
    }
  };

  const handleRemoverEtiqueta = async (etiquetaTarefaId) => {
    try {
      await tarefasService.removerEtiqueta(etiquetaTarefaId);
      toast.success('Etiqueta removida!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover etiqueta:', error);
      toast.error('Erro ao remover etiqueta');
    }
  };

  const handleCriarEtiqueta = async () => {
    if (!novaNome.trim()) {
      toast.error('Digite um nome para a etiqueta');
      return;
    }

    try {
      const response = await tarefasService.criarEtiqueta({
        nome: novaNome,
        cor: novaCor
      });

      if (response.sucesso) {
        await carregarEtiquetas();
        await handleAdicionarEtiqueta(response.dados.id);
        setNovaNome('');
        setNovaCor('#3b82f6');
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      toast.error('Erro ao criar etiqueta');
    }
  };

  // Etiquetas disponíveis (que ainda não estão na tarefa)
  const etiquetasDisponiveis = todasEtiquetas.filter(
    e => !etiquetas.find(et => et.etiqueta_id === e.id)
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Tag className="w-5 h-5" />
        Etiquetas
      </h3>

      <div className="flex flex-wrap gap-2 mb-2">
        {/* Etiquetas atuais da tarefa */}
        {etiquetas.map((etiqueta) => (
          <Badge
            key={etiqueta.id}
            style={{ backgroundColor: etiqueta.cor }}
            className="text-white px-3 py-1 flex items-center gap-2"
          >
            {etiqueta.nome}
            <button
              onClick={() => handleRemoverEtiqueta(etiqueta.id)}
              className="hover:bg-black/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {/* Botão para adicionar etiqueta */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-2">Etiquetas Disponíveis</h4>

              {/* Lista de etiquetas existentes */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {etiquetasDisponiveis.length > 0 ? (
                  etiquetasDisponiveis.map((etiqueta) => (
                    <button
                      key={etiqueta.id}
                      onClick={() => handleAdicionarEtiqueta(etiqueta.id)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-2"
                    >
                      <div
                        className="w-8 h-4 rounded"
                        style={{ backgroundColor: etiqueta.cor }}
                      />
                      <span className="text-sm">{etiqueta.nome}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 py-2">Nenhuma etiqueta disponível</p>
                )}
              </div>

              {/* Criar nova etiqueta */}
              <div className="border-t pt-2 mt-2">
                {!isAdding ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Criar nova etiqueta
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome da etiqueta"
                      value={novaNome}
                      onChange={(e) => setNovaNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCriarEtiqueta();
                      }}
                      className="text-sm"
                    />
                    <div className="flex flex-wrap gap-1">
                      {coresPadrao.map((cor) => (
                        <button
                          key={cor}
                          onClick={() => setNovaCor(cor)}
                          className={`w-8 h-8 rounded ${novaCor === cor ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCriarEtiqueta}
                        className="flex-1"
                      >
                        Criar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAdding(false);
                          setNovaNome('');
                          setNovaCor('#3b82f6');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default EtiquetasSection;
