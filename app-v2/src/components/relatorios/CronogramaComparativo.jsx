import { useState, useEffect } from 'react';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import relatoriosService from '@/services/relatoriosService';

/**
 * Componente de comparativo do cronograma (previsto vs realizado)
 * @param {Object} props
 * @param {Array} props.comparativo - Lista de fases com meta e realizado
 * @param {string} props.mes - Mês no formato YYYY-MM
 * @param {number} props.obraId - ID da obra
 */
export default function CronogramaComparativo({ comparativo: comparativoProp, mes, obraId }) {
  const [expandido, setExpandido] = useState(true);
  const [comparativo, setComparativo] = useState(comparativoProp || []);
  const [loading, setLoading] = useState(false);

  // Buscar dados do cronograma se não foram passados
  useEffect(() => {
    const carregarCronograma = async () => {
      if (!comparativoProp?.length && obraId && mes) {
        setLoading(true);
        try {
          const response = await relatoriosService.getCronogramaMes(obraId, mes);
          if (response?.sucesso) {
            setComparativo(response.dados?.comparativo || []);
          }
        } catch (error) {
          console.error('Erro ao carregar cronograma:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setComparativo(comparativoProp || []);
      }
    };

    carregarCronograma();
  }, [comparativoProp, obraId, mes]);

  // Ícone e cor do status
  const getStatusConfig = (status, diferenca) => {
    if (status === 'adiantado' || diferenca > 5) {
      return {
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        label: 'Adiantado'
      };
    }
    if (status === 'atrasado' || diferenca < -5) {
      return {
        icon: TrendingDown,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        label: 'Atrasado'
      };
    }
    return {
      icon: Minus,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      label: 'No Prazo'
    };
  };

  // Formatar diferença
  const formatarDiferenca = (diferenca) => {
    if (diferenca > 0) return `+${diferenca.toFixed(0)}%`;
    if (diferenca < 0) return `${diferenca.toFixed(0)}%`;
    return '0%';
  };

  // Calcular resumo
  const resumo = {
    adiantadas: comparativo.filter(f => f.diferenca > 5).length,
    noPrazo: comparativo.filter(f => f.diferenca >= -5 && f.diferenca <= 5).length,
    atrasadas: comparativo.filter(f => f.diferenca < -5).length,
    mediaRealizado: comparativo.length > 0
      ? (comparativo.reduce((sum, f) => sum + (f.realizado || 0), 0) / comparativo.length).toFixed(1)
      : 0
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando cronograma...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comparativo.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma fase de cronograma encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpandido(!expandido)}
            >
              {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Cronograma: Previsto vs Realizado
            </CardTitle>
          </div>
        </div>

        {/* Resumo */}
        {expandido && (
          <div className="flex items-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">{resumo.adiantadas} adiantadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600">{resumo.noPrazo} no prazo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-sm text-gray-600">{resumo.atrasadas} atrasadas</span>
            </div>
            <div className="ml-auto text-sm text-gray-500">
              Média realizada: <span className="font-semibold text-gray-900">{resumo.mediaRealizado}%</span>
            </div>
          </div>
        )}
      </CardHeader>

      {expandido && (
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[40%]">Fase</TableHead>
                  <TableHead className="text-center">Meta do Mês</TableHead>
                  <TableHead className="text-center">Realizado</TableHead>
                  <TableHead className="text-center">Diferença</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparativo.map((fase, idx) => {
                  const config = getStatusConfig(fase.status, fase.diferenca);
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={fase.id || idx} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: fase.cor || '#6366F1' }}
                          />
                          <span className="font-medium text-gray-900">{fase.fase}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-gray-600">{fase.meta_mes || 0}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-gray-900">{fase.realizado || 0}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${config.color}`}>
                          {formatarDiferenca(fase.diferenca)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${config.bg}`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Barra de progresso visual */}
          <div className="mt-4 space-y-2">
            {comparativo.slice(0, 6).map((fase, idx) => (
              <div key={fase.id || idx} className="flex items-center gap-3">
                <div className="w-28 text-sm text-gray-600 truncate">{fase.fase}</div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  {/* Meta (linha tracejada) */}
                  <div className="relative h-full">
                    {fase.meta_mes > 0 && (
                      <div
                        className="absolute top-0 h-full border-r-2 border-dashed border-gray-400 z-10"
                        style={{ left: `${fase.meta_mes}%` }}
                      />
                    )}
                    {/* Realizado */}
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${fase.realizado || 0}%`,
                        backgroundColor: fase.diferenca > 5 ? '#10B981' : fase.diferenca < -5 ? '#F43F5E' : '#6366F1'
                      }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium text-gray-900">
                  {fase.realizado || 0}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
