-- Migration: 20260425_get_user_data_superadmin.sql
-- Atualiza a RPC get_user_data para reconhecer role='superadmin' no app_metadata
-- e retornar tipo='superadmin' no resultado.
-- Rollback: ver fim do arquivo

-- -----------------------------------------------------------------------------
-- Recriar get_user_data com suporte a superadmin
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_user_data(uuid);
CREATE OR REPLACE FUNCTION public.get_user_data(p_auth_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user        RECORD;
  v_permissoes  json;
  v_tenants     json;
  v_jwt_role    TEXT;
BEGIN
  -- Checar role no app_metadata do JWT (superadmin bypass)
  v_jwt_role := (auth.jwt() -> 'app_metadata' ->> 'role');

  IF v_jwt_role = 'superadmin' THEN
    -- Superadmin: retornar dados m�nimos sem consultar tabela usuarios
    RETURN json_build_object(
      'sucesso', true,
      'mensagem', 'Superadmin autenticado',
      'dados', json_build_object(
        'usuario', json_build_object(
          'id',    p_auth_id,
          'nome',  'Administrador',
          'tipo',  'superadmin',
          'email', (SELECT email FROM auth.users WHERE id = p_auth_id)
        ),
        'permissoes', '[]'::json,
        'tenants',    '[]'::json
      )
    );
  END IF;

  -- Fluxo normal: buscar dados na tabela usuarios via supabase_auth_id
  SELECT u.* INTO v_user
  FROM public.usuarios u
  WHERE u.supabase_auth_id = p_auth_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'sucesso', false,
      'mensagem', 'Usu�rio n�o encontrado no sistema'
    );
  END IF;

  SELECT json_agg(row_to_json(p)) INTO v_permissoes
  FROM public.permissoes p
  WHERE p.usuario_id = v_user.id;

  SELECT json_agg(
    json_build_object(
      'id',         t.id,
      'name',       t.name,
      'short_name', t.short_name
    )
  ) INTO v_tenants
  FROM public.tenants t
  INNER JOIN public.usuarios_tenants ut ON ut.tenant_id = t.id
  WHERE ut.usuario_id = v_user.id AND ut.ativo = 1 AND t.active = true;

  RETURN json_build_object(
    'sucesso', true,
    'mensagem', 'OK',
    'dados', json_build_object(
      'usuario',    row_to_json(v_user),
      'permissoes', COALESCE(v_permissoes, '[]'::json),
      'tenants',    COALESCE(v_tenants, '[]'::json)
    )
  );
END;
$$;

-- ROLLBACK: n�o � necess�rio � a fun��o anterior continua funcionando at� a reescrita

-- -----------------------------------------------------------------------------
-- INSTRU��O MANUAL: criar usu�rio superadmin no Supabase Auth
-- Executar com service_role no SQL Editor:
--
--   -- 1. Criar usu�rio no Auth (se n�o existir)
--   -- (via Supabase Dashboard ? Authentication ? Add User)
--   -- Email: superadmin@app.internal
--   -- Password: <senha-forte>
--
--   -- 2. Setar o role no app_metadata:
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || jsonb '{"role": "superadmin"}'
--   WHERE email = 'superadmin@app.internal';
--
--   -- 3. Para logar no app, usar:
--   -- Usu�rio: superadmin   (sem @app.internal � o authService adiciona automaticamente)
--   -- Senha:   <senha definida acima>
-- -----------------------------------------------------------------------------
