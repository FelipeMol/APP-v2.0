import supabase, { getCurrentTenantId } from '../lib/supabase.js'

const TABLE = 'usuarios'
const check = (error) => { if (error) throw new Error(error.message) }

const usuariosService = {
  async list() {
    // Não retorna a senha
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, nome, usuario, email, avatar, tipo, ativo, primeiro_acesso, ultimo_login, criado_em')
      .order('nome')
    check(error)
    return data || []
  },

  async create(payload) {
    const { data, error } = await supabase.rpc('criar_usuario', {
      p_nome:      payload.nome,
      p_usuario:   payload.usuario,
      p_email:     payload.email || '',
      p_senha:     payload.senha,
      p_tipo:      payload.tipo  || 'usuario',
      p_ativo:     payload.ativo || 'Sim',
      p_tenant_id: getCurrentTenantId(),
    })
    check(error)
    if (!data?.sucesso) throw new Error(data?.mensagem || 'Erro ao criar usuário')
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase.rpc('atualizar_usuario', {
      p_id:      id,
      p_nome:    payload.nome,
      p_usuario: payload.usuario,
      p_email:   payload.email || '',
      p_tipo:    payload.tipo  || 'usuario',
      p_ativo:   payload.ativo || 'Sim',
      p_senha:   payload.senha || null,
    })
    check(error)
    if (!data?.sucesso) throw new Error(data?.mensagem || 'Erro ao atualizar usuário')
    return data
  },

  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    check(error)
    return { sucesso: true }
  },

  async alterarSenha(usuarioId, senhaAtual, senhaNova) {
    // Valida senha atual via RPC login (não depende de Supabase Auth session)
    const user = JSON.parse(localStorage.getItem('user_data') || '{}')
    const { data: loginData, error: loginError } = await supabase.rpc('login', {
      p_usuario: user.usuario,
      p_senha:   senhaAtual,
    })
    if (loginError) throw new Error(loginError.message)
    if (!loginData?.sucesso) return { sucesso: false, mensagem: 'Senha atual incorreta' }

    // Atualiza via atualizar_usuario (sincroniza public.usuarios + auth.users)
    const { data, error } = await supabase.rpc('atualizar_usuario', {
      p_id:      usuarioId,
      p_nome:    user.nome,
      p_usuario: user.usuario,
      p_email:   user.email || '',
      p_tipo:    user.tipo  || 'usuario',
      p_ativo:   user.ativo || 'Sim',
      p_senha:   senhaNova,
    })
    if (error) throw new Error(error.message)
    if (!data?.sucesso) return { sucesso: false, mensagem: data?.mensagem || 'Erro ao alterar senha' }

    return { sucesso: true, mensagem: 'Senha alterada com sucesso' }
  },
}

export default usuariosService
