-- Migration: 20260425_grupos_superadmin.sql
-- Cria��o da tabela grupos e RPCs de super-admin
-- Autor: Bruno Backend (SaaS Constru��o Squad)
-- Rollback: ver fim do arquivo

-- -----------------------------------------------------------------------------
-- 1. TABELA grupos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupos (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  dominio   TEXT NOT NULL UNIQUE,
  logo_url  TEXT,
  ativo     BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grupos IS
  'Grupos de clientes (holding/construtora m�e) que agrupam m�ltiplos tenants.';

-- Adiciona coluna grupo_id em tenants (se n�o existir)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES public.grupos(id);

CREATE INDEX IF NOT EXISTS tenants_grupo_id_idx ON public.tenants(grupo_id);

-- -----------------------------------------------------------------------------
-- 2. RLS em grupos
-- Apenas superadmin pode l�/escrever via client; leitura aberta para functions
-- -----------------------------------------------------------------------------
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grupos_superadmin_all" ON public.grupos;
CREATE POLICY "grupos_superadmin_all" ON public.grupos
  FOR ALL
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- -----------------------------------------------------------------------------
-- 3. RPC admin_list_grupos
-- Retorna todos os grupos com contagem de tenants e usu�rios.
-- SECURITY DEFINER: acesso irrestrito, checar role manualmente dentro.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_grupos();
CREATE OR REPLACE FUNCTION public.admin_list_grupos()
RETURNS TABLE (
  id        INT,
  nome      TEXT,
  dominio   TEXT,
  logo_url  TEXT,
  ativo     BOOLEAN,
  criado_em TIMESTAMPTZ,
  qtd_tenants BIGINT,
  qtd_usuarios BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Checar role no JWT
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.nome,
    g.dominio,
    g.logo_url,
    g.ativo,
    g.criado_em,
    COUNT(DISTINCT t.id)  AS qtd_tenants,
    COUNT(DISTINCT u.id)  AS qtd_usuarios
  FROM public.grupos g
  LEFT JOIN public.tenants        t  ON t.grupo_id = g.id
  LEFT JOIN public.usuarios_tenants ut ON ut.tenant_id = t.id
  LEFT JOIN public.usuarios       u  ON u.id = ut.usuario_id
  GROUP BY g.id
  ORDER BY g.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_grupos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_grupos() TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC admin_save_grupo (INSERT ou UPDATE)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_save_grupo(INT, TEXT, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_save_grupo(
  p_id       INT,
  p_nome     TEXT,
  p_dominio  TEXT,
  p_logo_url TEXT,
  p_ativo    BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.grupos (nome, dominio, logo_url, ativo)
    VALUES (p_nome, p_dominio, p_logo_url, p_ativo);
  ELSE
    UPDATE public.grupos
    SET nome = p_nome, dominio = p_dominio, logo_url = p_logo_url, ativo = p_ativo
    WHERE id = p_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_grupo(INT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_grupo(INT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. RPC admin_update_tenant_grupo
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_update_tenant_grupo(TEXT, INT);
CREATE OR REPLACE FUNCTION public.admin_update_tenant_grupo(
  p_tenant_id TEXT,
  p_grupo_id  INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  UPDATE public.tenants
  SET grupo_id = p_grupo_id
  WHERE id = p_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_tenant_grupo(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_tenant_grupo(TEXT, INT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. RPC admin_get_tenant_modules
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_get_tenant_modules(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_tenant_modules(
  p_tenant_id TEXT
)
RETURNS TABLE (module_id TEXT, ativo BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  RETURN QUERY
  SELECT tm.module_id, tm.ativo
  FROM public.tenant_modules tm
  WHERE tm.tenant_id = p_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_tenant_modules(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_tenant_modules(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. RPC admin_toggle_tenant_module
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_toggle_tenant_module(TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_toggle_tenant_module(
  p_tenant_id TEXT,
  p_module_id TEXT,
  p_ativo     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  INSERT INTO public.tenant_modules (tenant_id, module_id, ativo)
  VALUES (p_tenant_id, p_module_id, p_ativo)
  ON CONFLICT (tenant_id, module_id)
  DO UPDATE SET ativo = EXCLUDED.ativo;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_toggle_tenant_module(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_tenant_module(TEXT, TEXT, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- ROLLBACK (executar em caso de erro):
-- -----------------------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.admin_toggle_tenant_module(TEXT, TEXT, BOOLEAN);
-- DROP FUNCTION IF EXISTS public.admin_get_tenant_modules(TEXT);
-- DROP FUNCTION IF EXISTS public.admin_update_tenant_grupo(TEXT, INT);
-- DROP FUNCTION IF EXISTS public.admin_save_grupo(INT, TEXT, TEXT, TEXT, BOOLEAN);
-- DROP FUNCTION IF EXISTS public.admin_list_grupos();
-- ALTER TABLE public.tenants DROP COLUMN IF EXISTS grupo_id;
-- DROP TABLE IF EXISTS public.grupos;
