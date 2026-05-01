import supabase from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

// ── Contas ───────────────────────────────────────────────
export const contasService = {
  async list() {
    const { data, error } = await supabase
      .from('financeiro_contas')
      .select('*, empresa:empresa_id(id, nome)')
      .eq('ativo', true)
      .order('nome')
    check(error); return data || []
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('financeiro_contas').insert(payload).select('*, empresa:empresa_id(id, nome)').single()
    check(error); return data
  },
  async update(id, payload) {
    const { data, error } = await supabase
      .from('financeiro_contas').update(payload).eq('id', id).select('*, empresa:empresa_id(id, nome)').single()
    check(error); return data
  },
  async remove(id) {
    const { error } = await supabase
      .from('financeiro_contas').update({ ativo: false }).eq('id', id)
    check(error)
  },
  async saldos(contaIds) {
    if (!contaIds.length) return {}
    const { data, error } = await supabase
      .from('financeiro_lancamentos')
      .select('conta_id, valor, tipo')
      .eq('status', 'pago')
      .in('conta_id', contaIds)
    check(error)
    const map = {}
    contaIds.forEach(id => { map[id] = 0 })
    ;(data || []).forEach(l => {
      map[l.conta_id] = (map[l.conta_id] || 0) + (l.tipo === 'receita' ? +l.valor : -l.valor)
    })
    return map
  },
  async movimentacaoMes(contaIds) {
    if (!contaIds.length) return {}
    const now = new Date()
    const ini = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('financeiro_lancamentos')
      .select('conta_id, valor, tipo, data_pagamento')
      .in('conta_id', contaIds)
      .eq('status', 'pago')
      .gte('data_pagamento', ini)
      .lte('data_pagamento', fim)
    check(error)
    const map = {}
    contaIds.forEach(id => { map[id] = 0 })
    ;(data || []).forEach(l => {
      map[l.conta_id] = (map[l.conta_id] || 0) + +l.valor
    })
    return map
  },
  async ultimoLancamento(contaIds) {
    if (!contaIds.length) return {}
    const { data, error } = await supabase
      .from('financeiro_lancamentos')
      .select('conta_id, data_pagamento')
      .in('conta_id', contaIds)
      .eq('status', 'pago')
      .order('data_pagamento', { ascending: false })
    check(error)
    const map = {}
    ;(data || []).forEach(l => {
      if (!map[l.conta_id]) map[l.conta_id] = l.data_pagamento
    })
    return map
  },
  async pendentes(contaIds) {
    if (!contaIds.length) return {}
    const hoje = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('financeiro_lancamentos')
      .select('conta_id')
      .in('conta_id', contaIds)
      .eq('status', 'pendente')
      .lte('data_vencimento', hoje)
    check(error)
    const map = {}
    contaIds.forEach(id => { map[id] = 0 })
    ;(data || []).forEach(l => { map[l.conta_id] = (map[l.conta_id] || 0) + 1 })
    return map
  },
}

// ── Categorias ───────────────────────────────────────────
export const categoriasService = {
  // Retorna categorias planas (com parent_id). Use buildTree() no front para hierarquia.
  async list(tipo = null) {
    let q = supabase
      .from('financeiro_categorias')
      .select('*')
      .eq('ativo', true)
      .order('tipo')
      .order('nome')
    if (tipo) q = q.eq('tipo', tipo)
    const { data, error } = await q
    check(error); return data || []
  },
  // Retorna apenas categorias raiz (sem pai) — útil para selects
  async listRaiz(tipo = null) {
    let q = supabase
      .from('financeiro_categorias')
      .select('*')
      .eq('ativo', true)
      .is('parent_id', null)
      .order('tipo')
      .order('nome')
    if (tipo) q = q.eq('tipo', tipo)
    const { data, error } = await q
    check(error); return data || []
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('financeiro_categorias').insert(payload).select().single()
    check(error); return data
  },
  async update(id, payload) {
    const { data, error } = await supabase
      .from('financeiro_categorias').update(payload).eq('id', id).select().single()
    check(error); return data
  },
  async remove(id) {
    const { error } = await supabase
      .from('financeiro_categorias').update({ ativo: false }).eq('id', id)
    check(error)
  },
}

