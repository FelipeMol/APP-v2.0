import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cloud,
  CloudRain,
  Sun,
  CloudDrizzle,
  Send,
  ArrowLeft,
  HardHat,
  Loader2,
  Minus,
  Plus,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import obrasService from '@/services/obrasService';
import relatoriosService from '@/services/relatoriosService';
import useAuthStore from '@/store/authStore';
import useTenantStore from '@/store/tenantStore';

// ============================================================================
// CLIMA OPTIONS
// ============================================================================
const CLIMAS = [
  {
    id: 'sol',
    label: 'Sol',
    emoji: '☀️',
    Icon: Sun,
    activeClass: 'bg-amber-400 border-amber-400 text-white shadow-amber-200',
    idleClass: 'bg-white border-slate-200 text-slate-500',
  },
  {
    id: 'nublado',
    label: 'Nublado',
    emoji: '☁️',
    Icon: Cloud,
    activeClass: 'bg-slate-500 border-slate-500 text-white shadow-slate-200',
    idleClass: 'bg-white border-slate-200 text-slate-500',
  },
  {
    id: 'chuva',
    label: 'Chuva',
    emoji: '🌦️',
    Icon: CloudDrizzle,
    activeClass: 'bg-sky-500 border-sky-500 text-white shadow-sky-200',
    idleClass: 'bg-white border-slate-200 text-slate-500',
  },
  {
    id: 'chuva_forte',
    label: 'Tempestade',
    emoji: '⛈️',
    Icon: CloudRain,
    activeClass: 'bg-indigo-700 border-indigo-700 text-white shadow-indigo-200',
    idleClass: 'bg-white border-slate-200 text-slate-500',
  },
];

