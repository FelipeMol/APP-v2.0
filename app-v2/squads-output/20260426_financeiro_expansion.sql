-- ============================================================
-- Migration: financeiro_expansion
-- Data: 2026-04-26
-- Autor: Bruno Backend (Squad SaaS Construção)
-- Descrição: Expansão do módulo financeiro
--   - Nova tabela: contatos (clientes, fornecedores, funcionários, sócios)
--   - Nova tabela: financeiro_centros_custo
--   - Nova tabela: financeiro_recorrencias (cobranças/pagamentos recorrentes)
--   - Nova tabela: financeiro_nfse (notas fiscais de serviço)
--   - ALTER TABLE financeiro_lancamentos: novos campos + status 'agendado'
--   - RLS para todas as novas tabelas
-- ============================================================


-- ============================================================
-- SEÇÃO 1: TABELA contatos
-- ============================================================

CREATE TABLE IF NOT EXISTS contatos (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       TEXT         NOT NULL,
  nome             TEXT         NOT NULL,
  documento        TEXT         NOT NULL,  -- CPF ou CNPJ sem formatação (só números)
  tipo_documento   TEXT         CHECK (tipo_documento IN ('cpf', 'cnpj')),
  email            TEXT,
  telefone         TEXT,
  tipo             TEXT         CHECK (tipo IN ('cliente', 'fornecedor', 'funcionario', 'socio')) DEFAULT 'cliente',
  notas            TEXT,
  ativo            BOOLEAN      DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now(),

  -- Mesmo CPF/CNPJ não pode estar duplicado no mesmo tenant
  CONSTRAINT contatos_empresa_documento_unique UNIQUE (empresa_id, documento)
);

CREATE INDEX IF NOT EXISTS idx_contatos_empresa_id   ON contatos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_contatos_tipo         ON contatos (tipo);
CREATE INDEX IF NOT EXISTS idx_contatos_ativo        ON contatos (ativo);

-- Rollback desta seção:
-- DROP TABLE IF EXISTS contatos;


