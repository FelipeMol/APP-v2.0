-- ============================================================
-- MIGRAÇÃO: Previsto x Realizado — tabela de orçamentos
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Adicionar coluna grupo em financeiro_categorias
--    (agrupa categorias em subgrupos para a tela Previsto × Realizado)
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS grupo TEXT;

-- Exemplos de grupos sugeridos (ajuste conforme necessidade):
-- UPDATE financeiro_categorias SET grupo = 'Materiais'       WHERE nome ILIKE '%material%'  OR nome ILIKE '%cimento%' OR nome ILIKE '%ferragem%';
-- UPDATE financeiro_categorias SET grupo = 'Mão de obra'     WHERE nome ILIKE '%folha%'      OR nome ILIKE '%salário%' OR nome ILIKE '%empreit%';
-- UPDATE financeiro_categorias SET grupo = 'Serviços'        WHERE nome ILIKE '%serviço%'    OR nome ILIKE '%topogr%'  OR nome ILIKE '%elétric%';
-- UPDATE financeiro_categorias SET grupo = 'Locação'         WHERE nome ILIKE '%locaç%'      OR nome ILIKE '%aluguel%';
-- UPDATE financeiro_categorias SET grupo = 'Impostos'        WHERE nome ILIKE '%imposto%'    OR nome ILIKE '%inss%'    OR nome ILIKE '%iss%';
-- UPDATE financeiro_categorias SET grupo = 'Administrativo'  WHERE nome ILIKE '%admin%'      OR nome ILIKE '%escrit%';

-- 2. Tabela de orçamentos (previsto por categoria × mês × ano)
CREATE TABLE IF NOT EXISTS financeiro_orcamentos (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   VARCHAR(50) NOT NULL DEFAULT 'construtora',
    categoria_id BIGINT REFERENCES financeiro_categorias(id) ON DELETE CASCADE,
    ano         SMALLINT NOT NULL,
    mes         SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    valor       NUMERIC(15,2) NOT NULL DEFAULT 0,
    criado_em   TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, categoria_id, ano, mes)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fin_orc_tenant   ON financeiro_orcamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_orc_categ    ON financeiro_orcamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fin_orc_ano_mes  ON financeiro_orcamentos(ano, mes);

-- Trigger: atualiza atualizado_em automaticamente
DROP TRIGGER IF EXISTS trg_fin_orc_updated_at ON financeiro_orcamentos;
CREATE TRIGGER trg_fin_orc_updated_at
    BEFORE UPDATE ON financeiro_orcamentos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. RLS (Row Level Security) — isolamento por tenant
ALTER TABLE financeiro_orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_orc_tenant_isolation ON financeiro_orcamentos;
CREATE POLICY fin_orc_tenant_isolation ON financeiro_orcamentos
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true));

-- ============================================================
-- Registrar em TENANT_TABLES (feito manualmente no supabase.js)
-- Adicionar 'financeiro_orcamentos' ao Set TENANT_TABLES em
-- app-v2/src/lib/supabase.js para que o filtro por tenant_id
-- seja injetado automaticamente.
-- ============================================================
