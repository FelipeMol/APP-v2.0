-- ============================================================
-- MIGRATION 13: Fix Abrangente de RLS + Tenant Isolation
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================
-- PROBLEMAS CORRIGIDOS:
-- 1. Superadmin (role=superadmin no JWT) não conseguia criar/editar
--    registros de outros tenants → todas as tabelas ganham bypass
-- 2. current_tenant() já corrigida na migration 11 (lê JWT)
-- 3. DEFAULT 'construtora' nas tabelas → trocado para current_tenant()
-- 4. financeiro_recorrencias e financeiro_nfse sem tenant_id → adicionado
-- 5. trigger_set_tenant_id atualizada para usar current_tenant() (não 'construtora')
-- ============================================================

-- ── 0. Garantir helpers ──────────────────────────────────
CREATE OR REPLACE FUNCTION current_tenant()
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_tenant', true), ''),
    (auth.jwt()->'app_metadata'->>'tenant_id')::text,
    'construtora'
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'role')::text = 'superadmin', false);
$$ LANGUAGE SQL STABLE;

-- ── 1. Corrigir trigger_set_tenant_id ───────────────────
-- O trigger existente usava 'construtora' como fallback fixo
CREATE OR REPLACE FUNCTION trigger_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
    NEW.tenant_id := current_tenant();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Superadmin bypass: UMA policy permissiva por tabela
--    Policy permissiva = se ANY policy liberar, a linha passa
--    Isso não altera as policies existentes de tenant isolation
-- ────────────────────────────────────────────────────────

-- Helper para criar o bypass de uma vez
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'empresas','obras','funcoes','funcionarios','lancamentos',
    'etiquetas','avaliacoes','responsaveis',
    'obras_cronograma','obras_alertas','obras_metas',
    'relatorios','relatorios_fotos','relatorios_atividades','relatorios_ocorrencias',
    'requisicoes_vagas','candidatos','entrevistas','admissoes',
    'funcionario_dados','contatos',
    'tarefas','tarefas_anexos','tarefas_atividades',
    'tarefas_checklists','tarefas_comentarios','tarefas_etiquetas','tarefas_membros',
    'financeiro_contas','financeiro_lancamentos','financeiro_categorias',
    'financeiro_extrato','financeiro_centros_custo','financeiro_orcamentos',
    'financeiro_recorrencias','financeiro_nfse'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Garante que RLS está habilitado
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    -- Remove bypass antigo se existir
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_bypass" ON %I;', tbl);
    -- Cria bypass permissivo para superadmin
    EXECUTE format(
      'CREATE POLICY "superadmin_bypass" ON %I USING (is_superadmin()) WITH CHECK (is_superadmin());',
      tbl
    );
  END LOOP;
END $$;

-- ── 3. Adicionar tenant_id em tabelas que faltam ────────

-- financeiro_recorrencias (tem empresa_id mas não tenant_id)
ALTER TABLE financeiro_recorrencias
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';

UPDATE financeiro_recorrencias SET tenant_id = current_tenant()
  WHERE tenant_id = 'construtora' AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='financeiro_recorrencias' AND column_name='tenant_id'
  );

DROP POLICY IF EXISTS "superadmin_bypass" ON financeiro_recorrencias;
DROP POLICY IF EXISTS "tenant_select_fin_recorr" ON financeiro_recorrencias;
DROP POLICY IF EXISTS "tenant_insert_fin_recorr" ON financeiro_recorrencias;
DROP POLICY IF EXISTS "tenant_update_fin_recorr" ON financeiro_recorrencias;
DROP POLICY IF EXISTS "tenant_delete_fin_recorr" ON financeiro_recorrencias;

ALTER TABLE financeiro_recorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_fin_recorr" ON financeiro_recorrencias
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_recorr" ON financeiro_recorrencias
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_recorr" ON financeiro_recorrencias
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_recorr" ON financeiro_recorrencias
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- financeiro_nfse (tem empresa_id mas não tenant_id)
ALTER TABLE financeiro_nfse
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';

DROP POLICY IF EXISTS "tenant_select_fin_nfse" ON financeiro_nfse;
DROP POLICY IF EXISTS "tenant_insert_fin_nfse" ON financeiro_nfse;
DROP POLICY IF EXISTS "tenant_update_fin_nfse" ON financeiro_nfse;
DROP POLICY IF EXISTS "tenant_delete_fin_nfse" ON financeiro_nfse;

