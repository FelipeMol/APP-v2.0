-- ============================================================
-- MIGRAÇÃO 19: Orçamento de Construção (Builder tipo Excel)
-- Tabelas para criação de orçamentos detalhados por obra,
-- com suporte a modelos (templates) reutilizáveis.
--
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. orcamento_modelos — templates reutilizáveis entre obras
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orcamento_modelos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     VARCHAR(50) NOT NULL DEFAULT 'construtora',
  nome          TEXT        NOT NULL,
  descricao     TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orc_mod_tenant ON orcamento_modelos(tenant_id);

ALTER TABLE orcamento_modelos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orc_mod_tenant_isolation ON orcamento_modelos;
CREATE POLICY orc_mod_tenant_isolation ON orcamento_modelos
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_orc_mod_updated_at ON orcamento_modelos;
CREATE TRIGGER trg_orc_mod_updated_at
  BEFORE UPDATE ON orcamento_modelos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. orcamento_grupos — grupos/etapas dentro de um orçamento
--    Pertence a uma obra OU a um modelo (nunca ambos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orcamento_grupos (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id  VARCHAR(50) NOT NULL DEFAULT 'construtora',
  obra_id    BIGINT REFERENCES obras(id) ON DELETE CASCADE,
  modelo_id  BIGINT REFERENCES orcamento_modelos(id) ON DELETE CASCADE,
  nome       TEXT    NOT NULL,
  cor        TEXT    DEFAULT '#4F46E5',
  ordem      INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orc_grp_obra   ON orcamento_grupos(obra_id);
CREATE INDEX IF NOT EXISTS idx_orc_grp_modelo ON orcamento_grupos(modelo_id);

ALTER TABLE orcamento_grupos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orc_grp_tenant_isolation ON orcamento_grupos;
CREATE POLICY orc_grp_tenant_isolation ON orcamento_grupos
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────
-- 3. orcamento_itens — linhas do orçamento (dentro de um grupo)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id      VARCHAR(50)    NOT NULL DEFAULT 'construtora',
  grupo_id       BIGINT         NOT NULL REFERENCES orcamento_grupos(id) ON DELETE CASCADE,
  descricao      TEXT           NOT NULL DEFAULT '',
  unidade        TEXT           DEFAULT 'un',
  quantidade     NUMERIC(15,4)  DEFAULT 1,
  valor_unitario NUMERIC(15,2)  DEFAULT 0,
  ordem          INTEGER        DEFAULT 0,
  observacoes    TEXT
);

CREATE INDEX IF NOT EXISTS idx_orc_item_grupo ON orcamento_itens(grupo_id);

ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orc_item_tenant_isolation ON orcamento_itens;
CREATE POLICY orc_item_tenant_isolation ON orcamento_itens
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─────────────────────────────────────────────────────────────
-- Adicionar tabelas ao controle de tenant no supabase.js:
-- 'orcamento_modelos', 'orcamento_grupos', 'orcamento_itens'
-- ─────────────────────────────────────────────────────────────
