import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Edit3,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
  Users,
  Camera,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import relatoriosService from '@/services/relatoriosService';
import CalendarioMeses, { MESES_EXTENSO } from '@/components/relatorios/CalendarioMeses';
import FuncionariosMesSection from '@/components/relatorios/FuncionariosMesSection';
import CronogramaComparativo from '@/components/relatorios/CronogramaComparativo';
import FotosRelatorioSection from '@/components/relatorios/FotosRelatorioSection';
import RelatorioMensalModal from '@/components/relatorios/RelatorioMensalModal';

// KPI Card Component
function KpiCard({ icon: Icon, label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]} text-center`}>
      <Icon className="w-5 h-5 mx-auto mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const config = {
    rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
    aberto: { label: 'Aberto', className: 'bg-amber-100 text-amber-700' },
    fechado: { label: 'Fechado', className: 'bg-emerald-100 text-emerald-700' },
    revisao: { label: 'Em Revisão', className: 'bg-blue-100 text-blue-700' },
  };

  const { label, className } = config[status] || config.rascunho;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function RelatorioMensal() {
  const { obraId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados
  const [loading, setLoading] = useState(true);
  const [obra, setObra] = useState(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mesesComRelatorio, setMesesComRelatorio] = useState({});
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [relatorioAtual, setRelatorioAtual] = useState(null);
  const [dadosRelatorio, setDadosRelatorio] = useState(null);

  // Modais
  const [modalEditar, setModalEditar] = useState(false);
  const [modalConfirmarCriar, setModalConfirmarCriar] = useState(false);
  const [mesParaCriar, setMesParaCriar] = useState(null);
  const [criandoRelatorio, setCriandoRelatorio] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const mesParam = searchParams.get('mes');
    if (mesParam) {
      setMesSelecionado(mesParam);
      const [anoParam] = mesParam.split('-');
      setAno(parseInt(anoParam, 10));
    }
  }, [searchParams]);

  // Carregar meses com relatório
  const carregarMeses = useCallback(async () => {
    try {
      const response = await relatoriosService.getMesesComRelatorio(obraId, ano);
      if (response?.sucesso) {
        setMesesComRelatorio(response.dados?.meses || {});
      }
    } catch (error) {
      console.error('Erro ao carregar meses:', error);
    }
  }, [obraId, ano]);

  // Carregar relatório do mês selecionado
  const carregarRelatorioMes = useCallback(async () => {
    if (!mesSelecionado) {
      setRelatorioAtual(null);
      setDadosRelatorio(null);
      return;
    }

    setLoading(true);
    try {
      const response = await relatoriosService.getRelatorioMensal(obraId, mesSelecionado);
      if (response?.sucesso) {
        setObra(response.dados?.obra);
        setRelatorioAtual(response.dados?.relatorio);
        setDadosRelatorio(response.dados);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório do mês');
    } finally {
      setLoading(false);
    }
  }, [obraId, mesSelecionado]);

  // Carregar dados da obra inicialmente
  useEffect(() => {
    const carregarObra = async () => {
      try {
        const response = await relatoriosService.getDashboardObra(obraId);
        if (response?.sucesso || response?.dados) {
          setObra(response.dados?.obra || response.obra);
        }
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarObra();
  }, [obraId]);

  useEffect(() => {
    carregarMeses();
  }, [carregarMeses]);

  useEffect(() => {
    carregarRelatorioMes();
  }, [carregarRelatorioMes]);

  // Handlers
  const handleMesClick = (mes, relatorio) => {
    setMesSelecionado(mes);
    setSearchParams({ mes });
  };

  const handleCriarRelatorio = (mes) => {
    setMesParaCriar(mes);
    setModalConfirmarCriar(true);
  };

  const confirmarCriarRelatorio = async () => {
    if (!mesParaCriar) return;

    setCriandoRelatorio(true);
    try {
      const response = await relatoriosService.salvarRelatorioMensal({
        obra_id: obraId,
        mes: mesParaCriar,
        status: 'rascunho'
      });

      if (response?.sucesso) {
        toast.success('Relatório criado com sucesso!');
        setModalConfirmarCriar(false);
        setMesSelecionado(mesParaCriar);
        setSearchParams({ mes: mesParaCriar });
        await carregarMeses();
        await carregarRelatorioMes();
      } else {
        toast.error(response?.mensagem || 'Erro ao criar relatório');
      }
    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      toast.error('Erro ao criar relatório');
    } finally {
      setCriandoRelatorio(false);
    }
  };

  const handleSalvarRelatorio = async () => {
    await carregarMeses();
    await carregarRelatorioMes();
    setModalEditar(false);
    toast.success('Relatório salvo com sucesso!');
  };

  const getMesExtenso = (mes) => {
    if (!mes) return '';
    const [, mesNum] = mes.split('-');
    return MESES_EXTENSO[parseInt(mesNum, 10) - 1];
  };

  // Render loading
  if (loading && !obra) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {obra?.nome || 'Carregando...'}
            </h1>
            <p className="text-sm text-gray-500">Relatórios Mensais</p>
          </div>
        </div>

        {relatorioAtual && (
          <Button onClick={() => setModalEditar(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Editar Relatório
          </Button>
        )}
      </div>

      {/* Calendário de Meses */}
      <CalendarioMeses
        ano={ano}
        onAnoChange={setAno}
        mesesComRelatorio={mesesComRelatorio}
        mesSelecionado={mesSelecionado}
        onMesClick={handleMesClick}
        onCriarRelatorio={handleCriarRelatorio}
      />

      {/* Conteúdo do Mês Selecionado */}
      {mesSelecionado && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : relatorioAtual ? (
            <>
              {/* Header do Relatório */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {getMesExtenso(mesSelecionado)} {mesSelecionado?.split('-')[0]}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={relatorioAtual.status} />
                        <span className="text-sm text-gray-500">
                          Última atualização: {relatoriosService.formatarDataBR(relatorioAtual.atualizado_em?.split(' ')[0])}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* KPIs do Mês */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard
                      icon={TrendingUp}
                      label="Progresso do Mês"
                      value={`${dadosRelatorio?.kpis?.progresso_mes > 0 ? '+' : ''}${dadosRelatorio?.kpis?.progresso_mes || 0}%`}
                      color="emerald"
                    />
                    <KpiCard
                      icon={Users}
                      label="Funcionários"
                      value={dadosRelatorio?.kpis?.funcionarios || 0}
                      color="blue"
                    />
                    <KpiCard
                      icon={Clock}
                      label="Horas Totais"
                      value={`${dadosRelatorio?.kpis?.horas_totais || 0}h`}
                      color="purple"
                    />
                    <KpiCard
                      icon={Camera}
                      label="Fotos"
                      value={dadosRelatorio?.kpis?.fotos || 0}
                      color="amber"
                    />
                  </div>

                  {/* Resumo Executivo */}
                  {relatorioAtual.resumo_executivo && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Resumo do Mês
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap">
                        {relatorioAtual.resumo_executivo}
                      </div>
                    </div>
                  )}

                  {/* Conclusões */}
                  {relatorioAtual.conclusoes && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Conclusões</h3>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap">
                        {relatorioAtual.conclusoes}
                      </div>
                    </div>
                  )}

                  {/* Próximos Passos */}
                  {relatorioAtual.proximos_passos && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Próximos Passos</h3>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap">
                        {relatorioAtual.proximos_passos}
                      </div>
                    </div>
                  )}

                  {/* Mensagem se relatório vazio */}
                  {!relatorioAtual.resumo_executivo && !relatorioAtual.conclusoes && !relatorioAtual.proximos_passos && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Este relatório ainda não tem conteúdo.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setModalEditar(true)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Adicionar Conteúdo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cronograma Comparativo */}
              <CronogramaComparativo
                comparativo={dadosRelatorio?.cronograma || []}
                mes={mesSelecionado}
                obraId={obraId}
              />

              {/* Funcionários do Mês */}
              <FuncionariosMesSection
                funcionarios={dadosRelatorio?.funcionarios || []}
                mes={mesSelecionado}
              />

              {/* Fotos do Relatório */}
              {relatorioAtual?.id && (
                <FotosRelatorioSection
                  relatorioId={relatorioAtual.id}
                  fotos={dadosRelatorio?.fotos || []}
                  onUpdate={carregarRelatorioMes}
                  readOnly={relatorioAtual.status === 'fechado'}
                />
              )}

              {/* Ocorrências */}
              {dadosRelatorio?.ocorrencias?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Ocorrências do Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dadosRelatorio.ocorrencias.map((ocorrencia, idx) => {
                        const tipoConfig = {
                          informativo: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
                          alerta: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
                          critico: { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
                          positivo: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                        };
                        const config = tipoConfig[ocorrencia.tipo] || tipoConfig.informativo;

                        return (
                          <div
                            key={ocorrencia.id || idx}
                            className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${config.dot} mt-1.5 flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {relatoriosService.formatarDataBR(ocorrencia.data)}
                                </span>
                                {ocorrencia.titulo && (
                                  <span className="text-sm font-medium text-gray-900">{ocorrencia.titulo}</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{ocorrencia.descricao}</p>
                              {ocorrencia.acao_tomada && (
                                <p className="text-xs text-gray-500 mt-2">
                                  <strong>Ação tomada:</strong> {ocorrencia.acao_tomada}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum relatório para {getMesExtenso(mesSelecionado)}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Crie um relatório para documentar o progresso deste mês.
                </p>
                <Button onClick={() => handleCriarRelatorio(mesSelecionado)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Relatório
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Confirmação para Criar */}
      <Dialog open={modalConfirmarCriar} onOpenChange={setModalConfirmarCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Relatório Mensal</DialogTitle>
            <DialogDescription>
              Deseja criar um relatório para {getMesExtenso(mesParaCriar)} {mesParaCriar?.split('-')[0]}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfirmarCriar(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarCriarRelatorio} disabled={criandoRelatorio}>
              {criandoRelatorio ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      {relatorioAtual && (
        <RelatorioMensalModal
          open={modalEditar}
          onClose={() => setModalEditar(false)}
          relatorio={relatorioAtual}
          obra={obra}
          mes={mesSelecionado}
          ocorrencias={dadosRelatorio?.ocorrencias || []}
          onSave={handleSalvarRelatorio}
        />
      )}
    </div>
  );
}
