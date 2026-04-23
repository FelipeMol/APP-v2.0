-- ============================================================
-- RLS POLICIES - CONTROLE DE OBRAS (Supabase)
-- 
-- COMO USAR:
--   Execute DEPOIS do 01_schema.sql no SQL Editor do Supabase
-- 
-- FUNCIONAMENTO:
--   O PHP define a variável de sessão 'app.current_tenant'
--   logo após conectar. Ex.: SET app.current_tenant = 'construtora'
--   As políticas usam esse valor para filtrar automaticamente,
--   sem precisar alterar nenhuma query PHP.
-- ============================================================

-- ============================================================
-- 1. ATIVAR RLS EM TODAS AS TABELAS COM DADOS DE TENANT
-- ============================================================
ALTER TABLE empresas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras             ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_anexos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_membros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_cronograma  ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_alertas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_metas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_fotos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_atividades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicoes_vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrevistas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissoes         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. FUNÇÃO HELPER: retorna o tenant da sessão atual
-- ============================================================
CREATE OR REPLACE FUNCTION current_tenant()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('app.current_tenant', true),
    'construtora'
  );
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- 3. POLÍTICAS: o usuario postgres (backend PHP) passa por tudo
--    via "FORCE ROW LEVEL SECURITY" apenas para os anon/service keys
-- 
--    IMPORTANTE: o usuário 'postgres' tem BYPASSRLS por padrão.
--    Criamos políticas permissivas que filtram por tenant_id
--    quando a chamada vem da API Key anon/service.
-- ============================================================

-- Helper: gera a policy para uma tabela simples com tenant_id
-- Cada tabela precisa de 4 políticas: SELECT, INSERT, UPDATE, DELETE

-- ---- EMPRESAS ----
DROP POLICY IF EXISTS "tenant_select_empresas"  ON empresas;
DROP POLICY IF EXISTS "tenant_insert_empresas"  ON empresas;
DROP POLICY IF EXISTS "tenant_update_empresas"  ON empresas;
DROP POLICY IF EXISTS "tenant_delete_empresas"  ON empresas;

CREATE POLICY "tenant_select_empresas"  ON empresas FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_empresas"  ON empresas FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_empresas"  ON empresas FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_empresas"  ON empresas FOR DELETE USING (tenant_id = current_tenant());

-- ---- OBRAS ----
DROP POLICY IF EXISTS "tenant_select_obras"  ON obras;
DROP POLICY IF EXISTS "tenant_insert_obras"  ON obras;
DROP POLICY IF EXISTS "tenant_update_obras"  ON obras;
DROP POLICY IF EXISTS "tenant_delete_obras"  ON obras;

CREATE POLICY "tenant_select_obras"  ON obras FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_obras"  ON obras FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_obras"  ON obras FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_obras"  ON obras FOR DELETE USING (tenant_id = current_tenant());

-- ---- FUNCOES ----
DROP POLICY IF EXISTS "tenant_select_funcoes"  ON funcoes;
DROP POLICY IF EXISTS "tenant_insert_funcoes"  ON funcoes;
DROP POLICY IF EXISTS "tenant_update_funcoes"  ON funcoes;
DROP POLICY IF EXISTS "tenant_delete_funcoes"  ON funcoes;

CREATE POLICY "tenant_select_funcoes"  ON funcoes FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_funcoes"  ON funcoes FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_funcoes"  ON funcoes FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_funcoes"  ON funcoes FOR DELETE USING (tenant_id = current_tenant());

-- ---- FUNCIONARIOS ----
DROP POLICY IF EXISTS "tenant_select_funcionarios"  ON funcionarios;
DROP POLICY IF EXISTS "tenant_insert_funcionarios"  ON funcionarios;
DROP POLICY IF EXISTS "tenant_update_funcionarios"  ON funcionarios;
DROP POLICY IF EXISTS "tenant_delete_funcionarios"  ON funcionarios;

CREATE POLICY "tenant_select_funcionarios"  ON funcionarios FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_funcionarios"  ON funcionarios FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_funcionarios"  ON funcionarios FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_funcionarios"  ON funcionarios FOR DELETE USING (tenant_id = current_tenant());

