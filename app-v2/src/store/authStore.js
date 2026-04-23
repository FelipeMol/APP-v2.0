import { create } from 'zustand';
import authService from '../services/authService';
import toast from 'react-hot-toast';

const useAuthStore = create((set, get) => ({
  // ========================================
  // ESTADO
  // ========================================
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  // ========================================
  // AÇÕES
  // ========================================

  /**
   * Fazer login
   */
  login: async (usuario, senha) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(usuario, senha);
      const { usuario: user, permissoes, tenants } = response || {};

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      toast.success(`Bem-vindo, ${user?.nome || 'usuário'}!`);
      return { ...response, permissoes, tenants };
    } catch (error) {
      const mensagem = error?.response?.data?.mensagem || error?.message || 'Erro ao fazer login';

      set({
        isLoading: false,
        error: mensagem,
        isAuthenticated: false,
        user: null,
      });

      toast.error(mensagem);
      throw error;
    }
  },

  /**
   * Fazer logout
   */
  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    toast.success('Logout realizado com sucesso');
  },

  /**
   * Verificar se é admin
   */
  isAdmin: () => {
    return authService.isAdmin();
  },

  /**
   * Verificar permissão
   */
  hasPermission: (modulo, acao) => {
    return authService.hasPermission(modulo, acao);
  },

  /**
   * Obter permissões
   */
  getPermissions: () => {
    return authService.getPermissions();
  },

  /**
   * Atualizar dados do usuário (após edição de perfil, por exemplo)
   */
  updateUser: (userData) => {
    localStorage.setItem('user_data', JSON.stringify(userData));
    set({ user: userData });
  },

  /**
   * Limpar erro
   */
  clearError: () => {
    set({ error: null });
  },
}));

export default useAuthStore;