ALTER TABLE financeiro_nfse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_fin_nfse" ON financeiro_nfse
  FOR SELECT USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_insert_fin_nfse" ON financeiro_nfse
  FOR INSERT WITH CHECK (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_update_fin_nfse" ON financeiro_nfse
  FOR UPDATE USING (tenant_id = current_tenant() OR is_superadmin());
CREATE POLICY "tenant_delete_fin_nfse" ON financeiro_nfse
  FOR DELETE USING (tenant_id = current_tenant() OR is_superadmin());

-- ── 4. Corrigir DEFAULTs que apontavam fixo para 'construtora'
--    Agora usam current_tenant() dinamicamente
-- ────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'empresas','obras','funcoes','funcionarios','lancamentos',
    'etiquetas','avaliacoes','responsaveis',
    'obras_cronograma','obras_alertas','obras_metas',
    'relatorios','relatorios_fotos','relatorios_atividades','relatorios_ocorrencias',
    'requisicoes_vagas','candidatos','entrevistas','admissoes',
    'funcionario_dados','contatos',
    'tarefas','tarefas_anexos','tarefas_atividades',
    'tarefas_checklists','tarefas_comentarios','tarefas_etiquetas','tarefas_membros',
    'financeiro_contas','financeiro_lancamentos','financeiro_categorias',
    'financeiro_extrato','financeiro_centros_custo','financeiro_orcamentos',
    'financeiro_recorrencias','financeiro_nfse'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT current_tenant();',
        tbl
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignora se a tabela não tem a coluna tenant_id
      NULL;
    END;
  END LOOP;
END $$;

-- ── 5. Reaplica triggers de tenant_id nas tabelas sem triggers ──
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'financeiro_contas','financeiro_lancamentos','financeiro_categorias',
    'financeiro_extrato','financeiro_centros_custo','financeiro_orcamentos',
    'financeiro_recorrencias','financeiro_nfse',
    'contatos','funcionario_dados',
    'tarefas_anexos','tarefas_atividades','tarefas_checklists',
    'tarefas_comentarios','tarefas_etiquetas','tarefas_membros',
    'relatorios_atividades','relatorios_ocorrencias'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_tenant_%s ON %I;
       CREATE TRIGGER trg_set_tenant_%s
         BEFORE INSERT ON %I
         FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ── 6. usuarios: adicionar tenant_id para isolamento correto ──
-- NOTA: usuarios usa usuarios_tenants para multi-tenant.
-- Adicionamos tenant_id para permitir RLS simples no futuro,
-- usando o tenant "principal" do usuário.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);

-- Preenche tenant_id com o tenant padrão do usuario (eh_padrao=1)
UPDATE usuarios u
SET tenant_id = ut.tenant_id
FROM usuarios_tenants ut
WHERE ut.usuario_id = u.id
  AND ut.eh_padrao = 1
  AND u.tenant_id IS NULL;

-- Usuários sem tenant padrão ficam com 'construtora'
UPDATE usuarios SET tenant_id = 'construtora' WHERE tenant_id IS NULL;

-- Habilita RLS em usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_bypass" ON usuarios;
DROP POLICY IF EXISTS "tenant_select_usuarios" ON usuarios;
DROP POLICY IF EXISTS "tenant_insert_usuarios" ON usuarios;
DROP POLICY IF EXISTS "tenant_update_usuarios" ON usuarios;
DROP POLICY IF EXISTS "tenant_delete_usuarios" ON usuarios;

-- SELECT: usuário vê os do próprio tenant OU superadmin vê todos
CREATE POLICY "tenant_select_usuarios" ON usuarios
  FOR SELECT USING (
    tenant_id = current_tenant()
    OR is_superadmin()
    -- Usuario vê a si mesmo sempre
    OR id = (auth.jwt()->>'sub')::bigint
    -- Admin vê usuários do próprio tenant
    OR EXISTS (
      SELECT 1 FROM usuarios_tenants ut
      WHERE ut.usuario_id = id AND ut.tenant_id = current_tenant() AND ut.ativo = 1
    )
  );

CREATE POLICY "superadmin_bypass" ON usuarios
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ── 7. Verificação final ─────────────────────────────────
SELECT
  tablename,
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') AS n_policies
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename NOT IN ('grupos','tenants','tenant_modules','modulos','permissoes',
                        'planos','assinaturas','audit_logs','usage_events','usuarios_tenants')
ORDER BY tablename;
