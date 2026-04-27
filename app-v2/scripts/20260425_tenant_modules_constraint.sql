-- Migration: 20260425_tenant_modules_constraint.sql
-- Garante que tenant_modules tem a constraint UNIQUE necessária para
-- o upsert em admin_toggle_tenant_module funcionar corretamente.
-- Também adiciona os módulos base para o tenant construtora.
-- Rollback: ver fim do arquivo

-- -----------------------------------------------------------------------------
-- 1. Garantir coluna ativo em tenant_modules
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenant_modules
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------------
-- 2. Garantir constraint UNIQUE (tenant_id, module_id)
--    necessária para o ON CONFLICT no admin_toggle_tenant_module
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenant_modules'::regclass
      AND contype = 'u'
      AND conname = 'tenant_modules_tenant_module_unique'
  ) THEN
    ALTER TABLE public.tenant_modules
      ADD CONSTRAINT tenant_modules_tenant_module_unique
      UNIQUE (tenant_id, module_id);
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Ativar módulos base para tenant 'construtora' (módulos gratuitos/padrão)
--    Ajustar o tenant_id real conforme UUID da tabela tenants
-- -----------------------------------------------------------------------------
-- NOTA: substituir 'construtora' pelo UUID real do tenant na execução
-- Exemplo de como ativar todos os módulos base para um tenant específico:
--
--   INSERT INTO public.tenant_modules (tenant_id, module_id, ativo)
--   SELECT t.id, m.module_id, true
--   FROM public.tenants t
--   CROSS JOIN (
--     VALUES ('rh'), ('financeiro'), ('obras'), ('relatorios')
--   ) AS m(module_id)
--   WHERE t.short_name = 'construtora'
--   ON CONFLICT (tenant_id, module_id) DO NOTHING;
--
-- Descomente e execute após confirmar o short_name correto do tenant.

-- -----------------------------------------------------------------------------
-- ROLLBACK:
-- ALTER TABLE public.tenant_modules DROP CONSTRAINT IF EXISTS tenant_modules_tenant_module_unique;
-- ALTER TABLE public.tenant_modules DROP COLUMN IF EXISTS ativo;
