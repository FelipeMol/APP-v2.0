import { useState } from 'react';
import { CheckSquare, Plus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import tarefasService from '@/services/tarefasService';
import toast from 'react-hot-toast';

const ChecklistSection = ({ tarefaId, items, onUpdate }) => {
  const [novoItem, setNovoItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Calcular progresso
  const total = items.length;
  const concluidos = items.filter(item => item.concluido).length;
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const handleAdicionarItem = async () => {
    if (!novoItem.trim()) {
      toast.error('Digite um título para o item');
      return;
    }

    try {
      await tarefasService.criarChecklistItem({
        tarefa_id: tarefaId,
        titulo: novoItem,
        ordem: items.length
      });

      toast.success('Item adicionado!');
      setNovoItem('');
      setIsAdding(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  const handleToggleItem = async (itemId, concluido) => {
    try {
      await tarefasService.atualizarChecklistItem(itemId, {
        concluido: !concluido
      });
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const handleExcluirItem = async (itemId) => {
    try {
      await tarefasService.excluirChecklistItem(itemId);
      toast.success('Item excluído!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const handleLimparConcluidos = async () => {
    const concluidos = items.filter(item => item.concluido);

    if (concluidos.length === 0) {
      toast.error('Nenhum item concluído para limpar');
      return;
    }

    if (!confirm(`Excluir ${concluidos.length} item(ns) concluído(s)?`)) return;

    try {
      await Promise.all(
        concluidos.map(item => tarefasService.excluirChecklistItem(item.id))
      );

      toast.success('Itens concluídos removidos!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao limpar concluídos:', error);
      toast.error('Erro ao limpar concluídos');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Checklist
        </h3>
        {items.length > 0 && concluidos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLimparConcluidos}
            className="text-xs text-gray-600"
          >
            Limpar concluídos
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>{progresso}% concluído</span>
            <span>{concluidos}/{total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de Items */}
      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 group"
          >
            <input
              type="checkbox"
              checked={item.concluido}
              onChange={() => handleToggleItem(item.id, item.concluido)}
              className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            />
            <span className={`flex-1 ${item.concluido ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {item.titulo}
            </span>
            <button
              onClick={() => handleExcluirItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Adicionar novo item */}
      {!isAdding ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full text-left justify-start"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar item
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar item"
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdicionarItem();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNovoItem('');
              }
            }}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" onClick={handleAdicionarItem}>
            Adicionar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(false);
              setNovoItem('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChecklistSection;
