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
  ClipboardList,
  Loader2,
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
  { id: 'sol',        label: 'Sol',         Icon: Sun,         cor: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-300' },
  { id: 'nublado',    label: 'Nublado',     Icon: Cloud,       cor: 'text-gray-500',   bg: 'bg-gray-50 border-gray-300' },
  { id: 'chuva',      label: 'Chuva',       Icon: CloudDrizzle, cor: 'text-blue-500',  bg: 'bg-blue-50 border-blue-300' },
  { id: 'chuva_forte',label: 'Chuva forte', Icon: CloudRain,   cor: 'text-blue-700',   bg: 'bg-blue-100 border-blue-400' },
];

// ============================================================================
// HELPERS
// ============================================================================
function getStatusConfig(progresso) {
  if (progresso >= 100) return { label: 'Concluída', color: 'text-emerald-600', bg: 'bg-emerald-100', Icon: CheckCircle2 };
  if (progresso > 0)   return { label: 'Em andamento', color: 'text-indigo-600', bg: 'bg-indigo-100', Icon: Clock };
  return { label: 'Pendente', color: 'text-gray-500', bg: 'bg-gray-100', Icon: AlertTriangle };
}

// Constrói árvore hierárquica a partir de lista plana
function buildTree(items) {
  const byId = {};
  items.forEach(i => { byId[i.id] = { ...i, children: [] }; });
  const roots = [];
  items.forEach(i => {
    if (i.parent_id && byId[i.parent_id]) {
      byId[i.parent_id].children.push(byId[i.id]);
    } else {
      roots.push(byId[i.id]);
    }
  });
  return roots;
}

// ============================================================================
// COMPONENTE: ITEM DO CRONOGRAMA
// ============================================================================
function CronogramaItem({ item, progressMap, onProgressChange, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const progresso = progressMap[item.id] ?? item.progresso ?? 0;
  const statusCfg = getStatusConfig(progresso);
  const { Icon: StatusIcon } = statusCfg;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-gray-100' : ''}>
      <div className={`px-4 py-3 ${depth === 0 ? 'bg-white border-b border-gray-100' : 'bg-gray-50/50'}`}>
        {/* Header da fase */}
        <div className="flex items-center gap-2 mb-2">
          {hasChildren && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex-shrink-0 text-gray-400 touch-manipulation"
            >
              {expanded
                ? <ChevronDown size={18} />
                : <ChevronRight size={18} />
              }
            </button>
          )}
          {!hasChildren && <div className="w-[18px]" />}

          <div className="flex-1 min-w-0">
            <span className={`font-medium truncate block ${depth === 0 ? 'text-gray-900 text-sm' : 'text-gray-700 text-sm'}`}>
              {item.fase}
            </span>
          </div>

          <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon size={11} />
            {progresso}%
          </span>
        </div>

        {/* Slider de progresso */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progresso}
            onChange={e => onProgressChange(item.id, Number(e.target.value))}
            className="flex-1 h-2 accent-indigo-600 cursor-pointer touch-manipulation"
            style={{ minWidth: 0 }}
          />
          <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{progresso}%</span>
        </div>

        {/* Barra visual */}
        <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              progresso >= 100 ? 'bg-emerald-500' : progresso > 0 ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Filhos */}
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

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 touch-manipulation"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-600" />
            <h1 className="text-base font-semibold text-gray-900">Relatório Diário</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* Seletor de obra */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Obra
          </label>
          {loadingObras ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 size={16} className="animate-spin" /> Carregando obras...
            </div>
          ) : (
            <select
              value={obraId}
              onChange={e => setObraId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            >
              <option value="">Selecione a obra...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Data + Clima */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Data
            </label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Clima
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CLIMAS.map(({ id, label, Icon, cor, bg }) => (
                <button
                  key={id}
                  onClick={() => setClima(id)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all touch-manipulation ${
                    clima === id ? bg : 'bg-white border-gray-100 text-gray-500'
                  }`}
                >
                  <Icon size={20} className={clima === id ? cor : 'text-gray-400'} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cronograma */}
        {obraId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">
                Etapas do cronograma
              </h2>
              {obraSelecionada && (
                <p className="text-xs text-gray-500 mt-0.5">{obraSelecionada.nome}</p>
              )}
            </div>

            {loadingCronograma ? (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-10">
                <Loader2 size={18} className="animate-spin" /> Carregando etapas...
              </div>
            ) : tree.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-10">
                Nenhuma etapa cadastrada nesta obra.
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

        {/* Observações */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Observações gerais
          </label>
          <textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Descreva o que foi feito hoje, problemas encontrados, ocorrências..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Botão fixo no fundo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={submitting || !obraId}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl transition-colors touch-manipulation text-sm"
        >
          {submitting
            ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
            : <><Send size={18} /> Enviar relatório</>
          }
        </button>
      </div>
    </div>
  );
}
