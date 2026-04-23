import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X, Filter, Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/store/authStore';
import lancamentosService from '@/services/lancamentosService';
import funcionariosService from '@/services/funcionariosService';
import obrasService from '@/services/obrasService';

export default function Lancamentos() {
  const { isAdmin, hasPermission } = useAuthStore();

  const pageSizeOptions = [25, 50, 100, 500];

  const [items, setItems] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Paginação + ordenação
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [funcionarioFilter, setFuncionarioFilter] = useState('');
  const [funcaoFilter, setFuncaoFilter] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [obraFilter, setObraFilter] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    data: '',
    funcionario: '',
    funcao: '',
    empresa: '',
    obra: '',
    horas: '08:00',
    observacao: ''
  });

  const canView = isAdmin() || hasPermission('lancamentos', 'visualizar');
  const canCreate = isAdmin() || hasPermission('lancamentos', 'criar');
  const canEdit = isAdmin() || hasPermission('lancamentos', 'editar');
  const canDelete = isAdmin() || hasPermission('lancamentos', 'excluir');

  useEffect(() => {
    if (canView) {
      // Configurar filtro padrão de últimos 30 dias
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000);

      setDataFim(formatDateForInput(hoje));
      setDataInicio(formatDateForInput(trintaDiasAtras));

      loadData();
      loadAuxiliaryData();
    }
  }, [canView]);

  // Carregar dados quando os filtros de data mudarem
  useEffect(() => {
    if (canView && dataInicio && dataFim) {
      loadData();
    }
  }, [dataInicio, dataFim]);

  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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

  const collator = useMemo(() => new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' }), []);

  function requestSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }

  function renderSortIcon(key) {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchFuncionario = funcionarioFilter ? item.funcionario === funcionarioFilter : true;
      const matchFuncao = funcaoFilter ? item.funcao === funcaoFilter : true;
      const matchEmpresa = empresaFilter ? item.empresa === empresaFilter : true;
      const matchObra = obraFilter ? item.obra === obraFilter : true;
      return matchFuncionario && matchFuncao && matchEmpresa && matchObra;
    });
  }, [items, funcionarioFilter, funcaoFilter, empresaFilter, obraFilter]);

  const sorted = useMemo(() => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const key = sortConfig.key;

    return [...filtered].sort((a, b) => {
      if (key === 'data') {
        const at = new Date(a?.data || 0).getTime();
        const bt = new Date(b?.data || 0).getTime();
        return dir * (at - bt);
      }

      if (key === 'horas') {
        const ah = parseHorasToMinutes(a?.horas);
        const bh = parseHorasToMinutes(b?.horas);
        return dir * (ah - bh);
      }

      const av = String(a?.[key] ?? '');
      const bv = String(b?.[key] ?? '');
      return dir * collator.compare(av, bv);
    });
  }, [filtered, sortConfig, collator]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, funcionarioFilter, funcaoFilter, empresaFilter, obraFilter]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sorted.length / pageSize));
  }, [sorted.length, pageSize]);

  useEffect(() => {
    setCurrentPage((prev) => (prev > totalPages ? totalPages : prev));
  }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Extrair valores únicos para os filtros
  const funcoes = useMemo(() => {
    const unique = [...new Set(items.map(item => item.funcao).filter(Boolean))];
    return unique.sort();
  }, [items]);

  const empresas = useMemo(() => {
    const unique = [...new Set(items.map(item => item.empresa).filter(Boolean))];
    return unique.sort();
  }, [items]);

  async function loadData() {
    setLoading(true);
    try {
      const params = {};
      if (dataInicio) params.inicio = dataInicio;
      if (dataFim) params.fim = dataFim;

      console.log('🔍 Carregando lançamentos com params:', params);
      const res = await lancamentosService.list(params);
      console.log('📦 Resposta da API:', res);

      const list = Array.isArray(res?.dados) ? res.dados : [];
      console.log('✅ Lançamentos carregados:', list.length, list);

      setItems(list);
    } catch (error) {
      console.error('❌ Erro ao carregar lançamentos:', error);
      toast.error('Não foi possível carregar os lançamentos');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuxiliaryData() {
    try {
      const [funcionariosRes, obrasRes] = await Promise.all([
        funcionariosService.list(),
        obrasService.list()
      ]);

      const funcionariosList = Array.isArray(funcionariosRes?.dados) ? funcionariosRes.dados : [];
      const obrasList = Array.isArray(obrasRes?.dados) ? obrasRes.dados : [];

      // Filtrar apenas funcionários ativos
      const funcionariosAtivos = funcionariosList.filter(f => f.situacao === 'Ativo');
      funcionariosAtivos.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      obrasList.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));

      setFuncionarios(funcionariosAtivos);
      setObras(obrasList);
    } catch (error) {
      toast.error('Falha ao carregar dados auxiliares');
    }
  }

  function openCreate() {
    setEditingId(null);
    const hoje = new Date();
    setFormData({
      data: formatDateForInput(hoje),
      funcionario: '',
      funcao: '',
      empresa: '',
      obra: '',
      horas: '08:00',
      observacao: ''
    });
    setIsModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setFormData({
      data: item.data || '',
      funcionario: item.funcionario || '',
      funcao: item.funcao || '',
      empresa: item.empresa || '',
      obra: item.obra || '',
      horas: item.horas || '08:00',
      observacao: item.observacao || ''
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      data: '',
      funcionario: '',
      funcao: '',
      empresa: '',
      obra: '',
      horas: '08:00',
      observacao: ''
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.data || !formData.funcionario || !formData.obra || !formData.horas) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      console.log('💾 Salvando lançamento:', formData);
      if (editingId) {
        const result = await lancamentosService.update(editingId, formData);
        console.log('✅ Resultado update:', result);
        toast.success('Lançamento atualizado com sucesso');
      } else {
        const result = await lancamentosService.create(formData);
        console.log('✅ Resultado create:', result);
        toast.success('Lançamento criado com sucesso');
      }
      closeModal();
      console.log('🔄 Recarregando dados...');
      await loadData();
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao salvar lançamento');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;

    try {
      await lancamentosService.delete(id);
      toast.success('Lançamento excluído com sucesso');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir lançamento');
    }
  }

  function handleFuncionarioChange(e) {
    const nome = e.target.value;
    setFormData(prev => ({ ...prev, funcionario: nome }));

    // Auto-preencher função e empresa
    const funcionario = funcionarios.find(f => f.nome === nome);
    if (funcionario) {
      setFormData(prev => ({
        ...prev,
        funcionario: nome,
        funcao: funcionario.funcao || '',
        empresa: funcionario.empresa || ''
      }));
    }
  }

  function clearFilters() {
    setFuncionarioFilter('');
    setFuncaoFilter('');
    setEmpresaFilter('');
    setObraFilter('');
  }

  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para visualizar lançamentos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Lançamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os lançamentos de horas trabalhadas
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        )}
      </div>

      {/* Filtros de Período e Avançados */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Período */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="data-inicio" className="text-sm font-medium">Data Inicial</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="data-fim" className="text-sm font-medium">Data Final</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 h-10"
              >
                <Filter className="h-4 w-4" />
                Filtros
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Filtros Avançados */}
            {showFilters && (
              <div className="pt-4 border-t border-border/40 space-y-4 animate-scale-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="filter-funcionario" className="text-sm font-medium">Funcionário</Label>
                    <select
                      id="filter-funcionario"
                      className="w-full h-10 px-3 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors"
                      value={funcionarioFilter}
                      onChange={(e) => setFuncionarioFilter(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.nome}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-funcao" className="text-sm font-medium">Função</Label>
                    <select
                      id="filter-funcao"
                      className="w-full h-10 px-3 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors"
                      value={funcaoFilter}
                      onChange={(e) => setFuncaoFilter(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {funcoes.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-empresa" className="text-sm font-medium">Empresa</Label>
                    <select
                      id="filter-empresa"
                      className="w-full h-10 px-3 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors"
                      value={empresaFilter}
                      onChange={(e) => setEmpresaFilter(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {empresas.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-obra" className="text-sm font-medium">Obra</Label>
                    <select
                      id="filter-obra"
                      className="w-full h-10 px-3 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors"
                      value={obraFilter}
                      onChange={(e) => setObraFilter(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {obras.map(o => (
                        <option key={o.id} value={o.nome}>{o.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(funcionarioFilter || funcaoFilter || empresaFilter || obraFilter) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de lançamentos */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold">
              {sorted.length} {sorted.length === 1 ? 'lançamento' : 'lançamentos'}
            </CardTitle>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Linhas:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground focus:border-foreground transition-colors"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-16 text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-muted-foreground">Carregando lançamentos...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhum lançamento encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste os filtros ou adicione um novo lançamento
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('data')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Data
                        {renderSortIcon('data')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('funcionario')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Funcionário
                        {renderSortIcon('funcionario')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('funcao')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Função
                        {renderSortIcon('funcao')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('empresa')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Empresa
                        {renderSortIcon('empresa')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('obra')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Obra
                        {renderSortIcon('obra')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('horas')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Horas
                        {renderSortIcon('horas')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => requestSort('observacao')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Observação
                        {renderSortIcon('observacao')}
                      </button>
                    </th>
                    {(canEdit || canDelete) && <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginated.map((item, index) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-muted/30 transition-colors"
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <td className="px-4 py-3 text-sm text-foreground font-medium whitespace-nowrap">
                        {formatDateForDisplay(item.data)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {item.funcionario}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.funcao}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.empresa}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {item.obra}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary" className="font-mono text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.horas}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate" title={item.observacao}>
                        {item.observacao || '—'}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="h-8 w-8 p-0 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <CardHeader className="border-b border-border/40">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">
                  {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data" className="text-sm font-medium">
                      Data <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funcionario" className="text-sm font-medium">
                      Funcionário <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="funcionario"
                      className="w-full h-10 px-3 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors"
                      value={formData.funcionario}
                      onChange={handleFuncionarioChange}
                      required
                    >
                      <option value="">Selecione...</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.nome}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funcao" className="text-sm font-medium">Função</Label>
                    <Input
                      id="funcao"
                      value={formData.funcao}
                      onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                      readOnly
                      className="h-10 bg-muted/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresa" className="text-sm font-medium">Empresa</Label>
                    <Input
                      id="empresa"
                      value={formData.empresa}
                      onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                      readOnly
                      className="h-10 bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="obra" className="text-sm font-medium">
                      Obra <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="obra"
                      className="w-full h-10 px-3 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors"
                      value={formData.obra}
                      onChange={(e) => setFormData({ ...formData, obra: e.target.value })}
                      required
                    >
                      <option value="">Selecione...</option>
                      {obras.map(o => (
                        <option key={o.id} value={o.nome}>{o.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas" className="text-sm font-medium">
                      Horas <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="horas"
                      type="time"
                      value={formData.horas}
                      onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                      required
                      className="h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacao" className="text-sm font-medium">Observação</Label>
                  <textarea
                    id="observacao"
                    className="w-full min-h-[100px] px-3 py-2.5 rounded-md border border-border/60 bg-background text-sm focus:border-foreground transition-colors resize-none"
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Adicione observações opcionais..."
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="min-w-[100px]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="min-w-[100px]"
                  >
                    {editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
