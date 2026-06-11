-- ============================================================
-- COMPRAS: novos campos financeiros + tabela de anexos
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Novos campos em compras_pedidos ──────────────────────────
ALTER TABLE compras_pedidos
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS parcelas        SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS conta_id        BIGINT   REFERENCES financeiro_contas(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categoria_id    BIGINT   REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_vencimento DATE,
  ADD COLUMN IF NOT EXISTS data_pagamento  DATE;

-- ── Tabela de anexos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras_anexos (
  id             BIGSERIAL PRIMARY KEY,
  pedido_id      BIGINT      NOT NULL REFERENCES compras_pedidos(id) ON DELETE CASCADE,
  nome_original  TEXT        NOT NULL,
  caminho        TEXT        NOT NULL,
  tamanho        BIGINT,
  tipo_mime      TEXT,
  tenant_id      VARCHAR(50) NOT NULL DEFAULT 'construtora',
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_anexos_pedido ON compras_anexos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_compras_anexos_tenant ON compras_anexos(tenant_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE compras_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compras_anexos_tenant" ON compras_anexos;
CREATE POLICY "compras_anexos_tenant" ON compras_anexos
  USING (
    is_superadmin()
    OR tenant_id = current_tenant()
  )
  WITH CHECK (
    is_superadmin()
    OR tenant_id = current_tenant()
  );
