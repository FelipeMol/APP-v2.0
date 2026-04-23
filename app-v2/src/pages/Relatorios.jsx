import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  ListChecks,
  MapPin,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share2,
  Square,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  BarChart3,
  Activity,
  Target,
  Zap,
  Eye,
  Trash2,
  MoreVertical,
  ClipboardList,
  Camera,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/store/authStore';
import relatoriosService from '@/services/relatoriosService';
import obrasService from '@/services/obrasService';
import { CronogramaModal } from '@/components/cronograma';

// ============================================================================
// HOOKS PERSONALIZADOS
// ============================================================================

function useAnimatedNumber(value, duration = 800) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    if (typeof value !== 'number' || isNaN(value)) {
      setDisplayValue(0);
      return;
    }

    const startValue = previousValue.current;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (value - startValue) * eased);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return displayValue;
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function DonutChart({ percentage, emAndamento = 0, size = 180, strokeWidth = 16, animated = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calcular os offsets para cada segmento
  const concluidoOffset = circumference - (percentage / 100) * circumference;
  const emAndamentoLength = (emAndamento / 100) * circumference;
  const emAndamentoOffset = concluidoOffset - emAndamentoLength;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Fundo cinza */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Segmento "Em andamento" (azul) - renderiza primeiro para ficar embaixo */}
        {emAndamento > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animated ? emAndamentoOffset : circumference}
            className={animated ? "transition-all duration-1000 ease-out" : ""}
          />
        )}
        {/* Segmento "Concluído" (verde) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? concluidoOffset : circumference}
          className={animated ? "transition-all duration-1000 ease-out" : ""}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-900">{Math.round(percentage)}%</span>
        <span className="text-sm text-gray-500 font-medium">Concluído</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, onClick, editable = false }) {
  const config = {
    ativa: { label: 'Ativa', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    pausada: { label: 'Pausada', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    concluida: { label: 'Concluída', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    atrasada: { label: 'Atrasada', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  };

  const { label, className } = config[status] || config.ativa;

  return (
    <span
      onClick={editable ? onClick : undefined}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className} ${editable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
      {label}
      {editable && <Edit3 className="w-3 h-3 ml-1" />}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sublabel, color = 'blue', trend, onClick, clickable = false }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    rose: 'bg-rose-50 border-rose-200 text-rose-600',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
  };

  const iconColors = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    indigo: 'text-indigo-600',
  };

  const textColors = {
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    indigo: 'text-indigo-700',
  };

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`rounded-xl p-4 border ${colorClasses[color]} text-center transition-all hover:shadow-md ${clickable ? 'cursor-pointer hover-lift active-press' : ''}`}
    >
      <Icon className={`w-5 h-5 ${iconColors[color]} mx-auto mb-2`} />
      <p className={`text-2xl font-bold ${textColors[color]} animate-count`}>{value}</p>
      <p className={`text-xs font-medium ${iconColors[color]}`}>{label}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
      {trend !== undefined && (
        <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend >= 0 ? '+' : ''}{trend}%</span>
        </div>
      )}
      {clickable && (
        <p className="text-xs text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          Clique para detalhes
        </p>
      )}
    </div>
  );
}

function AlertCard({ type, message, count, onAction, actionLabel = 'Ver', onResolve }) {
  const configs = {
    warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconColor: 'text-amber-500' },
    danger: { icon: XCircle, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconColor: 'text-rose-500' },
    info: { icon: Activity, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconColor: 'text-blue-500' },
    success: { icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} ${config.border} border group animate-slide-up`}>
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.text}`}>{message}</p>
        {count && <p className="text-xs text-gray-500 mt-0.5">{count}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAction && (
          <Button variant="ghost" size="sm" onClick={onAction} className="h-7 px-2 text-xs">
            {actionLabel}
          </Button>
        )}
        {onResolve && (
          <Button variant="ghost" size="sm" onClick={onResolve} className="h-7 px-2 text-xs text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Componente de visualização Gantt Preview para o cronograma
function CronogramaGanttPreview({ cronograma, onOpenModal }) {
  // Filtra apenas fases principais (sem parent_id)
  const fasesPrincipais = cronograma.filter(f => !f.parent_id).slice(0, 6);

  // Calcula range de datas para o Gantt
  const hoje = new Date();
  const meses = [];

  // Gera 6 meses a partir do início das obras ou hoje
  let mesInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  for (let i = 0; i < 8; i++) {
    meses.push(new Date(mesInicio.getFullYear(), mesInicio.getMonth() + i, 1));
  }

  const formatMes = (data) => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return mesesNomes[data.getMonth()];
  };

  // Calcula a posição e largura da barra de cada fase
  const calcularBarra = (fase) => {
    const inicio = fase.data_inicio_planejada ? parseISO(fase.data_inicio_planejada) : null;
    const fim = fase.data_fim_planejada ? parseISO(fase.data_fim_planejada) : null;

    if (!inicio || !fim) return { left: 0, width: 0, visible: false };

    const primeiroMes = meses[0];
    // Usar o primeiro dia do mês seguinte ao último para calcular corretamente
    const ultimoMes = new Date(meses[meses.length - 1].getFullYear(), meses[meses.length - 1].getMonth() + 1, 1);
    const totalDias = (ultimoMes - primeiroMes) / (1000 * 60 * 60 * 24);

    const diasDesdeInicio = Math.max(0, (inicio - primeiroMes) / (1000 * 60 * 60 * 24));
    const duracaoDias = Math.max(15, (fim - inicio) / (1000 * 60 * 60 * 24));

    const left = (diasDesdeInicio / totalDias) * 100;
    const width = Math.min(100 - left, (duracaoDias / totalDias) * 100);

    return { left, width, visible: width > 0 && left < 100 };
  };

  // Cores por status
  const getStatusColor = (status) => {
    if (status === 'concluida') return { bar: 'bg-emerald-500', bg: 'bg-emerald-100' };
    if (status === 'atrasada') return { bar: 'bg-rose-500', bg: 'bg-rose-100' };
    if (status === 'em_andamento') return { bar: 'bg-indigo-500', bg: 'bg-indigo-100' };
    return { bar: 'bg-gray-400', bg: 'bg-gray-200' };
  };

  // Calcula posição da linha "hoje"
  const calcularLinhaHoje = () => {
    const primeiroMes = meses[0];
    // Usar o primeiro dia do mês seguinte ao último para calcular corretamente
    const ultimoMes = new Date(meses[meses.length - 1].getFullYear(), meses[meses.length - 1].getMonth() + 1, 1);
    const totalDias = (ultimoMes - primeiroMes) / (1000 * 60 * 60 * 24);
    const diasDesdeInicio = (hoje - primeiroMes) / (1000 * 60 * 60 * 24);
    return (diasDesdeInicio / totalDias) * 100;
  };

  const posicaoHoje = calcularLinhaHoje();

  return (
    <div className="space-y-0">
      {/* Header com meses */}
      <div className="flex border-b border-gray-200 pb-2 mb-3">
        <div className="w-32 flex-shrink-0" />
        <div className="flex-1 flex">
          {meses.map((mes, idx) => (
            <div
              key={idx}
              className="flex-1 text-center text-xs font-medium text-gray-500"
            >
              {formatMes(mes)}
              <span className="text-gray-400 ml-1">{mes.getFullYear().toString().slice(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Área do Gantt com linha do hoje */}
      <div className="relative">
        {/* Linha vertical "Hoje" */}
        {posicaoHoje >= 0 && posicaoHoje <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
            style={{ left: `calc(128px + (100% - 128px) * ${posicaoHoje / 100})` }}
          >
            <div className="absolute -top-5 -left-3 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              Hoje
            </div>
          </div>
        )}

        {/* Fases */}
        {fasesPrincipais.map((fase, idx) => {
          const barra = calcularBarra(fase);
          const colors = getStatusColor(fase.status);

          return (
            <div
              key={fase.id || idx}
              className="flex items-center py-1.5 hover:bg-gray-50 rounded transition-colors cursor-pointer group"
              onClick={onOpenModal}
            >
              {/* Nome da fase */}
              <div className="w-32 flex-shrink-0 pr-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${colors.bar}`} />
                  <span className="text-sm text-gray-700 truncate group-hover:text-indigo-600 transition-colors">
                    {fase.fase}
                  </span>
                </div>
              </div>

              {/* Área do Gantt */}
              <div className="flex-1 relative h-6">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {meses.map((_, idx) => (
                    <div key={idx} className="flex-1 border-l border-gray-100 first:border-l-0" />
                  ))}
                </div>

                {/* Barra da fase */}
                {barra.visible && (
                  <div
                    className={`absolute top-1 h-4 rounded ${colors.bg} overflow-hidden transition-all`}
                    style={{ left: `${barra.left}%`, width: `${barra.width}%` }}
                  >
                    <div
                      className={`h-full ${colors.bar} rounded transition-all`}
                      style={{ width: `${fase.progresso || 0}%` }}
                    />
                    {/* Texto de progresso dentro da barra */}
                    {barra.width > 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white mix-blend-difference">
                        {fase.progresso || 0}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-gray-600">Concluída</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-indigo-500" />
            <span className="text-gray-600">Em andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span className="text-gray-600">Pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-500" />
            <span className="text-gray-600">Atrasada</span>
          </div>
        </div>

        {cronograma.length > 6 && (
          <span className="text-xs text-gray-400">
            +{cronograma.filter(f => !f.parent_id).length - 6} fases
          </span>
        )}
      </div>
    </div>
  );
}

function GanttBar({ fase, onClick }) {
  const progresso = fase.progresso || 0;
  const status = fase.status || 'pendente';

  // Determina a cor baseado no status
  const getStatusColor = () => {
    if (status === 'concluida') return { bg: 'bg-emerald-500', light: 'bg-emerald-100' };
    if (status === 'atrasada') return { bg: 'bg-rose-500', light: 'bg-rose-100' };
    if (status === 'em_andamento') return { bg: 'bg-indigo-500', light: 'bg-indigo-100' };
    return { bg: 'bg-gray-400', light: 'bg-gray-100' };
  };

  const colors = getStatusColor();

  // Determina o ícone de status
  const getStatusIcon = () => {
    if (status === 'concluida') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === 'atrasada') return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    if (status === 'em_andamento') return <Activity className="w-4 h-4 text-indigo-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div
      className="flex items-center gap-3 py-2 group cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
      onClick={onClick}
    >
      {/* Ícone de status */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* Nome da fase */}
      <div className="w-28 text-sm font-medium text-gray-700 truncate group-hover:text-indigo-600 transition-colors">
        {fase.fase}
      </div>

      {/* Barra de progresso */}
      <div className="flex-1 relative">
        <div className={`h-3 rounded-full ${colors.light} overflow-hidden`}>
          <div
            className={`h-full rounded-full ${colors.bg} transition-all duration-500`}
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Percentual */}
      <div className="w-12 text-right">
        <span className={`text-sm font-semibold ${
          status === 'concluida' ? 'text-emerald-600' :
          status === 'atrasada' ? 'text-rose-600' :
          status === 'em_andamento' ? 'text-indigo-600' :
          'text-gray-500'
        }`}>
          {progresso}%
        </span>
      </div>
    </div>
  );
}

function ObraCard({ obra, onClick }) {
  const progress = obra.progresso || 0;
  const status = obra.status || 'ativa';
  const risco = progress < 30 ? 'alto' : progress < 60 ? 'medio' : 'baixo';

  const riscoColors = {
    baixo: 'bg-emerald-100 text-emerald-700',
    medio: 'bg-amber-100 text-amber-700',
    alto: 'bg-rose-100 text-rose-700',
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-gray-200 p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 animate-slide-up"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
            {obra.nome}
          </h3>
          <p className="text-sm text-gray-500 truncate">{obra.empresa || 'Sem empresa'}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <User className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{obra.responsavel || 'Não definido'}</p>
          <p className="text-xs text-gray-500">Responsável</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progresso</span>
          <span className="font-semibold text-gray-900">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full animate-progress"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {obra.prazo && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <Calendar className="w-3 h-3" />
              {obra.prazo}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded ${riscoColors[risco]}`}>
          {risco === 'baixo' ? 'Baixo Risco' : risco === 'medio' ? 'Médio Risco' : 'Alto Risco'}
        </span>
      </div>

      <div className="flex items-center justify-center mt-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-medium">Ver dashboard</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
}

function ReportCard({ title, subtitle, status, metrics, onOpen, onExport, type = 'monthly' }) {
  const statusConfig = {
    fechado: { label: 'Fechado', className: 'bg-emerald-100 text-emerald-700' },
    aberto: { label: 'Em aberto', className: 'bg-amber-100 text-amber-700' },
    pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-700' },
    revisao: { label: 'Em revisão', className: 'bg-blue-100 text-blue-700' },
    rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-600' },
  };

  const { label, className } = statusConfig[status] || statusConfig.pendente;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group animate-slide-up">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{title}</h4>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${className}`}>{label}</span>
        </div>
      </div>

      {metrics && (
        <div className="p-4 bg-gray-50 grid grid-cols-3 gap-4">
          {metrics.map((metric, idx) => (
            <div key={idx} className="text-center">
              <p className="text-lg font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-500">{metric.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 flex items-center justify-between border-t border-gray-100">
        <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700" onClick={onOpen}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>
    </div>
  );
}

function DailyReportCard({ date, dayOfWeek, isToday, funcionarios, horas, tarefas, atividades, ocorrencias, onView, onEdit, onAddOcorrencia }) {
  return (
    <div className={`bg-white rounded-xl border ${isToday ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'} p-4 hover:shadow-md transition-all animate-slide-up`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-lg ${isToday ? 'bg-indigo-500' : 'bg-gray-100'} flex items-center justify-center`}>
            <CalendarDays className={`w-5 h-5 ${isToday ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{dayOfWeek}</p>
            <p className="text-xs text-gray-500">{date}</p>
          </div>
        </div>
        {isToday && (
          <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 font-medium">
            Hoje
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{funcionarios}</p>
          <p className="text-xs text-gray-500">Funcionários</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{horas}h</p>
          <p className="text-xs text-gray-500">Horas</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{tarefas}</p>
          <p className="text-xs text-gray-500">Tarefas</p>
        </div>
      </div>

      {atividades && atividades.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Principais atividades:</p>
          <div className="space-y-1">
            {atividades.slice(0, 2).map((ativ, idx) => (
              <p key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                <span className="truncate">{ativ}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {ocorrencias && ocorrencias.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Ocorrências:</p>
          <div className="space-y-1">
            {ocorrencias.slice(0, 2).map((oc, idx) => (
              <p key={idx} className="text-sm text-amber-600 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{oc}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Button variant="ghost" size="sm" className="text-indigo-600" onClick={onView}>
          <Eye className="w-4 h-4 mr-1" />
          Ver detalhes
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={onEdit}>
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={onAddOcorrencia}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlobalKpisCard({ kpis, loading }) {
  const totalObras = useAnimatedNumber(kpis?.obras?.total || 0);
  const horasMes = useAnimatedNumber(Math.round(kpis?.horas_mes || 0));
  const funcionarios = useAnimatedNumber(kpis?.funcionarios_ativos || 0);
  const alertas = useAnimatedNumber(kpis?.alertas_pendentes || 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="skeleton h-5 w-5 rounded mb-2" />
            <div className="skeleton h-8 w-20 rounded mb-1" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-animation">
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover-lift">
        <div className="flex items-center justify-between mb-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <span className="text-xs text-emerald-600 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{kpis?.obras?.ativas || 0} ativas
          </span>
        </div>
        <p className="text-3xl font-bold text-gray-900">{totalObras}</p>
        <p className="text-sm text-gray-500">Total de Obras</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 hover-lift">
        <div className="flex items-center justify-between mb-2">
          <Clock className="w-5 h-5 text-purple-600" />
          <span className={`text-xs flex items-center ${(kpis?.horas_variacao || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {(kpis?.horas_variacao || 0) >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {kpis?.horas_variacao || 0}% vs mês
          </span>
        </div>
        <p className="text-3xl font-bold text-gray-900">{horasMes}h</p>
        <p className="text-sm text-gray-500">Horas Este Mês</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 hover-lift">
        <div className="flex items-center justify-between mb-2">
          <Users className="w-5 h-5 text-amber-600" />
        </div>
        <p className="text-3xl font-bold text-gray-900">{funcionarios}</p>
        <p className="text-sm text-gray-500">Funcionários Ativos</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 hover-lift">
        <div className="flex items-center justify-between mb-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          {(kpis?.alertas_pendentes || 0) > 0 && (
            <span className="text-xs text-rose-600 animate-alert-pulse">Atenção</span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900">{alertas}</p>
        <p className="text-sm text-gray-500">Alertas Pendentes</p>
      </div>
    </div>
  );
}

// ============================================================================
// MODAIS
// ============================================================================

function EditMetaModal({ open, onClose, obra, currentMeta, onSave }) {
  const [progresso, setProgresso] = useState(obra?.progresso || 0);
  const [metaMensal, setMetaMensal] = useState(currentMeta || 0);
  const [concluido, setConcluido] = useState(obra?.progresso || 0);
  const [emAndamento, setEmAndamento] = useState(20);
  const [saving, setSaving] = useState(false);

  // Atualizar valores quando modal abre
  useEffect(() => {
    if (open) {
      setProgresso(obra?.progresso || 0);
      setMetaMensal(currentMeta || obra?.meta_mensal || 0);
      setConcluido(obra?.progresso || 0);
      setEmAndamento(Math.min(20, 100 - (obra?.progresso || 0)));
    }
  }, [open, currentMeta, obra?.meta_mensal, obra?.progresso]);

  // Calcular pendente automaticamente
  const pendente = Math.max(0, 100 - concluido - emAndamento);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        meta_mensal: metaMensal,
        progresso: concluido,
        em_andamento: emAndamento
      });
      toast.success('Progresso e meta atualizados!');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
          <h2 className="text-xl font-bold">Editar Progresso da Obra</h2>
          <p className="text-indigo-200 text-sm mt-1">{obra?.nome}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Visualização do Progresso */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Progresso Total</span>
              <span className="text-2xl font-bold text-indigo-600">{concluido}%</span>
            </div>

            {/* Barra de progresso visual */}
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${concluido}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${emAndamento}%` }}
              />
              <div
                className="bg-gray-300 flex-1"
              />
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600">Concluído</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">Em andamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-gray-600">Pendente</span>
              </div>
            </div>
          </div>

          {/* Sliders de Edição */}
          <div className="space-y-5">
            {/* Concluído */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Concluído
                </Label>
                <span className="text-lg font-bold text-indigo-600">{concluido}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={concluido}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setConcluido(val);
                  // Ajustar em andamento se ultrapassar 100
                  if (val + emAndamento > 100) {
                    setEmAndamento(100 - val);
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Em Andamento */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Em Andamento
                </Label>
                <span className="text-lg font-bold text-blue-500">{emAndamento}%</span>
              </div>
              <input
                type="range"
                min="0"
                max={100 - concluido}
                value={emAndamento}
                onChange={(e) => setEmAndamento(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Pendente (somente leitura) */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Pendente (automático)
                </span>
                <span className="text-lg font-bold text-gray-500">{pendente}%</span>
              </div>
            </div>
          </div>

          {/* Meta Mensal */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                Meta do Mês
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={metaMensal}
                  onChange={(e) => setMetaMensal(Number(e.target.value))}
                  className="w-20 h-9 text-center font-bold"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>

            {/* Indicador de meta */}
            {concluido >= metaMensal ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Meta atingida! +{concluido - metaMensal}% acima</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Faltam {metaMensal - concluido}% para atingir a meta</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-5">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="px-5 bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditStatusModal({ open, onClose, currentStatus, onSave }) {
  const [status, setStatus] = useState(currentStatus || 'ativa');
  const [saving, setSaving] = useState(false);

  const statuses = [
    { value: 'ativa', label: 'Ativa', description: 'Obra em andamento normal' },
    { value: 'pausada', label: 'Pausada', description: 'Obra temporariamente parada' },
    { value: 'concluida', label: 'Concluída', description: 'Obra finalizada com sucesso' },
    { value: 'atrasada', label: 'Atrasada', description: 'Obra com atraso no cronograma' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(status);
      toast.success('Status atualizado com sucesso');
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md animate-modal-in">
        <DialogHeader>
          <DialogTitle>Alterar Status da Obra</DialogTitle>
          <DialogDescription>
            Selecione o novo status para esta obra
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {statuses.map((s) => (
            <div
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                status === s.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.label}</p>
                  <p className="text-sm text-gray-500">{s.description}</p>
                </div>
                <StatusBadge status={s.value} />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CriarAlertaModal({ open, onClose, obraId, onSave }) {
  const [tipo, setTipo] = useState('warning');
  const [mensagem, setMensagem] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [saving, setSaving] = useState(false);

  const tiposAlerta = [
    {
      value: 'warning',
      label: 'Atenção',
      emoji: '⚠️',
      description: 'Situação que requer cuidado',
      bgSelected: 'bg-amber-100',
      borderSelected: 'border-amber-400',
      textSelected: 'text-amber-700',
      bgHover: 'hover:bg-amber-50'
    },
    {
      value: 'danger',
      label: 'Urgente',
      emoji: '🚨',
      description: 'Problema crítico',
      bgSelected: 'bg-rose-100',
      borderSelected: 'border-rose-400',
      textSelected: 'text-rose-700',
      bgHover: 'hover:bg-rose-50'
    },
    {
      value: 'info',
      label: 'Informação',
      emoji: 'ℹ️',
      description: 'Aviso informativo',
      bgSelected: 'bg-blue-100',
      borderSelected: 'border-blue-400',
      textSelected: 'text-blue-700',
      bgHover: 'hover:bg-blue-50'
    },
    {
      value: 'success',
      label: 'Sucesso',
      emoji: '✅',
      description: 'Notícia positiva',
      bgSelected: 'bg-emerald-100',
      borderSelected: 'border-emerald-400',
      textSelected: 'text-emerald-700',
      bgHover: 'hover:bg-emerald-50'
    },
  ];

  const tipoSelecionado = tiposAlerta.find(t => t.value === tipo);

  const handleSave = async () => {
    if (!mensagem.trim()) {
      toast.error('Digite uma mensagem para o alerta');
      return;
    }

    setSaving(true);
    try {
      await onSave({ tipo, mensagem, detalhes, obra_id: obraId });
      toast.success('Alerta criado com sucesso');
      setMensagem('');
      setDetalhes('');
      setTipo('warning');
      onClose();
    } catch (error) {
      toast.error('Erro ao criar alerta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden">
        {/* Header com cor do tipo selecionado */}
        <div className={`px-6 py-5 ${tipoSelecionado?.bgSelected || 'bg-amber-100'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{tipoSelecionado?.emoji}</span>
            <div>
              <h2 className={`text-xl font-bold ${tipoSelecionado?.textSelected || 'text-amber-700'}`}>
                Criar Novo Alerta
              </h2>
              <p className={`text-sm ${tipoSelecionado?.textSelected || 'text-amber-700'} opacity-80`}>
                Notifique a equipe sobre algo importante
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Tipo do Alerta */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">
              Escolha o tipo do alerta
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {tiposAlerta.map((t) => (
                <div
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    tipo === t.value
                      ? `${t.bgSelected} ${t.borderSelected}`
                      : `bg-white border-gray-200 ${t.bgHover}`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <p className={`font-semibold ${tipo === t.value ? t.textSelected : 'text-gray-700'}`}>
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-500">{t.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mensagem */}
          <div>
            <Label htmlFor="mensagem" className="text-sm font-semibold text-gray-700 mb-2 block">
              Mensagem do alerta *
            </Label>
            <Input
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex: Material com atraso de entrega"
              className="h-12 text-base border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Detalhes */}
          <div>
            <Label htmlFor="detalhes" className="text-sm font-semibold text-gray-700 mb-2 block">
              Detalhes adicionais <span className="font-normal text-gray-400">(opcional)</span>
            </Label>
            <textarea
              id="detalhes"
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="Informações adicionais sobre o alerta..."
              className="w-full h-24 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Preview */}
          {mensagem && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                Pré-visualização
              </p>
              <AlertCard
                type={tipo}
                message={mensagem}
                count={detalhes || undefined}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-5">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !mensagem.trim()}
            className={`px-5 ${
              tipo === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
              tipo === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
              tipo === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? 'Criando...' : 'Criar Alerta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MODAL: NOVA ETAPA
// ============================================================================

function NovaEtapaModal({ open, onClose, obraId, onSave, etapaEdit = null }) {
  const [nome, setNome] = useState(etapaEdit?.nome || '');
  const [peso, setPeso] = useState(etapaEdit?.peso_percentual || 10);
  const [descricao, setDescricao] = useState(etapaEdit?.descricao || '');
  const [saving, setSaving] = useState(false);

  // Reset form quando abre/fecha
  useEffect(() => {
    if (open) {
      setNome(etapaEdit?.nome || '');
      setPeso(etapaEdit?.peso_percentual || 10);
      setDescricao(etapaEdit?.descricao || '');
    }
  }, [open, etapaEdit]);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('Digite o nome da etapa');
      return;
    }
    if (peso <= 0 || peso > 100) {
      toast.error('Peso deve ser entre 1 e 100%');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        obra_id: obraId,
        nome: nome.trim(),
        peso_percentual: parseFloat(peso),
        descricao: descricao.trim() || null,
        id: etapaEdit?.id
      });
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar etapa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-500">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-xl font-bold text-white">
                {etapaEdit ? 'Editar Etapa' : 'Nova Etapa'}
              </h2>
              <p className="text-sm text-indigo-100">
                Defina uma etapa da obra com seu peso percentual
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Nome da etapa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome da Etapa *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Fundação, Estrutura, Acabamento..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Peso percentual */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Peso Percentual (%) *
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="50"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg min-w-[80px] justify-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="w-12 text-center font-bold text-indigo-600 bg-transparent border-none focus:outline-none"
                />
                <Percent className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Define quanto essa etapa representa no progresso total da obra
            </p>
          </div>

          {/* Descrição opcional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes sobre esta etapa..."
              className="w-full h-20 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Pré-visualização
            </p>
            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              <div className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center">
                <Square className="w-3 h-3 text-gray-300" />
              </div>
              <span className="flex-1 font-medium text-gray-800">{nome || 'Nome da etapa'}</span>
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {peso}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !nome.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? 'Salvando...' : etapaEdit ? 'Salvar Alterações' : 'Criar Etapa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COMPONENTE: SEÇÃO DE ETAPAS
// ============================================================================

function EtapasSection({ obraId, onProgressChange }) {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressoCalculado, setProgressoCalculado] = useState(0);
  const [pesoTotal, setPesoTotal] = useState(0);
  const [novaEtapaModal, setNovaEtapaModal] = useState(false);
  const [etapaEdit, setEtapaEdit] = useState(null);
  const [aplicandoTemplate, setAplicandoTemplate] = useState(false);

  // Carregar etapas
  useEffect(() => {
    if (obraId) {
      loadEtapas();
    }
  }, [obraId]);

  async function loadEtapas() {
    setLoading(true);
    try {
      const res = await relatoriosService.getEtapas(obraId);
      if (res?.sucesso !== false && res?.dados) {
        setEtapas(res.dados.etapas || []);
        setProgressoCalculado(res.dados.progresso_calculado || 0);
        setPesoTotal(res.dados.peso_total || 0);
        // Notificar mudança de progresso
        if (onProgressChange) {
          onProgressChange(res.dados.progresso_calculado || 0);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleEtapa(etapaId) {
    try {
      const res = await relatoriosService.toggleEtapa(etapaId);
      if (res?.sucesso !== false) {
        // Recarregar para pegar progresso atualizado
        await loadEtapas();
        toast.success('Etapa atualizada');
      }
    } catch (error) {
      toast.error('Erro ao atualizar etapa');
    }
  }

  async function handleSaveEtapa(data) {
    try {
      if (data.id) {
        // Editar
        await relatoriosService.atualizarEtapa(data.id, data);
        toast.success('Etapa atualizada');
      } else {
        // Criar
        await relatoriosService.criarEtapa(data);
        toast.success('Etapa criada');
      }
      await loadEtapas();
      setNovaEtapaModal(false);
      setEtapaEdit(null);
    } catch (error) {
      throw error;
    }
  }

  async function handleDeleteEtapa(etapaId) {
    if (!confirm('Excluir esta etapa?')) return;
    try {
      await relatoriosService.excluirEtapa(etapaId);
      toast.success('Etapa excluída');
      await loadEtapas();
    } catch (error) {
      toast.error('Erro ao excluir etapa');
    }
  }

  async function handleAplicarTemplate() {
    if (etapas.length > 0) {
      if (!confirm('Já existem etapas cadastradas. O template será adicionado às etapas existentes. Continuar?')) {
        return;
      }
    }
    setAplicandoTemplate(true);
    try {
      await relatoriosService.aplicarTemplateEtapas(obraId);
      toast.success('Template aplicado com sucesso');
      await loadEtapas();
    } catch (error) {
      toast.error('Erro ao aplicar template');
    } finally {
      setAplicandoTemplate(false);
    }
  }

  function handleEditEtapa(etapa) {
    setEtapaEdit(etapa);
    setNovaEtapaModal(true);
  }

  if (loading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <CardContent className="p-6">
          <div className="skeleton h-48 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-indigo-500" />
            <CardTitle className="text-lg font-semibold">Etapas da Obra</CardTitle>
            {pesoTotal > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                {pesoTotal}% total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {etapas.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAplicarTemplate}
                disabled={aplicandoTemplate}
                className="text-xs"
              >
                {aplicandoTemplate ? 'Aplicando...' : 'Usar Template'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEtapaEdit(null);
                setNovaEtapaModal(true);
              }}
              className="text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {etapas.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">Nenhuma etapa cadastrada</p>
              <p className="text-sm text-gray-400 mb-4">
                Adicione etapas para calcular o progresso automaticamente
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAplicarTemplate}
                  disabled={aplicandoTemplate}
                >
                  📋 Usar Template Padrão
                </Button>
                <Button
                  size="sm"
                  onClick={() => setNovaEtapaModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Criar Etapa
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {etapas.map((etapa) => (
                <div
                  key={etapa.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    etapa.concluido
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleEtapa(etapa.id)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      etapa.concluido
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {etapa.concluido && <Check className="w-4 h-4" />}
                  </button>

                  {/* Nome */}
                  <span className={`flex-1 font-medium ${
                    etapa.concluido ? 'text-emerald-700 line-through' : 'text-gray-800'
                  }`}>
                    {etapa.nome}
                  </span>

                  {/* Peso */}
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                    etapa.concluido
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {etapa.peso_percentual}%
                  </span>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditEtapa(etapa)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEtapa(etapa.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Resumo */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Progresso baseado nas etapas:</span>
                  <span className="text-lg font-bold text-indigo-600">{progressoCalculado}%</span>
                </div>
                <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressoCalculado}%` }}
                  />
                </div>
                {pesoTotal !== 100 && pesoTotal > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Os pesos somam {pesoTotal}% (recomendado: 100%)
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Etapa */}
      <NovaEtapaModal
        open={novaEtapaModal}
        onClose={() => {
          setNovaEtapaModal(false);
          setEtapaEdit(null);
        }}
        obraId={obraId}
        onSave={handleSaveEtapa}
        etapaEdit={etapaEdit}
      />
    </>
  );
}

function ReportDetailModal({ open, onClose, report, obra, onSave }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    resumo_executivo: report?.resumo_executivo || '',
    conclusoes: report?.conclusoes || '',
    proximos_passos: report?.proximos_passos || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Relatório atualizado');
      setEditMode(false);
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-modal-in">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Relatório {report.tipo === 'mensal' ? 'Mensal' : report.tipo === 'semanal' ? 'Semanal' : 'Diário'}
              </DialogTitle>
              <DialogDescription>
                {obra?.nome} - {report.titulo || relatoriosService.formatarDataBR(report.periodo_inicio)}
              </DialogDescription>
            </div>
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
              {editMode ? 'Salvar' : 'Editar'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Indicadores */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.progresso || 0}%</p>
              <p className="text-xs text-gray-500">Progresso</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">R$ {((report.custo || 0) / 1000).toFixed(0)}k</p>
              <p className="text-xs text-gray-500">Custo</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.equipe_count || 0}</p>
              <p className="text-xs text-gray-500">Equipe</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.horas_totais || 0}h</p>
              <p className="text-xs text-gray-500">Horas</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.atividades?.length || 0}</p>
              <p className="text-xs text-gray-500">Atividades</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.ocorrencias?.length || 0}</p>
              <p className="text-xs text-gray-500">Ocorrências</p>
            </div>
          </div>

          {/* Resumo Executivo */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Resumo Executivo</h4>
            {editMode ? (
              <textarea
                value={formData.resumo_executivo}
                onChange={(e) => setFormData({ ...formData, resumo_executivo: e.target.value })}
                className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Descreva o resumo executivo do período..."
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {report.resumo_executivo || 'Nenhum resumo cadastrado.'}
                </p>
              </div>
            )}
          </div>

          {/* Atividades */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Atividades Concluídas</h4>
              {editMode && (
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {report.atividades?.length > 0 ? (
                report.atividades.map((ativ, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700">{ativ.descricao}</span>
                    </div>
                    {editMode && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm"><Edit3 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">Nenhuma atividade registrada.</p>
              )}
            </div>
          </div>

          {/* Ocorrências */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Ocorrências</h4>
              {editMode && (
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {report.ocorrencias?.length > 0 ? (
                report.ocorrencias.map((oc, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-gray-700">{oc.descricao}</p>
                        {oc.data && <p className="text-xs text-gray-500 mt-1">{relatoriosService.formatarDataBR(oc.data)}</p>}
                      </div>
                    </div>
                    {editMode && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm"><Edit3 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">Nenhuma ocorrência registrada.</p>
              )}
            </div>
          </div>

          {/* Conclusões */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Conclusões e Próximos Passos</h4>
            {editMode ? (
              <textarea
                value={formData.conclusoes}
                onChange={(e) => setFormData({ ...formData, conclusoes: e.target.value })}
                className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Conclusões e próximos passos..."
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {report.conclusoes || 'Nenhuma conclusão cadastrada.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          {editMode && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function Relatorios() {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = useAuthStore();

  // View state
  const [view, setView] = useState('list');
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('visao-geral');

  // Data state
  const [loading, setLoading] = useState(false);
  const [obras, setObras] = useState([]);
  const [obraData, setObraData] = useState(null);
  const [globalKpis, setGlobalKpis] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('recentes');
  const [periodoGlobal, setPeriodoGlobal] = useState('12meses');
  const [periodoCustomInicio, setPeriodoCustomInicio] = useState('');
  const [periodoCustomFim, setPeriodoCustomFim] = useState('');

  // Modal states
  const [editMetaModal, setEditMetaModal] = useState(false);
  const [editStatusModal, setEditStatusModal] = useState(false);
  const [reportDetailModal, setReportDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [criarAlertaModal, setCriarAlertaModal] = useState(false);
  const [cronogramaModalOpen, setCronogramaModalOpen] = useState(false);

  const canView = isAdmin() || hasPermission('relatorios', 'visualizar');

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (canView) {
      loadObras();
      loadGlobalKpis();
    }
  }, [canView]);

  async function loadObras() {
    setLoading(true);
    try {
      // Tentar primeiro a API de relatórios com métricas
      const res = await relatoriosService.getObrasComMetricas();
      // A resposta pode ser {sucesso, dados} ou diretamente um array
      const list = Array.isArray(res) ? res : (Array.isArray(res?.dados) ? res.dados : []);
      if (list.length > 0) {
        setObras(list);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Erro ao carregar obras com métricas:', error);
    }

    // Fallback para obrasService simples
    try {
      const res = await obrasService.list();
      // A resposta pode ser {sucesso, dados} ou diretamente um array
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.dados)) {
        list = res.dados;
      }

      // Adicionar dados mock se necessário
      const obrasComDados = list.map(obra => ({
        ...obra,
        progresso: obra.progresso ?? Math.floor(Math.random() * 80) + 10,
        status: obra.status || 'ativa',
      }));
      setObras(obrasComDados);
    } catch (e) {
      console.error('Erro ao carregar obras fallback:', e);
      toast.error('Erro ao carregar obras');
    } finally {
      setLoading(false);
    }
  }

  async function loadGlobalKpis() {
    try {
      const res = await relatoriosService.getKpisGlobais();
      if (res?.sucesso !== false) {
        setGlobalKpis(res?.dados || res);
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs globais:', error);
    }
  }

  async function loadObraData(obra) {
    setLoading(true);
    try {
      const res = await relatoriosService.getDashboardObra(obra.id);
      // Usar dados reais da API, não dados mockados
      const dadosApi = res?.sucesso !== false ? (res?.dados || res) : null;

      // Estrutura base com valores vazios (não mockados)
      let dadosBase = {
        obra: obra,
        kpis: dadosApi?.kpis || {},
        cronograma: [],
        alertas: [],
        relatorios: dadosApi?.relatorios || { mensais: [], semanais: [], diarios: [] },
        graficos: dadosApi?.graficos || { funcionarios_por_mes: [], horas_por_mes: [] },
        estatisticas: dadosApi?.estatisticas || {},
        metas: dadosApi?.metas || [],
        historico: dadosApi?.historico || []
      };

      // Se tiver dados da API, usar eles
      if (dadosApi?.obra) {
        dadosBase.obra = dadosApi.obra;
      }

      let alertasList = [];

      // Sempre buscar alertas reais da obra
      try {
        const alertasRes = await relatoriosService.getAlertas(obra.id, false);
        alertasList = Array.isArray(alertasRes) ? alertasRes : (Array.isArray(alertasRes?.dados) ? alertasRes.dados : []);
      } catch (e) {
        console.warn('Falha ao carregar alertas da obra:', e);
        // Usar alertas da API se disponíveis
        alertasList = Array.isArray(dadosApi?.alertas) ? dadosApi.alertas : [];
      }

      // Sempre buscar cronograma real da obra (retorna array vazio se não houver)
      let cronogramaList = [];
      try {
        const cronogramaRes = await relatoriosService.getCronograma(obra.id);
        const cronogramaData = cronogramaRes?.dados || cronogramaRes?.data?.dados || cronogramaRes;
        if (Array.isArray(cronogramaData)) {
          cronogramaList = cronogramaData;
        }
      } catch (e) {
        console.warn('Falha ao carregar cronograma da obra:', e);
        // Usar cronograma da API se disponível
        cronogramaList = Array.isArray(dadosApi?.cronograma) ? dadosApi.cronograma : [];
      }

      // Calcular atraso acumulado real baseado no cronograma
      let atrasoAcumulado = 0;
      const hoje = new Date();
      cronogramaList.forEach(fase => {
        if (fase.data_fim_planejada && fase.status !== 'concluida') {
          try {
            const fimPlanejado = parseISO(fase.data_fim_planejada);
            if (hoje > fimPlanejado) {
              atrasoAcumulado += differenceInDays(hoje, fimPlanejado);
            }
          } catch {}
        }
        if (fase.data_fim_real && fase.data_fim_planejada) {
          try {
            const fimReal = parseISO(fase.data_fim_real);
            const fimPlanejado = parseISO(fase.data_fim_planejada);
            if (fimReal > fimPlanejado) {
              atrasoAcumulado += differenceInDays(fimReal, fimPlanejado);
            }
          } catch {}
        }
      });

      // Atualizar KPIs com atraso real
      const kpis = { ...dadosBase.kpis };
      kpis.atraso_acumulado = atrasoAcumulado;
      kpis.progresso = obra.progresso ?? kpis.progresso ?? 0;
      kpis.meta_mensal = obra.meta_mensal ?? kpis.meta_mensal ?? 0;

      // Buscar relatórios mensais reais (nova tabela separada)
      let relatoriosMensaisReais = [];
      try {
        const anoAtual = new Date().getFullYear();
        const [resAnoAtual, resAnoAnterior] = await Promise.allSettled([
          relatoriosService.getMesesComRelatorio(obra.id, anoAtual),
          relatoriosService.getMesesComRelatorio(obra.id, anoAtual - 1),
        ]);
        const mesesAtual = resAnoAtual.status === 'fulfilled' ? (resAnoAtual.value?.dados?.meses || {}) : {};
        const mesesAnterior = resAnoAnterior.status === 'fulfilled' ? (resAnoAnterior.value?.dados?.meses || {}) : {};
        const todosMeses = { ...mesesAnterior, ...mesesAtual };
        relatoriosMensaisReais = Object.entries(todosMeses)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 6)
          .map(([mes, rel]) => ({ mes, ...rel }));
      } catch (e) {
        console.warn('Falha ao carregar relatórios mensais:', e);
      }

      setObraData({
        ...dadosBase,
        alertas: alertasList,
        cronograma: cronogramaList,
        kpis,
        relatorios: {
          ...dadosBase.relatorios,
          mensais: relatoriosMensaisReais,
        },
      });
    } catch (error) {
      console.error('Erro ao carregar dados da obra:', error);
      // Em caso de erro total, criar estrutura vazia (não mockada)
      const dadosVazios = {
        obra: obra,
        kpis: { progresso: obra.progresso || 0, meta_mensal: obra.meta_mensal || 0, atraso_acumulado: 0 },
        cronograma: [],
        alertas: [],
        relatorios: { mensais: [], semanais: [], diarios: [] },
        graficos: { funcionarios_por_mes: [], horas_por_mes: [] }
      };
      try {
        const alertasRes = await relatoriosService.getAlertas(obra.id, false);
        const list = Array.isArray(alertasRes) ? alertasRes : (Array.isArray(alertasRes?.dados) ? alertasRes.dados : []);
        setObraData({ ...dadosVazios, alertas: list });
      } catch (e) {
        console.warn('Falha ao carregar alertas da obra no fallback:', e);
        setObraData(dadosVazios);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === 'dashboard' && obraSelecionada) {
      const obraAtualId = obraData?.obra?.id || obraData?.obra_id || obraData?.id;
      if (obraAtualId !== obraSelecionada.id) {
        loadObraData(obraSelecionada);
      }
    }
  }, [view, obraSelecionada?.id]);

  function generateMockObraData(obra) {
    return {
      obra: obra,
      kpis: {
        dias_para_entrega: Math.floor(Math.random() * 180) + 30,
        custo_vs_orcado: Math.floor(Math.random() * 40) + 60,
        custo_atual: Math.floor(Math.random() * 300000) + 100000,
        custo_orcado: Math.floor(Math.random() * 200000) + 300000,
        produtividade: (Math.random() * 5 + 5).toFixed(1),
        risco_atraso: ['baixo', 'medio', 'alto'][Math.floor(Math.random() * 3)],
        atraso_acumulado: Math.floor(Math.random() * 20),
        progresso: obra.progresso || 50,
        meta_mensal: obra.meta_mensal || 60,
      },
      cronograma: [
        { id: 1, fase: 'Fundação', progresso: 100, status: 'concluida', data_inicio_planejada: '2025-06-01', data_fim_planejada: '2025-07-15' },
        { id: 2, fase: 'Estrutura', progresso: 100, status: 'concluida', data_inicio_planejada: '2025-07-15', data_fim_planejada: '2025-09-30' },
        { id: 3, fase: 'Alvenaria', progresso: 75, status: 'em_andamento', data_inicio_planejada: '2025-10-01', data_fim_planejada: '2025-12-15' },
        { id: 4, fase: 'Instalações Elétricas', progresso: 30, status: 'em_andamento', data_inicio_planejada: '2025-11-01', data_fim_planejada: '2026-01-30' },
        { id: 5, fase: 'Instalações Hidráulicas', progresso: 20, status: 'em_andamento', data_inicio_planejada: '2025-11-15', data_fim_planejada: '2026-02-15' },
        { id: 6, fase: 'Acabamento', progresso: 0, status: 'pendente', data_inicio_planejada: '2026-02-01', data_fim_planejada: '2026-05-30' },
      ],
      alertas: [],
      relatorios: {
        mensais: [
          { id: 1, titulo: 'Janeiro 2026', periodo_inicio: '2026-01-01', periodo_fim: '2026-01-31', status: 'aberto', progresso: 68, custo: 45000, equipe_count: 28 },
          { id: 2, titulo: 'Dezembro 2025', periodo_inicio: '2025-12-01', periodo_fim: '2025-12-31', status: 'fechado', progresso: 62, custo: 42000, equipe_count: 25 },
          { id: 3, titulo: 'Novembro 2025', periodo_inicio: '2025-11-01', periodo_fim: '2025-11-30', status: 'fechado', progresso: 55, custo: 38000, equipe_count: 22 },
        ],
        semanais: [
          { id: 1, titulo: 'Semana 2', periodo_inicio: '2026-01-06', periodo_fim: '2026-01-12', status: 'aberto', highlights: ['+12% equipe', '-5% custo', '1 marco em risco'] },
          { id: 2, titulo: 'Semana 1', periodo_inicio: '2025-12-30', periodo_fim: '2026-01-05', status: 'fechado', highlights: ['Meta atingida', 'Sem atrasos', 'Equipe completa'] },
        ],
        diarios: generateMockDailyReports(),
      },
      graficos: {
        funcionarios_por_mes: [
          { mes: '2025-02', funcionarios: 12 },
          { mes: '2025-03', funcionarios: 15 },
          { mes: '2025-04', funcionarios: 18 },
          { mes: '2025-05', funcionarios: 22 },
          { mes: '2025-06', funcionarios: 20 },
          { mes: '2025-07', funcionarios: 25 },
          { mes: '2025-08', funcionarios: 28 },
          { mes: '2025-09', funcionarios: 30 },
          { mes: '2025-10', funcionarios: 32 },
          { mes: '2025-11', funcionarios: 28 },
          { mes: '2025-12', funcionarios: 25 },
          { mes: '2026-01', funcionarios: 30 },
        ],
        horas_por_mes: [
          { mes: '2025-02', horas: 1200 },
          { mes: '2025-03', horas: 1350 },
          { mes: '2025-04', horas: 1500 },
          { mes: '2025-05', horas: 1680 },
          { mes: '2025-06', horas: 1520 },
          { mes: '2025-07', horas: 1800 },
          { mes: '2025-08', horas: 1920 },
          { mes: '2025-09', horas: 2100 },
          { mes: '2025-10', horas: 2200 },
          { mes: '2025-11', horas: 1950 },
          { mes: '2025-12', horas: 1750 },
          { mes: '2026-01', horas: 2100 },
        ],
      },
    };
  }

  function generateMockDailyReports() {
    const reports = [];
    const hoje = new Date();

    for (let i = 0; i < 7; i++) {
      const data = subDays(hoje, i);
      reports.push({
        id: i + 1,
        data: format(data, 'yyyy-MM-dd'),
        dia_semana: format(data, 'EEEE', { locale: ptBR }),
        funcionarios: Math.floor(Math.random() * 10) + 20,
        horas: Math.floor(Math.random() * 50) + 150,
        tarefas: Math.floor(Math.random() * 8) + 5,
        atividades: [
          'Concretagem do 3º pavimento',
          'Instalação elétrica',
          'Alvenaria área comum',
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        ocorrencias: i === 0 ? ['2 funcionários ausentes', 'Material com atraso'] : [],
      });
    }

    return reports;
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  function handleObraClick(obra) {
    setObraSelecionada(obra);
    loadObraData(obra);
    setView('dashboard');
    setDashboardTab('visao-geral');
  }

  function handleVoltar() {
    setView('list');
    setObraSelecionada(null);
    setObraData(null);
  }

  function handleRefresh() {
    setLastUpdate(new Date());
    if (view === 'list') {
      loadObras();
      loadGlobalKpis();
    } else if (obraSelecionada) {
      loadObraData(obraSelecionada);
    }
    toast.success('Dados atualizados');
  }

  function handleExport(formato) {
    toast.success(`Exportando em ${formato.toUpperCase()}...`);
    if (obraSelecionada && obraData) {
      relatoriosService.exportarRelatorioObra(obraSelecionada, obraData);
    }
  }

  async function handleSaveMeta(dados) {
    if (!obraSelecionada) return;

    // dados pode ser { meta_mensal, progresso, em_andamento }
    const metaMensal = typeof dados === 'object' ? dados.meta_mensal : dados;
    const progresso = typeof dados === 'object' ? dados.progresso : null;

    try {
      // Salvar meta
      const metaRes = await relatoriosService.salvarMeta({
        obra_id: obraSelecionada.id,
        mes: format(new Date(), 'yyyy-MM-01'),
        meta_progresso: metaMensal,
      });

      if (metaRes?.sucesso === false) {
        throw new Error(metaRes?.mensagem || 'Erro ao salvar meta');
      }

      // Salvar progresso se foi alterado
      if (progresso !== null) {
        const progressoRes = await relatoriosService.atualizarProgresso(obraSelecionada.id, progresso);
        if (progressoRes?.sucesso === false) {
          throw new Error(progressoRes?.mensagem || 'Erro ao atualizar progresso');
        }
      }

      // Atualizar dados locais
      setObraData(prev => ({
        ...prev,
        kpis: {
          ...prev?.kpis,
          meta_mensal: metaMensal,
          progresso: progresso ?? prev?.kpis?.progresso
        }
      }));

      // Atualizar obra selecionada
      if (progresso !== null) {
        setObraSelecionada(prev => ({ ...prev, progresso }));
        setObras(prev => prev.map(o =>
          o.id === obraSelecionada.id ? { ...o, progresso } : o
        ));
      }

    } catch (error) {
      console.error('Erro ao salvar meta/progresso:', error);
      throw error; // Propagar para o modal mostrar o erro
    }
  }

  async function handleSaveStatus(novoStatus) {
    if (!obraSelecionada) return;

    await relatoriosService.atualizarStatusObra(obraSelecionada.id, novoStatus);

    // Atualizar dados locais
    setObraSelecionada(prev => ({ ...prev, status: novoStatus }));
    setObras(prev => prev.map(o => o.id === obraSelecionada.id ? { ...o, status: novoStatus } : o));
  }

  async function handleResolverAlerta(alertaId) {
    try {
      await relatoriosService.resolverAlerta(alertaId, 'Resolvido pelo usuário');
      toast.success('Alerta resolvido');

      // Atualizar dados locais
      setObraData(prev => ({
        ...prev,
        alertas: prev?.alertas?.filter(a => a.id !== alertaId)
      }));
    } catch (error) {
      toast.error('Erro ao resolver alerta');
    }
  }

  function handleOpenReport(report) {
    setSelectedReport(report);
    setReportDetailModal(true);
  }

  async function handleSaveReport(formData) {
    if (!selectedReport) return;

    await relatoriosService.atualizarRelatorio(selectedReport.id, formData);

    // Atualizar dados locais
    setObraData(prev => ({
      ...prev,
      relatorios: {
        ...prev?.relatorios,
        mensais: prev?.relatorios?.mensais?.map(r =>
          r.id === selectedReport.id ? { ...r, ...formData } : r
        ),
      }
    }));
  }

  async function handleCriarAlerta(alertaData) {
    if (!obraSelecionada) {
      toast.error('Selecione uma obra antes de criar um alerta');
      return;
    }

    try {
      // Tentar salvar no backend e usar o retorno para atualizar localmente
      const res = await relatoriosService.criarAlerta(alertaData);

      // Caso a API retorne o novo ID, buscar os alertas novamente para garantir consistência
      if (res?.sucesso !== false) {
        // Recarregar alertas da obra para garantir que vemos o registro persistido
        try {
          const alertasRes = await relatoriosService.getAlertas(obraSelecionada.id, false);
          const list = Array.isArray(alertasRes) ? alertasRes : (Array.isArray(alertasRes?.dados) ? alertasRes.dados : []);
          setObraData(prev => ({ ...prev, alertas: list }));
          return;
        } catch (e) {
          console.warn('Alerta criado, mas falha ao recarregar alertas:', e);
        }
      }

      // Fallback: adicionar localmente se não foi possível recarregar
      const novoAlerta = {
        id: res?.dados?.id || Date.now(),
        obra_id: obraSelecionada?.id,
        tipo: alertaData.tipo,
        mensagem: alertaData.mensagem,
        detalhes: alertaData.detalhes,
        criado_em: new Date().toISOString(),
      };

      setObraData(prev => ({
        ...prev,
        alertas: [novoAlerta, ...(prev?.alertas || [])]
      }));

    } catch (error) {
      console.error('Erro ao salvar alerta no backend:', error);
      toast.error('Erro ao criar alerta');
    }
  }

  async function handleExcluirAlerta(alertaId) {
    try {
      const response = await relatoriosService.excluirAlerta(alertaId);

      // Verificar se a API retornou sucesso
      if (response?.sucesso === false) {
        throw new Error(response?.mensagem || 'Erro ao excluir alerta');
      }

      // Remover localmente apenas se a API teve sucesso
      setObraData(prev => ({
        ...prev,
        alertas: prev?.alertas?.filter(a => a.id !== alertaId)
      }));
      toast.success('Alerta excluído');
    } catch (error) {
      console.error('Erro ao excluir alerta:', error);
      toast.error('Erro ao excluir alerta');
    }
  }

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const obrasFiltradas = useMemo(() => {
    let filtered = [...obras];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(obra =>
        obra.nome?.toLowerCase().includes(term) ||
        obra.responsavel?.toLowerCase().includes(term) ||
        obra.empresa?.toLowerCase().includes(term) ||
        obra.cidade?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(obra => obra.status === statusFilter);
    }

    switch (sortBy) {
      case 'recentes':
        filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
      case 'progresso':
        filtered.sort((a, b) => (b.progresso || 0) - (a.progresso || 0));
        break;
      case 'atrasadas':
        filtered.sort((a, b) => (a.progresso || 100) - (b.progresso || 100));
        break;
      case 'nome':
        filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        break;
    }

    return filtered;
  }, [obras, searchTerm, statusFilter, sortBy]);

  // ============================================================================
  // RENDER: PERMISSION CHECK
  // ============================================================================

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h3>
            <p className="text-gray-500">Você não tem permissão para acessar os relatórios.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: OBRA DASHBOARD
  // ============================================================================

  if (view === 'dashboard' && obraSelecionada) {
    const kpis = obraData?.kpis || {};
    const cronograma = obraData?.cronograma || [];
    const alertas = obraData?.alertas || [];
    const relatorios = obraData?.relatorios || {};
    const graficos = obraData?.graficos || {};

    return (
      <div className="space-y-6 animate-page-in">
        {/* HEADER FIXO */}
        <div className="bg-white -mx-6 -mt-6 px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleVoltar} className="text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Obras
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{obraSelecionada.nome}</h1>
                  <StatusBadge
                    status={obraSelecionada.status || 'ativa'}
                    editable
                    onClick={() => setEditStatusModal(true)}
                  />
                  {kpis.risco_atraso === 'alto' && (
                    <span className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 animate-alert-pulse">Alto Risco</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {obraSelecionada.empresa || 'Sem empresa'} • {obraSelecionada.responsavel || 'Sem responsável'} • {obraSelecionada.cidade || 'Local não definido'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={periodoGlobal}
                onChange={(e) => setPeriodoGlobal(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="12meses">Últimos 12 meses</option>
                <option value="este-ano">Este ano</option>
                <option value="6meses">Últimos 6 meses</option>
                <option value="3meses">Últimos 3 meses</option>
              </select>

              <div className="relative group">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-20">
                  <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <FileDown className="w-4 h-4" /> PDF
                  </button>
                  <button onClick={() => handleExport('excel')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </button>
                  <button onClick={() => window.print()} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                </div>
              </div>

              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>

              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="text-xs text-gray-500">há {Math.floor((new Date() - lastUpdate) / 60000) || '<1'} min</span>
              </Button>
            </div>
          </div>

        </div>

        {/* CONTEÚDO DO DASHBOARD COM TABS */}
        <Tabs value={dashboardTab} onValueChange={setDashboardTab}>
          {/* TABS HEADER */}
          <TabsList className="bg-gray-100 mb-6">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
          </TabsList>
          {/* TAB: VISÃO GERAL */}
          <TabsContent value="visao-geral" className="space-y-6 mt-0">
            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-7 skeleton h-64 rounded-xl" />
                  <div className="col-span-12 lg:col-span-5 skeleton h-64 rounded-xl" />
                </div>
              </div>
            ) : (
              <>
                {/* ROW 1: Progress + KPIs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* COLUNA ESQUERDA: Progresso + Etapas */}
                  <div className="col-span-12 lg:col-span-7 space-y-6">
                    <Card className="animate-slide-up">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-semibold">Progresso da Obra</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setEditMetaModal(true)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Editar Meta
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-8">
                          <div className="flex-shrink-0">
                            <DonutChart
                              percentage={obraSelecionada.progresso || kpis.progresso || 0}
                              emAndamento={Math.min(100 - (kpis.progresso || obraSelecionada.progresso || 0), 20)}
                              size={180}
                            />
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="space-y-3">
                              {[
                                { label: 'Concluído', value: kpis.progresso || obraSelecionada.progresso || 0, color: 'bg-emerald-500' },
                                { label: 'Em andamento', value: Math.min(100 - (kpis.progresso || obraSelecionada.progresso || 0), 20), color: 'bg-blue-500' },
                                { label: 'Pendente', value: Math.max(0, 100 - (kpis.progresso || obraSelecionada.progresso || 0) - 20), color: 'bg-gray-300' },
                              ].map(item => (
                                <div key={item.label} className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                  <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                                  <span className="text-sm font-semibold text-gray-900">{Math.round(item.value)}%</span>
                                </div>
                              ))}
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Meta do mês</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{kpis.meta_mensal || 0}%</span>
                                {(kpis.progresso || 0) < (kpis.meta_mensal || 0) ? (
                                  <span className="text-rose-600 text-xs flex items-center">
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                    {((kpis.progresso || 0) - (kpis.meta_mensal || 0)).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 text-xs flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    +{((kpis.progresso || 0) - (kpis.meta_mensal || 0)).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* COLUNA DIREITA: KPIs menores */}
                  <div className="col-span-12 lg:col-span-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3 stagger-animation">
                      <KpiCard
                        icon={CalendarDays}
                        label="Dias para Entrega"
                        value={kpis.dias_para_entrega || '—'}
                        color="blue"
                        clickable
                        onClick={() => toast.info('Detalhes de datas em breve')}
                      />
                      <KpiCard
                        icon={Target}
                        label="Custo vs Orçado"
                        value={`${kpis.custo_vs_orcado || 0}%`}
                        sublabel={`R$ ${relatoriosService.formatarNumeroAbreviado(kpis.custo_atual)} / ${relatoriosService.formatarNumeroAbreviado(kpis.custo_orcado)}`}
                        color="purple"
                        clickable
                        onClick={() => setDashboardTab('financeiro')}
                      />
                      <KpiCard
                        icon={Zap}
                        label="Produtividade"
                        value={`${kpis.produtividade || 0} m²/dia`}
                        color="amber"
                        trend={12}
                        clickable
                        onClick={() => toast.info('Detalhes de produtividade em breve')}
                      />
                      <KpiCard
                        icon={AlertTriangle}
                        label="Risco de Atraso"
                        value={kpis.risco_atraso === 'alto' ? 'Alto' : kpis.risco_atraso === 'medio' ? 'Médio' : 'Baixo'}
                        color={kpis.risco_atraso === 'alto' ? 'rose' : kpis.risco_atraso === 'medio' ? 'amber' : 'emerald'}
                        clickable
                        onClick={() => toast.info('Fatores de risco em breve')}
                      />
                    </div>
                  </div>
                </div>

                {/* ROW 2: CRONOGRAMA EM BANNER INTEIRO */}
                <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-indigo-500" />
                      <CardTitle className="text-lg font-semibold">Cronograma</CardTitle>
                      {cronograma.length > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                          {cronograma.filter(f => f.status === 'concluida').length}/{cronograma.filter(f => !f.parent_id).length} concluídas
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCronogramaModalOpen(true)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Abrir completo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {cronograma.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium mb-1">Nenhuma fase cadastrada</p>
                        <p className="text-sm text-gray-400 mb-4">
                          Adicione fases para acompanhar o cronograma
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setCronogramaModalOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Fases
                        </Button>
                      </div>
                    ) : (
                      <CronogramaGanttPreview
                        cronograma={cronograma}
                        onOpenModal={() => setCronogramaModalOpen(true)}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* ROW 3: ALERTAS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-7">
                    <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <CardTitle className="text-sm font-semibold text-gray-700">Alertas</CardTitle>
                          {alertas.length > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">
                              {alertas.length}
                            </span>
                          )}
                        </div>
                        {isAdmin() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-indigo-600 hover:text-indigo-700"
                            onClick={() => setCriarAlertaModal(true)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Novo
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {alertas.length > 0 ? (
                          alertas.slice(0, 4).map((alerta, idx) => (
                            <AlertCard
                              key={alerta.id || idx}
                              type={alerta.tipo}
                              message={alerta.mensagem}
                              count={alerta.detalhes}
                              onAction={() => toast.info('Detalhes do alerta')}
                              actionLabel="Ver"
                              onResolve={isAdmin() ? () => handleExcluirAlerta(alerta.id) : undefined}
                            />
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Nenhum alerta</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <div className="col-span-12 lg:col-span-5">
                    {/* Espaço reservado ou gráfico adicional */}
                  </div>
                </div>

                {/* ROW 4: Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Funcionários por Mês</CardTitle>
                        <p className="text-sm text-gray-500">Evolução da equipe ao longo do tempo</p>
                      </div>
                      <Users className="w-5 h-5 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {graficos.funcionarios_por_mes?.length > 0 ? (
                          <>
                            <div className="flex items-end gap-2 h-40">
                              {graficos.funcionarios_por_mes.map((item, idx) => {
                                const max = Math.max(...graficos.funcionarios_por_mes.map(i => i.funcionarios || 0), 1);
                                const height = max > 0 ? ((item.funcionarios || 0) / max) * 100 : 0;
                                const mesLabel = item.mes ? item.mes.split('-')[1] : '';
                                const mesesNomes = { '01': 'J', '02': 'F', '03': 'M', '04': 'A', '05': 'M', '06': 'J', '07': 'J', '08': 'A', '09': 'S', '10': 'O', '11': 'N', '12': 'D' };
                                return (
                                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                                    <div
                                      className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all hover:from-indigo-600 hover:to-indigo-500 animate-bar-grow"
                                      style={{ height: `${Math.max(height, 2)}%`, animationDelay: `${idx * 50}ms` }}
                                      title={`${item.mes}: ${item.funcionarios} funcionários`}
                                    />
                                    <span className="text-xs text-gray-500">{mesesNomes[mesLabel] || mesLabel}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Média: {Math.round(graficos.funcionarios_por_mes.reduce((s, i) => s + (i.funcionarios || 0), 0) / graficos.funcionarios_por_mes.length)} funcionários</span>
                              {graficos.funcionarios_por_mes.length >= 2 && (() => {
                                const atual = graficos.funcionarios_por_mes[graficos.funcionarios_por_mes.length - 1]?.funcionarios || 0;
                                const anterior = graficos.funcionarios_por_mes[graficos.funcionarios_por_mes.length - 2]?.funcionarios || 0;
                                const variacao = anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : 0;
                                return variacao !== 0 ? (
                                  <span className={`flex items-center ${variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {variacao >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                                    {variacao >= 0 ? '+' : ''}{variacao}% vs mês anterior
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Users className="w-12 h-12 mb-2 opacity-30" />
                            <p className="text-sm">Nenhum lançamento registrado</p>
                            <p className="text-xs">Os dados aparecerão conforme houver lançamentos</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Horas Trabalhadas</CardTitle>
                        <p className="text-sm text-gray-500">Comparativo mensal de horas</p>
                      </div>
                      <Clock className="w-5 h-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {graficos.horas_por_mes?.length > 0 ? (
                          <>
                            <div className="flex items-end gap-1 h-40">
                              {graficos.horas_por_mes.map((item, idx) => {
                                const max = Math.max(...graficos.horas_por_mes.map(i => i.horas || 0), 1);
                                const height = max > 0 ? ((item.horas || 0) / max) * 100 : 0;
                                return (
                                  <div key={idx} className="flex-1 flex items-end gap-0.5 group cursor-pointer">
                                    <div
                                      className="flex-1 bg-emerald-500 rounded-t animate-bar-grow"
                                      style={{ height: `${Math.max(height, 2)}%`, animationDelay: `${idx * 50}ms` }}
                                      title={`${item.mes}: ${Math.round(item.horas || 0)}h`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-center gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-emerald-500" />
                                <span className="text-gray-600">Horas trabalhadas</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Clock className="w-12 h-12 mb-2 opacity-30" />
                            <p className="text-sm">Nenhuma hora registrada</p>
                            <p className="text-xs">Os dados aparecerão conforme houver lançamentos</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ROW 3: Relatórios */}
                <div className="space-y-6">
                  {/* Relatórios Mensais */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Relatórios Mensais</h3>
                        <p className="text-sm text-gray-500">Resumo gerencial por mês com gráficos e conclusões</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-600"
                        onClick={() => navigate(`/relatorios/obra/${obraSelecionada?.id}/mensal`)}
                      >
                        Mostrar mais
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    {relatorios.mensais?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-animation">
                        {relatorios.mensais.map((rel, idx) => {
                          const [ano, mesNum] = rel.mes.split('-');
                          const nomeMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(mesNum,10)-1];
                          const statusConfig = {
                            fechado: { label: 'Fechado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
                            aberto: { label: 'Em aberto', bg: 'bg-amber-100', text: 'text-amber-700' },
                            revisao: { label: 'Em revisão', bg: 'bg-blue-100', text: 'text-blue-700' },
                            rascunho: { label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-600' },
                          };
                          const sc = statusConfig[rel.status] || statusConfig.rascunho;
                          return (
                            <button
                              key={rel.mes || idx}
                              onClick={() => navigate(`/relatorios/obra/${obraSelecionada?.id}/mensal?mes=${rel.mes}`)}
                              className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all animate-slide-up group"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{nomeMes}</p>
                                    <p className="text-xs text-gray-500">{ano}</p>
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                                  {sc.label}
                                </span>
                              </div>
                              <div className="mb-3 text-xs text-gray-400">
                                Atualizado em {rel.atualizado_em ? relatoriosService.formatarDataBR(rel.atualizado_em.split(' ')[0]) : rel.criado_em ? relatoriosService.formatarDataBR(rel.criado_em.split(' ')[0]) : '—'}
                              </div>
                              <div className="flex items-center justify-between text-xs text-indigo-600 font-medium group-hover:text-indigo-700">
                                <span>Ver relatório</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <FileText className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">Nenhum relatório mensal criado</p>
                        <p className="text-xs text-gray-500 mb-4">Crie o primeiro relatório para documentar o progresso da obra</p>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/relatorios/obra/${obraSelecionada?.id}/mensal`)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Criar primeiro relatório
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Relatórios Semanais */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Relatórios Semanais</h3>
                        <p className="text-sm text-gray-500">Acompanhamento semanal com destaques</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-indigo-600">
                        Mostrar mais
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-animation">
                      {relatorios.semanais?.map((rel, idx) => (
                        <div key={rel.id || idx} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all animate-slide-up">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <CalendarDays className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{rel.titulo}</p>
                                <p className="text-xs text-gray-500">{relatoriosService.formatarDataBR(rel.periodo_inicio)}</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              rel.status === 'fechado' ? 'bg-emerald-100 text-emerald-700' :
                                rel.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-700'
                            }`}>
                              {rel.status === 'fechado' ? 'Fechado' : rel.status === 'aberto' ? 'Em aberto' : 'Pendente'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {rel.highlights?.map((h, i) => (
                              <p key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                {h}
                              </p>
                            ))}
                          </div>
                          <Button variant="ghost" size="sm" className="w-full mt-3 text-indigo-600" onClick={() => handleOpenReport(rel)}>
                            Abrir relatório
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relatórios Diários */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Relatórios Diários</h3>
                        <p className="text-sm text-gray-500">Registro diário de atividades e ocorrências</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          Novo Registro
                        </Button>
                        <Button variant="ghost" size="sm" className="text-indigo-600">
                          Ver todos
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 stagger-animation">
                      {relatorios.diarios?.slice(0, 7).map((rel, idx) => (
                        <DailyReportCard
                          key={rel.id || idx}
                          date={relatoriosService.formatarDataBR(rel.data)}
                          dayOfWeek={rel.dia_semana?.charAt(0).toUpperCase() + rel.dia_semana?.slice(1)}
                          isToday={idx === 0}
                          funcionarios={rel.funcionarios}
                          horas={rel.horas}
                          tarefas={rel.tarefas}
                          atividades={rel.atividades}
                          ocorrencias={rel.ocorrencias}
                          onView={() => toast.info('Visualizar relatório diário')}
                          onEdit={() => toast.info('Editar relatório diário')}
                          onAddOcorrencia={() => toast.info('Adicionar ocorrência')}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB: CRONOGRAMA */}
          <TabsContent value="cronograma" className="space-y-6 mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cronograma Detalhado</CardTitle>
                  <p className="text-sm text-gray-500">Visão completa das fases do projeto</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCronogramaModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Fase
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cronograma.length > 0 ? (
                    cronograma.filter(f => f.parent_id === null || !f.parent_id).map((fase, idx) => (
                      <GanttBar
                        key={fase.id || idx}
                        fase={fase}
                        onClick={() => setCronogramaModalOpen(true)}
                      />
                    ))
                  ) : (
                    <div className="py-6 text-center text-gray-500">
                      <p className="text-sm">Nenhuma fase cadastrada.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setCronogramaModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Criar cronograma
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Visão Financeira</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-animation">
                  <KpiCard
                    icon={Target}
                    label="Orçamento Total"
                    value={relatoriosService.formatarMoeda(kpis.custo_orcado)}
                    color="blue"
                  />
                  <KpiCard
                    icon={Activity}
                    label="Custo Atual"
                    value={relatoriosService.formatarMoeda(kpis.custo_atual)}
                    color="purple"
                  />
                  <KpiCard
                    icon={TrendingUp}
                    label="Variação"
                    value={`${((kpis.custo_atual / kpis.custo_orcado - 1) * 100).toFixed(1)}%`}
                    color={(kpis.custo_atual || 0) <= (kpis.custo_orcado || 1) ? 'emerald' : 'rose'}
                  />
                  <KpiCard
                    icon={Calendar}
                    label="Saldo Disponível"
                    value={relatoriosService.formatarMoeda((kpis.custo_orcado || 0) - (kpis.custo_atual || 0))}
                    color="emerald"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: EQUIPE */}
          <TabsContent value="equipe" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-animation">
                  <KpiCard
                    icon={Users}
                    label="Total Funcionários"
                    value={kpis.funcionarios_ativos || obraSelecionada.funcionarios_count || 0}
                    color="blue"
                  />
                  <KpiCard
                    icon={Clock}
                    label="Horas Totais Mês"
                    value={`${kpis.horas_mes || 0}h`}
                    color="purple"
                  />
                  <KpiCard
                    icon={Activity}
                    label="Média Horas/Func"
                    value={`${Math.round((kpis.horas_mes || 0) / (kpis.funcionarios_ativos || 1))}h`}
                    color="amber"
                  />
                  <KpiCard
                    icon={Zap}
                    label="Produtividade"
                    value={`${kpis.produtividade || 0} m²/dia`}
                    color="emerald"
                    trend={12}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAIS */}
        <EditMetaModal
          open={editMetaModal}
          onClose={() => setEditMetaModal(false)}
          obra={obraSelecionada}
          currentMeta={kpis.meta_mensal}
          onSave={handleSaveMeta}
        />

        <EditStatusModal
          open={editStatusModal}
          onClose={() => setEditStatusModal(false)}
          currentStatus={obraSelecionada?.status}
          onSave={handleSaveStatus}
        />

        <ReportDetailModal
          open={reportDetailModal}
          onClose={() => {
            setReportDetailModal(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          obra={obraSelecionada}
          onSave={handleSaveReport}
        />

        <CriarAlertaModal
          open={criarAlertaModal}
          onClose={() => setCriarAlertaModal(false)}
          obraId={obraSelecionada?.id}
          onSave={handleCriarAlerta}
        />

        <CronogramaModal
          open={cronogramaModalOpen}
          onOpenChange={setCronogramaModalOpen}
          obraId={obraSelecionada?.id}
          obraNome={obraSelecionada?.nome}
        />
      </div>
    );
  }

  // ============================================================================
  // RENDER: LISTA DE OBRAS
  // ============================================================================

  return (
    <div className="space-y-6 animate-page-in">
      {/* HEADER FIXO */}
      <div className="bg-white -mx-6 -mt-6 px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>Dashboard</span>
              <ChevronRight className="w-4 h-4" />
              <span>Relatórios</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">Obras</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={periodoGlobal}
              onChange={(e) => setPeriodoGlobal(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="12meses">Últimos 12 meses</option>
              <option value="este-ano">Este ano</option>
              <option value="6meses">Últimos 6 meses</option>
              <option value="custom">Personalizado</option>
            </select>

            {periodoGlobal === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={periodoCustomInicio}
                  onChange={(e) => setPeriodoCustomInicio(e.target.value)}
                  className="h-9 w-36"
                  placeholder="Data início"
                />
                <span className="text-gray-400">até</span>
                <Input
                  type="date"
                  value={periodoCustomFim}
                  onChange={(e) => setPeriodoCustomFim(e.target.value)}
                  className="h-9 w-36"
                  placeholder="Data fim"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (periodoCustomInicio && periodoCustomFim) {
                      toast.success(`Filtrando de ${format(parseISO(periodoCustomInicio), 'dd/MM/yyyy')} até ${format(parseISO(periodoCustomFim), 'dd/MM/yyyy')}`);
                      loadObras();
                      loadGlobalKpis();
                    } else {
                      toast.error('Selecione as datas de início e fim');
                    }
                  }}
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="relative group">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-20">
                <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FileDown className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => handleExport('excel')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={() => window.print()} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>
            </div>

            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>

            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="text-xs text-gray-500">há {Math.floor((new Date() - lastUpdate) / 60000) || '<1'} min</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs GLOBAIS */}
      <GlobalKpisCard kpis={globalKpis} loading={loading && !globalKpis} />

      {/* SEÇÃO: LISTA DE OBRAS */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Obras</h2>
          <p className="text-gray-500">Selecione uma obra para visualizar indicadores, cronograma e relatórios.</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar obra (nome, cliente, responsável...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="todos">Todos os status</option>
            <option value="ativa">Ativas</option>
            <option value="pausada">Pausadas</option>
            <option value="concluida">Concluídas</option>
            <option value="atrasada">Atrasadas</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="recentes">Mais recentes</option>
            <option value="progresso">Maior progresso</option>
            <option value="atrasadas">Mais atrasadas</option>
            <option value="nome">Nome (A-Z)</option>
          </select>
        </div>

        {/* Grid de Obras */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="skeleton h-6 w-3/4 rounded mb-4" />
                <div className="skeleton h-4 w-1/2 rounded mb-4" />
                <div className="skeleton h-2 w-full rounded mb-4" />
                <div className="skeleton h-8 w-full rounded" />
              </div>
            ))}
          </div>
        ) : obrasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma obra encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou criar uma nova obra.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-animation">
            {obrasFiltradas.map(obra => (
              <ObraCard
                key={obra.id}
                obra={obra}
                onClick={() => handleObraClick(obra)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