// Utilitário: transforma lista plana em árvore { ...cat, subcategorias: [...] }
export function buildCategoriasTree(flat) {
  const map = {}
  flat.forEach(c => { map[c.id] = { ...c, subcategorias: [] } })
  const roots = []
  flat.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].subcategorias.push(map[c.id])
    } else {
      roots.push(map[c.id])
    }
  })
  return roots
}

// ── Lançamento Itens (Rateios) ──────────────────────────────────
export const lancamentoItensService = {
  async saveItens(lancamentoId, itens) {
    // Deleta todos os itens existentes e reinsere
    const { error: delErr } = await supabase
      .from('financeiro_lancamento_itens')
      .delete()
      .eq('lancamento_id', lancamentoId)
    check(delErr)
    if (!itens.length) return []
    const rows = itens.map(item => ({
      lancamento_id: lancamentoId,
      descricao: item.descricao || null,
      categoria_id: item.categoria_id ? parseInt(item.categoria_id) : null,
      centro_custo_id: item.centro_custo_id ? parseInt(item.centro_custo_id) : null,
      valor: parseFloat(item.valor) || 0,
    }))
    const { data, error } = await supabase
      .from('financeiro_lancamento_itens')
      .insert(rows)
      .select('*, financeiro_categorias(nome), financeiro_centros_custo(nome)')
    check(error); return data || []
  },
}

// ── Lançamentos ──────────────────────────────────────────
export const lancamentosFinService = {
  async list(filtros = {}) {
    let q = supabase
      .from('financeiro_lancamentos')
      .select('*, financeiro_categorias(nome,cor,icone), financeiro_contas(nome), contatos(nome,documento,tipo), financeiro_centros_custo(nome), financeiro_lancamento_itens(id,descricao,valor,categoria_id,centro_custo_id,financeiro_categorias(nome),financeiro_centros_custo(nome))')
      .order('data_vencimento', { ascending: true })
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo)
    if (filtros.status)    q = q.eq('status', filtros.status)
    if (filtros.conta_id)  q = q.eq('conta_id', filtros.conta_id)
    if (filtros.obra_id)   q = q.eq('obra_id', filtros.obra_id)
    if (filtros.inicio)    q = q.gte('data_vencimento', filtros.inicio)
    if (filtros.fim)       q = q.lte('data_vencimento', filtros.fim)
    const { data, error } = await q
    check(error); return data || []
  },
  async create(payload, itens = []) {
    const { data, error } = await supabase
      .from('financeiro_lancamentos').insert(payload).select().single()
    check(error)
    if (itens.length > 0) await lancamentoItensService.saveItens(data.id, itens)
    return data
  },
  async update(id, payload, itens = null) {
    const { data, error } = await supabase
      .from('financeiro_lancamentos').update(payload).eq('id', id).select().single()
    check(error)
    if (itens !== null) await lancamentoItensService.saveItens(id, itens)
    return data
  },
  async marcarPago(id) {
    const { data, error } = await supabase
      .from('financeiro_lancamentos')
      .update({ status: 'pago', data_pagamento: new Date().toISOString().slice(0, 10) })
      .eq('id', id).select().single()
    check(error); return data
  },
  async remove(id) {
    const { error } = await supabase.from('financeiro_lancamentos').delete().eq('id', id)
    check(error)
  },
}

