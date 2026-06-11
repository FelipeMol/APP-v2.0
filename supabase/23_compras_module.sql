-- ============================================================
-- MÓDULO DE COMPRAS
-- Tabelas: compras_pedidos, compras_itens
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tabela de pedidos de compra ──────────────────────────────
CREATE TABLE IF NOT EXISTS compras_pedidos (
  id            BIGSERIAL PRIMARY KEY,
  data          DATE        NOT NULL DEFAULT CURRENT_DATE,
  contato_id    BIGINT      REFERENCES contatos(id) ON DELETE SET NULL,
  obra_id       BIGINT      REFERENCES obras(id)    ON DELETE SET NULL,
  numero_nf     TEXT,
  status        TEXT        NOT NULL DEFAULT 'recebido'
                            CHECK (status IN ('rascunho', 'confirmado', 'recebido', 'cancelado')),
  observacao    TEXT,
  valor_total   NUMERIC(15,2) NOT NULL DEFAULT 0,
  tenant_id     VARCHAR(50) NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela de itens do pedido ────────────────────────────────
CREATE TABLE IF NOT EXISTS compras_itens (
  id             BIGSERIAL PRIMARY KEY,
  pedido_id      BIGINT      NOT NULL REFERENCES compras_pedidos(id) ON DELETE CASCADE,
  descricao      TEXT        NOT NULL,
  unidade        TEXT        NOT NULL DEFAULT 'un',
  quantidade     NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_total    NUMERIC(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  tenant_id      VARCHAR(50) NOT NULL DEFAULT 'construtora',
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_compras_pedidos_tenant ON compras_pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compras_pedidos_data   ON compras_pedidos(data);
CREATE INDEX IF NOT EXISTS idx_compras_pedidos_obra   ON compras_pedidos(obra_id);
CREATE INDEX IF NOT EXISTS idx_compras_itens_pedido   ON compras_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_compras_itens_tenant   ON compras_itens(tenant_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE compras_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_itens   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compras_pedidos_tenant" ON compras_pedidos;
CREATE POLICY "compras_pedidos_tenant" ON compras_pedidos
  USING (
    is_superadmin()
    OR tenant_id = current_tenant()
  )
  WITH CHECK (
    is_superadmin()
    OR tenant_id = current_tenant()
  );

DROP POLICY IF EXISTS "compras_itens_tenant" ON compras_itens;
CREATE POLICY "compras_itens_tenant" ON compras_itens
  USING (
    is_superadmin()
    OR tenant_id = current_tenant()
  )
  WITH CHECK (
    is_superadmin()
    OR tenant_id = current_tenant()
  );

-- ── Trigger: recalcula valor_total do pedido após mudança nos itens ──
CREATE OR REPLACE FUNCTION fn_recalc_pedido_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE compras_pedidos
  SET
    valor_total   = (
      SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
      FROM   compras_itens
      WHERE  pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    ),
    atualizado_em = NOW()
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_pedido_total ON compras_itens;
CREATE TRIGGER trg_recalc_pedido_total
  AFTER INSERT OR UPDATE OR DELETE ON compras_itens
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_pedido_total();

-- ── Trigger: atualiza atualizado_em do pedido ────────────────
CREATE OR REPLACE FUNCTION fn_touch_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_pedido ON compras_pedidos;
CREATE TRIGGER trg_touch_pedido
  BEFORE UPDATE ON compras_pedidos
  FOR EACH ROW EXECUTE FUNCTION fn_touch_pedido();