-- ---- LANCAMENTOS ----
DROP POLICY IF EXISTS "tenant_select_lancamentos"  ON lancamentos;
DROP POLICY IF EXISTS "tenant_insert_lancamentos"  ON lancamentos;
DROP POLICY IF EXISTS "tenant_update_lancamentos"  ON lancamentos;
DROP POLICY IF EXISTS "tenant_delete_lancamentos"  ON lancamentos;

CREATE POLICY "tenant_select_lancamentos"  ON lancamentos FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_lancamentos"  ON lancamentos FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_lancamentos"  ON lancamentos FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_lancamentos"  ON lancamentos FOR DELETE USING (tenant_id = current_tenant());

-- ---- ETIQUETAS ----
DROP POLICY IF EXISTS "tenant_select_etiquetas"  ON etiquetas;
DROP POLICY IF EXISTS "tenant_insert_etiquetas"  ON etiquetas;
DROP POLICY IF EXISTS "tenant_update_etiquetas"  ON etiquetas;
DROP POLICY IF EXISTS "tenant_delete_etiquetas"  ON etiquetas;

CREATE POLICY "tenant_select_etiquetas"  ON etiquetas FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_etiquetas"  ON etiquetas FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_etiquetas"  ON etiquetas FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_etiquetas"  ON etiquetas FOR DELETE USING (tenant_id = current_tenant());

-- ---- AVALIACOES ----
DROP POLICY IF EXISTS "tenant_select_avaliacoes"  ON avaliacoes;
DROP POLICY IF EXISTS "tenant_insert_avaliacoes"  ON avaliacoes;
DROP POLICY IF EXISTS "tenant_update_avaliacoes"  ON avaliacoes;
DROP POLICY IF EXISTS "tenant_delete_avaliacoes"  ON avaliacoes;

CREATE POLICY "tenant_select_avaliacoes"  ON avaliacoes FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_avaliacoes"  ON avaliacoes FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_avaliacoes"  ON avaliacoes FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_avaliacoes"  ON avaliacoes FOR DELETE USING (tenant_id = current_tenant());

-- ---- TAREFAS ----
DROP POLICY IF EXISTS "tenant_select_tarefas"  ON tarefas;
DROP POLICY IF EXISTS "tenant_insert_tarefas"  ON tarefas;
DROP POLICY IF EXISTS "tenant_update_tarefas"  ON tarefas;
DROP POLICY IF EXISTS "tenant_delete_tarefas"  ON tarefas;

CREATE POLICY "tenant_select_tarefas"  ON tarefas FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_tarefas"  ON tarefas FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_tarefas"  ON tarefas FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_tarefas"  ON tarefas FOR DELETE USING (tenant_id = current_tenant());

-- ---- RESPONSAVEIS ----
DROP POLICY IF EXISTS "tenant_select_responsaveis"  ON responsaveis;
DROP POLICY IF EXISTS "tenant_insert_responsaveis"  ON responsaveis;
DROP POLICY IF EXISTS "tenant_update_responsaveis"  ON responsaveis;
DROP POLICY IF EXISTS "tenant_delete_responsaveis"  ON responsaveis;

CREATE POLICY "tenant_select_responsaveis"  ON responsaveis FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_responsaveis"  ON responsaveis FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_responsaveis"  ON responsaveis FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_responsaveis"  ON responsaveis FOR DELETE USING (tenant_id = current_tenant());

-- ---- OBRAS_CRONOGRAMA ----
DROP POLICY IF EXISTS "tenant_select_cronograma"  ON obras_cronograma;
DROP POLICY IF EXISTS "tenant_insert_cronograma"  ON obras_cronograma;
DROP POLICY IF EXISTS "tenant_update_cronograma"  ON obras_cronograma;
DROP POLICY IF EXISTS "tenant_delete_cronograma"  ON obras_cronograma;

CREATE POLICY "tenant_select_cronograma"  ON obras_cronograma FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_cronograma"  ON obras_cronograma FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_cronograma"  ON obras_cronograma FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_cronograma"  ON obras_cronograma FOR DELETE USING (tenant_id = current_tenant());