// ── Extrato ──────────────────────────────────────────────
export const extratoService = {
  async list(contaId, status = null) {
    let q = supabase
      .from('financeiro_extrato')
      .select('*, financeiro_lancamentos(descricao, valor)')
      .eq('conta_id', contaId)
      .order('data', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    check(error); return data || []
  },
  async addLinha(payload) {
    const { data, error } = await supabase
      .from('financeiro_extrato').insert(payload).select().single()
    check(error); return data
  },
  async importarLinhas(linhas) {
    const { data, error } = await supabase
      .from('financeiro_extrato')
      .upsert(linhas, { onConflict: 'conta_id,hash_linha', ignoreDuplicates: true })
      .select()
    check(error); return data || []
  },
  async conciliar(extratoId, lancamentoId, dataExtrato) {
    const { error: e1 } = await supabase
      .from('financeiro_extrato')
      .update({ status: 'conciliado', lancamento_id: lancamentoId })
      .eq('id', extratoId)
    check(e1)
    const { error: e2 } = await supabase
      .from('financeiro_lancamentos')
      .update({ status: 'pago', data_pagamento: dataExtrato })
      .eq('id', lancamentoId)
    check(e2)
  },
  async desconciliar(extratoId, lancamentoId) {
    const { error: e1 } = await supabase
      .from('financeiro_extrato')
      .update({ status: 'nao_conciliado', lancamento_id: null })
      .eq('id', extratoId)
    check(e1)
    if (lancamentoId) {
      const { error: e2 } = await supabase
        .from('financeiro_lancamentos')
        .update({ status: 'pendente', data_pagamento: null })
        .eq('id', lancamentoId)
      check(e2)
    }
  },
  async ignorar(id) {
    const { error } = await supabase.from('financeiro_extrato').update({ status: 'ignorado' }).eq('id', id)
    check(error)
  },
  async remove(id) {
    const { error } = await supabase.from('financeiro_extrato').delete().eq('id', id)
    check(error)
  },
}

// ── Orçamentos (Previsto) ────────────────────────────────
// previsto por obra × categoria × mês × ano
export const orcamentosService = {
  // Retorna todos os orçamentos de uma obra+ano (ou ano inteiro se obra=null)
  async listByObraAno(obraId, ano) {
    let q = supabase
      .from('financeiro_orcamentos')
      .select('*, financeiro_categorias(id,nome,tipo,parent_id,grupo)')
      .or(`ano.eq.${ano},ano.is.null`)
    if (obraId) q = q.eq('obra_id', obraId)
    else q = q.is('obra_id', null)
    const { data, error } = await q
    check(error); return data || []
  },
  // Upsert um único valor (cria ou atualiza)
  async upsert(obraId, categoriaId, ano, mes, valor) {
    const payload = {
      obra_id: obraId || null,
      categoria_id: categoriaId,
      ano,
      mes,
      valor,
    }
    const { data, error } = await supabase
      .from('financeiro_orcamentos')
      .upsert(payload, { onConflict: 'tenant_id,obra_id,categoria_id,ano,mes' })
      .select()
      .single()
    check(error); return data
  },
  // Upsert em lote (array de { obra_id, categoria_id, ano, mes, valor })
  async upsertBatch(rows) {
    const { data, error } = await supabase
      .from('financeiro_orcamentos')
      .upsert(rows, { onConflict: 'tenant_id,obra_id,categoria_id,ano,mes' })
      .select()
    check(error); return data || []
  },
  async remove(id) {
    const { error } = await supabase.from('financeiro_orcamentos').delete().eq('id', id)
    check(error)
  },
}

// ── Centros de Custo ─────────────────────────────────────
export const centrosCustoService = {
  async list() {
    const { data, error } = await supabase
      .from('financeiro_centros_custo').select('*').eq('ativo', true).order('nome')
    check(error); return data || []
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('financeiro_centros_custo').insert(payload).select().single()
    check(error); return data
  },
  async update(id, payload) {
    const { data, error } = await supabase
      .from('financeiro_centros_custo').update(payload).eq('id', id).select().single()
    check(error); return data
  },
  async remove(id) {
    const { error } = await supabase
      .from('financeiro_centros_custo').update({ ativo: false }).eq('id', id)
    check(error)
  },
}
