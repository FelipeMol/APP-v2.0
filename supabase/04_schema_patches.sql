-- ============================================================
-- SCHEMA PATCHES - Colunas faltantes descobertas na migração
-- Execute no Supabase SQL Editor ANTES de rodar migrate_data.js novamente
-- ============================================================

-- ── usuarios_tenants: coluna eh_padrao ───────────────────────────
ALTER TABLE usuarios_tenants
  ADD COLUMN IF NOT EXISTS eh_padrao SMALLINT NOT NULL DEFAULT 0;

-- ── funcionarios: colunas de RH ──────────────────────────────────
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS cpf            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS rg             VARCHAR(30),
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS endereco       TEXT,
  ADD COLUMN IF NOT EXISTS cep            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cidade         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS uf             VARCHAR(2),
  ADD COLUMN IF NOT EXISTS pis            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ctps_numero    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ctps_serie     VARCHAR(10),
  ADD COLUMN IF NOT EXISTS ctps_uf        VARCHAR(2),
  ADD COLUMN IF NOT EXISTS data_admissao  DATE,
  ADD COLUMN IF NOT EXISTS data_demissao  DATE,
  ADD COLUMN IF NOT EXISTS salario        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS banco          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS agencia        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS conta          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tipo_conta     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nivel          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status         VARCHAR(30) DEFAULT 'ativo';

-- ── tarefas (subtabelas): tenant_id ─────────────────────────────
ALTER TABLE tarefas_membros
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
ALTER TABLE tarefas_etiquetas
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
ALTER TABLE tarefas_checklists
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
ALTER TABLE tarefas_comentarios
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
ALTER TABLE tarefas_atividades
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';

-- ── obras_cronograma: hierarquia ─────────────────────────────────
ALTER TABLE obras_cronograma
  ADD COLUMN IF NOT EXISTS nivel     SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES obras_cronograma(id) ON DELETE SET NULL;

-- ── obras_alertas: colunas faltantes ────────────────────────────
ALTER TABLE obras_alertas
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS detalhes      TEXT,
  ADD COLUMN IF NOT EXISTS categoria     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS titulo        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS prioridade    VARCHAR(20);

-- ── obras_metas: tornar tipo nullable (não existe no dump antigo) ─
ALTER TABLE obras_metas
  ALTER COLUMN tipo DROP NOT NULL;

-- ── tarefas: coluna usuario_responsavel_id nullable ──────────────
-- (alguns registros antigos podem ter IDs que não existem em usuarios)
ALTER TABLE tarefas
  ALTER COLUMN usuario_responsavel_id DROP NOT NULL;

-- ── obras_metas: coluna de mês ──────────────────────────────────
ALTER TABLE obras_metas
  ADD COLUMN IF NOT EXISTS mes                DATE,
  ADD COLUMN IF NOT EXISTS meta_progresso     DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS meta_custo         DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS meta_horas         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS meta_equipe        INTEGER,
  ADD COLUMN IF NOT EXISTS realizado_progresso DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS realizado_custo    DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS realizado_horas    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS realizado_equipe   INTEGER;

-- ── RPC auxiliar: retorna colunas de uma tabela ──────────────────
-- Usada pelo migrate_data.js para filtrar colunas dinamicamente
CREATE OR REPLACE FUNCTION get_table_columns(p_table TEXT)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(column_name::TEXT ORDER BY ordinal_position)
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_table_columns(TEXT) TO service_role, anon, authenticated;
