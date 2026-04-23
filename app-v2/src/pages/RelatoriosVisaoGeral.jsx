import { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  PieChart,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import lancamentosService from '@/services/lancamentosService';

// Página focada em UX/UI (dados fake) — pronta para você conectar ao backend.
// Não altera /relatorios/obras. Ideal para ser a Home do módulo de relatórios.

function Kpi({ title, value, icon: Icon, deltaLabel = '+0%', tone = 'neutral', footer }) {
  const toneStyles = {
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };

  const chipStyles = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-indigo-100 text-indigo-800'
  };

  return (
    <Card className="border bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${chipStyles[tone] || chipStyles.neutral}`}>
                {deltaLabel}
              </span>
            </div>
            {footer ? <p className="text-xs text-slate-500">{footer}</p> : null}
          </div>

          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneStyles[tone] || toneStyles.neutral}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskDot({ level = 'baixo' }) {
  const map = {
    baixo: 'bg-emerald-500',
    medio: 'bg-amber-500',
    alto: 'bg-rose-500'
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[level] || map.baixo}`} />;
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Progresso</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function MiniPill({ children, tone = 'default' }) {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-indigo-100 text-indigo-800'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone] || styles.default}`}>
      {children}
    </span>
  );
}

function Drawer({ open, onClose, children, title }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-sm text-slate-500">Detalhe da obra</p>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-[calc(100vh-73px)] overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export default function RelatoriosVisaoGeral() {
  const [period, setPeriod] = useState('30d');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [obraAtiva, setObraAtiva] = useState(null);

  const [drawerFuncionarioOpen, setDrawerFuncionarioOpen] = useState(false);
  const [funcionarioAtivo, setFuncionarioAtivo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [lancamentos, setLancamentos] = useState([]);

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toDateInput(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function getRangeFromPeriod(p) {
    const end = new Date();
    const start = new Date(end);

    if (p === '7d') start.setDate(end.getDate() - 6);
    else if (p === '30d') start.setDate(end.getDate() - 29);
    else if (p === 'mes') start.setDate(1);
    else if (p === 'ano') {
      start.setMonth(0);
      start.setDate(1);
    } else {
      // fallback
      start.setDate(end.getDate() - 29);
    }

    return { inicio: toDateInput(start), fim: toDateInput(end) };
  }

  function parseHorasToMinutes(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const [h, m] = raw.split(':');
    const hours = Number(h);
    const minutes = Number(m || 0);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  }

  function minutesToHHMM(totalMinutes) {
    const m = Math.max(0, Math.round(totalMinutes || 0));
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${pad2(hh)}:${pad2(mm)}`;
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { inicio, fim } = getRangeFromPeriod(period);
        const res = await lancamentosService.list({ inicio, fim });

        // api.js interceptor retorna response.data; api_lancamentos.php retorna: { sucesso, dados }
        const rows = Array.isArray(res?.dados) ? res.dados : Array.isArray(res) ? res : [];
        setLancamentos(rows);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar lançamentos para relatórios');
        setLancamentos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const aggregates = useMemo(() => {
    const byObra = new Map();
    const byFuncionario = new Map();

    let totalMinutes = 0;

    for (const l of lancamentos) {
      const obra = (l?.obra || 'Sem obra').trim() || 'Sem obra';
      const funcionario = (l?.funcionario || 'Sem funcionário').trim() || 'Sem funcionário';
      const funcao = (l?.funcao || 'Sem função').trim() || 'Sem função';

      const mins = parseHorasToMinutes(l?.horas);
      totalMinutes += mins;

      // por obra
      if (!byObra.has(obra)) {
        byObra.set(obra, {
          nome: obra,
          status: '—',
          risco: 'baixo',
          horasMin: 0,
          funcionariosSet: new Set(),
          funcoesMin: new Map(),
          lancamentos: []
        });
      }
      const o = byObra.get(obra);
      o.horasMin += mins;
      o.funcionariosSet.add(funcionario);
      o.lancamentos.push(l);
      o.funcoesMin.set(funcao, (o.funcoesMin.get(funcao) || 0) + mins);

      // por funcionário
      if (!byFuncionario.has(funcionario)) {
        byFuncionario.set(funcionario, {
          nome: funcionario,
          horasMin: 0,
          obrasMin: new Map(),
          lancamentos: []
        });
      }
      const f = byFuncionario.get(funcionario);
      f.horasMin += mins;
      f.lancamentos.push(l);
      f.obrasMin.set(obra, (f.obrasMin.get(obra) || 0) + mins);
    }

    const obrasList = Array.from(byObra.values()).map((o, idx) => {
      const funcoesSorted = Array.from(o.funcoesMin.entries())
        .map(([label, min]) => ({ label, minutes: min }))
        .sort((a, b) => b.minutes - a.minutes);

      return {
        id: idx + 1,
        nome: o.nome,
        status: o.status,
        risco: o.risco,
        funcionariosCount: o.funcionariosSet.size,
        horasPeriodoMin: o.horasMin,
        funcoesSorted,
        lancamentos: o.lancamentos,
        // placeholders para futuro financeiro:
        custoReal: 0,
        custoOrcado: 0,
        progresso: 0,
        prazoDias: 0,
      };
    });

    obrasList.sort((a, b) => b.horasPeriodoMin - a.horasPeriodoMin);

    const funcionariosList = Array.from(byFuncionario.values())
      .map((f) => {
        const obrasSorted = Array.from(f.obrasMin.entries())
          .map(([obra, min]) => ({ obra, minutes: min }))
          .sort((a, b) => b.minutes - a.minutes);
        return { ...f, obrasSorted };
      })
      .sort((a, b) => b.horasMin - a.horasMin);

    const abs = 0; // ainda não dá pra calcular sem RH

    return {
      totalMinutes,
      obrasList,
      funcionariosList,
      absenteismo: abs,
    };
  }, [lancamentos]);

  const obras = aggregates.obrasList;

  const obrasFiltradas = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return obras;
    return obras.filter((o) => o.nome.toLowerCase().includes(s));
  }, [obras, search]);

  const kpis = useMemo(() => {
    return {
      horas: aggregates.totalMinutes,
      funcionarios: aggregates.funcionariosList.length,
      obras: aggregates.obrasList.length,
    };
  }, [aggregates]);

  const handleOpenObra = (obra) => {
    setObraAtiva(obra);
    setDrawerOpen(true);
  };

  const handleOpenFuncionario = (func) => {
    setFuncionarioAtivo(func);
    setDrawerFuncionarioOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-600">
            Dados vindos de <span className="font-medium text-slate-900">Lançamentos</span> (horas por obra, funcionário e função).
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2">
            <Button variant={period === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('7d')}>
              7d
            </Button>
            <Button variant={period === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('30d')}>
              30d
            </Button>
            <Button variant={period === 'mes' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('mes')}>
              Mês
            </Button>
            <Button variant={period === 'ano' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('ano')}>
              Ano
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm">
              <ArrowRight className="mr-2 h-4 w-4" />
              Abrir Dashboard por Obra
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-slate-50 p-6 text-sm text-slate-600">Carregando lançamentos…</div>
      ) : null}

      {/* KPIs (agora baseados em lançamentos) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi title="Obras (no período)" value={String(kpis.obras)} icon={Building2} deltaLabel="—" tone="info" footer="Com lançamento registrado" />
        <Kpi title="Funcionários (no período)" value={String(kpis.funcionarios)} icon={Users} deltaLabel="—" tone="info" footer="Com lançamento registrado" />
        <Kpi title="Horas totais" value={minutesToHHMM(kpis.horas)} icon={TrendingUp} deltaLabel="—" tone="info" footer="Somatório das horas" />
        <Kpi title="Lançamentos" value={String(lancamentos.length)} icon={BarChart3} deltaLabel="—" tone="neutral" footer="Registros no período" />
        <Kpi title="Custo real (R$)" value="—" icon={Wallet} deltaLabel="Em breve" tone="warning" footer="Habilitar no financeiro" />
        <Kpi title="Prazo (risco)" value="—" icon={AlertTriangle} deltaLabel="Em breve" tone="danger" footer="Habilitar via cronograma" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="executivo" className="w-full">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-xl bg-transparent p-0 sm:grid-cols-4">
          <TabsTrigger value="executivo" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="funcionarios" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="diario" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Diário
          </TabsTrigger>
          <TabsTrigger value="atalhos" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Atalhos
          </TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="executivo" className="mt-6 space-y-6">
          {/* Substitui as 3 bolhas (confuso) por um resumo claro */}
          <Card className="border bg-white overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-slate-900">Resumo por Obra (baseado em Lançamentos)</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    Esta visão usa apenas os dados de <span className="font-medium">horas</span>. Prazo/custo entram depois.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MiniPill tone="info">Clique numa obra para horas por função</MiniPill>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">Obra com mais horas</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{obras[0]?.nome || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">{obras[0] ? `${minutesToHHMM(obras[0].horasPeriodoMin)}h` : '—'}</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">Função mais usada (geral)</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">—</p>
                  <p className="mt-1 text-xs text-slate-500">(calcular por soma de função depois)</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">Funcionário com mais horas</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{aggregates.funcionariosList[0]?.nome || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {aggregates.funcionariosList[0] ? `${minutesToHHMM(aggregates.funcionariosList[0].horasMin)}h` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Obras */}
          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <SectionHeader
                title="Obras"
                subtitle="Clique em uma obra para ver os lançamentos dela e horas por função."
                right={
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-[320px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar obra…"
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filtros
                    </Button>
                  </div>
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {obrasFiltradas.map((obra) => (
                <button
                  key={obra.nome}
                  onClick={() => handleOpenObra(obra)}
                  className="group w-full rounded-xl border bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-50 text-slate-700">
                          <Building2 className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="max-w-full truncate text-base font-semibold text-slate-900">{obra.nome}</p>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">{obra.funcionariosCount} func.</Badge>
                            <MiniPill tone="info">{minutesToHHMM(obra.horasPeriodoMin)}h</MiniPill>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-600">{obra.lancamentos.length} lançamentos no período</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-2 lg:flex-col lg:items-end">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                        Ver detalhes
                        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {obrasFiltradas.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Nenhuma obra encontrada</p>
                  <p className="mt-1 text-sm text-slate-600">Ajuste a busca ou limpe os filtros.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNCIONÁRIOS */}
        <TabsContent value="funcionarios" className="mt-6 space-y-6">
          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <SectionHeader
                title="Funcionários (baseado em lançamentos)"
                subtitle="Clique em um funcionário para ver todos os lançamentos dele e o total por obra."
              />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {aggregates.funcionariosList.slice(0, 20).map((f) => (
                <button
                  key={f.nome}
                  onClick={() => handleOpenFuncionario(f)}
                  className="rounded-xl border bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{f.nome}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{f.lancamentos.length} lançamentos • {f.obrasSorted.length} obras</p>
                    </div>
                    <MiniPill tone="info">{minutesToHHMM(f.horasMin)}h</MiniPill>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Clique para detalhar por obra</p>
                  </div>
                </button>
              ))}

              {aggregates.funcionariosList.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center lg:col-span-2">
                  <p className="text-sm font-medium text-slate-900">Sem dados</p>
                  <p className="mt-1 text-sm text-slate-600">Não há lançamentos no período selecionado.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIÁRIO (continua como preview) */}
        <TabsContent value="diario" className="mt-6 space-y-6">
          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <SectionHeader
                title="Relatório Diário (placeholder)"
                subtitle="Você pode ligar aqui um agrupamento por data usando os lançamentos."
              />
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-900">Pronto para conectar</p>
                <p className="mt-1 text-sm text-slate-600">Agrupar lançamentos por dia e mostrar horas/equipe/obras.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATALHOS */}
        <TabsContent value="atalhos" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <PieChart className="h-5 w-5 text-indigo-600" />
                  Dashboards por obra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Acesse a página completa com gráficos, cronograma e relatórios mensais/semanais/diários.</p>
                <Button className="mt-4 w-full">
                  Abrir Relatórios &gt; Obras
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Exportação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Exportar relatórios in Excel/PDF e manter histórico de auditoria (quando conectado).</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="w-full">
                    Excel
                  </Button>
                  <Button variant="outline" className="w-full">
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  Metas & Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Base para “metas por obra” e alertas automáticos (prazo/custo/equipe).</p>
                <Button variant="outline" className="mt-4 w-full">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawer: detalhe da obra */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={obraAtiva?.nome || 'Obra'}
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Lançamentos da obra</p>
                <p className="mt-1 text-sm text-slate-600">
                  {obraAtiva ? `${obraAtiva.lancamentos.length} lançamentos • ${minutesToHHMM(obraAtiva.horasPeriodoMin)}h no período` : '—'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <ArrowRight className="mr-2 h-4 w-4" />
                Abrir dashboard completo
              </Button>
            </div>
          </div>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-slate-900">Horas por Função</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">Calculado a partir dos lançamentos desta obra.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default">Horas</Button>
                  <Button size="sm" variant="outline" disabled title="Em breve">
                    Custo (R$)
                  </Button>
                  <Button size="sm" variant="outline" disabled title="Em breve">
                    Custo/hora
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(obraAtiva?.funcoesSorted || []).slice(0, 10).map((row) => (
                <div key={row.label} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{minutesToHHMM(row.minutes)}h</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                      style={{ width: `${Math.min(100, (row.minutes / Math.max(1, (obraAtiva?.funcoesSorted?.[0]?.minutes || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {(obraAtiva?.funcoesSorted || []).length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Sem dados por função</p>
                  <p className="mt-1 text-sm text-slate-600">Não há lançamentos com função preenchida nesta obra.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900">Últimos lançamentos (obra)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(obraAtiva?.lancamentos || []).slice(0, 12).map((l) => (
                <div key={l.id || `${l.data}-${l.funcionario}-${l.horas}`} className="flex flex-col gap-1 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{l.funcionario}</p>
                    <p className="text-xs text-slate-600">{l.data} • {l.funcao || 'Sem função'} • {l.empresa || '—'}</p>
                  </div>
                  <MiniPill tone="info">{l.horas || '00:00'}h</MiniPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Drawer>

      {/* Drawer: detalhe do funcionário */}
      <Drawer
        open={drawerFuncionarioOpen}
        onClose={() => setDrawerFuncionarioOpen(false)}
        title={funcionarioAtivo?.nome || 'Funcionário'}
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Resumo</p>
            <p className="mt-1 text-sm text-slate-600">
              {funcionarioAtivo ? `${funcionarioAtivo.lancamentos.length} lançamentos • ${minutesToHHMM(funcionarioAtivo.horasMin)}h no período` : '—'}
            </p>
          </div>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900">Horas por Obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(funcionarioAtivo?.obrasSorted || []).map((row) => (
                <div key={row.obra} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{row.obra}</p>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{minutesToHHMM(row.minutes)}h</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                      style={{ width: `${Math.min(100, (row.minutes / Math.max(1, (funcionarioAtivo?.obrasSorted?.[0]?.minutes || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {(funcionarioAtivo?.obrasSorted || []).length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Sem obras</p>
                  <p className="mt-1 text-sm text-slate-600">Este funcionário não tem lançamentos com obra preenchida.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900">Últimos lançamentos (funcionário)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(funcionarioAtivo?.lancamentos || []).slice(0, 12).map((l) => (
                <div key={l.id || `${l.data}-${l.obra}-${l.horas}`} className="flex flex-col gap-1 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{l.obra || 'Sem obra'}</p>
                    <p className="text-xs text-slate-600">{l.data} • {l.funcao || 'Sem função'} • {l.empresa || '—'}</p>
                  </div>
                  <MiniPill tone="info">{l.horas || '00:00'}h</MiniPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Drawer>

      <div className="text-xs text-slate-500">
        * Esta página usa a tabela de lançamentos como fonte principal. Custo/prazo entram quando o financeiro/cronograma estiver pronto.
      </div>
    </div>
  );
}
