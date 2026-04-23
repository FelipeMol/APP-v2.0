import supabase from '../lib/supabase.js'

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
      p_nome:    payload.nome,
      p_usuario: payload.usuario,
      p_email:   payload.email || '',
      p_senha:   payload.senha,
      p_tipo:    payload.tipo  || 'usuario',
      p_ativo:   payload.ativo || 'Sim',
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
    const { data, error } = await supabase.rpc('alterar_senha', {
      p_usuario_id: usuarioId,
      p_senha_atual: senhaAtual,
      p_senha_nova: senhaNova,
    })
    check(error)
    return data
  },
}

export default usuariosService
