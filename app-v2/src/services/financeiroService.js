import supabase from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

// ── Contas ───────────────────────────────────────────────
export const contasService = {
  async list() {
    const { data, error } = await supabase
      .from('financeiro_contas').select('*').eq('ativo', true).order('nome')
    check(error); return data || []
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('financeiro_contas').insert(payload).select().single()
    check(error); return data
  },
  async update(id, payload) {
    const { data, error } = await supabase
      .from('financeiro_contas').update(payload).eq('id', id).select().single()
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
}

// ── Categorias ───────────────────────────────────────────
export const categoriasService = {
  async list(tipo = null) {
    let q = supabase.from('financeiro_categorias').select('*').eq('ativo', true).order('tipo').order('nome')
    if (tipo) q = q.eq('tipo', tipo)
    const { data, error } = await q
    check(error); return data || []
  },
}

// ── Lançamentos ──────────────────────────────────────────
export const lancamentosFinService = {
  async list(filtros = {}) {
    let q = supabase
      .from('financeiro_lancamentos')
      .select('*, financeiro_categorias(nome,cor,icone), financeiro_contas(nome)')
      .order('data_vencimento', { ascending: true })
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo)
    if (filtros.status)    q = q.eq('status', filtros.status)
    if (filtros.conta_id)  q = q.eq('conta_id', filtros.conta_id)
    if (filtros.inicio)    q = q.gte('data_vencimento', filtros.inicio)
    if (filtros.fim)       q = q.lte('data_vencimento', filtros.fim)
    const { data, error } = await q
    check(error); return data || []
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('financeiro_lancamentos').insert(payload).select().single()
    check(error); return data
  },
  async update(id, payload) {
    const { data, error } = await supabase
      .from('financeiro_lancamentos').update(payload).eq('id', id).select().single()
    check(error); return data
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
