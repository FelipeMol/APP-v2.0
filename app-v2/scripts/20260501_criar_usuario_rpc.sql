-- ============================================================
-- Migration: 20260501_criar_usuario_rpc.sql
-- Criação de usuários a partir do sistema (sem precisar do dashboard Supabase)
-- Cada tenant tem usuários isolados (admin vê apenas os usuários da sua empresa)
--
-- O que faz:
--   1. Adiciona supabase_auth_id em usuarios (se não existir)
--   2. Cria RPC criar_usuario: cria em auth.users + usuarios + usuarios_tenants
--   3. Cria RPC atualizar_usuario: atualiza dados + auth.users (senha opcional)
--   4. Cria RPC listar_usuarios_tenant: lista apenas usuários do tenant atual
--   5. Cria RPC remover_usuario_tenant: desvincula (soft) ou exclui usuário
-- ============================================================

-- ============================================================
-- 1. Coluna supabase_auth_id na tabela usuarios
-- ============================================================
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS supabase_auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_supabase_auth_id ON public.usuarios(supabase_auth_id);

-- ============================================================
-- 2. RPC: criar_usuario
--    Cria o usuário em auth.users, public.usuarios e usuarios_tenants.
--    Só admin do tenant (ou superadmin) pode executar.
-- ============================================================
DROP FUNCTION IF EXISTS public.criar_usuario(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.criar_usuario(
  p_nome      TEXT,
  p_usuario   TEXT,
  p_email     TEXT,
  p_senha     TEXT,
  p_tipo      TEXT DEFAULT 'usuario',
  p_ativo     TEXT DEFAULT 'Sim',
  p_tenant_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_auth_id  UUID;
  v_caller_tipo     TEXT;
  v_auth_id         UUID;
  v_usuario_id      BIGINT;
  v_fake_email      TEXT;
  v_existing_global INT;
  v_existing_tenant INT;
  v_tenant          TEXT;
BEGIN
  -- Determinar tenant
  v_tenant := COALESCE(p_tenant_id, 'transformar');

  -- Verificar autorização: quem está chamando deve ser admin do tenant ou superadmin
  v_caller_auth_id := auth.uid();

  IF v_caller_auth_id IS NOT NULL THEN
    SELECT u.tipo INTO v_caller_tipo
    FROM public.usuarios u
    INNER JOIN public.usuarios_tenants ut ON ut.usuario_id = u.id
    WHERE u.supabase_auth_id = v_caller_auth_id
      AND ut.tenant_id = v_tenant
      AND ut.ativo = 1
    LIMIT 1;

    IF v_caller_tipo IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
      RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Acesso negado');
    END IF;

    IF v_caller_tipo IS NOT NULL AND v_caller_tipo NOT IN ('admin') AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
      RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Apenas administradores podem criar usuários');
    END IF;
  END IF;

  -- Validações básicas
  IF p_nome IS NULL OR trim(p_nome) = '' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Nome é obrigatório');
  END IF;
  IF p_usuario IS NULL OR trim(p_usuario) = '' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Nome de usuário é obrigatório');
  END IF;
  IF p_senha IS NULL OR length(p_senha) < 6 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Senha deve ter no mínimo 6 caracteres');
  END IF;

  -- Verificar se username já existe globalmente (auth email precisa ser único)
  SELECT COUNT(*) INTO v_existing_global
  FROM public.usuarios
  WHERE lower(usuario) = lower(trim(p_usuario));

  IF v_existing_global > 0 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Nome de usuário já está em uso');
  END IF;

  -- Verificar se e-mail já existe (se informado)
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE lower(email) = lower(trim(p_email))) THEN
      RETURN jsonb_build_object('sucesso', false, 'mensagem', 'E-mail já está em uso');
    END IF;
  END IF;

  -- Montar fake email para Supabase Auth (formato: usuario@app.internal)
  v_fake_email := lower(trim(p_usuario)) || '@app.internal';

  -- Criar usuário em auth.users (SECURITY DEFINER roda como postgres, tem acesso ao schema auth)
  v_auth_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    v_auth_id,
    '00000000-0000-0000-0000-000000000000',
    v_fake_email,
    crypt(p_senha, gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('nome', trim(p_nome)),
    'authenticated',
    'authenticated'
  );

  -- Criar na tabela public.usuarios
  INSERT INTO public.usuarios (
    nome,
    usuario,
    email,
    senha,
    supabase_auth_id,
    tipo,
    ativo,
    primeiro_acesso
  ) VALUES (
    trim(p_nome),
    lower(trim(p_usuario)),
    NULLIF(trim(p_email), ''),
    crypt(p_senha, gen_salt('bf', 10)),  -- hash para compatibilidade com login legado
    v_auth_id,
    COALESCE(NULLIF(p_tipo, ''), 'usuario'),
    COALESCE(NULLIF(p_ativo, ''), 'Sim'),
    1
  )
  RETURNING id INTO v_usuario_id;

  -- Vincular ao tenant
  INSERT INTO public.usuarios_tenants (usuario_id, tenant_id, ativo)
  VALUES (v_usuario_id, v_tenant, 1)
  ON CONFLICT (usuario_id, tenant_id) DO UPDATE SET ativo = 1;

  RETURN jsonb_build_object(
    'sucesso',  true,
    'mensagem', 'Usuário criado com sucesso',
    'id',       v_usuario_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Nome de usuário ou e-mail já existe');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_usuario(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_usuario(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- ============================================================
-- 3. RPC: atualizar_usuario
--    Atualiza dados do usuário. Senha opcional.
--    Atualiza também auth.users (email e senha) se necessário.
-- ============================================================
DROP FUNCTION IF EXISTS public.atualizar_usuario(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.atualizar_usuario(
  p_id      BIGINT,
  p_nome    TEXT,
  p_usuario TEXT,
  p_email   TEXT,
  p_tipo    TEXT,
  p_ativo   TEXT,
  p_senha   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_auth_id UUID;
  v_caller_tipo    TEXT;
  v_auth_id        UUID;
  v_tenant         TEXT;
BEGIN
  -- Autorização: só admin ou o próprio usuário (para alterar senha)
  v_caller_auth_id := auth.uid();

  -- Pega o tenant do usuário que está sendo editado
  SELECT ut.tenant_id INTO v_tenant
  FROM public.usuarios_tenants ut
  WHERE ut.usuario_id = p_id AND ut.ativo = 1
  LIMIT 1;

  -- Verifica se caller é admin do mesmo tenant
  SELECT u.tipo INTO v_caller_tipo
  FROM public.usuarios u
  INNER JOIN public.usuarios_tenants ut ON ut.usuario_id = u.id
  WHERE u.supabase_auth_id = v_caller_auth_id
    AND ut.tenant_id = v_tenant
    AND ut.ativo = 1
  LIMIT 1;

  -- Permite que o próprio usuário atualize a si mesmo (para alterar senha via Perfil)
  IF v_caller_tipo IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_id AND supabase_auth_id = v_caller_auth_id) THEN
      IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
        RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Acesso negado');
      END IF;
    END IF;
  ELSIF v_caller_tipo <> 'admin' THEN
    -- Usuário comum só pode editar a si mesmo
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_id AND supabase_auth_id = v_caller_auth_id) THEN
      RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Apenas administradores podem editar outros usuários');
    END IF;
  END IF;

  -- Verificar unicidade do username (excluindo o próprio registro)
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE lower(usuario) = lower(trim(p_usuario)) AND id <> p_id) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Nome de usuário já está em uso');
  END IF;

  -- Pegar auth_id atual
  SELECT supabase_auth_id INTO v_auth_id
  FROM public.usuarios
  WHERE id = p_id;

  -- Atualizar public.usuarios
  UPDATE public.usuarios SET
    nome          = trim(p_nome),
    usuario       = lower(trim(p_usuario)),
    email         = NULLIF(trim(p_email), ''),
    tipo          = COALESCE(NULLIF(p_tipo, ''), 'usuario'),
    ativo         = COALESCE(NULLIF(p_ativo, ''), 'Sim'),
    senha         = CASE WHEN p_senha IS NOT NULL AND p_senha <> '' THEN crypt(p_senha, gen_salt('bf', 10)) ELSE senha END,
    atualizado_em = now()
  WHERE id = p_id;

  -- Atualizar auth.users se existir vínculo
  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users SET
      email          = lower(trim(p_usuario)) || '@app.internal',
      encrypted_password = CASE WHEN p_senha IS NOT NULL AND p_senha <> '' THEN crypt(p_senha, gen_salt('bf', 10)) ELSE encrypted_password END,
      updated_at     = now()
    WHERE id = v_auth_id;
  END IF;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Usuário atualizado com sucesso');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_usuario(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_usuario(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- ============================================================
-- 4. RPC: listar_usuarios_tenant
--    Lista apenas usuários vinculados ao tenant atual.
--    Admin vê todos; usuário comum só vê a si mesmo.
-- ============================================================
DROP FUNCTION IF EXISTS public.listar_usuarios_tenant(TEXT);
CREATE OR REPLACE FUNCTION public.listar_usuarios_tenant(p_tenant_id TEXT)
RETURNS TABLE (
  id              BIGINT,
  nome            VARCHAR,
  usuario         VARCHAR,
  email           VARCHAR,
  avatar          VARCHAR,
  tipo            VARCHAR,
  ativo           VARCHAR,
  primeiro_acesso SMALLINT,
  ultimo_login    TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_auth_id UUID;
  v_caller_tipo    TEXT;
BEGIN
  v_caller_auth_id := auth.uid();

  -- Pega o tipo do usuário que está chamando
  SELECT u.tipo INTO v_caller_tipo
  FROM public.usuarios u
  INNER JOIN public.usuarios_tenants ut ON ut.usuario_id = u.id
  WHERE u.supabase_auth_id = v_caller_auth_id
    AND ut.tenant_id = p_tenant_id
    AND ut.ativo = 1
  LIMIT 1;

  -- Superadmin vê tudo
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin' THEN
    RETURN QUERY
    SELECT u.id, u.nome, u.usuario, u.email, u.avatar, u.tipo, u.ativo,
           u.primeiro_acesso, u.ultimo_login, u.criado_em
    FROM public.usuarios u
    INNER JOIN public.usuarios_tenants ut ON ut.usuario_id = u.id
    WHERE ut.tenant_id = p_tenant_id AND ut.ativo = 1
    ORDER BY u.nome;
    RETURN;
  END IF;

  -- Admin do tenant: vê todos os usuários do tenant
  IF v_caller_tipo = 'admin' THEN
    RETURN QUERY
    SELECT u.id, u.nome, u.usuario, u.email, u.avatar, u.tipo, u.ativo,
           u.primeiro_acesso, u.ultimo_login, u.criado_em
    FROM public.usuarios u
    INNER JOIN public.usuarios_tenants ut ON ut.usuario_id = u.id
    WHERE ut.tenant_id = p_tenant_id AND ut.ativo = 1
    ORDER BY u.nome;
  ELSE
    -- Usuário comum: só vê a si mesmo
    RETURN QUERY
    SELECT u.id, u.nome, u.usuario, u.email, u.avatar, u.tipo, u.ativo,
           u.primeiro_acesso, u.ultimo_login, u.criado_em
    FROM public.usuarios u
    WHERE u.supabase_auth_id = v_caller_auth_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_usuarios_tenant(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_tenant(TEXT) TO authenticated, anon;

-- ============================================================
-- 5. RPC: remover_usuario_tenant
--    Remove o vínculo usuário-tenant (soft delete).
--    Se o usuário não tiver mais nenhum tenant ativo, desativa a conta.
-- ============================================================
DROP FUNCTION IF EXISTS public.remover_usuario_tenant(BIGINT, TEXT);
CREATE OR REPLACE FUNCTION public.remover_usuario_tenant(p_usuario_id BIGINT, p_tenant_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_auth_id UUID;
  v_caller_tipo    TEXT;
  v_auth_id        UUID;
  v_outros_tenants INT;
BEGIN
  v_caller_auth_id := auth.uid();

  -- Verificar se caller é admin do tenant
  SELECT u.tipo INTO v_caller_tipo
  FROM public.usuarios u
  INNER JOIN public.usuarios_tenants ut ON ut.usuario_id = u.id
  WHERE u.supabase_auth_id = v_caller_auth_id
    AND ut.tenant_id = p_tenant_id
    AND ut.ativo = 1
  LIMIT 1;

  IF v_caller_tipo <> 'admin' AND (auth.jwt() -> 'app_metadata' ->> 'role') <> 'superadmin' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Apenas administradores podem remover usuários');
  END IF;

  -- Não permitir remover a si mesmo
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND supabase_auth_id = v_caller_auth_id) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Você não pode remover seu próprio usuário');
  END IF;

  -- Desvincula do tenant (soft delete)
  UPDATE public.usuarios_tenants
  SET ativo = 0
  WHERE usuario_id = p_usuario_id AND tenant_id = p_tenant_id;

  -- Verificar se o usuário ainda tem outros tenants ativos
  SELECT COUNT(*) INTO v_outros_tenants
  FROM public.usuarios_tenants
  WHERE usuario_id = p_usuario_id AND ativo = 1;

  -- Se não tiver mais tenants, desativa a conta
  IF v_outros_tenants = 0 THEN
    UPDATE public.usuarios SET ativo = 'Não' WHERE id = p_usuario_id;

    -- Desabilita no Supabase Auth também
    SELECT supabase_auth_id INTO v_auth_id FROM public.usuarios WHERE id = p_usuario_id;
    IF v_auth_id IS NOT NULL THEN
      UPDATE auth.users SET banned_until = 'infinity' WHERE id = v_auth_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Usuário removido da empresa');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.remover_usuario_tenant(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remover_usuario_tenant(BIGINT, TEXT) TO authenticated, anon;

-- ============================================================
-- 6. Garantir que o campo email em usuarios_tenants está correto
--    (índice auxiliar para queries de listagem por tenant)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ut_usuario_tenant_ativo
  ON public.usuarios_tenants(tenant_id, usuario_id, ativo);

-- ============================================================
-- INSTRUÇÕES DE USO
-- Execute este arquivo no Supabase Dashboard → SQL Editor
-- Depois disso o frontend já consegue criar usuários via RPC.
-- ============================================================
