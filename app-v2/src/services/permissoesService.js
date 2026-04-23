import supabase from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

const permissoesService = {
  async listModules() {
    const { data, error } = await supabase.from('modulos').select('*').order('ordem')
    check(error)
    return data || []
  },

  async getByUsuario(usuarioId) {
    const { data, error } = await supabase
      .from('permissoes')
      .select('*, modulos(nome, titulo)')
      .eq('usuario_id', usuarioId)
    check(error)
    return (data || []).map(p => ({
      ...p,
      modulo: p.modulos?.nome,
      modulo_titulo: p.modulos?.titulo,
    }))
  },

  async save(usuarioId, permissoes) {
    // Upsert todas as permissões de uma vez
    const rows = permissoes.map(p => ({ ...p, usuario_id: usuarioId }))
    const { data, error } = await supabase
      .from('permissoes')
      .upsert(rows, { onConflict: 'usuario_id,modulo_id' })
      .select()
    check(error)
    return data
  },
}

export default permissoesService
