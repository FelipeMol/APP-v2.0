import supabase from '../lib/supabase.js'

const check = (e) => { if (e) throw new Error(e.message) }

export const comprasPedidosService = {
  async list(filtros = {}) {
    let q = supabase
      .from('compras_pedidos')
      .select(`
        *,
        contato:contato_id(id, nome),
        obra:obra_id(id, nome),
        conta:conta_id(id, nome),
        categoria:categoria_id(id, nome),
        itens:compras_itens(id, descricao, unidade, quantidade, valor_unitario, valor_total),
        anexos:compras_anexos(id, nome_original, caminho, tamanho, tipo_mime, criado_em)
      `)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })

    if (filtros.inicio)   q = q.gte('data', filtros.inicio)
    if (filtros.fim)      q = q.lte('data', filtros.fim)
    if (filtros.status)   q = q.eq('status', filtros.status)
    if (filtros.obra_id)  q = q.eq('obra_id', filtros.obra_id)

    const { data, error } = await q
    check(error)
    return (data || []).map(p => ({
      ...p,
      anexos: (p.anexos || []).map(a => ({
        ...a,
        url: supabase.storage.from('anexos').getPublicUrl(a.caminho).data.publicUrl,
      })),
    }))
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('compras_pedidos')
      .insert(payload)
      .select('*, contato:contato_id(id, nome), obra:obra_id(id, nome), conta:conta_id(id, nome), categoria:categoria_id(id, nome)')
      .single()
    check(error)
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('compras_pedidos')
      .update(payload)
      .eq('id', id)
      .select('*, contato:contato_id(id, nome), obra:obra_id(id, nome), conta:conta_id(id, nome), categoria:categoria_id(id, nome)')
      .single()
    check(error)
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('compras_pedidos').delete().eq('id', id)
    check(error)
  },
}

export const comprasItensService = {
  async replaceAll(pedidoId, itens) {
    const { error: delErr } = await supabase
      .from('compras_itens')
      .delete()
      .eq('pedido_id', pedidoId)
    check(delErr)

    if (!itens || itens.length === 0) return []

    const { data, error } = await supabase
      .from('compras_itens')
      .insert(itens.map(({ descricao, unidade, quantidade, valor_unitario }) => ({
        pedido_id: pedidoId,
        descricao,
        unidade: unidade || 'un',
        quantidade: parseFloat(quantidade) || 0,
        valor_unitario: parseFloat(valor_unitario) || 0,
      })))
      .select()
    check(error)
    return data || []
  },
}

export const comprasAnexosService = {
  async list(pedidoId) {
    const { data, error } = await supabase
      .from('compras_anexos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('criado_em', { ascending: false })
    check(error)
    return (data || []).map(a => ({
      ...a,
      url: supabase.storage.from('anexos').getPublicUrl(a.caminho).data.publicUrl,
    }))
  },

  async upload(pedidoId, arquivo) {
    const path = `compras/${pedidoId}/${Date.now()}_${arquivo.name}`
    const { error: upErr } = await supabase.storage.from('anexos').upload(path, arquivo)
    check(upErr)
    const { data, error } = await supabase
      .from('compras_anexos')
      .insert({
        pedido_id:     pedidoId,
        nome_original: arquivo.name,
        caminho:       path,
        tamanho:       arquivo.size,
        tipo_mime:     arquivo.type,
      })
      .select()
      .single()
    check(error)
    return {
      ...data,
      url: supabase.storage.from('anexos').getPublicUrl(path).data.publicUrl,
    }
  },

  async remove(id, caminho) {
    if (caminho) {
      await supabase.storage.from('anexos').remove([caminho])
    }
    const { error } = await supabase.from('compras_anexos').delete().eq('id', id)
    check(error)
  },
}
