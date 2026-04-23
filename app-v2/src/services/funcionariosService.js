import supabase from '../lib/supabase.js'

const TABLE = 'funcionarios'
const check = (error) => { if (error) throw new Error(error.message) }

const funcionariosService = {
  async list() {
    const { data, error } = await supabase.from(TABLE).select('*').order('nome')
    check(error)
    return { dados: data || [] }
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

export default funcionariosService
