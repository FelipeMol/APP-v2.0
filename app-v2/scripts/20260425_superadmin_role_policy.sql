-- Migration: 20260425_superadmin_role_policy.sql
-- Adiciona suporte ao role 'superadmin' no app_metadata e policies em tenants/usuarios
-- ATENÇÃO: esta migration adiciona policies em tabelas existentes.
-- Executar SOMENTE após 20260425_grupos_superadmin.sql
-- Rollback: ver fim do arquivo

-- -----------------------------------------------------------------------------
-- 1. Policy superadmin em tenants (leitura e escrita global)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenants_superadmin_all" ON public.tenants;
CREATE POLICY "tenants_superadmin_all" ON public.tenants
  FOR ALL
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- -----------------------------------------------------------------------------
-- 2. Policy superadmin em usuarios (leitura global para relatórios)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "usuarios_superadmin_read" ON public.usuarios;
CREATE POLICY "usuarios_superadmin_read" ON public.usuarios
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- -----------------------------------------------------------------------------
-- 3. Policy superadmin em tenant_modules (CRUD global)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_modules_superadmin_all" ON public.tenant_modules;
CREATE POLICY "tenant_modules_superadmin_all" ON public.tenant_modules
  FOR ALL
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- -----------------------------------------------------------------------------
-- 4. Função helper para checar superadmin (reutilizável em policies futuras)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin';
$$;

-- -----------------------------------------------------------------------------
-- INSTRUÇÕES MANUAIS (executar no Supabase Dashboard ? Authentication ? Users)
-- Para criar um superadmin:
--   1. Criar usuário no Supabase Auth normalmente
--   2. No SQL Editor, rodar com service_role:
--      UPDATE auth.users
--      SET raw_app_meta_data = raw_app_meta_data || '{"role": "superadmin"}'
--      WHERE email = 'superadmin@app.internal';
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- ROLLBACK:
-- DROP POLICY IF EXISTS "tenant_modules_superadmin_all" ON public.tenant_modules;
-- DROP POLICY IF EXISTS "usuarios_superadmin_read" ON public.usuarios;
-- DROP POLICY IF EXISTS "tenants_superadmin_all" ON public.tenants;
-- DROP FUNCTION IF EXISTS public.is_superadmin();
