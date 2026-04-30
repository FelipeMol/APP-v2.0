-- ============================================================
-- CORREÇÃO: RLS das tabelas financeiras
-- Usa current_tenant() (padrão do projeto) em vez de
-- current_setting('app.tenant_id') que causava 403.
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Função current_tenant() corrigida ───────────────────
-- Ordem de prioridade:
-- 1. Variável de sessão (PHP backend define: SET app.current_tenant = 'xxx')
-- 2. JWT app_metadata.tenant_id  (Supabase JS / REST API)
-- 3. Fallback 'construtora'
CREATE OR REPLACE FUNCTION current_tenant()
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_tenant', true), ''),
    (auth.jwt()->'app_metadata'->>'tenant_id')::text,
    'construtora'
  );
$$ LANGUAGE SQL STABLE;

-- Helper: superadmin pode operar em qualquer tenant
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'role')::text = 'superadmin', false);
$$ LANGUAGE SQL STABLE;

-- ── financeiro_categorias ───────────────────────────────
ALTER TABLE financeiro_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_cat_tenant_isolation  ON financeiro_categorias;
DROP POLICY IF EXISTS "tenant_select_fin_cat"   ON financeiro_categorias;
DROP POLICY IF EXISTS "tenant_insert_fin_cat"   ON financeiro_categorias;
DROP POLICY IF EXISTS "tenant_update_fin_cat"   ON financeiro_categorias;
DROP POLICY IF EXISTS "tenant_delete_fin_cat"   ON financeiro_categorias;

CREATE POLICY "tenant_select_fin_cat" ON financeiro_categorias
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_cat" ON financeiro_categorias
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_cat" ON financeiro_categorias
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_cat" ON financeiro_categorias
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- ── financeiro_contas ───────────────────────────────────
ALTER TABLE financeiro_contas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_fin_contas" ON financeiro_contas;
DROP POLICY IF EXISTS "tenant_insert_fin_contas" ON financeiro_contas;
DROP POLICY IF EXISTS "tenant_update_fin_contas" ON financeiro_contas;
DROP POLICY IF EXISTS "tenant_delete_fin_contas" ON financeiro_contas;

CREATE POLICY "tenant_select_fin_contas" ON financeiro_contas
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_contas" ON financeiro_contas
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_contas" ON financeiro_contas
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_contas" ON financeiro_contas
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- ── financeiro_lancamentos ──────────────────────────────
ALTER TABLE financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_fin_lanc" ON financeiro_lancamentos;
DROP POLICY IF EXISTS "tenant_insert_fin_lanc" ON financeiro_lancamentos;
DROP POLICY IF EXISTS "tenant_update_fin_lanc" ON financeiro_lancamentos;
DROP POLICY IF EXISTS "tenant_delete_fin_lanc" ON financeiro_lancamentos;

CREATE POLICY "tenant_select_fin_lanc" ON financeiro_lancamentos
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_lanc" ON financeiro_lancamentos
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_lanc" ON financeiro_lancamentos
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_lanc" ON financeiro_lancamentos
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- ── financeiro_extrato ──────────────────────────────────
ALTER TABLE financeiro_extrato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_fin_ext" ON financeiro_extrato;
DROP POLICY IF EXISTS "tenant_insert_fin_ext" ON financeiro_extrato;
DROP POLICY IF EXISTS "tenant_update_fin_ext" ON financeiro_extrato;
DROP POLICY IF EXISTS "tenant_delete_fin_ext" ON financeiro_extrato;

CREATE POLICY "tenant_select_fin_ext" ON financeiro_extrato
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_ext" ON financeiro_extrato
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_ext" ON financeiro_extrato
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_ext" ON financeiro_extrato
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- ── financeiro_centros_custo ────────────────────────────
ALTER TABLE financeiro_centros_custo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_cc_tenant_isolation       ON financeiro_centros_custo;
DROP POLICY IF EXISTS "tenant_select_fin_cc"        ON financeiro_centros_custo;
DROP POLICY IF EXISTS "tenant_insert_fin_cc"        ON financeiro_centros_custo;
DROP POLICY IF EXISTS "tenant_update_fin_cc"        ON financeiro_centros_custo;
DROP POLICY IF EXISTS "tenant_delete_fin_cc"        ON financeiro_centros_custo;

CREATE POLICY "tenant_select_fin_cc" ON financeiro_centros_custo
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_cc" ON financeiro_centros_custo
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_cc" ON financeiro_centros_custo
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_cc" ON financeiro_centros_custo
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- ── financeiro_orcamentos ───────────────────────────────
ALTER TABLE financeiro_orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_orc_tenant_isolation      ON financeiro_orcamentos;
DROP POLICY IF EXISTS "tenant_select_fin_orc"       ON financeiro_orcamentos;
DROP POLICY IF EXISTS "tenant_insert_fin_orc"       ON financeiro_orcamentos;
DROP POLICY IF EXISTS "tenant_update_fin_orc"       ON financeiro_orcamentos;
DROP POLICY IF EXISTS "tenant_delete_fin_orc"       ON financeiro_orcamentos;

CREATE POLICY "tenant_select_fin_orc" ON financeiro_orcamentos
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_orc" ON financeiro_orcamentos
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_orc" ON financeiro_orcamentos
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_orc" ON financeiro_orcamentos
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());
