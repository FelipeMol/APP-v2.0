-- ============================================================
-- Migration: 20260424_funcionario_dados.sql
-- Tabela para persistência dos dados das abas do FuncionarioDrawer
-- Substitui o uso de localStorage — dados isolados por tenant
-- ============================================================

-- ============================================================
-- TABELA: funcionario_dados
-- ============================================================
CREATE TABLE IF NOT EXISTS funcionario_dados (
  id             BIGSERIAL PRIMARY KEY,
  funcionario_id BIGINT       NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  dados          JSONB        NOT NULL DEFAULT '{}',
  tenant_id      VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (funcionario_id)
);

COMMENT ON TABLE funcionario_dados IS
  'Armazena dados extras do funcionário (abas do drawer): tabs customizadas e avaliações. '
  'Um registro por funcionário (upsert). Estrutura JSONB: { tabs: [...], avaliacoes: [...] }';

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Busca eficiente por tenant (listagens filtradas)
CREATE INDEX IF NOT EXISTS idx_funcionario_dados_tenant_id
  ON funcionario_dados (tenant_id);

-- Buscas dentro do JSONB (ex: campos customizados, filtros futuros)
CREATE INDEX IF NOT EXISTS idx_funcionario_dados_dados_gin
  ON funcionario_dados USING GIN (dados);

-- ============================================================
-- TRIGGER: atualiza atualizado_em automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_funcionario_dados_atualizado_em
  BEFORE UPDATE ON funcionario_dados
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE funcionario_dados ENABLE ROW LEVEL SECURITY;

-- Política permissiva (anon): alinhada com o padrão atual do projeto.
-- ATENÇÃO: Migration 05 (fix_rls_tenant_isolation) substituirá por política baseada em JWT.
CREATE POLICY allow_all_anon ON funcionario_dados
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- ROLLBACK (comentado — executar manualmente se necessário)
-- ============================================================
-- DROP TABLE IF EXISTS funcionario_dados CASCADE;
-- DROP FUNCTION IF EXISTS set_atualizado_em CASCADE;
-- (Os índices e a trigger são removidos em cascata com DROP TABLE)
