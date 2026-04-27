// TarefasFuncionario.jsx
// Lista as tarefas vinculadas a um funcionário específico no drawer do RH.

import { useEffect, useState } from 'react';
import { Plus, AlertCircle, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import tarefasService from '@/services/tarefasService';

const STATUS_LABEL = {
  novo: 'Novo',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_BADGE = {
  novo: 'info',
  em_andamento: 'warning',
  concluido: 'success',
  cancelado: 'secondary',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function isPastDue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function TarefasFuncionario({ funcionarioId }) {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (funcionarioId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await tarefasService.listar({ funcionario_id: funcionarioId });
      // Ativos primeiro, concluídos/cancelados no final
      const ativos = data.filter(t => t.status !== 'concluido' && t.status !== 'cancelado');
      const concluidos = data.filter(t => t.status === 'concluido' || t.status === 'cancelado');
      setTarefas([...ativos, ...concluidos]);
    } catch {
      setError('Não foi possível carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  }

  // Estado: loading
  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex gap-3 items-start">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="flex-1 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Estado: error
  if (error) {
    return (
      <Card className="p-4 border-border/60">
        <div className="flex items-center gap-2 text-sm text-destructive mb-3">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  // Estado: empty
  if (tarefas.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-3">Nenhuma tarefa para este funcionário.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast('Use a página de Tarefas para criar uma tarefa vinculada a este funcionário.')}
        >
          <Plus className="w-4 h-4 mr-1" />
          Como criar uma tarefa
        </Button>
      </div>
    );
  }

  // Estado: success
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-muted-foreground">
          {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {tarefas.map((tarefa, idx) => (
        <div key={tarefa.id}>
          <div className="flex items-start gap-3 py-2">
            <Badge variant={STATUS_BADGE[tarefa.status] || 'secondary'} className="mt-0.5 shrink-0">
              {STATUS_LABEL[tarefa.status] || tarefa.status}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tarefa.titulo}</p>
              {(tarefa.data_prazo || tarefa.obra_nome) && (
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {tarefa.data_prazo && (
                    <span
                      className={`text-xs flex items-center gap-1 ${
                        isPastDue(tarefa.data_prazo) && tarefa.status !== 'concluido'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(tarefa.data_prazo)}
                    </span>
                  )}
                  {tarefa.obra_nome && (
                    <span className="text-xs text-muted-foreground">{tarefa.obra_nome}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {idx < tarefas.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

export default TarefasFuncionario;