// ============================================================================
// HELPERS
// ============================================================================
function getProgressStyle(progresso) {
  if (progresso >= 100) return { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 };
  if (progresso >= 50)  return { bar: 'bg-indigo-500',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700',  Icon: Clock };
  if (progresso > 0)    return { bar: 'bg-amber-500',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700',    Icon: Clock };
  return { bar: 'bg-slate-300', text: 'text-slate-400', badge: 'bg-slate-100 text-slate-500', Icon: AlertTriangle };
}

function buildTree(items) {
  const byId = {};
  items.forEach(i => { byId[i.id] = { ...i, children: [] }; });
  const roots = [];
  items.forEach(i => {
    if (i.parent_id && byId[i.parent_id]) byId[i.parent_id].children.push(byId[i.id]);
    else roots.push(byId[i.id]);
  });
  return roots;
}

// ============================================================================
// COMPONENTE: ITEM DO CRONOGRAMA
// ============================================================================
function CronogramaItem({ item, progressMap, onProgressChange, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const progresso = progressMap[item.id] ?? item.progresso ?? 0;
  const style = getProgressStyle(progresso);
  const { Icon: StatusIcon } = style;
  const hasChildren = item.children && item.children.length > 0;

  const decrement = (e) => {
    e.stopPropagation();
    onProgressChange(item.id, Math.max(0, progresso - 5));
  };
  const increment = (e) => {
    e.stopPropagation();
    onProgressChange(item.id, Math.min(100, progresso + 5));
  };

  return (
    <div>
      <div
        className={`${depth === 0 ? 'border-b border-slate-100' : 'border-b border-slate-50 bg-slate-50/60'}`}
        style={depth > 0 ? { paddingLeft: `${depth * 16}px` } : {}}
      >
        <div className="px-4 py-4">
          {/* Nome + status */}
          <div className="flex items-start gap-2 mb-3">
            {hasChildren ? (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 text-slate-500 active:bg-slate-200 touch-manipulation"
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="mt-0.5 w-6 h-6 flex-shrink-0 flex items-center justify-center">
                <StatusIcon size={14} className={style.text} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className={`leading-tight ${depth === 0 ? 'font-semibold text-slate-800 text-sm' : 'font-medium text-slate-600 text-sm'}`}>
                {item.fase}
              </p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
              style={{ width: `${progresso}%` }}
            />
          </div>

          {/* Controles +/- */}
          <div className="flex items-center gap-3">
            <button
              onPointerDown={decrement}
              disabled={progresso <= 0}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 disabled:opacity-30 touch-manipulation select-none"
            >
              <Minus size={18} />
            </button>

            <div className="flex-1 flex items-center justify-center gap-1.5">
              <span className={`text-2xl font-bold tabular-nums ${style.text}`}>{progresso}</span>
              <span className={`text-sm font-medium ${style.text}`}>%</span>
            </div>

            <button
              onPointerDown={increment}
              disabled={progresso >= 100}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 disabled:opacity-30 touch-manipulation select-none"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {item.children.map(child => (
            <CronogramaItem
              key={child.id}
              item={child}
              progressMap={progressMap}
              onProgressChange={onProgressChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================
export default function RelatorioDiario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const tenantId = useTenantStore(s => s.selectedTenantId);

  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState(searchParams.get('obra_id') || '');
  const [cronograma, setCronograma] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [clima, setClima] = useState('sol');
  const [observacoes, setObservacoes] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [loadingObras, setLoadingObras] = useState(true);
  const [loadingCronograma, setLoadingCronograma] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Carrega obras
  useEffect(() => {
    obrasService.list()
      .then(res => setObras((res.dados || []).filter(o => o.status !== 'concluida')))
      .catch(() => toast.error('Erro ao carregar obras'))
      .finally(() => setLoadingObras(false));
  }, []);

  // Carrega cronograma da obra selecionada
  useEffect(() => {
    if (!obraId) { setCronograma([]); setProgressMap({}); return; }
    setLoadingCronograma(true);
    relatoriosService.getCronograma(obraId)
      .then(items => {
        const arr = Array.isArray(items) ? items : (items?.dados || []);
        const sorted = [...arr].sort((a, b) => a.ordem - b.ordem);
        setCronograma(sorted);
        const map = {};
        sorted.forEach(i => { map[i.id] = Number(i.progresso ?? 0); });
        setProgressMap(map);
      })
      .catch(() => toast.error('Erro ao carregar cronograma'))
      .finally(() => setLoadingCronograma(false));
  }, [obraId]);

  const handleProgressChange = useCallback((id, valor) => {
    setProgressMap(prev => ({ ...prev, [id]: valor }));
  }, []);

  const handleSubmit = async () => {
    if (!obraId) { toast.error('Selecione uma obra'); return; }
    if (cronograma.length === 0) { toast.error('Nenhuma etapa no cronograma'); return; }

    setSubmitting(true);
    try {
      const itens = cronograma.map(item => ({
        id: item.id,
        fase: item.fase,
        progresso_anterior: Number(item.progresso ?? 0),
        progresso_novo: progressMap[item.id] ?? Number(item.progresso ?? 0),
      }));

      await relatoriosService.submeterRelatorioDiario({
        obra_id: Number(obraId),
        data,
        clima,
        observacoes: observacoes.trim() || null,
        itens,
        criado_por: user?.id || null,
        tenant_id: tenantId,
      });

      toast.success('Relatório diário enviado!');
      // Limpa observações mas mantém obra selecionada
      setObservacoes('');
      // Recarrega cronograma para mostrar progresso atualizado
      const updated = await relatoriosService.getCronograma(obraId);
      const arr = Array.isArray(updated) ? updated : (updated?.dados || []);
      const sorted = [...arr].sort((a, b) => a.ordem - b.ordem);
      setCronograma(sorted);
      const map = {};
      sorted.forEach(i => { map[i.id] = Number(i.progresso ?? 0); });
      setProgressMap(map);
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar relatório');
    } finally {
      setSubmitting(false);
    }
  };

  const tree = buildTree(cronograma);
  const obraSelecionada = obras.find(o => String(o.id) === String(obraId));

  const dataFormatada = (() => {
    try {
      const [y, m, d] = data.split('-').map(Number);
      return format(new Date(y, m - 1, d), "EEEE, dd 'de' MMMM", { locale: ptBR });
    } catch { return data; }
  })();

  const climaSelecionado = CLIMAS.find(c => c.id === clima);
  const totalFases = cronograma.length;
  const fasesAtualizadas = cronograma.filter(i => (progressMap[i.id] ?? i.progresso ?? 0) !== Number(i.progresso ?? 0)).length;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 pb-32">

      {/* ── HERO HEADER ── */}
      <div className="bg-slate-900 sticky top-0 z-20">
        {/* Barra de navegação */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white active:bg-white/20 touch-manipulation"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <HardHat size={18} className="text-amber-400" />
            <span className="text-white font-semibold text-sm tracking-wide">Relatório Diário</span>
          </div>
          {climaSelecionado && (
            <span className="text-xl" title={climaSelecionado.label}>{climaSelecionado.emoji}</span>
          )}
        </div>

        {/* Info da obra + data */}
        <div className="px-4 pb-4">
          {obraSelecionada ? (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-white font-bold text-lg leading-tight">{obraSelecionada.nome}</p>
            </div>
          ) : (
            <p className="text-slate-400 text-sm italic">Nenhuma obra selecionada</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <CalendarDays size={13} className="text-slate-400" />
            <span className="text-slate-400 text-xs capitalize">{dataFormatada}</span>
          </div>
        </div>

        {/* Barra de progresso geral */}
        {obraId && totalFases > 0 && (
          <div className="h-1 bg-slate-700">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{
                width: `${Math.round(
                  cronograma.reduce((sum, i) => sum + (progressMap[i.id] ?? Number(i.progresso ?? 0)), 0) / totalFases
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto space-y-4 pt-4 px-4">

        {/* ── OBRA + DATA ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuração</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Obra */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Obra</label>
              {loadingObras ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader2 size={14} className="animate-spin" /> Carregando...
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={obraId}
                    onChange={e => setObraId(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation pr-10"
                  >
                    <option value="">Selecione a obra...</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
              />
            </div>
          </div>
        </div>

        {/* ── CLIMA ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clima hoje</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {CLIMAS.map(({ id, label, emoji, Icon, activeClass, idleClass }) => (
              <button
                key={id}
                onClick={() => setClima(id)}
                className={`
                  flex items-center gap-3 px-4 py-4 rounded-2xl border-2 font-semibold text-sm
                  transition-all duration-150 touch-manipulation active:scale-95 shadow-sm
                  ${clima === id ? `${activeClass} shadow-md` : idleClass}
                `}
              >
                <span className="text-2xl leading-none">{emoji}</span>
                <div className="text-left">
                  <p className={`font-bold text-sm leading-none ${clima === id ? 'text-white' : 'text-slate-700'}`}>{label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── ETAPAS DO CRONOGRAMA ── */}
        {obraId && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso das etapas</p>
              {fasesAtualizadas > 0 && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {fasesAtualizadas} alterada{fasesAtualizadas > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loadingCronograma ? (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-14">
                <Loader2 size={28} className="animate-spin text-indigo-500" />
                <p className="text-sm">Carregando etapas...</p>
              </div>
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
                <p className="text-3xl">📋</p>
                <p className="text-sm">Nenhuma etapa cadastrada</p>
              </div>
            ) : (
              <div>
                {tree.map(item => (
                  <CronogramaItem
                    key={item.id}
                    item={item}
                    progressMap={progressMap}
                    onProgressChange={handleProgressChange}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OBSERVAÇÕES ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Observações</p>
          </div>
          <div className="p-4">
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="O que foi feito hoje? Algum problema ou ocorrência?"
              rows={4}
              className="w-full text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none leading-relaxed"
            />
            {observacoes.length > 0 && (
              <p className="text-right text-xs text-slate-300 mt-1">{observacoes.length} caracteres</p>
            )}
          </div>
        </div>

      </div>

      {/* ── BOTÃO ENVIAR (fixo) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(248,250,252,1) 60%, rgba(248,250,252,0))' }}
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || !obraId}
          className="
            w-full max-w-lg mx-auto flex items-center justify-center gap-2.5
            bg-slate-900 disabled:bg-slate-300
            text-white font-bold py-4 rounded-2xl
            shadow-xl shadow-slate-900/20
            active:scale-[0.98] transition-transform duration-100
            touch-manipulation text-base
          "
        >
          {submitting
            ? <><Loader2 size={20} className="animate-spin" /> Enviando...</>
            : <><Send size={20} /> Registrar dia de trabalho</>
          }
        </button>
      </div>
    </div>
  );
}
