import supabase from '../lib/supabase.js'

const TABLE = 'funcoes'
const check = (error) => { if (error) throw new Error(error.message) }

const funcoesService = {
  async list(params = {}) {
    let query = supabase.from(TABLE).select('*').order('nome')
    // Nota: filtro de ativo removido da query — tipo incerto no Supabase (tinyint migrado).
    // Filtragem por ativo é feita client-side nas páginas.
    const { data, error } = await query
    check(error)
    return data || []
  },

  async create(payload) {
    const { data, error } = await supabase.from(TABLE).insert(payload).select().single()
    check(error)
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single()
    check(error)
    return data
  },

  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },
}

export default funcoesService
