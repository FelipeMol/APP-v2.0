import supabase from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

const tarefasService = {
  // ==================== TAREFAS PRINCIPAIS ====================

  async listar(filtros = {}) {
    let query = supabase
      .from('view_tarefas_resumo')
      .select('*')
      .order('criado_em', { ascending: false })

    if (filtros.status)                  query = query.eq('status', filtros.status)
    if (filtros.prioridade)              query = query.eq('prioridade', filtros.prioridade)
    if (filtros.usuario_responsavel_id)  query = query.eq('usuario_responsavel_id', filtros.usuario_responsavel_id)
    if (filtros.obra_id)                 query = query.eq('obra_id', filtros.obra_id)
    if (filtros.empresa_id)              query = query.eq('empresa_id', filtros.empresa_id)
    if (filtros.funcionario_id)          query = query.eq('funcionario_id', filtros.funcionario_id)

    const { data, error } = await query
    check(error)
    return data || []
  },

  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('view_tarefas_resumo')
      .select('*')
      .eq('id', id)
      .single()
    check(error)
    return data
  },

  async criar(dados) {
    const { data, error } = await supabase.from('tarefas').insert(dados).select().single()
    check(error)
    return data
  },

  async atualizar(id, dados) {
    const { data, error } = await supabase.from('tarefas').update(dados).eq('id', id).select().single()
    check(error)
    return data
  },

  async excluir(id) {
    const { error } = await supabase.from('tarefas').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ==================== ETIQUETAS ====================

  async listarEtiquetas() {
    const { data, error } = await supabase.from('etiquetas').select('*').order('nome')
    check(error)
    return data || []
  },

  async listarEtiquetasTarefa(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_etiquetas')
      .select('*, etiquetas(id, nome, cor)')
      .eq('tarefa_id', tarefaId)
    check(error)
    return data || []
  },

  async criarEtiqueta(dados) {
    const { data, error } = await supabase.from('etiquetas').insert(dados).select().single()
    check(error)
    return data
  },

  async associarEtiqueta(tarefaId, etiquetaId) {
    const { data, error } = await supabase
      .from('tarefas_etiquetas')
      .insert({ tarefa_id: tarefaId, etiqueta_id: etiquetaId })
      .select().single()
    check(error)
    return data
  },

  async removerEtiqueta(id) {
    const { error } = await supabase.from('tarefas_etiquetas').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ==================== CHECKLISTS ====================

  async listarChecklists(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_checklists')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('ordem')
    check(error)
    return data || []
  },

  async criarChecklistItem(dados) {
    const { data, error } = await supabase.from('tarefas_checklists').insert(dados).select().single()
    check(error)
    return data
  },

  async atualizarChecklistItem(id, dados) {
    const { data, error } = await supabase.from('tarefas_checklists').update(dados).eq('id', id).select().single()
    check(error)
    return data
  },

  async excluirChecklistItem(id) {
    const { error } = await supabase.from('tarefas_checklists').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ==================== MEMBROS ====================

  async listarMembros(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_membros')
      .select('*, usuarios(id, nome, avatar)')
      .eq('tarefa_id', tarefaId)
    check(error)
    return data || []
  },

  async adicionarMembro(dados) {
    const { data, error } = await supabase.from('tarefas_membros').insert(dados).select().single()
    check(error)
    return data
  },

  async atualizarPapelMembro(id, papel) {
    const { data, error } = await supabase.from('tarefas_membros').update({ papel }).eq('id', id).select().single()
    check(error)
    return data
  },

  async removerMembro(id) {
    const { error } = await supabase.from('tarefas_membros').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ==================== COMENTÁRIOS ====================

  async listarComentarios(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_comentarios')
      .select('*, usuarios(id, nome, avatar)')
      .eq('tarefa_id', tarefaId)
      .order('criado_em')
    check(error)
    return data || []
  },

  async criarComentario(dados) {
    const { data, error } = await supabase.from('tarefas_comentarios').insert(dados).select().single()
    check(error)
    return data
  },

  async excluirComentario(id) {
    const { error } = await supabase.from('tarefas_comentarios').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ==================== ANEXOS ====================

  async listarAnexos(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_anexos')
      .select('*')
      .eq('tarefa_id', tarefaId)
    check(error)
    return data || []
  },

  // Upload de anexo: usa Supabase Storage
  async uploadAnexo(tarefaId, arquivo, usuarioId) {
    const path = `tarefas/${tarefaId}/${Date.now()}_${arquivo.name}`
    const { error: upErr } = await supabase.storage.from('anexos').upload(path, arquivo)
    check(upErr)
    const { data, error } = await supabase.from('tarefas_anexos').insert({
      tarefa_id:     tarefaId,
      usuario_id:    usuarioId,
      nome_original: arquivo.name,
      nome_arquivo:  arquivo.name,
      caminho:       path,
      tamanho:       arquivo.size,
      tipo_mime:     arquivo.type,
    }).select().single()
    check(error)
    return data
  },

  async excluirAnexo(id) {
    const { error } = await supabase.from('tarefas_anexos').delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ==================== ATIVIDADES ====================

  async listarAtividades(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_atividades')
      .select('*, usuarios(id, nome)')
      .eq('tarefa_id', tarefaId)
      .order('criado_em', { ascending: false })
    check(error)
    return data || []
  },
}

export default tarefasService
