-- ============================================================
-- MIGRATION 22: RPCs para gestão de usuários pelo Super Admin
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================
-- O que faz:
--   1. listar_todos_usuarios_superadmin() — retorna TODOS os usuários
--      do sistema (independente de tenant), com seus tenant_ids.
--      Só superadmin pode chamar.
--   2. atualizar_tenants_usuario(p_usuario_id, p_tenant_ids[]) — substitui
--      as associações de tenant de um usuário. Só superadmin.
-- ============================================================

-- ── 1. listar_todos_usuarios_superadmin ──────────────────────
DROP FUNCTION IF EXISTS public.listar_todos_usuarios_superadmin();
CREATE OR REPLACE FUNCTION public.listar_todos_usuarios_superadmin()
RETURNS TABLE (
  id           BIGINT,
  nome         TEXT,
  usuario      TEXT,
  email        TEXT,
  tipo         TEXT,
  ativo        TEXT,
  ultimo_login TIMESTAMPTZ,
  criado_em    TIMESTAMPTZ,
  tenant_ids   TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Retorna vazio para não-superadmin (evita HTTP 400)
  IF NOT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin',
    false
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.nome::TEXT,
    u.usuario::TEXT,
    COALESCE(u.email, '')::TEXT,
    u.tipo::TEXT,
    COALESCE(u.ativo, 'Não')::TEXT,
    u.ultimo_login,
    u.criado_em,
    COALESCE(
      ARRAY(
        SELECT ut.tenant_id::TEXT   -- cast explícito: tenant_id é VARCHAR, não TEXT
        FROM usuarios_tenants ut
        WHERE ut.usuario_id = u.id AND ut.ativo = 1
        ORDER BY ut.tenant_id
      ),
      '{}'::TEXT[]
    ) AS tenant_ids
  FROM usuarios u
  ORDER BY u.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_todos_usuarios_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_todos_usuarios_superadmin() TO authenticated, anon;

-- ── 2. atualizar_tenants_usuario ─────────────────────────────
-- Substitui completamente as associações de tenant de um usuário.
-- Desativa todos os vínculos antigos e cria/reativa os novos.
DROP FUNCTION IF EXISTS public.atualizar_tenants_usuario(BIGINT, TEXT[]);
CREATE OR REPLACE FUNCTION public.atualizar_tenants_usuario(
  p_usuario_id BIGINT,
  p_tenant_ids TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tid  TEXT;
  v_rows INT;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Acesso negado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_usuario_id) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Usuário não encontrado');
  END IF;

  -- Desativar todos os vínculos atuais
  UPDATE usuarios_tenants SET ativo = 0 WHERE usuario_id = p_usuario_id;

  -- Reativar ou inserir cada tenant da nova lista
  IF p_tenant_ids IS NOT NULL AND array_length(p_tenant_ids, 1) > 0 THEN
    FOREACH v_tid IN ARRAY p_tenant_ids LOOP
      -- Tenta atualizar (pode já existir desativado)
      UPDATE usuarios_tenants
        SET ativo = 1
      WHERE usuario_id = p_usuario_id AND tenant_id = v_tid;
      GET DIAGNOSTICS v_rows = ROW_COUNT;

      -- Se não existia, insere
      IF v_rows = 0 THEN
        INSERT INTO usuarios_tenants (usuario_id, tenant_id, ativo, eh_padrao)
        VALUES (p_usuario_id, v_tid, 1, 0);
      END IF;
    END LOOP;

    -- Garantir que o primeiro da lista seja o tenant padrão
    UPDATE usuarios_tenants
      SET eh_padrao = 0
    WHERE usuario_id = p_usuario_id;

    UPDATE usuarios_tenants
      SET eh_padrao = 1
    WHERE usuario_id = p_usuario_id AND tenant_id = p_tenant_ids[1] AND ativo = 1;
  END IF;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Empresas atualizadas com sucesso');
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_tenants_usuario(BIGINT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_tenants_usuario(BIGINT, TEXT[]) TO authenticated, anon;
