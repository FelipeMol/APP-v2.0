import { useMemo, useRef, useEffect } from 'react';
import {
  format,
  parseISO,
  differenceInDays,
  eachMonthOfInterval,
  eachWeekOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachQuarterOfInterval,
  startOfQuarter,
  endOfQuarter,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useCronogramaStore from '@/store/cronogramaStore';

const ROW_HEIGHT = 41; // altura de cada linha (deve coincidir com o spreadsheet)
const HEADER_HEIGHT = 45; // altura do header

// Pixels por dia baseado no zoom
const ZOOM_CONFIG = {
  week: 12, // mais detalhado
  month: 4,
  quarter: 1.5,
  full: 2,
};

export default function CronogramaTimeline({ scrollTop, onScroll }) {
  const containerRef = useRef(null);
  const { buildTree, getDateRange, zoomLevel } = useCronogramaStore();

  const items = buildTree();
  const dateRange = getDateRange();

  // Pixels por dia baseado no zoom
  const dayWidth = ZOOM_CONFIG[zoomLevel] || ZOOM_CONFIG.month;

  // Sincroniza scroll vertical com spreadsheet
  useEffect(() => {
    if (containerRef.current && scrollTop !== undefined) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  // Calcula períodos baseado no zoom
  const periods = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];

    switch (zoomLevel) {
      case 'week':
        return eachWeekOfInterval(
          { start: dateRange.start, end: dateRange.end },
          { weekStartsOn: 1 }
        ).map((week) => ({
          date: week,
          start: startOfWeek(week, { weekStartsOn: 1 }),
          end: endOfWeek(week, { weekStartsOn: 1 }),
          label: `Sem ${format(week, 'w', { locale: ptBR })}`,
          sublabel: format(week, 'MMM', { locale: ptBR }),
        }));

      case 'quarter':
        return eachQuarterOfInterval({
          start: dateRange.start,
          end: dateRange.end,
        }).map((quarter) => ({
          date: quarter,
          start: startOfQuarter(quarter),
          end: endOfQuarter(quarter),
          label: `T${Math.ceil((quarter.getMonth() + 1) / 3)}`,
          sublabel: format(quarter, 'yyyy'),
        }));

      case 'full':
      case 'month':
      default:
        return eachMonthOfInterval({
          start: dateRange.start,
          end: dateRange.end,
        }).map((month) => ({
          date: month,
          start: startOfMonth(month),
          end: endOfMonth(month),
          label: format(month, 'MMM', { locale: ptBR }),
          sublabel: format(month, 'yyyy'),
        }));
    }
  }, [dateRange, zoomLevel]);

  // Calcula largura total do timeline
  const totalDays = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return 365;
    return differenceInDays(dateRange.end, dateRange.start) + 1;
  }, [dateRange]);

  const totalWidth = totalDays * dayWidth;

  // Calcula posição e largura de uma barra
  const calculateBarPosition = (startDate, endDate) => {
    if (!startDate || !endDate || !dateRange.start) {
      return { left: 0, width: 0 };
    }

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const rangeStart = dateRange.start;

      const daysFromStart = differenceInDays(start, rangeStart);
      const duration = differenceInDays(end, start) + 1;

      return {
        left: daysFromStart * dayWidth,
        width: Math.max(duration * dayWidth, 4), // Mínimo 4px de largura
      };
    } catch {
      return { left: 0, width: 0 };
    }
  };

  // Calcula posição da linha "hoje"
  const todayPosition = useMemo(() => {
    if (!dateRange.start) return null;
    const today = new Date();
    const daysFromStart = differenceInDays(today, dateRange.start);
    if (daysFromStart < 0 || daysFromStart > totalDays) return null;
    return daysFromStart * dayWidth;
  }, [dateRange, totalDays, dayWidth]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-white"
      onScroll={(e) => onScroll?.(e.target.scrollTop)}
    >
      <div style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
        {/* Header com períodos */}
        <div
          className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 flex"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          {periods.map((period, idx) => {
            const daysInPeriod = differenceInDays(period.end, period.start) + 1;
            const periodWidth = daysInPeriod * dayWidth;

            return (
              <div
                key={idx}
                className="border-r border-gray-200 flex flex-col justify-center items-center"
                style={{ width: `${periodWidth}px`, minWidth: `${periodWidth}px` }}
              >
                <span className="text-xs font-medium text-gray-600 uppercase">
                  {period.label}
                </span>
                <span className="text-xs text-gray-400">
                  {period.sublabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Body com barras */}
        <div className="relative">
          {/* Grid lines verticais */}
          <div className="absolute inset-0 flex pointer-events-none">
            {periods.map((period, idx) => {
              const daysInPeriod = differenceInDays(period.end, period.start) + 1;
              const periodWidth = daysInPeriod * dayWidth;

              return (
                <div
                  key={idx}
                  className="border-r border-gray-100"
                  style={{ width: `${periodWidth}px`, minWidth: `${periodWidth}px` }}
                />
              );
            })}
          </div>

          {/* Linha de hoje */}
          {todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
              style={{ left: `${todayPosition}px` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] px-1 rounded">
                Hoje
              </div>
            </div>
          )}

          {/* Linhas do cronograma */}
          {items.map((item) => {
            const plannedBar = calculateBarPosition(
              item.data_inicio_planejada,
              item.data_fim_planejada
            );
            const actualBar = item.data_inicio_real
              ? calculateBarPosition(
                  item.data_inicio_real,
                  item.data_fim_real || new Date().toISOString().split('T')[0]
                )
              : null;

            const isDelayed =
              item.data_fim_real &&
              item.data_fim_planejada &&
              new Date(item.data_fim_real) > new Date(item.data_fim_planejada);

            return (
              <div
                key={item.id}
                className="relative border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {/* Barra planejada (fundo) */}
                {plannedBar.width > 0 && (
                  <div
                    className="absolute top-2 h-4 rounded bg-gray-200 opacity-60"
                    style={{
                      left: `${plannedBar.left}px`,
                      width: `${plannedBar.width}px`,
                    }}
                    title={`Planejado: ${format(parseISO(item.data_inicio_planejada), 'dd/MM/yy')} - ${format(parseISO(item.data_fim_planejada), 'dd/MM/yy')}`}
                  />
                )}

                {/* Barra real/progresso */}
                {plannedBar.width > 0 && (
                  <div
                    className={`absolute top-2 h-4 rounded transition-all ${
                      isDelayed ? 'bg-amber-500' : ''
                    }`}
                    style={{
                      left: `${actualBar?.left ?? plannedBar.left}px`,
                      width: `${
                        actualBar
                          ? actualBar.width
                          : (plannedBar.width * item.progresso) / 100
                      }px`,
                      backgroundColor: !isDelayed ? item.cor || '#6366f1' : undefined,
                    }}
                    title={`Progresso: ${item.progresso}%`}
                  />
                )}

                {/* Indicador de atraso */}
                {isDelayed && (
                  <div
                    className="absolute top-1 text-[10px] text-rose-600 font-medium"
                    style={{
                      left: `${(actualBar?.left ?? 0) + (actualBar?.width ?? 0) + 4}px`,
                    }}
                  >
                    +{differenceInDays(
                      parseISO(item.data_fim_real),
                      parseISO(item.data_fim_planejada)
                    )}d
                  </div>
                )}
              </div>
            );
          })}

          {/* Mensagem vazia */}
          {items.length === 0 && (
            <div
              className="flex items-center justify-center text-gray-400"
              style={{ height: '200px' }}
            >
              Adicione categorias para visualizar o cronograma
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
