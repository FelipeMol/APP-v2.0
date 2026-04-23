import supabase from '../lib/supabase.js'

const TABLE = 'lancamentos'

// Lança erro se a resposta do Supabase tiver erro
function check(error, msg) {
  if (error) throw new Error(error.message || msg)
}

const lancamentosService = {
  async list(params = {}) {
    // Busca em lotes de 1000 até ter todos os registros
    const PAGE = 1000
    let all = []
    let from = 0

    while (true) {
      let query = supabase
        .from(TABLE)
        .select('*')
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false })
        .range(from, from + PAGE - 1)

      if (params.inicio) query = query.gte('data', params.inicio)
      if (params.fim)    query = query.lte('data', params.fim)

      const { data, error } = await query
      check(error, 'Erro ao buscar lançamentos')
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
      from += PAGE
    }

    // Normaliza horas: PostgreSQL retorna 'HH:MM:SS' → corta para 'HH:MM'
    const dados = all.map(l => ({
      ...l,
      horas: l.horas ? l.horas.slice(0, 5) : '08:00',
    }))
    return { dados }
  },

  async create(payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single()
    check(error, 'Erro ao criar lançamento')
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    check(error, 'Erro ao atualizar lançamento')
    return data
  },

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    check(error, 'Erro ao excluir lançamento')
    return { sucesso: true }
  },
}

export default lancamentosService
