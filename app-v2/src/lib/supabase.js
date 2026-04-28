import { createClient } from '@supabase/supabase-js'

// Credenciais do Supabase (apenas a publishable key vai no frontend)
const SUPABASE_URL    = 'https://zkjrghjwnalfhzprsrpc.supabase.co'
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JjS4xfCV-i7B3orHHNi0bw_ALiM2e-5'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ============================================================
// TENANT ISOLATION: Auto-inject tenant_id in all queries
// ============================================================

// Tables that have tenant_id column and should be filtered
const TENANT_TABLES = new Set([
  'empresas', 'obras', 'funcoes', 'funcionarios', 'funcionario_dados',
  'lancamentos', 'etiquetas', 'avaliacoes', 'tarefas', 'contatos',
  'tarefas_checklists', 'tarefas_comentarios', 'tarefas_atividades',
  'tarefas_membros', 'tarefas_etiquetas', 'tarefas_anexos',
  'responsaveis', 'obras_cronograma', 'obras_alertas', 'obras_metas',
  'relatorios', 'relatorios_fotos', 'relatorios_atividades', 'relatorios_ocorrencias',
  'requisicoes_vagas', 'candidatos', 'entrevistas', 'admissoes',
  'financeiro_contas', 'financeiro_lancamentos', 'financeiro_categorias',
  'financeiro_extrato', 'financeiro_centros_custo', 'financeiro_orcamentos',
  'view_tarefas_resumo',
])

// Lazy getter — avoids circular dependency with tenantStore
let _getTenantId = () => 'construtora'

export function initTenantFilter(getter) {
  _getTenantId = getter
}

function tenantId() {
  return _getTenantId() || 'construtora'
}

// Save original .from()
const _originalFrom = supabase.from.bind(supabase)

// Override .from() to inject tenant_id automatically
supabase.from = function (table) {
  const builder = _originalFrom(table)

  if (!TENANT_TABLES.has(table)) return builder

  // --- Intercept .select() to add tenant filter ---
  const origSelect = builder.select.bind(builder)
  builder.select = function (...args) {
    const query = origSelect(...args)
    const tid = tenantId()
    // Only add if not already present (avoid double-filtering)
    if (tid) {
      const origEq = query.eq.bind(query)
      query.eq = function (col, val) { return origEq(col, val) }
      return origEq('tenant_id', tid)
    }
    return query
  }

  // --- Intercept .insert() to add tenant_id to payload ---
  const origInsert = builder.insert.bind(builder)
  builder.insert = function (payload, ...args) {
    const tid = tenantId()
    if (Array.isArray(payload)) {
      payload = payload.map(p => ({ ...p, tenant_id: tid }))
    } else if (payload && typeof payload === 'object') {
      payload = { ...payload, tenant_id: tid }
    }
    return origInsert(payload, ...args)
  }

  // --- Intercept .upsert() to add tenant_id to payload ---
  const origUpsert = builder.upsert.bind(builder)
  builder.upsert = function (payload, ...args) {
    const tid = tenantId()
    if (Array.isArray(payload)) {
      payload = payload.map(p => ({ ...p, tenant_id: tid }))
    } else if (payload && typeof payload === 'object') {
      payload = { ...payload, tenant_id: tid }
    }
    return origUpsert(payload, ...args)
  }

  // --- Intercept .update() to add tenant filter ---
  const origUpdate = builder.update.bind(builder)
  builder.update = function (payload, ...args) {
    const query = origUpdate(payload, ...args)
    const tid = tenantId()
    if (tid) return query.eq('tenant_id', tid)
    return query
  }

  // --- Intercept .delete() to add tenant filter ---
  const origDelete = builder.delete.bind(builder)
  builder.delete = function (...args) {
    const query = origDelete(...args)
    const tid = tenantId()
    if (tid) return query.eq('tenant_id', tid)
    return query
  }

  return builder
}

export default supabase