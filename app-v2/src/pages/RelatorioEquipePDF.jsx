import { useEffect, useMemo, useState } from 'react';
import {
  FileDown,
  Filter,
  Loader2,
  Calendar,
  Building,
  Users,
  Clock,
  CalendarDays,
  TrendingUp,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import {
  BarChart,
  Bar,
  LineChart as RLineChart,
  Line,
  PieChart as RPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import lancamentosService from '@/services/lancamentosService';
import obrasService from '@/services/obrasService';
import useAuthStore from '@/store/authStore';
import RelatorioEquipePDFDocument from '@/components/relatorios/RelatorioEquipePDFDocument';

const CHART_COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
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

function minutesToHoursLabel(minutes) {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function minutesToHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

export default function RelatorioEquipePDF() {
  const { isAdmin, hasPermission } = useAuthStore();
  const canView = isAdmin() || hasPermission('relatorios', 'visualizar');

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [obras, setObras] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [obraFilter, setObraFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000);
    setDataFim(formatDateForInput(hoje));
    setDataInicio(formatDateForInput(trintaDiasAtras));
    loadObras();
  }, []);

  async function loadObras() {
    try {
      const res = await obrasService.list();
      const list = Array.isArray(res?.dados) ? res.dados : [];
      list.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      setObras(list);
    } catch (err) {
      toast.error('Erro ao carregar obras');
    }
  }

  async function carregarLancamentos() {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione o período');
      return;
    }
    if (!obraFilter) {
      toast.error('Selecione uma obra');
      return;
    }
    setLoading(true);
    try {
      const res = await lancamentosService.list({
        inicio: dataInicio,
        fim: dataFim,
      });
      const list = Array.isArray(res?.dados) ? res.dados : [];
      const filtered = list.filter((l) => l.obra === obraFilter);
      setLancamentos(filtered);
      if (filtered.length === 0) {
        toast('Nenhum lançamento encontrado para esse período e obra', { icon: 'ℹ️' });
      } else {
        toast.success(`${filtered.length} lançamentos carregados`);
      }
    } catch (err) {
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  }

  // Agregações
  const dados = useMemo(() => {
    if (lancamentos.length === 0) return null;

    const porFuncionario = new Map();
    const porDia = new Map();
    const porFuncao = new Map();
    const diasUnicos = new Set();

    lancamentos.forEach((l) => {
      const minutos = parseHorasToMinutes(l.horas);
      const nome = l.funcionario || 'Sem nome';
      const funcao = l.funcao || 'Sem função';
      const data = l.data;

      diasUnicos.add(data);

      // Por funcionário
      if (!porFuncionario.has(nome)) {
        porFuncionario.set(nome, {
          nome,
          funcao,
          minutos: 0,
          dias: new Set(),
        });
      }
      const pf = porFuncionario.get(nome);
      pf.minutos += minutos;
      pf.dias.add(data);

      // Por dia
      porDia.set(data, (porDia.get(data) || 0) + minutos);

      // Por função
      porFuncao.set(funcao, (porFuncao.get(funcao) || 0) + minutos);
    });

    const funcionariosList = Array.from(porFuncionario.values())
      .map((f) => ({
        nome: f.nome,
        funcao: f.funcao,
        minutos: f.minutos,
        dias: f.dias.size,
        totalHorasLabel: minutesToHoursLabel(f.minutos),
        mediaDiaLabel: minutesToHoursLabel(
          f.dias.size > 0 ? Math.round(f.minutos / f.dias.size) : 0
        ),
      }))
      .sort((a, b) => b.minutos - a.minutos);

    const horasPorFuncionario = funcionariosList.map((f) => ({
      label: f.nome,
      value: minutesToHours(f.minutos),
      display: f.totalHorasLabel,
    }));

    const horasPorDia = Array.from(porDia.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, minutos]) => {
        const [, m, d] = data.split('-');
        return {
          label: `${d}/${m}`,
          data,
          value: minutesToHours(minutos),
          display: minutesToHoursLabel(minutos),
        };
      });

    const horasPorFuncao = Array.from(porFuncao.entries())
      .map(([funcao, minutos]) => ({
        label: funcao,
        value: minutos, // minutos (para o pie)
        valueHours: minutesToHours(minutos),
      }))
      .sort((a, b) => b.value - a.value);

    const totalMinutos = Array.from(porFuncao.values()).reduce((s, v) => s + v, 0);
    const diasTrabalhados = diasUnicos.size;
    const mediaHorasDia =
      diasTrabalhados > 0 ? Math.round(totalMinutos / diasTrabalhados) : 0;

    return {
      kpis: {
        totalHoras: totalMinutos,
        totalHorasLabel: minutesToHoursLabel(totalMinutos),
        totalFuncionarios: funcionariosList.length,
        diasTrabalhados,
        mediaHorasDia,
        mediaHorasDiaLabel: minutesToHoursLabel(mediaHorasDia),
      },
      funcionarios: funcionariosList,
      horasPorFuncionario,
      horasPorDia,
      horasPorFuncao,
    };
  }, [lancamentos]);

  const pdfProps = useMemo(() => {
    if (!dados) return null;
    return {
      obra: obraFilter,
      empresa: 'Construtora RR',
      periodoInicio: dataInicio,
      periodoFim: dataFim,
      kpis: dados.kpis,
      funcionarios: dados.funcionarios,
      horasPorFuncionario: dados.horasPorFuncionario,
      horasPorDia: dados.horasPorDia,
      horasPorFuncao: dados.horasPorFuncao.map((f) => ({
        label: f.label,
        value: f.value,
      })),
      geradoEm: new Date().toLocaleString('pt-BR'),
    };
  }, [dados, obraFilter, dataInicio, dataFim]);

  const fileName = useMemo(() => {
    const safe = (obraFilter || 'relatorio')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 50);
    return `Relatorio_Equipe_${safe}_${dataInicio}_${dataFim}.pdf`;
  }, [obraFilter, dataInicio, dataFim]);

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Você não tem permissão para visualizar relatórios.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Relatório de Equipe em PDF
          </h1>
          <p className="text-slate-600 mt-1">
            Gere relatórios profissionais das horas trabalhadas por funcionário
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>
                <Building className="w-3.5 h-3.5 inline mr-1" />
                Obra
              </Label>
              <select
                value={obraFilter}
                onChange={(e) => setObraFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione uma obra...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.nome}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data início
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <Label>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data fim
              </Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={carregarLancamentos}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Gerar Prévia
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {dados && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={Clock}
              label="Total Horas"
              value={dados.kpis.totalHorasLabel}
              sub="no período"
              color="indigo"
            />
            <KpiCard
              icon={Users}
              label="Funcionários"
              value={dados.kpis.totalFuncionarios}
              sub="pessoas únicas"
              color="emerald"
            />
            <KpiCard
              icon={CalendarDays}
              label="Dias Trabalhados"
              value={dados.kpis.diasTrabalhados}
              sub="dias com registro"
              color="amber"
            />
            <KpiCard
              icon={TrendingUp}
              label="Média / Dia"
              value={dados.kpis.mediaHorasDiaLabel}
              sub="total ÷ dias"
              color="purple"
            />
          </div>

          {/* Botão Download PDF */}
          <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 text-white">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileDown className="w-5 h-5" />
                  Relatório pronto para download
                </h3>
                <p className="text-indigo-100 text-sm mt-1">
                  Obra <strong>{obraFilter}</strong> · Período{' '}
                  {formatDateBR(dataInicio)} a {formatDateBR(dataFim)}
                </p>
              </div>
              {pdfProps && (
                <PDFDownloadLink
                  document={<RelatorioEquipePDFDocument {...pdfProps} />}
                  fileName={fileName}
                >
                  {({ loading: pdfLoading }) => (
                    <Button
                      className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold"
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Preparando...
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4 mr-2" />
                          Baixar PDF
                        </>
                      )}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </CardContent>
          </Card>

          {/* Gráfico: Horas por dia */}
          {dados.horasPorDia.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Horas Trabalhadas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RLineChart data={dados.horasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={12} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={12}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}h`, 'Horas']}
                      labelStyle={{ color: '#0F172A' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico: Horas por funcionário (top 10) */}
            {dados.horasPorFuncionario.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Top 10 — Horas por Funcionário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={dados.horasPorFuncionario.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        type="number"
                        stroke="#64748B"
                        fontSize={11}
                        tickFormatter={(v) => `${v}h`}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        stroke="#64748B"
                        fontSize={11}
                        width={80}
                      />
                      <Tooltip formatter={(v) => [`${v}h`, 'Horas']} />
                      <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Gráfico: Distribuição por função (pizza) */}
            {dados.horasPorFuncao.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Função</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <RPieChart>
                      <Pie
                        data={dados.horasPorFuncao.map((f) => ({
                          name: f.label,
                          value: f.valueHours,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={50}
                        label={(e) => `${e.name} (${e.value}h)`}
                      >
                        {dados.horasPorFuncao.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}h`, 'Horas']} />
                    </RPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Detalhamento por Funcionário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
                      <th className="text-left py-3 px-2 font-semibold">
                        Funcionário
                      </th>
                      <th className="text-left py-3 px-2 font-semibold">Função</th>
                      <th className="text-right py-3 px-2 font-semibold">Dias</th>
                      <th className="text-right py-3 px-2 font-semibold">
                        Total Horas
                      </th>
                      <th className="text-right py-3 px-2 font-semibold">
                        Média/Dia
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.funcionarios.map((f, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 ${
                          i % 2 === 1 ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="py-3 px-2 font-semibold text-slate-900">
                          {f.nome}
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          {f.funcao || '—'}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600">
                          {f.dias}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-slate-900">
                          {f.totalHorasLabel}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600">
                          {f.mediaDiaLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Estado vazio */}
      {!dados && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              Selecione uma obra e um período para gerar a prévia
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Você poderá visualizar os dados antes de baixar o PDF
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-lg border ${colorMap[color]} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