-- ============================================================
-- SEÇÃO 2: TABELA financeiro_centros_custo
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_centros_custo (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  TEXT         NOT NULL,
  nome        TEXT         NOT NULL,
  ativo       BOOLEAN      DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_centros_custo_empresa_id  ON financeiro_centros_custo (empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_centros_custo_ativo       ON financeiro_centros_custo (ativo);

-- Rollback desta seção:
-- DROP TABLE IF EXISTS financeiro_centros_custo;


-- ============================================================
-- SEÇÃO 3: TABELA financeiro_recorrencias
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_recorrencias (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       TEXT          NOT NULL,
  descricao        TEXT          NOT NULL,
  valor            DECIMAL(15,2) NOT NULL,
  tipo             TEXT          CHECK (tipo IN ('receita', 'despesa')),
  frequencia       TEXT          CHECK (frequencia IN ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  dia_vencimento   INTEGER       CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),  -- dia do mês
  categoria_id     BIGINT        REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  conta_id         BIGINT        REFERENCES financeiro_contas(id) ON DELETE SET NULL,
  contato_id       UUID          REFERENCES contatos(id) ON DELETE SET NULL,
  data_inicio      DATE          NOT NULL,
  data_fim         DATE,         -- NULL = sem data de término
  ativa            BOOLEAN       DEFAULT true,
  created_at       TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_recorrencias_empresa_id  ON financeiro_recorrencias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_recorrencias_ativa       ON financeiro_recorrencias (ativa);

-- Rollback desta seção:
-- DROP TABLE IF EXISTS financeiro_recorrencias;


-- ============================================================
-- SEÇÃO 4: TABELA financeiro_nfse
-- ============================================================

CREATE TABLE IF NOT EXISTS financeiro_nfse (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id          TEXT          NOT NULL,
  lancamento_id       BIGINT        REFERENCES financeiro_lancamentos(id) ON DELETE SET NULL,
  numero_nota         TEXT,
  serie               TEXT,
  data_emissao        TIMESTAMPTZ,
  tomador_documento   TEXT          NOT NULL,
  tomador_nome        TEXT          NOT NULL,
  valor_servico       DECIMAL(15,2) NOT NULL,
  aliquota_iss        DECIMAL(5,2),
  descricao_servico   TEXT,
  status              TEXT          DEFAULT 'processando' CHECK (status IN ('processando', 'emitida', 'cancelada', 'erro')),
  xml_url             TEXT,
  pdf_url             TEXT,
  external_id         TEXT,         -- ID na API do NFE.io
  erro_mensagem       TEXT,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  updated_at          TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_nfse_empresa_id     ON financeiro_nfse (empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_nfse_status         ON financeiro_nfse (status);
CREATE INDEX IF NOT EXISTS idx_financeiro_nfse_lancamento_id  ON financeiro_nfse (lancamento_id);

-- Rollback desta seção:
-- DROP TABLE IF EXISTS financeiro_nfse;


-- ============================================================
-- SEÇÃO 5: ALTER TABLE financeiro_lancamentos
-- ============================================================

-- Novos campos (todos nullable para não quebrar dados existentes)
ALTER TABLE financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS contato_id       UUID     REFERENCES contatos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id  UUID     REFERENCES financeiro_centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recorrencia_id   UUID     REFERENCES financeiro_recorrencias(id) ON DELETE SET NULL,
  -- NOTA: contato_id, centro_custo_id e recorrencia_id são UUID pois referenciam tabelas novas (UUID)
  -- financeiro_lancamentos.id é bigint; as novas tabelas que referenciam lancamentos usam BIGINT
  ADD COLUMN IF NOT EXISTS parcela_numero   INTEGER,
  ADD COLUMN IF NOT EXISTS parcela_total    INTEGER;

-- Atualizar CHECK constraint de status para incluir 'agendado'
-- (drop constraint antiga e recria com os 4 valores)
ALTER TABLE financeiro_lancamentos
  DROP CONSTRAINT IF EXISTS financeiro_lancamentos_status_check;

ALTER TABLE financeiro_lancamentos
  ADD CONSTRAINT financeiro_lancamentos_status_check
    CHECK (status IN ('pendente', 'pago', 'cancelado', 'agendado'));

-- Rollback desta seção:
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS contato_id;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS centro_custo_id;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS recorrencia_id;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS parcela_numero;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS parcela_total;
-- ALTER TABLE financeiro_lancamentos DROP CONSTRAINT IF EXISTS financeiro_lancamentos_status_check;
-- ALTER TABLE financeiro_lancamentos ADD CONSTRAINT financeiro_lancamentos_status_check CHECK (status IN ('pendente', 'pago', 'cancelado'));


-- ============================================================
-- SEÇÃO 6: ROW LEVEL SECURITY — contatos
-- ============================================================

ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contatos_tenant_isolation" ON contatos
  FOR ALL
  USING (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'))
  WITH CHECK (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'));

-- Rollback desta seção:
-- DROP POLICY IF EXISTS "contatos_tenant_isolation" ON contatos;
-- ALTER TABLE contatos DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- SEÇÃO 7: ROW LEVEL SECURITY — financeiro_centros_custo
-- ============================================================

ALTER TABLE financeiro_centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro_centros_custo_tenant_isolation" ON financeiro_centros_custo
  FOR ALL
  USING (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'))
  WITH CHECK (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'));

-- Rollback desta seção:
-- DROP POLICY IF EXISTS "financeiro_centros_custo_tenant_isolation" ON financeiro_centros_custo;
-- ALTER TABLE financeiro_centros_custo DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- SEÇÃO 8: ROW LEVEL SECURITY — financeiro_recorrencias
-- ============================================================

ALTER TABLE financeiro_recorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro_recorrencias_tenant_isolation" ON financeiro_recorrencias
  FOR ALL
  USING (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'))
  WITH CHECK (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'));

-- Rollback desta seção:
-- DROP POLICY IF EXISTS "financeiro_recorrencias_tenant_isolation" ON financeiro_recorrencias;
-- ALTER TABLE financeiro_recorrencias DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- SEÇÃO 9: ROW LEVEL SECURITY — financeiro_nfse
-- ============================================================

ALTER TABLE financeiro_nfse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro_nfse_tenant_isolation" ON financeiro_nfse
  FOR ALL
  USING (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'))
  WITH CHECK (empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id'));

-- Rollback desta seção:
-- DROP POLICY IF EXISTS "financeiro_nfse_tenant_isolation" ON financeiro_nfse;
-- ALTER TABLE financeiro_nfse DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- ROLLBACK COMPLETO
-- (execute apenas se precisar desfazer toda esta migration)
-- ============================================================
-- DROP TABLE IF EXISTS financeiro_nfse;
-- DROP TABLE IF EXISTS financeiro_recorrencias;
-- DROP TABLE IF EXISTS financeiro_centros_custo;
-- DROP TABLE IF EXISTS contatos;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS contato_id;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS centro_custo_id;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS recorrencia_id;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS parcela_numero;
-- ALTER TABLE financeiro_lancamentos DROP COLUMN IF EXISTS parcela_total;
-- ALTER TABLE financeiro_lancamentos DROP CONSTRAINT IF EXISTS financeiro_lancamentos_status_check;
-- ALTER TABLE financeiro_lancamentos ADD CONSTRAINT financeiro_lancamentos_status_check CHECK (status IN ('pendente', 'pago', 'cancelado'));
