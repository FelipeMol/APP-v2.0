import supabase from '../lib/supabase.js'

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return permissions || {};

  return permissions.reduce((acc, item) => {
    if (!item?.modulo) return acc;

    acc[item.modulo] = {
      pode_visualizar: item.pode_visualizar === 'Sim' || item.pode_visualizar === 1 || item.pode_visualizar === true,
      pode_criar: item.pode_criar === 'Sim' || item.pode_criar === 1 || item.pode_criar === true,
      pode_editar: item.pode_editar === 'Sim' || item.pode_editar === 1 || item.pode_editar === true,
      pode_excluir: item.pode_excluir === 'Sim' || item.pode_excluir === 1 || item.pode_excluir === true,
    };

    return acc;
  }, {});
};

const TENANTS_KEY = 'allowed_tenants';

const authService = {
  /**
   * Fazer login
   * @param {string} usuario - Nome de usuário
   * @param {string} senha - Senha
   * @returns {Promise} - Resposta da API com token e dados do usuário
   */
  async login(usuario, senha) {
    try {
      // Chama a função PostgreSQL login() diretamente no Supabase
      const { data, error } = await supabase.rpc('login', {
        p_usuario: usuario,
        p_senha:   senha,
      })

      if (error) throw new Error(error.message)

      const { sucesso, mensagem, dados } = data || {}
      if (!sucesso) throw new Error(mensagem || 'Usuário ou senha incorretos')

      const { usuario: user, permissoes, tenants } = dados || {}
      const normalizedPermissions = normalizePermissions(permissoes)

      // Salvar dados no localStorage (sem JWT — auth é feita na app)
      localStorage.setItem('user_data',        JSON.stringify(user))
      localStorage.setItem('user_permissions', JSON.stringify(normalizedPermissions))

      if (Array.isArray(tenants) && tenants.length > 0) {
        localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants))
      } else {
        localStorage.removeItem(TENANTS_KEY)
      }

      console.log('✅ Login realizado com sucesso:', user)
      // Mantém o retorno igual ao anterior para não quebrar o resto do app
      return { sucesso: true, token: 'supabase', usuario: user, permissoes: normalizedPermissions, tenants: tenants || [] }
    } catch (error) {
      console.error('❌ Erro no login:', error)
      throw error
    }
  },

  /**
   * Fazer logout
   */
  logout() {
    // Limpar dados do localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem(TENANTS_KEY);

    console.log('✅ Logout realizado');

    // Redirecionar para página de login (usa import.meta.env.BASE_URL do Vite)
    const basePath = import.meta.env.BASE_URL || '/';
    window.location.href = `${basePath}#/login`;
  },

  /**
   * Obter usuário atual
   * @returns {Object|null} - Dados do usuário ou null
   */
  getCurrentUser() {
    const userData = localStorage.getItem('user_data');

    // Tratar valores inválidos que quebram o JSON.parse
    if (!userData || userData === 'undefined' || userData === 'null') {
      return null;
    }

    try {
      const parsed = JSON.parse(userData);

      if (parsed && typeof parsed === 'object') {
        return parsed;
      }

      // Se for algo inesperado, limpa para não repetir o erro
      localStorage.removeItem('user_data');
      return null;
    } catch (error) {
      console.error('❌ Erro ao obter usuário atual:', error);
      localStorage.removeItem('user_data');
      return null;
    }
  },

  /**
   * Verificar se usuário está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const user = this.getCurrentUser()
    return !!user
  },

  /**
   * Verificar se usuário é admin
   * @returns {boolean}
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.tipo === 'admin';
  },

  /**
   * Obter permissões do usuário
   * @returns {Object} - Objeto com permissões
   */
  getPermissions() {
    try {
      const permissions = localStorage.getItem('user_permissions');
      const parsed = permissions ? JSON.parse(permissions) : {};
      return normalizePermissions(parsed);
    } catch (error) {
      console.error('❌ Erro ao obter permissões:', error);
      return {};
    }
  },

  /**
   * Verificar se usuário tem permissão específica
   * @param {string} modulo - Nome do módulo
   * @param {string} acao - Ação (visualizar, criar, editar, excluir)
   * @returns {boolean}
   */
  hasPermission(modulo, acao) {
    // Admin sempre tem permissão total
    if (this.isAdmin()) {
      return true;
    }

    const permissions = this.getPermissions();
    const moduloPermissions = permissions[modulo];

    if (!moduloPermissions) {
      return false;
    }

    const permissionKey = `pode_${acao}`;
    return moduloPermissions[permissionKey] === true;
  },

  /**
   * Obter token JWT
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('auth_token');
  },

  /**
   * Obter tenants permitidos (lista retornada no login)
   */
  getAllowedTenants() {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
};

export default authService;
