-- 16_lancamento_itens.sql
-- Tabela de itens/rateios para lançamentos financeiros
-- Permite que um único lançamento seja dividido entre múltiplos
-- centros de custo, categorias e descrições (split transaction)

CREATE TABLE IF NOT EXISTS financeiro_lancamento_itens (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lancamento_id   BIGINT NOT NULL REFERENCES financeiro_lancamentos(id) ON DELETE CASCADE,
  tenant_id       VARCHAR(50) NOT NULL DEFAULT 'transformar',
  descricao       TEXT,
  categoria_id    BIGINT REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  centro_custo_id BIGINT REFERENCES financeiro_centros_custo(id) ON DELETE SET NULL,
  valor           NUMERIC(15,2) NOT NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_lanc_itens_lancamento ON financeiro_lancamento_itens(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_itens_tenant     ON financeiro_lancamento_itens(tenant_id);

ALTER TABLE financeiro_lancamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_fin_lanc_itens" ON financeiro_lancamento_itens;
DROP POLICY IF EXISTS "tenant_insert_fin_lanc_itens" ON financeiro_lancamento_itens;
DROP POLICY IF EXISTS "tenant_update_fin_lanc_itens" ON financeiro_lancamento_itens;
DROP POLICY IF EXISTS "tenant_delete_fin_lanc_itens" ON financeiro_lancamento_itens;

CREATE POLICY "tenant_select_fin_lanc_itens" ON financeiro_lancamento_itens
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "tenant_insert_fin_lanc_itens" ON financeiro_lancamento_itens
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "tenant_update_fin_lanc_itens" ON financeiro_lancamento_itens
  FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "tenant_delete_fin_lanc_itens" ON financeiro_lancamento_itens
  FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true));
