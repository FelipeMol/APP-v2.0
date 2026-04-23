import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_EXTENSO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Componente de calendário de meses para navegação de relatórios
 * @param {Object} props
 * @param {number} props.ano - Ano selecionado
 * @param {Function} props.onAnoChange - Callback para mudança de ano
 * @param {Object} props.mesesComRelatorio - Mapa de meses com relatório { '2026-01': { status: 'fechado', ... } }
 * @param {string} props.mesSelecionado - Mês selecionado no formato YYYY-MM
 * @param {Function} props.onMesClick - Callback quando clica em um mês
 * @param {Function} props.onCriarRelatorio - Callback para criar novo relatório
 */
export default function CalendarioMeses({
  ano,
  onAnoChange,
  mesesComRelatorio = {},
  mesSelecionado,
  onMesClick,
  onCriarRelatorio
}) {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  const getStatusMes = (mesIndex) => {
    const mesKey = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
    return mesesComRelatorio[mesKey] || null;
  };

  const getCorStatus = (status) => {
    if (!status) return null;
    switch (status.status) {
      case 'fechado':
        return 'bg-emerald-500';
      case 'aberto':
        return 'bg-amber-500';
      case 'rascunho':
        return 'bg-gray-400';
      case 'revisao':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const isMesFuturo = (mesIndex) => {
    if (ano > anoAtual) return true;
    if (ano < anoAtual) return false;
    return mesIndex > mesAtual;
  };

  const isMesAtual = (mesIndex) => {
    return ano === anoAtual && mesIndex === mesAtual;
  };

  const handleMesClick = (mesIndex) => {
    const mesKey = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
    const relatorio = getStatusMes(mesIndex);

    if (relatorio) {
      // Mês tem relatório - abrir visualização
      onMesClick?.(mesKey, relatorio);
    } else if (!isMesFuturo(mesIndex)) {
      // Mês passado sem relatório - perguntar se quer criar
      onCriarRelatorio?.(mesKey);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header com navegação de ano */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Relatórios Mensais</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAnoChange?.(ano - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold text-gray-900 min-w-[60px] text-center">
            {ano}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAnoChange?.(ano + 1)}
            disabled={ano >= anoAtual}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid de meses */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {MESES.map((mes, index) => {
          const relatorio = getStatusMes(index);
          const corStatus = getCorStatus(relatorio);
          const futuro = isMesFuturo(index);
          const atual = isMesAtual(index);
          const mesKey = `${ano}-${String(index + 1).padStart(2, '0')}`;
          const selecionado = mesSelecionado === mesKey;

          return (
            <button
              key={index}
              onClick={() => handleMesClick(index)}
              disabled={futuro}
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                ${futuro
                  ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                  : selecionado
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                    : relatorio
                      ? 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                      : 'bg-white border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                }
                ${atual ? 'ring-2 ring-indigo-300' : ''}
              `}
            >
              {/* Nome do mês */}
              <span className={`text-sm font-medium ${futuro ? 'text-gray-300' : selecionado ? 'text-indigo-700' : 'text-gray-700'}`}>
                {mes}
              </span>

              {/* Indicador de status */}
              <div className="mt-2 h-3 flex items-center justify-center">
                {relatorio ? (
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${corStatus}`}
                    title={`Status: ${relatorio.status}`}
                  />
                ) : !futuro ? (
                  <Plus className="w-3 h-3 text-gray-300" />
                ) : null}
              </div>

              {/* Badge "Atual" */}
              {atual && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500 text-white rounded">
                  Atual
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-600">Fechado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-600">Aberto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-600">Rascunho</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plus className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600">Sem relatório</span>
        </div>
      </div>
    </div>
  );
}

export { MESES, MESES_EXTENSO };
