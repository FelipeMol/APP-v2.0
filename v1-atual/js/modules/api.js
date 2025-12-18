// ========================================
// MÓDULO DE COMUNICAÇÃO COM APIS
// ========================================

import { API_CONFIG, MESSAGES } from './config.js';
import { showNotification } from './ui.js';
import { obterToken, logout } from './auth.js';

/**
 * Função principal para fazer requisições à API
 * @param {string} endpoint - Nome do endpoint (ex: 'empresas', 'funcionarios')
 * @param {Object} options - Opções da requisição
 * @returns {Promise<Object>} Resposta da API
 */
export async function fetchAPI(endpoint, options = {}) {
    try {
        // Determinar URL completa
        const url = API_CONFIG.baseURL + (API_CONFIG.endpoints[endpoint] || endpoint);

        // Obter token JWT
        const token = obterToken();

        // Configurações padrão
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Adicionar Authorization header se token existir e não for endpoint de auth
        if (token && endpoint !== 'auth') {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Adicionar corpo da requisição se houver dados
        if (options.data) {
            config.body = JSON.stringify(options.data);
        }

        // Adicionar parâmetros de query string para GET
        let fullUrl = url;
        if (options.params) {
            const params = new URLSearchParams(options.params);
            fullUrl += '?' + params.toString();
        }

        // Adicionar ID na URL para PUT/DELETE
        if (options.id) {
            fullUrl += (fullUrl.includes('?') ? '&' : '?') + 'id=' + options.id;
        }

        // Fazer requisição com timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(fullUrl, { ...config, signal: controller.signal });
            clearTimeout(timeoutId);

            // Tratar 401 (não autorizado) → logout
            if (response.status === 401) {
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                logout();
                return { sucesso: false, mensagem: 'Não autorizado' };
            }

            // Tratar 403 (sem permissão)
            if (response.status === 403) {
                const result = await response.json();
                showNotification(result.mensagem || 'Sem permissão para esta ação', 'error');
                return result;
            }

            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Resposta não é JSON:', text);
                throw new Error('Resposta inválida do servidor');
            }

            const result = await response.json();

            // Log para debug em desenvolvimento
            if (!API_CONFIG.isProduction) {
                console.log(`[API ${config.method}] ${fullUrl}`, {
                    options,
                    response: result
                });
            }

            return result;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Timeout: servidor não respondeu em 10 segundos');
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('[API ERROR]', error);

        // Mostrar notificação de erro
        if (options.showError !== false) {
            showNotification(MESSAGES.ERROR.NETWORK, 'error');
        }

        return {
            sucesso: false,
            mensagem: error.message || MESSAGES.ERROR.GENERIC,
            dados: null
        };
    }
}

/**
 * Funções auxiliares específicas para cada endpoint
 */

// Empresas
export const EmpresasAPI = {
    listar: () => fetchAPI('empresas'),
    criar: (data) => fetchAPI('empresas', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('empresas', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('empresas', { method: 'DELETE', id })
};

// Funcionários
export const FuncionariosAPI = {
    listar: () => fetchAPI('funcionarios'),
    criar: (data) => fetchAPI('funcionarios', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('funcionarios', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('funcionarios', { method: 'DELETE', id })
};

// Usuários
export const UsuariosAPI = {
    listar: () => fetchAPI('usuarios'),
    criar: (data) => fetchAPI('usuarios', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('usuarios', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('usuarios', { method: 'DELETE', id })
};

// Obras
export const ObrasAPI = {
    listar: () => fetchAPI('obras'),
    criar: (data) => fetchAPI('obras', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('obras', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('obras', { method: 'DELETE', id })
};

// Lançamentos
export const LancamentosAPI = {
    listar: (params) => fetchAPI('lancamentos', { params }),
    criar: (data) => fetchAPI('lancamentos', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('lancamentos', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('lancamentos', { method: 'DELETE', id })
};

// Funções
export const FuncoesAPI = {
    listar: () => fetchAPI('funcoes'),
    criar: (data) => fetchAPI('funcoes', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('funcoes', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('funcoes', { method: 'DELETE', id })
};

// Responsáveis
export const ResponsaveisAPI = {
    listar: () => fetchAPI('responsaveis'),
    criar: (data) => fetchAPI('responsaveis', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('responsaveis', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('responsaveis', { method: 'DELETE', id })
};

// Tarefas
export const TarefasAPI = {
    listar: (params) => fetchAPI('tarefas', { params }),
    criar: (data) => fetchAPI('tarefas', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('tarefas', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('tarefas', { method: 'DELETE', id })
};

// Comentários de Tarefas
export const ComentariosAPI = {
    listar: (tarefaId) => fetchAPI('tarefas_comentarios', { params: { tarefa_id: tarefaId } }),
    criar: (data) => fetchAPI('tarefas_comentarios', { method: 'POST', data }),
    excluir: (id) => fetchAPI('tarefas_comentarios', { method: 'DELETE', id })
};

// ========================================
// NOVAS APIS TRELLO
// ========================================

// Etiquetas
export const EtiquetasAPI = {
    listar: () => fetchAPI('etiquetas'),
    criar: (data) => fetchAPI('etiquetas', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('etiquetas', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('etiquetas', { method: 'DELETE', id })
};

// Tarefas <-> Etiquetas (associação)
export const TarefasEtiquetasAPI = {
    listar: (tarefaId) => fetchAPI('tarefas_etiquetas', { params: { tarefa_id: tarefaId } }),
    adicionar: (data) => fetchAPI('tarefas_etiquetas', { method: 'POST', data }),
    remover: (id) => fetchAPI('tarefas_etiquetas', { method: 'DELETE', id })
};

// Checklist
export const ChecklistAPI = {
    listar: (tarefaId) => fetchAPI('tarefas_checklists', { params: { tarefa_id: tarefaId } }),
    criar: (data) => fetchAPI('tarefas_checklists', { method: 'POST', data }),
    atualizar: (id, data) => fetchAPI('tarefas_checklists', { method: 'PUT', id, data }),
    excluir: (id) => fetchAPI('tarefas_checklists', { method: 'DELETE', id })
};

// Membros
export const MembrosAPI = {
    listar: (tarefaId) => fetchAPI('tarefas_membros', { params: { tarefa_id: tarefaId } }),
    adicionar: (data) => fetchAPI('tarefas_membros', { method: 'POST', data }),
    atualizarPapel: (id, data) => fetchAPI('tarefas_membros', { method: 'PUT', id, data }),
    remover: (id) => fetchAPI('tarefas_membros', { method: 'DELETE', id })
};

// Anexos
export const AnexosAPI = {
    listar: (tarefaId) => fetchAPI('tarefas_anexos', { params: { tarefa_id: tarefaId } }),
    upload: async (tarefaId, arquivo) => {
        const formData = new FormData();
        formData.append('tarefa_id', tarefaId);
        formData.append('arquivo', arquivo);

        const token = obterToken();
        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.tarefas_anexos, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        return await response.json();
    },
    excluir: (id) => fetchAPI('tarefas_anexos', { method: 'DELETE', id }),
    download: (id) => API_CONFIG.baseURL + API_CONFIG.endpoints.tarefas_anexos + '?download=1&id=' + id
};

// Atividades
export const AtividadesAPI = {
    listar: (tarefaId, params = {}) => fetchAPI('tarefas_atividades', { params: { tarefa_id: tarefaId, ...params } })
};
