import supabase from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

class RHService {
  // ========================================
  // REQUISIÃ‡Ã•ES DE VAGAS
  // ========================================
  async listarRequisicoes(filtros = {}) {
    let query = supabase.from('requisicoes_vagas').select('*, obras(nome)').order('criado_em', { ascending: false })
    if (filtros.status)  query = query.eq('status', filtros.status)
    if (filtros.obra_id) query = query.eq('obra_id', filtros.obra_id)
    const { data, error } = await query
    check(error)
    return data || []
  }

  async criarRequisicao(dados) {
    const { data, error } = await supabase.from('requisicoes_vagas').insert(dados).select().single()
    check(error)
    return data
  }

  async aprovarRequisicao(id, nivel) {
    const updates = nivel === 1
      ? { aprovado_nivel1: true, aprovado_nivel1_em: new Date().toISOString() }
      : { aprovado_nivel2: true, aprovado_nivel2_em: new Date().toISOString(), status: 'aprovada' }
    const { data, error } = await supabase.from('requisicoes_vagas').update(updates).eq('id', id).select().single()
    check(error)
    return data
  }

  async atualizarStatusRequisicao(id, status, observacoes) {
    const { data, error } = await supabase.from('requisicoes_vagas').update({ status, observacoes }).eq('id', id).select().single()
    check(error)
    return data
  }

  // ========================================
  // CANDIDATOS
  // ========================================
  async listarCandidatos(filtros = {}) {
    let query = supabase.from('candidatos').select('*, requisicoes_vagas(cargo)').order('criado_em', { ascending: false })
    if (filtros.status)        query = query.eq('status', filtros.status)
    if (filtros.requisicao_id) query = query.eq('requisicao_id', filtros.requisicao_id)
    const { data, error } = await query
    check(error)
    return data || []
  }

  async criarCandidato(dados) {
    const { data, error } = await supabase.from('candidatos').insert(dados).select().single()
    check(error)
    return data
  }

  async atualizarCandidato(dados) {
    const { id, ...rest } = dados
    const { data, error } = await supabase.from('candidatos').update(rest).eq('id', id).select().single()
    check(error)
    return data
  }

  // ========================================
  // ENTREVISTAS
  // ========================================
  async listarEntrevistas(candidato_id) {
    let query = supabase.from('entrevistas').select('*').order('data_agendada')
    if (candidato_id) query = query.eq('candidato_id', candidato_id)
    const { data, error } = await query
    check(error)
    return data || []
  }

  async agendarEntrevista(dados) {
    const { data, error } = await supabase.from('entrevistas').insert(dados).select().single()
    check(error)
    return data
  }

  async avaliarEntrevista(dados) {
    const { id, ...rest } = dados
    const { data, error } = await supabase.from('entrevistas').update({ ...rest, realizada: true }).eq('id', id).select().single()
    check(error)
    return data
  }

  // ========================================
  // ADMISSÃ•ES
  // ========================================
  async listarAdmissoes(status) {
    let query = supabase.from('admissoes').select('*, candidatos(nome), funcionarios(nome)').order('criado_em', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    check(error)
    return data || []
  }

  async criarAdmissao(dados) {
    const { data, error } = await supabase.from('admissoes').insert(dados).select().single()
    check(error)
    return data
  }

  async atualizarChecklistAdmissao(dados) {
    const { id, ...rest } = dados
    const { data, error } = await supabase.from('admissoes').update(rest).eq('id', id).select().single()
    check(error)
    return data
  }

  async finalizarAdmissao(admissao_id, criar_experiencia = true) {
    const { data, error } = await supabase.from('admissoes')
      .update({ status: 'concluida', concluida_em: new Date().toISOString() })
      .eq('id', admissao_id).select().single()
    check(error)
    return data
  }

  // ========================================
  // EXPERIÃŠNCIAS (via avaliacoes)
  // ========================================
  async listarExperiencias(filtros = {}) {
    let query = supabase.from('avaliacoes').select('*, funcionarios(nome)').order('criado_em', { ascending: false })
    if (filtros.funcionario_id) query = query.eq('funcionario_id', filtros.funcionario_id)
    if (filtros.status)         query = query.eq('status', filtros.status)
    const { data, error } = await query
    check(error)
    return data || []
  }

  async avaliarExperiencia(dados) {
    const { id, ...rest } = dados
    const { data, error } = await supabase.from('avaliacoes').update(rest).eq('id', id).select().single()
    check(error)
    return data
  }

  // ========================================
  // AVALIAÃ‡Ã•ES DE DESEMPENHO
  // ========================================
  async listarAvaliacoes(funcionario_id) {
    let query = supabase.from('avaliacoes').select('*').order('criado_em', { ascending: false })
    if (funcionario_id) query = query.eq('funcionario_id', funcionario_id)
    const { data, error } = await query
    check(error)
    return data || []
  }

  async criarAvaliacao(dados) {
    const { data, error } = await supabase.from('avaliacoes').insert(dados).select().single()
    check(error)
    return data
  }

  async enviarAvaliacao(id) {
    const { data, error } = await supabase.from('avaliacoes').update({ enviada: true, enviada_em: new Date().toISOString() }).eq('id', id).select().single()
    check(error)
    return data
  }

  // ========================================
  // DOCUMENTOS (sem tabela dedicada - placeholder)
  // ========================================
  async listarDocumentos(funcionario_id, tipo) {
    // Tabela de documentos pode ser adicionada depois; retorna vazio por ora
    return []
  }

  async adicionarDocumento(dados) {
    return { sucesso: true, mensagem: 'Funcionalidade a implementar' }
  }

  // ========================================
  // DESLIGAMENTOS (placeholder)
  // ========================================
  async criarDesligamento(dados) {
    // Atualiza o funcionÃ¡rio como inativo
    const { data, error } = await supabase.from('funcionarios')
      .update({ ativo: false, data_demissao: dados.data_demissao })
      .eq('id', dados.funcionario_id).select().single()
    check(error)
    return data
  }

  async atualizarChecklistDesligamento(dados) {
    return { sucesso: true }
  }

  // ========================================
  // DASHBOARD E RELATÃ“RIOS
  // ========================================
  async getDashboard() {
    const [{ data: requisicoes }, { data: candidatos }, { data: admissoes }, { data: avaliacoes }] = await Promise.all([
      supabase.from('requisicoes_vagas').select('status'),
      supabase.from('candidatos').select('status'),
      supabase.from('admissoes').select('status'),
      supabase.from('avaliacoes').select('nota_geral'),
    ])
    return {
      requisicoes_abertas: (requisicoes || []).filter(r => r.status === 'aberta').length,
      candidatos_em_processo: (candidatos || []).filter(c => ['em_processo', 'entrevistado'].includes(c.status)).length,
      admissoes_pendentes: (admissoes || []).filter(a => a.status !== 'concluida').length,
      total_avaliacoes: (avaliacoes || []).length,
    }
  }

  async getRelatorioTurnover(ano) {
    return { ano, dados: [] } // Placeholder - implementar conforme necessidade
  }

  async getRelatorioAdmissoes(ano) {
    const { data, error } = await supabase.from('admissoes')
      .select('*').gte('criado_em', `${ano}-01-01`).lt('criado_em', `${parseInt(ano) + 1}-01-01`)
    check(error)
    return data || []
  }
}

export default new RHService()

