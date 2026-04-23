-- ============================================================
-- AUTH RPC - Supabase (PostgreSQL)
-- 
-- Execute DEPOIS do 01_schema.sql no SQL Editor do Supabase
--
-- O que faz:
--   Cria a função login() que o frontend chama com:
--   supabase.rpc('login', { p_usuario: 'Felipe', p_senha: '...' })
--   A função verifica o bcrypt (compatível com password_hash do PHP)
--   e retorna os dados do usuário + permissões.
-- ============================================================

-- Habilita a extensão pgcrypto (já vem no Supabase, só garante)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Função auxiliar: verifica bcrypt compatível com PHP ($2y$)
-- O PHP usa prefixo $2y$ que é idêntico ao $2a$ em algoritmo
-- ============================================================
CREATE OR REPLACE FUNCTION verify_bcrypt(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized_hash TEXT;
BEGIN
  -- Normaliza $2y$ (PHP) para $2a$ (pgcrypto)
  normalized_hash := REPLACE(hashed_password, '$2y$', '$2a$');
  RETURN crypt(plain_password, normalized_hash) = normalized_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Função principal: login
-- Retorna: sucesso, mensagem, e os dados do usuário com permissões
-- ============================================================
CREATE OR REPLACE FUNCTION login(p_usuario TEXT, p_senha TEXT)
RETURNS JSONB AS $$
DECLARE
  v_usuario   RECORD;
  v_permissoes JSONB;
  v_tenants    JSONB;
BEGIN
  -- Busca usuário pelo nome de usuário ou e-mail
  SELECT id, nome, usuario, email, avatar, senha, tipo, ativo, primeiro_acesso, token_versao
  INTO v_usuario
  FROM usuarios
  WHERE usuario = p_usuario OR email = p_usuario
  LIMIT 1;

  -- Usuário não existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Usuário ou senha incorretos'
    );
  END IF;

  -- Usuário inativo
  IF v_usuario.ativo NOT IN ('Sim', 'sim') THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Usuário desativado. Entre em contato com o administrador.'
    );
  END IF;

  -- Verifica senha
  IF NOT verify_bcrypt(p_senha, v_usuario.senha) THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Usuário ou senha incorretos'
    );
  END IF;

  -- Busca permissões
  SELECT jsonb_agg(
    jsonb_build_object(
      'modulo',          m.nome,
      'pode_visualizar', p.pode_visualizar,
      'pode_criar',      p.pode_criar,
      'pode_editar',     p.pode_editar,
      'pode_excluir',    p.pode_excluir
    )
  )
  INTO v_permissoes
  FROM permissoes p
  JOIN modulos m ON m.id = p.modulo_id
  WHERE p.usuario_id = v_usuario.id;

  -- Busca tenants permitidos
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',    ut.tenant_id,
      'label', ut.tenant_id
    )
  )
  INTO v_tenants
  FROM usuarios_tenants ut
  WHERE ut.usuario_id = v_usuario.id AND ut.ativo = 1;

  -- Atualiza último login
  UPDATE usuarios SET ultimo_login = NOW() WHERE id = v_usuario.id;

  -- Retorna sucesso
  RETURN jsonb_build_object(
    'sucesso', true,
    'dados', jsonb_build_object(
      'usuario', jsonb_build_object(
        'id',              v_usuario.id,
        'nome',            v_usuario.nome,
        'usuario',         v_usuario.usuario,
        'email',           v_usuario.email,
        'avatar',          v_usuario.avatar,
        'tipo',            v_usuario.tipo,
        'ativo',           v_usuario.ativo,
        'primeiro_acesso', v_usuario.primeiro_acesso,
        'token_versao',    v_usuario.token_versao
      ),
      'permissoes', COALESCE(v_permissoes, '[]'::jsonb),
      'tenants',    COALESCE(v_tenants,    '[]'::jsonb)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Função: alterar senha do usuário logado
-- Chamada com: supabase.rpc('alterar_senha', { p_usuario_id, p_senha_atual, p_senha_nova })
-- ============================================================
CREATE OR REPLACE FUNCTION alterar_senha(p_usuario_id BIGINT, p_senha_atual TEXT, p_senha_nova TEXT)
RETURNS JSONB AS $$
DECLARE
  v_hash_atual TEXT;
BEGIN
  SELECT senha INTO v_hash_atual FROM usuarios WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Usuário não encontrado');
  END IF;

  IF NOT verify_bcrypt(p_senha_atual, v_hash_atual) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Senha atual incorreta');
  END IF;

  -- Gera novo hash bcrypt (usa prefixo $2a$ - compatível com PHP $2y$)
  UPDATE usuarios
  SET senha = crypt(p_senha_nova, gen_salt('bf', 10)),
      token_versao = token_versao + 1
  WHERE id = p_usuario_id;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Senha alterada com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Permissões: garante que a role anon pode chamar as RPCs
-- ============================================================
GRANT EXECUTE ON FUNCTION login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION alterar_senha(BIGINT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_bcrypt(TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- RLS simplificado para uso com anon key (app interno)
-- Permite acesso total via anon key (autenticação é feita na app)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'empresas','obras','funcoes','funcionarios','lancamentos',
    'etiquetas','avaliacoes','tarefas','tarefas_checklists',
    'tarefas_comentarios','tarefas_atividades','tarefas_membros',
    'tarefas_etiquetas','tarefas_anexos','responsaveis',
    'obras_cronograma','obras_alertas','obras_metas',
    'relatorios','relatorios_fotos','relatorios_atividades','relatorios_ocorrencias',
    'requisicoes_vagas','candidatos','entrevistas','admissoes',
    'usuarios','modulos','permissoes','usuarios_tenants'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Habilita RLS mas cria policy permissiva para a anon key
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon" ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY "allow_all_anon" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      tbl
    );
  END LOOP;
END $$;
