-- ============================================================
-- MIGRAÇÃO 10: Previsto x Realizado — categorias hierárquicas,
--              centros de custo e orçamentos por obra
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Adicionar tenant_id e parent_id em financeiro_categorias
--    (tenant_id para isolamento multi-tenant; parent_id para subcategorias)
ALTER TABLE financeiro_categorias
  ADD COLUMN IF NOT EXISTS tenant_id   VARCHAR(50) DEFAULT 'construtora',
  ADD COLUMN IF NOT EXISTS parent_id   BIGINT REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grupo       TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_fin_cat_tenant    ON financeiro_categorias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_cat_parent    ON financeiro_categorias(parent_id);

-- RLS em financeiro_categorias (se ainda não habilitado)
ALTER TABLE financeiro_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_cat_tenant_isolation ON financeiro_categorias;
CREATE POLICY fin_cat_tenant_isolation ON financeiro_categorias
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

-- 2. Tabela de centros de custo
CREATE TABLE IF NOT EXISTS financeiro_centros_custo (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     VARCHAR(50) NOT NULL DEFAULT 'construtora',
  nome          TEXT        NOT NULL,
  codigo        TEXT,
  descricao     TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_fin_cc_tenant ON financeiro_centros_custo(tenant_id);

ALTER TABLE financeiro_centros_custo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_cc_tenant_isolation ON financeiro_centros_custo;
CREATE POLICY fin_cc_tenant_isolation ON financeiro_centros_custo
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE OR REPLACE TRIGGER trg_fin_cc_updated_at
  BEFORE UPDATE ON financeiro_centros_custo
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. Recriar financeiro_orcamentos com obra_id
--    (dropa a versão anterior sem obra_id e recria corretamente)
DROP TABLE IF EXISTS financeiro_orcamentos CASCADE;

CREATE TABLE financeiro_orcamentos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     VARCHAR(50) NOT NULL DEFAULT 'construtora',
  obra_id       BIGINT      REFERENCES obras(id) ON DELETE CASCADE,
  categoria_id  BIGINT      NOT NULL REFERENCES financeiro_categorias(id) ON DELETE CASCADE,
  ano           SMALLINT    NOT NULL,
  mes           SMALLINT    NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor         NUMERIC(15,2) NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, obra_id, categoria_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_fin_orc_tenant    ON financeiro_orcamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_orc_obra      ON financeiro_orcamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_fin_orc_categoria ON financeiro_orcamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fin_orc_ano_mes   ON financeiro_orcamentos(ano, mes);

ALTER TABLE financeiro_orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_orc_tenant_isolation ON financeiro_orcamentos;
CREATE POLICY fin_orc_tenant_isolation ON financeiro_orcamentos
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE OR REPLACE TRIGGER trg_fin_orc_updated_at
  BEFORE UPDATE ON financeiro_orcamentos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4. Adicionar obra_id e centro_custo_id em financeiro_lancamentos
--    (para poder filtrar realizado por obra e por centro de custo)
ALTER TABLE financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS obra_id         BIGINT REFERENCES obras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id BIGINT REFERENCES financeiro_centros_custo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_lanc_obra ON financeiro_lancamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_cc   ON financeiro_lancamentos(centro_custo_id);

-- ============================================================
-- IMPORTANTE: Adicionar ao Set TENANT_TABLES em
-- app-v2/src/lib/supabase.js:
--   'financeiro_categorias', 'financeiro_centros_custo', 'financeiro_orcamentos'
-- ============================================================
