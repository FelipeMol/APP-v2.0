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

    const hoje = new Date().toISOString().split('T')[0]
    const primeiroDia = hoje.slice(0, 7) + '-01'

    const [funcionarios, obras, lancamentosCount, tarefasCount, lancamentosRecentes, lancamentosDoMes] = await Promise.all([
      allowed('funcionarios')
        ? safe('funcionarios', supabase.from('funcionarios').select('id').eq('situacao', 'Ativo'))
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
        ? safe('lancamentos_recentes', supabase.from('lancamentos').select('id, data, funcionario, obra, horas, diarias').order('data', { ascending: false }).order('id', { ascending: false }).limit(8))
        : [],
      allowed('lancamentos')
        ? safe('lancamentos_mes', supabase.from('lancamentos').select('id, diarias, funcionario').gte('data', primeiroDia).lte('data', hoje))
        : [],
    ])

    return {
      counts: {
        funcionarios: funcionarios.length,
        obras: obras.length,
        lancamentos: lancamentosCount,
        tarefas: tarefasCount,
      },
      data: { obras, lancamentosRecentes, lancamentosDoMes },
    }
  },
}

export default dashboardService
