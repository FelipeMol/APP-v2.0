import supabase from '../lib/supabase.js'
import useTenantStore from '../store/tenantStore.js'

const TABLE = 'funcionarios'
const check = (error) => { if (error) throw new Error(error.message) }
const getTenantId = () => useTenantStore.getState().selectedTenantId || 'construtora'

const funcionariosService = {
  async list() {
    const tenantId = getTenantId()
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nome')
    check(error)
    return { dados: data || [] }
  },

  async create(payload) {
    const tenantId = getTenantId()
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single()
    check(error)
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    check(error)
    return data
  },

  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  // ========================================
  // DADOS ADICIONAIS DO FUNCIONÁRIO (abas do drawer)
  // ========================================

  async getDados(funcionarioId) {
    const { data, error } = await supabase
      .from('funcionario_dados')
      .select('dados')
      .eq('funcionario_id', funcionarioId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data?.dados || null
  },

  async upsertDados(funcionarioId, dados) {
    const tenantId = getTenantId()
    const { error } = await supabase
      .from('funcionario_dados')
      .upsert(
        { funcionario_id: funcionarioId, dados, tenant_id: tenantId },
        { onConflict: 'funcionario_id' }
      )
    if (error) throw new Error(error.message)
  },
}

export default funcionariosService
