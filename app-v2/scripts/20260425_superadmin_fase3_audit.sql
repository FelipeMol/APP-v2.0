-- Migration: 20260425_superadmin_fase3_audit.sql
-- Tabelas para: Auditoria e Métricas de uso
-- Executar APÓS: 20260425_superadmin_role_policy.sql
-- Status: PRONTO PARA EXECUTAR quando quiser habilitar as seções Auditoria e Métricas

-- =============================================================================
-- 1. AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   TEXT REFERENCES public.tenants(id),
  usuario_id  INTEGER REFERENCES public.usuarios(id),
  acao        TEXT NOT NULL,          -- Ex: 'login', 'criar_funcionario', 'editar_lancamento'
  modulo      TEXT,                   -- Ex: 'rh', 'financeiro'
  tabela      TEXT,                   -- Ex: 'funcionarios'
  registro_id TEXT,                   -- ID do registro afetado
  dados_antes JSONB,
  dados_depois JSONB,
  ip          TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_idx    ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_usuario_idx   ON public.audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS audit_logs_criado_em_idx ON public.audit_logs(criado_em DESC);

-- =============================================================================
-- 2. USAGE EVENTS (métricas de uso)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   TEXT REFERENCES public.tenants(id),
  usuario_id  INTEGER REFERENCES public.usuarios(id),
  evento      TEXT NOT NULL,          -- Ex: 'page_view', 'api_call', 'export'
  modulo      TEXT,
  metadata    JSONB,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_tenant_idx    ON public.usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS usage_events_criado_em_idx ON public.usage_events(criado_em DESC);

-- Partição por mês (para performance em alta escala — opcional)
-- ALTER TABLE public.usage_events PARTITION BY RANGE (criado_em);

-- =============================================================================
-- 3. RLS
-- =============================================================================
ALTER TABLE public.audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Superadmin pode tudo
CREATE POLICY "audit_superadmin_all"  ON public.audit_logs   FOR ALL USING ((auth.jwt()->'app_metadata'->>'role')='superadmin');
CREATE POLICY "usage_superadmin_all"  ON public.usage_events FOR ALL USING ((auth.jwt()->'app_metadata'->>'role')='superadmin');

-- Usuários autenticados podem inserir seus próprios eventos
CREATE POLICY "usage_insert_own" ON public.usage_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- ROLLBACK:
-- DROP TABLE IF EXISTS public.usage_events;
-- DROP TABLE IF EXISTS public.audit_logs;
