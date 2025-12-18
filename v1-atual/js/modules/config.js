// ========================================
// CONFIGURAÇÕES GLOBAIS DA APLICAÇÃO
// ========================================

export const APP_VERSION = '2025.12.12-refactored';

// Configuração automática da API baseada no ambiente
export const API_CONFIG = {
    // Detectar automaticamente se está em produção ou desenvolvimento
    isProduction: !['localhost', '127.0.0.1'].includes(window.location.hostname),

    // URLs das APIs - sempre usar caminhos relativos para HostGator
    get baseURL() {
        return '';
    },

    // Endpoints das APIs
    endpoints: {
        // Autenticação
        auth: 'api_auth.php',
        usuarios: 'api_usuarios.php',
        permissoes: 'api_permissoes.php',

        // Entidades
        empresas: 'api_empresas.php',
        funcionarios: 'api_funcionarios.php',
        obras: 'api_obras.php',
        lancamentos: 'api_lancamentos.php',
        funcoes: 'api_funcoes.php',
        responsaveis: 'api_responsaveis.php',

        // Tarefas
        tarefas: 'api_tarefas.php',
        tarefas_comentarios: 'api_tarefas_comentarios.php',

        // Tarefas Trello
        etiquetas: 'api_etiquetas.php',
        tarefas_etiquetas: 'api_tarefas_etiquetas.php',
        tarefas_checklists: 'api_tarefas_checklists.php',
        tarefas_membros: 'api_tarefas_membros.php',
        tarefas_anexos: 'api_tarefas_anexos.php',
        tarefas_atividades: 'api_tarefas_atividades.php'
    }
};

// Constantes de UI
export const UI_CONSTANTS = {
    SIDEBAR_WIDTH_EXPANDED: 280,
    SIDEBAR_WIDTH_COLLAPSED: 70,
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300
};

// Mensagens padrão
export const MESSAGES = {
    SUCCESS: {
        CREATED: 'Registro criado com sucesso!',
        UPDATED: 'Registro atualizado com sucesso!',
        DELETED: 'Registro excluído com sucesso!',
        SAVED: 'Salvo com sucesso!'
    },
    ERROR: {
        GENERIC: 'Ocorreu um erro. Tente novamente.',
        NETWORK: 'Erro de conexão com o servidor.',
        VALIDATION: 'Por favor, preencha todos os campos obrigatórios.',
        NOT_FOUND: 'Registro não encontrado.',
        DELETE_CONFIRM: 'Tem certeza que deseja excluir este registro?'
    },
    LOADING: {
        FETCHING: 'Carregando dados...',
        SAVING: 'Salvando...',
        DELETING: 'Excluindo...'
    },
    TAREFAS: {
        SUCCESS: {
            CREATED: 'Tarefa criada com sucesso!',
            UPDATED: 'Tarefa atualizada com sucesso!',
            DELETED: 'Tarefa excluída com sucesso!',
            STATUS_CHANGED: 'Status atualizado com sucesso!',
            COMMENT_ADDED: 'Comentário adicionado!'
        },
        ERROR: {
            NO_PERMISSION: 'Você não tem permissão para esta ação',
            LOAD_FAILED: 'Erro ao carregar tarefas',
            TITLE_REQUIRED: 'Título é obrigatório',
            TITLE_MIN_LENGTH: 'Título deve ter no mínimo 3 caracteres'
        }
    }
};

// Configurações de Tarefas
export const TAREFAS_CONFIG = {
    STATUS: {
        NOVO: { value: 'novo', label: 'Novo', color: '#3b82f6', icon: '📋' },
        EM_ANDAMENTO: { value: 'em_andamento', label: 'Em Andamento', color: '#f59e0b', icon: '⚙️' },
        CONCLUIDO: { value: 'concluido', label: 'Concluído', color: '#10b981', icon: '✅' },
        CANCELADO: { value: 'cancelado', label: 'Cancelado', color: '#6b7280', icon: '❌' }
    },
    PRIORIDADE: {
        BAIXA: { value: 'baixa', label: 'Baixa', color: '#6b7280' },
        MEDIA: { value: 'media', label: 'Média', color: '#3b82f6' },
        ALTA: { value: 'alta', label: 'Alta', color: '#f59e0b' },
        URGENTE: { value: 'urgente', label: 'Urgente', color: '#ef4444' }
    }
};

// Validação de formulários
export const VALIDATION_RULES = {
    REQUIRED: 'required',
    EMAIL: 'email',
    CNPJ: 'cnpj',
    CPF: 'cpf',
    PHONE: 'phone',
    NUMBER: 'number',
    DATE: 'date'
};