-- ---- OBRAS_ALERTAS ----
DROP POLICY IF EXISTS "tenant_select_alertas"  ON obras_alertas;
DROP POLICY IF EXISTS "tenant_insert_alertas"  ON obras_alertas;
DROP POLICY IF EXISTS "tenant_update_alertas"  ON obras_alertas;
DROP POLICY IF EXISTS "tenant_delete_alertas"  ON obras_alertas;

CREATE POLICY "tenant_select_alertas"  ON obras_alertas FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_alertas"  ON obras_alertas FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_alertas"  ON obras_alertas FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_alertas"  ON obras_alertas FOR DELETE USING (tenant_id = current_tenant());

-- ---- RELATORIOS ----
DROP POLICY IF EXISTS "tenant_select_relatorios"  ON relatorios;
DROP POLICY IF EXISTS "tenant_insert_relatorios"  ON relatorios;
DROP POLICY IF EXISTS "tenant_update_relatorios"  ON relatorios;
DROP POLICY IF EXISTS "tenant_delete_relatorios"  ON relatorios;

CREATE POLICY "tenant_select_relatorios"  ON relatorios FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_relatorios"  ON relatorios FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_relatorios"  ON relatorios FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_relatorios"  ON relatorios FOR DELETE USING (tenant_id = current_tenant());

-- ---- RELATORIOS_FOTOS ----
DROP POLICY IF EXISTS "tenant_select_rfoto"  ON relatorios_fotos;
DROP POLICY IF EXISTS "tenant_insert_rfoto"  ON relatorios_fotos;
DROP POLICY IF EXISTS "tenant_delete_rfoto"  ON relatorios_fotos;

CREATE POLICY "tenant_select_rfoto"  ON relatorios_fotos FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_rfoto"  ON relatorios_fotos FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_rfoto"  ON relatorios_fotos FOR DELETE USING (tenant_id = current_tenant());

-- ---- RH ----
DROP POLICY IF EXISTS "tenant_select_reqvagas"  ON requisicoes_vagas;
DROP POLICY IF EXISTS "tenant_insert_reqvagas"  ON requisicoes_vagas;
DROP POLICY IF EXISTS "tenant_update_reqvagas"  ON requisicoes_vagas;
DROP POLICY IF EXISTS "tenant_delete_reqvagas"  ON requisicoes_vagas;

CREATE POLICY "tenant_select_reqvagas"  ON requisicoes_vagas FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_reqvagas"  ON requisicoes_vagas FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_reqvagas"  ON requisicoes_vagas FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_reqvagas"  ON requisicoes_vagas FOR DELETE USING (tenant_id = current_tenant());

DROP POLICY IF EXISTS "tenant_select_candidatos"  ON candidatos;
DROP POLICY IF EXISTS "tenant_insert_candidatos"  ON candidatos;
DROP POLICY IF EXISTS "tenant_update_candidatos"  ON candidatos;
DROP POLICY IF EXISTS "tenant_delete_candidatos"  ON candidatos;

CREATE POLICY "tenant_select_candidatos"  ON candidatos FOR SELECT USING (tenant_id = current_tenant());
CREATE POLICY "tenant_insert_candidatos"  ON candidatos FOR INSERT WITH CHECK (tenant_id = current_tenant());
CREATE POLICY "tenant_update_candidatos"  ON candidatos FOR UPDATE USING (tenant_id = current_tenant());
CREATE POLICY "tenant_delete_candidatos"  ON candidatos FOR DELETE USING (tenant_id = current_tenant());

-- ============================================================
-- 4. TRIGGER: auto-preenche tenant_id no INSERT
--    (o PHP não precisa passar tenant_id explicitamente)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
    NEW.tenant_id := current_tenant();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger em todas as tabelas com tenant_id
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'empresas','obras','funcoes','funcionarios','lancamentos',
    'etiquetas','avaliacoes','tarefas','responsaveis',
    'obras_cronograma','obras_alertas','obras_metas',
    'relatorios','relatorios_fotos',
    'requisicoes_vagas','candidatos','entrevistas','admissoes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_tenant_%s ON %s;
       CREATE TRIGGER trg_set_tenant_%s
         BEFORE INSERT ON %s
         FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- FIM DO ARQUIVO DE RLS
-- ============================================================
