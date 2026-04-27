import supabase from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

export const contatosService = {
  async list(tipo = null) {
    let q = supabase.from('contatos').select('*').eq('ativo', true).order('nome')
    if (tipo) q = q.eq('tipo', tipo)
    const { data, error } = await q
    check(error); return data || []
  },
  async create(payload) {
    const { data, error } = await supabase
      .from('contatos').insert(payload).select().single()
    check(error); return data
  },
  async update(id, payload) {
    const { data, error } = await supabase
      .from('contatos').update(payload).eq('id', id).select().single()
    check(error); return data
  },
  async remove(id) {
    const { error } = await supabase
      .from('contatos').update({ ativo: false }).eq('id', id)
    check(error)
  },
  async search(termo) {
    // Sanitizar para evitar injeção de filtros PostgREST
    const safe = termo.replace(/[%_,()']/g, '').trim()
    const safeDigits = safe.replace(/\D/g, '')
    const { data, error } = await supabase
      .from('contatos').select('id, nome, documento, tipo_documento, tipo')
      .eq('ativo', true)
      .or(`nome.ilike.%${safe}%,documento.ilike.%${safeDigits || safe}%`)
      .order('nome')
      .limit(20)
    check(error); return data || []
  },
}
