import supabase, { getCurrentTenantId } from '../lib/supabase.js'

const check = (error) => { if (error) throw new Error(error.message) }

const usuariosService = {
  async list() {
    const tenantId = getCurrentTenantId()
    // Lista apenas usuários do tenant atual via RPC (isolamento por empresa)
    const { data, error } = await supabase.rpc('listar_usuarios_tenant', {
      p_tenant_id: tenantId,
    })
    // Fallback: se a RPC ainda não existir no banco, usa query direta (sem filtro de tenant)
    if (error) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('usuarios')
        .select('id, nome, usuario, email, avatar, tipo, ativo, primeiro_acesso, ultimo_login, criado_em')
        .order('nome')
      check(fallbackError)
      return Array.isArray(fallback) ? fallback : []
    }
    return Array.isArray(data) ? data : []
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
    const tenantId = getCurrentTenantId()
    // Desvincula o usuário do tenant (soft delete) em vez de deletar globalmente
    const { data, error } = await supabase.rpc('remover_usuario_tenant', {
      p_usuario_id: id,
      p_tenant_id:  tenantId,
    })
    check(error)
    if (!data?.sucesso) throw new Error(data?.mensagem || 'Erro ao remover usuário')
    return data
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
