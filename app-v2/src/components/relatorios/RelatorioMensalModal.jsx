import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import relatoriosService from '@/services/relatoriosService';

const MESES_EXTENSO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Modal de edição do relatório mensal
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar
 * @param {Object} props.relatorio - Dados do relatório
 * @param {Object} props.obra - Dados da obra
 * @param {string} props.mes - Mês no formato YYYY-MM
 * @param {Array} props.ocorrencias - Lista de ocorrências existentes
 * @param {Function} props.onSave - Callback após salvar
 */
export default function RelatorioMensalModal({
  open,
  onClose,
  relatorio,
  obra,
  mes,
  ocorrencias: ocorrenciasIniciais = [],
  onSave
}) {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form data
  const [status, setStatus] = useState('rascunho');
  const [resumoExecutivo, setResumoExecutivo] = useState('');
  const [conclusoes, setConclusoes] = useState('');
  const [proximosPassos, setProximosPassos] = useState('');
  const [ocorrencias, setOcorrencias] = useState([]);

  // Nova ocorrência
  const [novaOcorrencia, setNovaOcorrencia] = useState({
    data: '',
    tipo: 'informativo',
    titulo: '',
    descricao: '',
    impacto: '',
    acao_tomada: ''
  });
  const [mostrarFormOcorrencia, setMostrarFormOcorrencia] = useState(false);

  // Inicializar dados do relatório
  useEffect(() => {
    if (open && relatorio) {
      setStatus(relatorio.status || 'rascunho');
      setResumoExecutivo(relatorio.resumo_executivo || '');
      setConclusoes(relatorio.conclusoes || '');
      setProximosPassos(relatorio.proximos_passos || '');
      setOcorrencias(ocorrenciasIniciais || []);
      setHasChanges(false);
    }
  }, [open, relatorio, ocorrenciasIniciais]);

  // Detectar mudanças
  useEffect(() => {
    if (!relatorio) return;

    const changed =
      status !== (relatorio.status || 'rascunho') ||
      resumoExecutivo !== (relatorio.resumo_executivo || '') ||
      conclusoes !== (relatorio.conclusoes || '') ||
      proximosPassos !== (relatorio.proximos_passos || '');

    setHasChanges(changed);
  }, [status, resumoExecutivo, conclusoes, proximosPassos, relatorio]);

  // Formatar mês
  const getMesExtenso = () => {
    if (!mes) return '';
    const [ano, mesNum] = mes.split('-');
    return `${MESES_EXTENSO[parseInt(mesNum, 10) - 1]} ${ano}`;
  };

  // Salvar relatório
  const handleSalvar = async () => {
    setSaving(true);
    try {
      const response = await relatoriosService.salvarRelatorioMensal({
        obra_id: obra?.id,
        mes,
        status,
        resumo_executivo: resumoExecutivo,
        conclusoes,
        proximos_passos: proximosPassos,
        ocorrencias: ocorrencias
      });

      if (response?.sucesso) {
        onSave?.();
      } else {
        toast.error(response?.mensagem || 'Erro ao salvar relatório');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
  };

  // Adicionar ocorrência
  const handleAdicionarOcorrencia = () => {
    if (!novaOcorrencia.descricao.trim()) {
      toast.error('A descrição da ocorrência é obrigatória');
      return;
    }

    setOcorrencias(prev => [
      ...prev,
      {
        ...novaOcorrencia,
        data: novaOcorrencia.data || new Date().toISOString().split('T')[0],
        id: null // Nova ocorrência (sem ID)
      }
    ]);

    // Limpar form
    setNovaOcorrencia({
      data: '',
      tipo: 'informativo',
      titulo: '',
      descricao: '',
      impacto: '',
      acao_tomada: ''
    });
    setMostrarFormOcorrencia(false);
    setHasChanges(true);
  };

  // Remover ocorrência
  const handleRemoverOcorrencia = (index) => {
    setOcorrencias(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Confirmar fechar com mudanças
  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('Existem alterações não salvas. Deseja sair mesmo assim?')) {
        return;
      }
    }
    onClose();
  };

  // Atalho de teclado para salvar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && hasChanges) {
          handleSalvar();
        }
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, hasChanges]);

  const tipoOcorrenciaConfig = {
    informativo: { label: 'Informativo', color: 'bg-blue-500' },
    alerta: { label: 'Alerta', color: 'bg-amber-500' },
    critico: { label: 'Crítico', color: 'bg-rose-500' },
    positivo: { label: 'Positivo', color: 'bg-emerald-500' }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <DialogTitle className="text-lg">
                  Relatório {getMesExtenso()}
                </DialogTitle>
                <p className="text-sm text-gray-500">{obra?.nome}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Alterações não salvas
                </span>
              )}

              {/* Dropdown de Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Status: {status === 'rascunho' ? 'Rascunho' : status === 'aberto' ? 'Aberto' : 'Fechado'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatus('rascunho')}>
                    Rascunho
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus('aberto')}>
                    Aberto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus('fechado')}>
                    Fechado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleSalvar} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>

              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Resumo Executivo */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5" />
                Resumo Executivo
              </Label>
              <textarea
                value={resumoExecutivo}
                onChange={(e) => setResumoExecutivo(e.target.value)}
                placeholder="Descreva os principais acontecimentos e realizações do mês..."
                className="w-full min-h-[200px] p-4 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y"
              />
            </div>

            {/* Conclusões */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Conclusões do Mês
              </Label>
              <textarea
                value={conclusoes}
                onChange={(e) => setConclusoes(e.target.value)}
                placeholder="Quais foram as principais conclusões e aprendizados deste mês?"
                className="w-full min-h-[150px] p-4 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y"
              />
            </div>

            {/* Próximos Passos */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Próximos Passos
              </Label>
              <textarea
                value={proximosPassos}
                onChange={(e) => setProximosPassos(e.target.value)}
                placeholder="O que está planejado para o próximo mês?"
                className="w-full min-h-[150px] p-4 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y"
              />
            </div>

            {/* Ocorrências */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Ocorrências do Mês
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFormOcorrencia(!mostrarFormOcorrencia)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ocorrência
                </Button>
              </div>

              {/* Form de nova ocorrência */}
              {mostrarFormOcorrencia && (
                <div className="bg-gray-50 border rounded-lg p-4 mb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Data</Label>
                      <Input
                        type="date"
                        value={novaOcorrencia.data}
                        onChange={(e) => setNovaOcorrencia(prev => ({ ...prev, data: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Tipo</Label>
                      <select
                        value={novaOcorrencia.tipo}
                        onChange={(e) => setNovaOcorrencia(prev => ({ ...prev, tipo: e.target.value }))}
                        className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      >
                        <option value="informativo">Informativo</option>
                        <option value="alerta">Alerta</option>
                        <option value="critico">Crítico</option>
                        <option value="positivo">Positivo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Título (opcional)</Label>
                    <Input
                      value={novaOcorrencia.titulo}
                      onChange={(e) => setNovaOcorrencia(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Título breve da ocorrência"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Descrição *</Label>
                    <textarea
                      value={novaOcorrencia.descricao}
                      onChange={(e) => setNovaOcorrencia(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva a ocorrência..."
                      className="w-full min-h-[80px] p-3 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Ação Tomada (opcional)</Label>
                    <Input
                      value={novaOcorrencia.acao_tomada}
                      onChange={(e) => setNovaOcorrencia(prev => ({ ...prev, acao_tomada: e.target.value }))}
                      placeholder="O que foi feito em resposta?"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMostrarFormOcorrencia(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAdicionarOcorrencia}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de ocorrências */}
              <div className="space-y-3">
                {ocorrencias.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    Nenhuma ocorrência registrada para este mês.
                  </div>
                ) : (
                  ocorrencias.map((ocorrencia, idx) => {
                    const config = tipoOcorrenciaConfig[ocorrencia.tipo] || tipoOcorrenciaConfig.informativo;

                    return (
                      <div
                        key={ocorrencia.id || idx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${config.color} mt-1.5 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {relatoriosService.formatarDataBR(ocorrencia.data)}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                              {config.label}
                            </span>
                            {ocorrencia.titulo && (
                              <span className="text-sm font-medium text-gray-900">{ocorrencia.titulo}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{ocorrencia.descricao}</p>
                          {ocorrencia.acao_tomada && (
                            <p className="text-xs text-gray-500 mt-2">
                              <strong>Ação:</strong> {ocorrencia.acao_tomada}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoverOcorrencia(idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              Dica: Use <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-200 rounded">S</kbd> para salvar
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-gray-200 rounded">Esc</kbd> para fechar
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
