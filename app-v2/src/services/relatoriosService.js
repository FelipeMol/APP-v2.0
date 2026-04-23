import supabase from '../lib/supabase.js'
import lancamentosService from './lancamentosService';
import obrasService from './obrasService';
import * as XLSX from 'xlsx';

const check = (error) => { if (error) throw new Error(error.message) }
const relatoriosService = {
  // ============================================================================
  // DASHBOARD E DADOS DA OBRA
  // ============================================================================

  async getDashboardObra(obraId) {
    try {
      const [{ data: cronograma }, { data: alertas }, { data: metas }] = await Promise.all([
        supabase.from('obras_cronograma').select('*').eq('obra_id', obraId).order('ordem'),
        supabase.from('obras_alertas').select('*').eq('obra_id', obraId).eq('resolvido', false),
        supabase.from('obras_metas').select('*').eq('obra_id', obraId),
      ])
      return { sucesso: true, dados: { cronograma: cronograma || [], alertas: alertas || [], metas: metas || [] } }
    } catch (error) {
      return this.obterDadosObra(obraId)
    }
  },

  async getObrasComMetricas() {
    try {
      return this.obterObrasComMetricas()
    } catch (error) {
      throw error
    }
  },

  async getKpisGlobais() {
    const { data: obras, error: eObras } = await supabase.from('obras').select('id, status, progresso')
    check(eObras)
    const { data: lancamentos, error: eLanc } = await supabase
      .from('lancamentos').select('horas, obra_id, funcionario_id')
    check(eLanc)
    const totalHoras = (lancamentos || []).reduce((sum, l) => sum + this.horasParaDecimal(l.horas), 0)
    return {
      sucesso: true,
      dados: {
        total_obras: obras?.length || 0,
        obras_ativas: obras?.filter(o => o.status === 'ativa').length || 0,
        total_horas: totalHoras,
        total_lancamentos: lancamentos?.length || 0,
      }
    }
  },

  // ============================================================================
  // RELATÓRIOS CRUD
  // ============================================================================

  async listarRelatorios(params = {}) {
    let query = supabase.from('relatorios').select('*').order('criado_em', { ascending: false })
    if (params.obra_id) query = query.eq('obra_id', params.obra_id)
    if (params.tipo)    query = query.eq('tipo', params.tipo)
    if (params.limite)  query = query.limit(params.limite)
    const { data, error } = await query
    check(error)
    return data || []
  },

  async getRelatorio(id) {
    const { data, error } = await supabase.from('relatorios').select('*').eq('id', id).single()
    check(error)
    return data
  },

  async criarRelatorio(payload) {
    const { data, error } = await supabase.from('relatorios').insert(payload).select().single()
    check(error)
    return data
  },

  async atualizarRelatorio(id, payload) {
    const { data, error } = await supabase.from('relatorios').update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async excluirRelatorio(id) {
    const { error } = await supabase.from('relatorios').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ============================================================================
  // CRONOGRAMA
  // ============================================================================

  async getCronograma(obraId) {
    const { data, error } = await supabase.from('obras_cronograma').select('*').eq('obra_id', obraId).order('ordem')
    check(error)
    return data || []
  },

  async criarFaseCronograma(payload) {
    const { data, error } = await supabase.from('obras_cronograma').insert(payload).select().single()
    check(error)
    return data
  },

  async atualizarFaseCronograma(id, payload) {
    const { data, error } = await supabase.from('obras_cronograma').update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async excluirFaseCronograma(id) {
    const { error } = await supabase.from('obras_cronograma').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  async salvarCronograma(obraId, items) {
    // Upsert em bloco
    const rows = items.map(i => ({ ...i, obra_id: obraId }))
    const { data, error } = await supabase.from('obras_cronograma').upsert(rows, { onConflict: 'id' }).select()
    check(error)
    return data
  },

  // ============================================================================
  // ALERTAS
  // ============================================================================

  async getAlertas(obraId = null, apenasNaoResolvidos = true) {
    let query = supabase.from('obras_alertas').select('*').order('criado_em', { ascending: false })
    if (obraId) query = query.eq('obra_id', obraId)
    if (apenasNaoResolvidos) query = query.eq('resolvido', false)
    const { data, error } = await query
    check(error)
    return data || []
  },

  async criarAlerta(payload) {
    const { data, error } = await supabase.from('obras_alertas').insert(payload).select().single()
    check(error)
    return data
  },

  async atualizarAlerta(id, payload) {
    const { data, error } = await supabase.from('obras_alertas').update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async resolverAlerta(id, resolucao = '') {
    const { data, error } = await supabase.from('obras_alertas')
      .update({ resolvido: true, resolucao, resolvido_em: new Date().toISOString() })
      .eq('id', id).select().single()
    check(error)
    return data
  },

  async excluirAlerta(id) {
    const { error } = await supabase.from('obras_alertas').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ============================================================================
  // ETAPAS DA OBRA
  // ============================================================================

  async getEtapas(obraId) {
    const { data, error } = await supabase.from('obras_cronograma')
      .select('*').eq('obra_id', obraId).order('ordem')
    check(error)
    const etapas = data || []
    const pesoConcluido = etapas.filter(e => e.concluido).reduce((sum, e) => sum + (e.peso_percentual || 0), 0)
    const pesoTotal = etapas.reduce((sum, e) => sum + (e.peso_percentual || 0), 0)
    return { etapas, progresso_calculado: pesoTotal > 0 ? Math.round(pesoConcluido / pesoTotal * 100) : 0, peso_total: pesoTotal }
  },

  async getEtapasTemplate() {
    // Retorna etapas padrão de construção civil
    return [
      { nome: 'Fundação', peso_percentual: 15 },
      { nome: 'Estrutura', peso_percentual: 25 },
      { nome: 'Alvenaria', peso_percentual: 15 },
      { nome: 'Cobertura', peso_percentual: 10 },
      { nome: 'Instalações Elétricas', peso_percentual: 10 },
      { nome: 'Instalações Hidráulicas', peso_percentual: 10 },
      { nome: 'Revestimentos', peso_percentual: 10 },
      { nome: 'Acabamentos', peso_percentual: 5 },
    ]
  },

  async criarEtapa(payload) {
    const { data, error } = await supabase.from('obras_cronograma').insert(payload).select().single()
    check(error)
    return data
  },

  async aplicarTemplateEtapas(obraId) {
    const template = await this.getEtapasTemplate()
    const rows = template.map((t, i) => ({ ...t, obra_id: obraId, ordem: i + 1, concluido: false }))
    const { data, error } = await supabase.from('obras_cronograma').insert(rows).select()
    check(error)
    return data
  },

  async atualizarEtapa(id, payload) {
    const { data, error } = await supabase.from('obras_cronograma').update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async toggleEtapa(id) {
    // Busca estado atual e inverte
    const { data: current, error: eGet } = await supabase.from('obras_cronograma').select('concluido').eq('id', id).single()
    check(eGet)
    const { data, error } = await supabase.from('obras_cronograma')
      .update({ concluido: !current.concluido }).eq('id', id).select().single()
    check(error)
    return { concluido: data.concluido }
  },

  async excluirEtapa(id) {
    const { error } = await supabase.from('obras_cronograma').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ============================================================================
  // METAS
  // ============================================================================

  async getMetas(obraId) {
    const { data, error } = await supabase.from('obras_metas').select('*').eq('obra_id', obraId)
    check(error)
    return data || []
  },

  async salvarMeta(payload) {
    const { data, error } = payload.id
      ? await supabase.from('obras_metas').update(payload).eq('id', payload.id).select().single()
      : await supabase.from('obras_metas').insert(payload).select().single()
    check(error)
    return data
  },

  // ============================================================================
  // HISTÓRICO
  // ============================================================================

  async getHistorico(obraId, meses = 12) {
    // Busca relatorios mensais dos últimos N meses
    const { data, error } = await supabase.from('relatorios')
      .select('*').eq('obra_id', obraId).order('criado_em', { ascending: false }).limit(meses)
    check(error)
    return data || []
  },

  // ============================================================================
  // ATIVIDADES E OCORRÊNCIAS
  // ============================================================================

  async criarAtividade(payload) {
    const { data, error } = await supabase.from('relatorios_atividades').insert(payload).select().single()
    check(error)
    return data
  },

  async atualizarAtividade(id, payload) {
    const { data, error } = await supabase.from('relatorios_atividades').update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async excluirAtividade(id) {
    const { error } = await supabase.from('relatorios_atividades').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  async criarOcorrencia(payload) {
    const { data, error } = await supabase.from('relatorios_ocorrencias').insert(payload).select().single()
    check(error)
    return data
  },

  async atualizarOcorrencia(id, payload) {
    const { data, error } = await supabase.from('relatorios_ocorrencias').update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async excluirOcorrencia(id) {
    const { error } = await supabase.from('relatorios_ocorrencias').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ============================================================================
  // ATUALIZAÇÃO DE OBRA
  // ============================================================================

  /**
   * Atualizar progresso da obra
   * @param {number} obraId - ID da obra
   * @param {number} progresso - Novo progresso (0-100)
   * @param {string} observacao - Observação opcional
   * @returns {Promise<Object>}
   */
  async atualizarProgresso(obraId, progresso, observacao = '') {
    const { data, error } = await supabase.from('obras').update({ progresso }).eq('id', obraId).select().single()
    check(error)
    return data
  },

  async atualizarStatusObra(obraId, status) {
    const { data, error } = await supabase.from('obras').update({ status }).eq('id', obraId).select().single()
    check(error)
    return data
  },

  // ============================================================================
  // FUNÇÕES LEGADAS (FALLBACK)
  // ============================================================================

  /**
   * Obter dados detalhados de uma obra específica (FALLBACK)
   */
  async obterDadosObra(obraId, periodo = {}) {
    try {
      const lancamentosRes = await lancamentosService.list({ inicio: periodo.inicio, fim: periodo.fim })
      const lancamentos = lancamentosRes.dados || lancamentosRes
      const lancamentosObra = lancamentos.filter(l => l.obra_id === obraId)

      const totalHoras = lancamentosObra.reduce((sum, l) => sum + this.horasParaDecimal(l.horas), 0);
      const totalLancamentos = lancamentosObra.length;
      const funcionariosUnicos = [...new Set(lancamentosObra.map(l => l.funcionario))].filter(Boolean);

      const porMes = {};
      lancamentosObra.forEach(l => {
        const mes = l.data?.substring(0, 7);
        if (!porMes[mes]) {
          porMes[mes] = { horas: 0, lancamentos: 0, funcionarios: new Set() };
        }
        porMes[mes].horas += this.horasParaDecimal(l.horas);
        porMes[mes].lancamentos++;
        if (l.funcionario) porMes[mes].funcionarios.add(l.funcionario);
      });

      const dadosMensais = Object.entries(porMes)
        .map(([mes, dados]) => ({
          mes,
          horas: dados.horas,
          lancamentos: dados.lancamentos,
          funcionarios: dados.funcionarios.size
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

      return {
        sucesso: true,
        dados: {
          totalHoras,
          totalLancamentos,
          funcionariosCount: funcionariosUnicos.length,
          funcionarios: funcionariosUnicos,
          dadosMensais,
          lancamentos: lancamentosObra
        }
      }
    } catch (error) {
      console.error('Erro ao obter dados da obra:', error)
      throw error
    }
  },

  async obterObrasComMetricas() {
    try {
      const obrasRes = await obrasService.list()
      const obras = obrasRes.dados || obrasRes

      const hoje = new Date()
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
      const lancamentosRes = await lancamentosService.list({
        inicio: this.formatDateForAPI(trintaDiasAtras),
        fim: this.formatDateForAPI(hoje)
      })
      const lancamentos = lancamentosRes.dados || lancamentosRes

      const obrasComMetricas = obras.map(obra => {
        const lancamentosObra = lancamentos.filter(l => l.obra_id === obra.id)

        const totalHoras = lancamentosObra.reduce((sum, l) => sum + this.horasParaDecimal(l.horas), 0);
        const funcionariosUnicos = new Set(lancamentosObra.map(l => l.funcionario).filter(Boolean));

        return {
          ...obra,
          metricas: {
            horasUltimos30Dias: totalHoras,
            lancamentosUltimos30Dias: lancamentosObra.length,
            funcionariosAtivos: funcionariosUnicos.size
          }
        };
      });

      return {
        sucesso: true,
        dados: obrasComMetricas
      }
    } catch (error) {
      console.error('Erro ao obter obras com métricas:', error)
      throw error
    }
  },

  async obterDadosRelatorio(params) {
    try {
      const lancamentosRes = await lancamentosService.list({ inicio: params.inicio, fim: params.fim })
      const lancamentos = lancamentosRes.dados || lancamentosRes
      const filtrados = this.aplicarFiltros(lancamentos, params);
      const agregados = this.calcularAgregados(filtrados);

      return {
        lancamentos: filtrados,
        agregados
      };
    } catch (error) {
      console.error('Erro ao obter dados do relatório:', error);
      throw error;
    }
  },

  /**
   * Aplicar filtros aos lançamentos
   */
  aplicarFiltros(lancamentos, params) {
    let filtrados = [...lancamentos];

    if (params.funcionarios && params.funcionarios.length > 0) {
      filtrados = filtrados.filter(lanc =>
        params.funcionarios.includes(lanc.funcionario)
      );
    }

    if (params.funcoes && params.funcoes.length > 0) {
      filtrados = filtrados.filter(lanc =>
        params.funcoes.includes(lanc.funcao)
      );
    }

    if (params.obras && params.obras.length > 0) {
      filtrados = filtrados.filter(lanc =>
        params.obras.includes(lanc.obra)
      );
    }

    if (params.empresas && params.empresas.length > 0) {
      filtrados = filtrados.filter(lanc =>
        params.empresas.includes(lanc.empresa)
      );
    }

    return filtrados;
  },

  /**
   * Calcular agregações dos dados
   */
  calcularAgregados(lancamentos) {
    const porFuncionario = {};
    const porObra = {};
    const porDia = {};
    const porEmpresa = {};

    lancamentos.forEach(lanc => {
      const horas = this.horasParaDecimal(lanc.horas);

      // Agrupar por funcionário
      if (!porFuncionario[lanc.funcionario]) {
        porFuncionario[lanc.funcionario] = {
          nome: lanc.funcionario,
          funcao: lanc.funcao || 'Não definida',
          empresa: lanc.empresa || 'Não definida',
          horas: 0,
          lancamentos: 0,
          obras: new Set()
        };
      }
      porFuncionario[lanc.funcionario].horas += horas;
      porFuncionario[lanc.funcionario].lancamentos++;
      if (lanc.obra) porFuncionario[lanc.funcionario].obras.add(lanc.obra);

      // Agrupar por obra
      if (lanc.obra) {
        if (!porObra[lanc.obra]) {
          porObra[lanc.obra] = {
            nome: lanc.obra,
            horas: 0,
            lancamentos: 0,
            funcionarios: new Set(),
            empresas: new Set()
          };
        }
        porObra[lanc.obra].horas += horas;
        porObra[lanc.obra].lancamentos++;
        porObra[lanc.obra].funcionarios.add(lanc.funcionario);
        if (lanc.empresa) porObra[lanc.obra].empresas.add(lanc.empresa);
      }

      // Agrupar por dia
      if (!porDia[lanc.data]) {
        porDia[lanc.data] = {
          data: lanc.data,
          horas: 0,
          lancamentos: 0,
          funcionarios: new Set(),
          obras: new Set()
        };
      }
      porDia[lanc.data].horas += horas;
      porDia[lanc.data].lancamentos++;
      porDia[lanc.data].funcionarios.add(lanc.funcionario);
      if (lanc.obra) porDia[lanc.data].obras.add(lanc.obra);

      // Agrupar por empresa
      if (lanc.empresa) {
        if (!porEmpresa[lanc.empresa]) {
          porEmpresa[lanc.empresa] = {
            nome: lanc.empresa,
            horas: 0,
            lancamentos: 0,
            funcionarios: new Set(),
            obras: new Set()
          };
        }
        porEmpresa[lanc.empresa].horas += horas;
        porEmpresa[lanc.empresa].lancamentos++;
        porEmpresa[lanc.empresa].funcionarios.add(lanc.funcionario);
        if (lanc.obra) porEmpresa[lanc.empresa].obras.add(lanc.obra);
      }
    });

    // Converter Sets para contadores
    Object.values(porFuncionario).forEach(f => {
      f.obrasCount = f.obras.size;
      f.obras = Array.from(f.obras);
    });

    Object.values(porObra).forEach(o => {
      o.funcionariosCount = o.funcionarios.size;
      o.empresasCount = o.empresas.size;
      o.funcionarios = Array.from(o.funcionarios);
      o.empresas = Array.from(o.empresas);
    });

    Object.values(porDia).forEach(d => {
      d.funcionariosCount = d.funcionarios.size;
      d.obrasCount = d.obras.size;
      d.funcionarios = Array.from(d.funcionarios);
      d.obras = Array.from(d.obras);
    });

    Object.values(porEmpresa).forEach(e => {
      e.funcionariosCount = e.funcionarios.size;
      e.obrasCount = e.obras.size;
      e.funcionarios = Array.from(e.funcionarios);
      e.obras = Array.from(e.obras);
    });

    return { porFuncionario, porObra, porDia, porEmpresa };
  },

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  formatDateForAPI(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatarDataBR(dataStr) {
    if (!dataStr) return '';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  },

  horasParaDecimal(horas) {
    if (!horas) return 0;
    if (typeof horas === 'number') return horas;

    const partes = horas.toString().split(':');
    const h = parseInt(partes[0]) || 0;
    const m = parseInt(partes[1]) || 0;
    const s = parseInt(partes[2]) || 0;

    return h + (m / 60) + (s / 3600);
  },

  decimalParaHoras(decimal) {
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  },

  formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  },

  formatarNumeroAbreviado(valor) {
    if (!valor) return '0';
    if (valor >= 1000000) return (valor / 1000000).toFixed(1) + 'M';
    if (valor >= 1000) return (valor / 1000).toFixed(0) + 'k';
    return valor.toString();
  },

  // ============================================================================
  // HELPERS PARA O FRONTEND
  // ============================================================================

  calcularAtrasoFase(fase) {
    if (!fase.data_fim_planejada) return 0;

    const planejada = new Date(fase.data_fim_planejada);
    const referencia = fase.data_fim_real ? new Date(fase.data_fim_real) : new Date();

    if (referencia <= planejada) return 0;

    const diffTime = Math.abs(referencia - planejada);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  calcularPosicaoGantt(fase, dataInicioProjeto, dataFimProjeto) {
    if (!fase.data_inicio_planejada || !fase.data_fim_planejada) {
      return { start: 0, width: 0 };
    }

    const inicio = new Date(dataInicioProjeto);
    const fim = new Date(dataFimProjeto);
    const faseInicio = new Date(fase.data_inicio_planejada);
    const faseFim = new Date(fase.data_fim_planejada);

    const totalDias = (fim - inicio) / (1000 * 60 * 60 * 24);
    const startDias = (faseInicio - inicio) / (1000 * 60 * 60 * 24);
    const widthDias = (faseFim - faseInicio) / (1000 * 60 * 60 * 24);

    return {
      start: Math.max(0, (startDias / totalDias) * 100),
      width: Math.min(100 - (startDias / totalDias) * 100, (widthDias / totalDias) * 100)
    };
  },

  getCorRisco(risco) {
    const cores = {
      baixo: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
      medio: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
      alto: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' }
    };
    return cores[risco] || cores.baixo;
  },

  getCorStatus(status) {
    const cores = {
      ativa: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      pausada: { bg: 'bg-amber-100', text: 'text-amber-700' },
      concluida: { bg: 'bg-blue-100', text: 'text-blue-700' },
      atrasada: { bg: 'bg-rose-100', text: 'text-rose-700' }
    };
    return cores[status] || cores.ativa;
  },

  // ============================================================================
  // EXPORTAÇÃO
  // ============================================================================

  exportarCSV(dados, agregados, periodo) {
    try {
      let csv = 'Relatório de Lançamentos\n';
      csv += `Período: ${this.formatarDataBR(periodo.inicio)} a ${this.formatarDataBR(periodo.fim)}\n\n`;

      csv += 'RESUMO GERAL\n';
      csv += `Total de Funcionários:,${Object.keys(agregados.porFuncionario || {}).length}\n`;
      csv += `Total de Obras:,${Object.keys(agregados.porObra || {}).length}\n`;
      csv += `Total de Lançamentos:,${dados.length}\n`;
      const totalHoras = Object.values(agregados.porFuncionario || {}).reduce((sum, f) => sum + f.horas, 0);
      csv += `Total de Horas:,${totalHoras.toFixed(1)}h\n\n`;

      csv += 'LANÇAMENTOS DETALHADOS\n';
      csv += 'Data,Funcionário,Função,Empresa,Obra,Horas,Observação\n';
      dados.forEach(lanc => {
        csv += `${this.formatarDataBR(lanc.data)},${lanc.funcionario},${lanc.funcao || ''},${lanc.empresa || ''},${lanc.obra || ''},${lanc.horas},${(lanc.observacao || '').replace(/,/g, ';')}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_${periodo.inicio}_${periodo.fim}.csv`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      throw error;
    }
  },

  exportarExcel(dados, agregados, periodo) {
    try {
      const wb = XLSX.utils.book_new();

      const dadosDetalhados = dados.map(lanc => ({
        'Data': this.formatarDataBR(lanc.data),
        'Funcionário': lanc.funcionario,
        'Função': lanc.funcao || '',
        'Empresa': lanc.empresa || '',
        'Obra': lanc.obra || '',
        'Horas': lanc.horas,
        'Observação': lanc.observacao || ''
      }));
      const ws1 = XLSX.utils.json_to_sheet(dadosDetalhados);
      XLSX.utils.book_append_sheet(wb, ws1, "Detalhado");

      const dadosFuncionarios = Object.values(agregados.porFuncionario || {})
        .sort((a, b) => b.horas - a.horas)
        .map((f, index) => ({
          'Posição': index + 1,
          'Funcionário': f.nome,
          'Função': f.funcao,
          'Empresa': f.empresa,
          'Horas Totais': f.horas.toFixed(1),
          'Lançamentos': f.lancamentos,
          'Obras': f.obrasCount
        }));
      const ws2 = XLSX.utils.json_to_sheet(dadosFuncionarios);
      XLSX.utils.book_append_sheet(wb, ws2, "Por Funcionário");

      const dadosObras = Object.values(agregados.porObra || {})
        .sort((a, b) => b.horas - a.horas)
        .map((o, index) => ({
          'Posição': index + 1,
          'Obra': o.nome,
          'Horas Totais': o.horas.toFixed(1),
          'Lançamentos': o.lancamentos,
          'Funcionários': o.funcionariosCount,
          'Empresas': o.empresasCount
        }));
      const ws3 = XLSX.utils.json_to_sheet(dadosObras);
      XLSX.utils.book_append_sheet(wb, ws3, "Por Obra");

      const dadosDias = Object.values(agregados.porDia || {})
        .sort((a, b) => a.data.localeCompare(b.data))
        .map(d => ({
          'Data': this.formatarDataBR(d.data),
          'Horas Totais': d.horas.toFixed(1),
          'Lançamentos': d.lancamentos,
          'Funcionários': d.funcionariosCount,
          'Obras': d.obrasCount
        }));
      const ws4 = XLSX.utils.json_to_sheet(dadosDias);
      XLSX.utils.book_append_sheet(wb, ws4, "Por Dia");

      XLSX.writeFile(wb, `relatorio_${periodo.inicio}_${periodo.fim}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      throw error;
    }
  },

  exportarRelatorioObra(obra, dashboardData) {
    try {
      const wb = XLSX.utils.book_new();

      const resumo = [{
        'Obra': obra.nome,
        'Status': obra.status,
        'Progresso': `${obra.progresso}%`,
        'Responsável': obra.responsavel || '',
        'Cidade': obra.cidade || '',
        'Data Início': this.formatarDataBR(obra.data_inicio),
        'Previsão': this.formatarDataBR(obra.data_prevista),
        'Orçamento': this.formatarMoeda(obra.orcamento),
        'Custo Atual': this.formatarMoeda(obra.custo_atual)
      }];
      const ws1 = XLSX.utils.json_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

      if (dashboardData.cronograma?.length) {
        const cronograma = dashboardData.cronograma.map(fase => ({
          'Fase': fase.fase,
          'Status': fase.status,
          'Progresso': `${fase.progresso}%`,
          'Início Planejado': this.formatarDataBR(fase.data_inicio_planejada),
          'Fim Planejado': this.formatarDataBR(fase.data_fim_planejada),
          'Início Real': this.formatarDataBR(fase.data_inicio_real),
          'Fim Real': this.formatarDataBR(fase.data_fim_real)
        }));
        const ws2 = XLSX.utils.json_to_sheet(cronograma);
        XLSX.utils.book_append_sheet(wb, ws2, "Cronograma");
      }

      if (dashboardData.alertas?.length) {
        const alertas = dashboardData.alertas.map(alerta => ({
          'Tipo': alerta.tipo,
          'Categoria': alerta.categoria,
          'Título': alerta.titulo,
          'Mensagem': alerta.mensagem,
          'Prioridade': alerta.prioridade,
          'Data': this.formatarDataBR(alerta.criado_em?.split(' ')[0])
        }));
        const ws3 = XLSX.utils.json_to_sheet(alertas);
        XLSX.utils.book_append_sheet(wb, ws3, "Alertas");
      }

      const filename = `relatorio_${obra.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${this.formatDateForAPI(new Date())}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Erro ao exportar relatório da obra:', error);
      throw error;
    }
  },

  // ============================================================================
  // RELATÓRIOS MENSAIS
  // ============================================================================

  async getRelatorioMensal(obraId, mes) {
    const { data, error } = await supabase.from('relatorios')
      .select('*, relatorios_atividades(*), relatorios_ocorrencias(*), relatorios_fotos(*)')
      .eq('obra_id', obraId).eq('mes_referencia', mes).maybeSingle()
    check(error)
    return data
  },

  async getMesesComRelatorio(obraId, ano) {
    const { data, error } = await supabase.from('relatorios')
      .select('mes_referencia').eq('obra_id', obraId)
      .like('mes_referencia', `${ano}-%`)
    check(error)
    return (data || []).map(r => r.mes_referencia)
  },

  async getFuncionariosMes(obraId, mes) {
    // Busca funcionarios que tiveram lancamentos na obra no mes
    const inicio = `${mes}-01`
    const fim = `${mes}-31`
    const { data, error } = await supabase.from('lancamentos')
      .select('funcionario_id, funcionarios(id, nome)')
      .eq('obra_id', obraId).gte('data', inicio).lte('data', fim)
    check(error)
    // Deduplica
    const unique = {}
    ;(data || []).forEach(l => { if (l.funcionarios) unique[l.funcionario_id] = l.funcionarios })
    return Object.values(unique)
  },

  async getCronogramaMes(obraId, mes) {
    return this.getCronograma(obraId)
  },

  async salvarRelatorioMensal(payload) {
    const { data, error } = payload.id
      ? await supabase.from('relatorios').update(payload).eq('id', payload.id).select().single()
      : await supabase.from('relatorios').insert(payload).select().single()
    check(error)
    return data
  },

  // ============================================================================
  // FOTOS DE RELATÓRIOS
  // ============================================================================

  async listarFotosRelatorio(relatorioId, tipo = null) {
    let query = supabase.from('relatorios_fotos').select('*').eq('relatorio_id', relatorioId).order('ordem')
    if (tipo) query = query.eq('tipo', tipo)
    const { data, error } = await query
    check(error)
    return data || []
  },

  async uploadFotoRelatorio(relatorioId, arquivo, dados = {}) {
    const path = `relatorios/${relatorioId}/${Date.now()}_${arquivo.name}`
    const { error: upErr } = await supabase.storage.from('fotos').upload(path, arquivo)
    check(upErr)
    const { data, error } = await supabase.from('relatorios_fotos').insert({
      relatorio_id: relatorioId,
      nome_arquivo: arquivo.name,
      caminho: path,
      tipo: dados.tipo || 'foto',
      titulo: dados.titulo || '',
      descricao: dados.descricao || '',
    }).select().single()
    check(error)
    return data
  },

  async atualizarFotoRelatorio(fotoId, dados) {
    const { data, error } = await supabase.from('relatorios_fotos').update(dados).eq('id', fotoId).select().single()
    check(error)
    return data
  },

  async excluirFotoRelatorio(fotoId) {
    const { error } = await supabase.from('relatorios_fotos').delete().eq('id', fotoId)
    check(error)
    return { sucesso: true }
  },

  // ============================================================================
  // HELPERS PARA RELATÓRIOS MENSAIS
  // ============================================================================

  /**
   * Formata mês para exibição (ex: "Fevereiro 2026")
   * @param {string} mes - Mês no formato YYYY-MM
   * @returns {string}
   */
  formatarMesExtenso(mes) {
    if (!mes) return '';
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [ano, mesNum] = mes.split('-');
    const mesIndex = parseInt(mesNum, 10) - 1;
    return `${meses[mesIndex]} ${ano}`;
  },

  /**
   * Formata mês abreviado (ex: "Fev")
   * @param {number} mesIndex - Índice do mês (0-11)
   * @returns {string}
   */
  formatarMesAbreviado(mesIndex) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mesIndex] || '';
  },

  /**
   * Obtém cor do status do relatório
   * @param {string} status - Status (rascunho, aberto, fechado, revisao)
   * @returns {Object}
   */
  getCorStatusRelatorio(status) {
    const cores = {
      rascunho: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' },
      aberto: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      fechado: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      revisao: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' }
    };
    return cores[status] || cores.rascunho;
  }
};

export default relatoriosService;
