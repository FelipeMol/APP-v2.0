-- =============================================
-- MIGRAÇÃO 05: Módulo Financeiro
-- Execute no Supabase Dashboard → SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS financeiro_contas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL,
    banco TEXT,
    agencia TEXT,
    conta TEXT,
    tipo TEXT DEFAULT 'corrente' CHECK (tipo IN ('corrente','poupanca','investimento','caixa')),
    saldo_inicial NUMERIC(15,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro_categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
    cor TEXT DEFAULT '#3b82f6',
    icone TEXT DEFAULT '💰',
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descricao TEXT NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
    categoria_id BIGINT REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
    conta_id BIGINT REFERENCES financeiro_contas(id) ON DELETE SET NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
    numero_documento TEXT,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro_extrato (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conta_id BIGINT NOT NULL REFERENCES financeiro_contas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
    status TEXT DEFAULT 'nao_conciliado' CHECK (status IN ('nao_conciliado','conciliado','ignorado')),
    lancamento_id BIGINT REFERENCES financeiro_lancamentos(id) ON DELETE SET NULL,
    hash_linha TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (conta_id, hash_linha)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lanc_status     ON financeiro_lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_lanc_vencimento ON financeiro_lancamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_extrato_conta   ON financeiro_extrato(conta_id, data);

-- Trigger atualizado_em
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_fin_contas_upd
    BEFORE UPDATE ON financeiro_contas
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_fin_lanc_upd
    BEFORE UPDATE ON financeiro_lancamentos
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Categorias padrão
INSERT INTO financeiro_categorias (nome, tipo, cor, icone) VALUES
    ('Mão de Obra',        'despesa', '#ef4444', '👷'),
    ('Materiais',          'despesa', '#f97316', '🧱'),
    ('Equipamentos',       'despesa', '#eab308', '🔧'),
    ('Serviços Terceiros', 'despesa', '#8b5cf6', '🔨'),
    ('Aluguel',            'despesa', '#06b6d4', '🏠'),
    ('Impostos e Taxas',   'despesa', '#64748b', '📄'),
    ('Outras Despesas',    'despesa', '#6b7280', '💸'),
    ('Contratos de Obra',  'receita', '#10b981', '📋'),
    ('Medições',           'receita', '#3b82f6', '📏'),
    ('Outras Receitas',    'receita', '#22c55e', '💰')
ON CONFLICT DO NOTHING;
