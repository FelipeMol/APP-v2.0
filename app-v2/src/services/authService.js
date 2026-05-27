import supabase from '../lib/supabase.js'

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return permissions || {};
  return permissions.reduce((acc, item) => {
    if (!item?.modulo) return acc;
    acc[item.modulo] = {
      pode_visualizar: item.pode_visualizar === 'Sim' || item.pode_visualizar === 1 || item.pode_visualizar === true,
      pode_criar:      item.pode_criar      === 'Sim' || item.pode_criar      === 1 || item.pode_criar      === true,
      pode_editar:     item.pode_editar     === 'Sim' || item.pode_editar     === 1 || item.pode_editar     === true,
      pode_excluir:    item.pode_excluir    === 'Sim' || item.pode_excluir    === 1 || item.pode_excluir    === true,
    };
    return acc;
  }, {});
};

const TENANTS_KEY = 'allowed_tenants';

const authService = {
  // domainTenantIds: IDs dos tenants do domínio atual (vem do grupoStore).
  // Se informado e não-vazio, bloqueia login de usuários sem acesso a nenhum deles.
  async login(usuario, senha, domainTenantIds = []) {
    try {
      const fakeEmail = `${usuario.toLowerCase().trim()}@app.internal`;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: senha,
      });

      if (authError) throw new Error('Usuário ou senha incorretos');
      if (!authData?.user) throw new Error('Usuário não encontrado');

      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_data', {
        p_auth_id: authData.user.id,
      });

      if (rpcError) throw new Error(rpcError.message);

      const { sucesso, mensagem, dados } = rpcData || {};
      if (!sucesso) throw new Error(mensagem || 'Erro ao carregar dados do usuário');

      const { usuario: user, permissoes, tenants } = dados || {};
      const normalizedPermissions = normalizePermissions(permissoes);

      // Verificar acesso ao domínio atual.
      // Só bloqueia se: domínio tem tenants definidos E usuário tem tenants definidos
      // E não há interseção. (superadmin sem restrições de tenant passa sempre)
      if (domainTenantIds.length > 0 && Array.isArray(tenants) && tenants.length > 0) {
        const userTenantIds = tenants.map(t => t.id ?? t);
        const hasAccess = userTenantIds.some(id => domainTenantIds.includes(id));
        if (!hasAccess) {
          await supabase.auth.signOut();
          throw new Error('Sua conta não tem acesso a este sistema.');
        }
      }

      localStorage.setItem('user_data',        JSON.stringify(user));
      localStorage.setItem('user_permissions', JSON.stringify(normalizedPermissions));

      if (Array.isArray(tenants) && tenants.length > 0) {
        localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
      } else {
        localStorage.removeItem(TENANTS_KEY);
      }

      return {
        sucesso: true,
        token: 'supabase',
        usuario: user,
        permissoes: normalizedPermissions,
        tenants: tenants || [],
      };
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  },

  async logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem(TENANTS_KEY);
    localStorage.removeItem('selected_tenant');
    const basePath = import.meta.env.BASE_URL || '/';
    window.location.href = `${basePath}#/login`;
  },

  getCurrentUser() {
    const userData = localStorage.getItem('user_data');
    if (!userData || userData === 'undefined' || userData === 'null') return null;
    try {
      const parsed = JSON.parse(userData);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      localStorage.removeItem('user_data');
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getCurrentUser();
  },

  isAdmin() {
    const tipo = this.getCurrentUser()?.tipo;
    return tipo === 'admin' || tipo === 'superadmin';
  },

  isSuperAdmin() {
    return this.getCurrentUser()?.tipo === 'superadmin';
  },

  getPermissions() {
    try {
      const permissions = localStorage.getItem('user_permissions');
      return normalizePermissions(permissions ? JSON.parse(permissions) : {});
    } catch {
      return {};
    }
  },

  hasPermission(modulo, acao) {
    if (this.isAdmin()) return true;
    const permissions = this.getPermissions();
    return permissions[modulo]?.[`pode_${acao}`] === true;
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

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
