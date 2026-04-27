-- Migration: 20260425_superadmin_fase2_billing.sql
-- Tabelas para: Faturamento, Planos & Limites
-- Executar APÓS: 20260425_grupos_superadmin.sql
-- Status: PRONTO PARA EXECUTAR quando quiser habilitar a seção Faturamento

-- =============================================================================
-- 1. PLANOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.planos (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,                          -- Ex: Trial, Standard, Premium
  preco_mrr   NUMERIC(10,2) NOT NULL DEFAULT 0,       -- Valor mensal em R$
  max_usuarios INT,                                   -- NULL = ilimitado
  max_tenants  INT,                                   -- NULL = ilimitado
  modulos     TEXT[] NOT NULL DEFAULT '{}',           -- Módulos inclusos
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.planos (nome, preco_mrr, max_usuarios, max_tenants, modulos) VALUES
  ('Trial',      0,       5,    1, ARRAY['rh']),
  ('Standard',   990,     25,   3, ARRAY['rh','financeiro']),
  ('Premium',    2490,    100,  10, ARRAY['rh','financeiro','obras','relatorios']),
  ('Enterprise', 4990,    NULL, NULL, ARRAY['rh','financeiro','obras','relatorios'])
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. ASSINATURAS (grupos → planos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id           SERIAL PRIMARY KEY,
  grupo_id     INTEGER NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  plano_id     INTEGER NOT NULL REFERENCES public.planos(id),
  status       TEXT NOT NULL DEFAULT 'ativo'         -- ativo | cancelado | inadimplente
                CHECK (status IN ('ativo','cancelado','inadimplente')),
  inicio_em    DATE NOT NULL DEFAULT CURRENT_DATE,
  fim_em       DATE,
  valor_atual  NUMERIC(10,2),                        -- Pode diferir do plano (desconto/negociado)
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. RLS
-- =============================================================================
ALTER TABLE public.planos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planos_superadmin_all"      ON public.planos      FOR ALL USING ((auth.jwt()->'app_metadata'->>'role')='superadmin') WITH CHECK ((auth.jwt()->'app_metadata'->>'role')='superadmin');
CREATE POLICY "assinaturas_superadmin_all" ON public.assinaturas FOR ALL USING ((auth.jwt()->'app_metadata'->>'role')='superadmin') WITH CHECK ((auth.jwt()->'app_metadata'->>'role')='superadmin');

-- =============================================================================
-- 4. VIEW MRR consolidado (helper)
-- =============================================================================
CREATE OR REPLACE VIEW public.v_mrr_por_grupo AS
SELECT
  g.id          AS grupo_id,
  g.nome        AS grupo_nome,
  p.nome        AS plano_nome,
  COALESCE(a.valor_atual, p.preco_mrr) AS mrr,
  a.status
FROM public.grupos g
LEFT JOIN public.assinaturas a ON a.grupo_id = g.id AND a.status = 'ativo'
LEFT JOIN public.planos       p ON p.id = a.plano_id;

-- =============================================================================
-- ROLLBACK:
-- DROP VIEW  IF EXISTS public.v_mrr_por_grupo;
-- DROP TABLE IF EXISTS public.assinaturas;
-- DROP TABLE IF EXISTS public.planos;
