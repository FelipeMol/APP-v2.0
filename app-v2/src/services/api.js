import axios from 'axios';
import toast from 'react-hot-toast';

// Base URL da API - usa variável de ambiente
// IMPORTANTE: em hospedagem em subpasta (ex.: /~hg253b74/), usar prefixo relativo
// para não apontar para a raiz do domínio.
//
// Observação: com Router em modo history / URLs como /~hg253b74/#/login,
// './api' costuma funcionar. Porém em alguns cenários (rewrite/paths),
// pode resolver para um path inesperado. Por isso, por padrão, derivamos
// o "prefixo" do app a partir do pathname atual.
const getDefaultApiBaseUrl = () => {
  const p = window.location.pathname || '/';
  // Se estiver em /~user/alguma-coisa, pega '/~user'
  const m = p.match(/^(\/~[^/]+)(?:\/|$)/);
  const prefix = m ? m[1] : '';
  return `${prefix}/api`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl();

// Criar instância do Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

// ========================================
// INTERCEPTOR DE REQUEST
// ========================================
api.interceptors.request.use(
  (config) => {
    // Adicionar token JWT em todas as requisições
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Multi-tenant: envia tenant em todas as requisições
    // (o backend deve usar isso para selecionar o banco/connection)
    try {
      const rawTenant = localStorage.getItem('selected_tenant');
      const tenantId = rawTenant ? JSON.parse(rawTenant)?.id : null;
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }
    } catch {
      // ignore
    }

    console.debug(
      'API request',
      config.method?.toUpperCase(),
      config.url,
      'Authorization',
      Boolean(config.headers.Authorization),
      'Tenant',
      config.headers['X-Tenant-ID'] || null
    );

    // Log de debug (apenas em desenvolvimento)
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ========================================
// INTERCEPTOR DE RESPONSE
// ========================================
api.interceptors.response.use(
  (response) => {
    // Log de debug (apenas em desenvolvimento)
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.log('📥 API Response:', {
        status: response.status,
        data: response.data,
      });
    }

    // Retornar apenas os dados (response.data já contém {sucesso, dados, mensagem})
    return response.data;
  },
  (error) => {
    // Tratar erros de resposta
    const status = error.response?.status;
    const mensagem = error.response?.data?.mensagem || 'Erro desconhecido';

    console.error('❌ API Error:', {
      status,
      mensagem,
      error,
    });

    // Erro 401: Token inválido ou expirado
    if (status === 401) {
      // Limpar dados do localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_permissions');

      // Redirecionar para login (usando hash routing)
      const isAlreadyOnLogin = window.location.hash.includes('/login');
      if (!isAlreadyOnLogin) {
        toast.error('Sessão expirada. Faça login novamente.');
        const basePath = import.meta.env.BASE_URL || '/';
        window.location.href = `${basePath}#/login`;
      }

      console.error('API 401', error.response?.data);
    }

    // Erro 403: Sem permissão
    else if (status === 403) {
      toast.error('Você não tem permissão para realizar esta ação.');
    }

    // Erro 404: Não encontrado
    else if (status === 404) {
      toast.error('Recurso não encontrado.');
    }

    // Erro 500: Erro no servidor
    else if (status === 500) {
      toast.error('Erro no servidor. Tente novamente mais tarde.');
    }

    // Outros erros
    else {
      toast.error(mensagem);
    }

    return Promise.reject(error);
  }
);

export default api;
