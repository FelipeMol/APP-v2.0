import supabase from '../lib/supabase.js'

const dashboardService = {
  async fetchKpis({ signal, canView } = {}) {
    const allowed = (key) => canView?.[key] !== false

    const safe = async (key, query) => {
      const { data, error } = await query
      if (error) console.error(`[dashboard] erro em ${key}:`, error)
      return data || []
    }

    const safeCount = async (key, query) => {
      const { count, error } = await query
      if (error) console.error(`[dashboard] erro em ${key}:`, error)
      return count || 0
    }

    const [funcionarios, obras, lancamentosCount, tarefasCount, lancamentosRecentes] = await Promise.all([
      allowed('funcionarios')
        ? safe('funcionarios', supabase.from('funcionarios').select('id, empresa'))
        : [],
      allowed('obras')
        ? safe('obras', supabase.from('obras').select('*').order('id', { ascending: true }))
        : [],
      allowed('lancamentos')
        ? safeCount('lancamentos', supabase.from('lancamentos').select('*', { count: 'exact', head: true }))
        : 0,
      allowed('tarefas')
        ? safeCount('tarefas', supabase.from('view_tarefas_resumo').select('*', { count: 'exact', head: true }))
        : 0,
      allowed('lancamentos')
        ? safe('lancamentos_recentes', supabase.from('lancamentos').select('id, data, funcionario, obra, horas, diarias').order('id', { ascending: false }).limit(8))
        : [],
    ])

    return {
      counts: {
        funcionarios: funcionarios.length,
        obras: obras.length,
        lancamentos: lancamentosCount,
        tarefas: tarefasCount,
      },
      data: { obras, lancamentosRecentes },
    }
  },
}

export default dashboardService
