// ========================================
// MÓDULO DE INTERFACE DO USUÁRIO (UI)
// ========================================

import { salvarLocal, carregarLocal, formatarDataHeader } from './utils.js';
import { UI_CONSTANTS } from './config.js';

/**
 * Sistema de Notificações/Toasts
 */
let notificationTimeout;

export function showNotification(mensagem, tipo = 'success', duracao = 3000) {
    // Remove notificação anterior se existir
    const existente = document.querySelector('.notification-toast');
    if (existente) {
        existente.remove();
        clearTimeout(notificationTimeout);
    }

    // Criar elemento de notificação
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${tipo}`;
    toast.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(tipo)}</span>
        <span class="notification-message">${mensagem}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Adicionar ao body
    document.body.appendChild(toast);

    // Mostrar com animação
    setTimeout(() => toast.classList.add('show'), 10);

    // Remover automaticamente
    notificationTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

function getNotificationIcon(tipo) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[tipo] || icons.info;
}

/**
 * Modal genérico
 */
export function showModal(titulo, conteudo, opcoes = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${titulo}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                ${conteudo}
            </div>
            ${opcoes.botoes ? `
                <div class="modal-footer">
                    ${opcoes.botoes.map(btn => `
                        <button class="btn ${btn.classe || 'btn-secondary'}"
                                onclick="${btn.onclick}">${btn.texto}</button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    return modal;
}

/**
 * Confirmação
 */
export function showConfirm(mensagem, onConfirm, onCancel = null) {
    const modal = showModal('Confirmação', `<p>${mensagem}</p>`, {
        botoes: [
            {
                texto: 'Cancelar',
                classe: 'btn-secondary',
                onclick: `this.closest('.modal').remove(); ${onCancel ? onCancel : ''}`
            },
            {
                texto: 'Confirmar',
                classe: 'btn-danger',
                onclick: `this.closest('.modal').remove(); (${onConfirm})()`
            }
        ]
    });
    return modal;
}

/**
 * Loading overlay
 */
export function showLoading(mensagem = 'Carregando...') {
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p>${mensagem}</p>
    `;
    document.body.appendChild(loading);
}

export function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.remove();
    }
}

/**
 * Sistema de Tabs
 */
export function showTab(tabName) {
    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Mostrar tab selecionada
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
        updateActiveMenuItem(tabName);

        // Salvar última tab visitada
        salvarLocal('ultimaTab', tabName);

        // Inicializar relatórios se necessário (função do script.js)
        if (tabName === 'relatorios' && typeof window.initRelatorios === 'function') {
            setTimeout(() => window.initRelatorios(), 100);
        }

        // Carregar usuários quando abrir a aba de permissões
        if (tabName === 'permissoes') {
            setTimeout(() => {
                console.log('🔐 Aba Permissões aberta - carregando usuários...');
                const tabPermissoes = document.getElementById('permissoes');
                console.log('📋 Tab permissoes existe:', tabPermissoes ? 'SIM' : 'NÃO');
                console.log('📋 Tab permissoes tem classe active:', tabPermissoes?.classList.contains('active') ? 'SIM' : 'NÃO');
                console.log('📋 Tab permissoes display:', tabPermissoes ? window.getComputedStyle(tabPermissoes).display : 'N/A');
                
                const listaUsuarios = document.getElementById('lista-usuarios');
                if (listaUsuarios) {
                    console.log('✓ Elemento lista-usuarios encontrado');
                    console.log('📋 lista-usuarios visível:', window.getComputedStyle(listaUsuarios).display !== 'none' ? 'SIM' : 'NÃO');
                    console.log('📋 lista-usuarios parent visível:', window.getComputedStyle(listaUsuarios.parentElement).display !== 'none' ? 'SIM' : 'NÃO');
                    
                    if (typeof window.carregarUsuarios === 'function') {
                        window.carregarUsuarios();
                    } else {
                        console.error('❌ Função carregarUsuarios não encontrada no window');
                    }
                } else {
                    console.error('❌ Elemento lista-usuarios não encontrado no DOM');
                }
            }, 100);
        }
    }
}

/**
 * Atualizar item ativo no menu
 */
export function updateActiveMenuItem(tabName) {
    // Remove active de todos os itens
    document.querySelectorAll('.sidebar-item, .submenu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Adiciona active no item correspondente
    const items = document.querySelectorAll('.sidebar-item, .submenu-item');
    items.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${tabName}'`)) {
            item.classList.add('active');

            // Se for submenu-item, abrir o submenu pai
            if (item.classList.contains('submenu-item')) {
                const submenu = item.closest('.submenu');
                const parent = submenu?.previousElementSibling;
                if (submenu && parent) {
                    submenu.classList.add('open');
                    parent.classList.add('open');
                }
            }
        }
    });
}

/**
 * Sistema de Sidebar
 */
export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');

    // Salvar estado no localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    salvarLocal('sidebarCollapsed', isCollapsed);
}

export function toggleSubmenu(element) {
    const submenu = element.nextElementSibling;
    const isOpen = submenu.classList.contains('open');

    // Fechar todos os submenus
    document.querySelectorAll('.submenu').forEach(sub => {
        sub.classList.remove('open');
    });
    document.querySelectorAll('.submenu-parent').forEach(parent => {
        parent.classList.remove('open');
    });

    // Abrir o submenu clicado (se não estava aberto)
    if (!isOpen) {
        submenu.classList.add('open');
        element.classList.add('open');
    }
}

/**
 * Restaurar estado da sidebar
 */
export function restaurarSidebar() {
    const isCollapsed = carregarLocal('sidebarCollapsed', false);
    if (isCollapsed) {
        document.getElementById('sidebar')?.classList.add('collapsed');
        document.getElementById('mainContent')?.classList.add('sidebar-collapsed');
    }
}

/**
 * Restaurar última tab
 */
export function restaurarUltimaTab() {
    const ultimaTab = carregarLocal('ultimaTab', 'dashboard');
    showTab(ultimaTab);
}

/**
 * Atualizar data no header
 */
export function atualizarDataHeader() {
    const dataEl = document.getElementById('data-hoje');
    if (dataEl) {
        dataEl.textContent = formatarDataHeader();
    }
}

/**
 * Renderizar tabela genérica
 */
export function renderTable(dados, colunas, acoes) {
    if (!dados || dados.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Nenhum registro encontrado</h3>
                <p>Comece adicionando um novo registro</p>
            </div>
        `;
    }

    return `
        <table class="table">
            <thead>
                <tr>
                    ${colunas.map(col => `<th>${col.label}</th>`).join('')}
                    ${acoes ? '<th class="th-acoes">Ações</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${dados.map(item => `
                    <tr>
                        ${colunas.map(col => `
                            <td>${col.render ? col.render(item[col.field], item) : item[col.field] || '-'}</td>
                        `).join('')}
                        ${acoes ? `<td class="td-acoes">${acoes(item)}</td>` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Renderizar cards em grid
 */
export function renderCards(dados, renderCard) {
    if (!dados || dados.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Nenhum registro encontrado</h3>
            </div>
        `;
    }

    return `
        <div class="cards-grid">
            ${dados.map(item => renderCard(item)).join('')}
        </div>
    `;
}

/**
 * Inicialização da UI
 */
export function initUI() {
    // Restaurar estado do sidebar
    restaurarSidebar();

    // Atualizar data no header
    atualizarDataHeader();

    // Restaurar última tab visitada
    restaurarUltimaTab();

    // Adicionar estilos de notificação se não existir
    addNotificationStyles();
}

/**
 * Adicionar estilos de notificação dinamicamente
 */
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 500px;
            padding: 16px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(calc(100% + 40px));
            transition: transform 0.3s ease;
            z-index: 10000;
            border-left: 4px solid;
        }
        .notification-toast.show {
            transform: translateX(0);
        }
        .notification-toast.notification-success {
            border-left-color: #10b981;
        }
        .notification-toast.notification-error {
            border-left-color: #ef4444;
        }
        .notification-toast.notification-warning {
            border-left-color: #f59e0b;
        }
        .notification-toast.notification-info {
            border-left-color: #3b82f6;
        }
        .notification-icon {
            font-size: 20px;
            font-weight: bold;
        }
        .notification-success .notification-icon {
            color: #10b981;
        }
        .notification-error .notification-icon {
            color: #ef4444;
        }
        .notification-warning .notification-icon {
            color: #f59e0b;
        }
        .notification-info .notification-icon {
            color: #3b82f6;
        }
        .notification-message {
            flex: 1;
            font-size: 14px;
            color: #333;
        }
        .notification-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #999;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .notification-close:hover {
            color: #333;
        }
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .loading-overlay p {
            color: white;
            margin-top: 16px;
            font-size: 16px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        .empty-state h3 {
            margin: 0 0 8px 0;
            color: #333;
        }
        .empty-state p {
            margin: 0;
            color: #999;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Fechar modal por ID
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Aplicar permissões na UI
 * Esconde/mostra elementos conforme permissões do usuário
 */
export async function aplicarPermissoesUI() {
    // Importar dinamicamente para evitar dependência circular
    const { ehAdmin, temPermissao, obterPermissoes } = await import('./auth.js');

    // 1. Esconder menu Permissões para não-admin
    const menuPermissoes = document.querySelector('[onclick*="permissoes"]');
    const abaPermissoes = document.getElementById('permissoes');

    if (!ehAdmin()) {
        if (menuPermissoes) {
            menuPermissoes.style.display = 'none';
        }
        if (abaPermissoes) {
            abaPermissoes.style.display = 'none';
        }
    }

    // Admin vê tudo - retorna aqui para não aplicar restrições
    if (ehAdmin()) {
        return;
    }

    const permissoes = obterPermissoes();

    // Lista de módulos e seus IDs de abas
    const modulosUI = [
        { modulo: 'dashboard', aba: 'dashboard', menuSelector: '[onclick*="dashboard"]' },
        { modulo: 'lancamentos', aba: 'lancamentos', menuSelector: '[onclick*="lancamentos"]' },
        { modulo: 'funcionarios', aba: 'funcionarios', menuSelector: '[onclick*="funcionarios"]' },
        { modulo: 'obras', aba: 'obras', menuSelector: '[onclick*="obras"]' },
        { modulo: 'empresas', aba: 'empresas', menuSelector: '[onclick*="empresas"]' },
        { modulo: 'tarefas', aba: 'tarefas', menuSelector: '[onclick*="tarefas"]' },
        { modulo: 'base', aba: 'base', menuSelector: '[onclick*="base"]' },
        { modulo: 'relatorios', aba: 'relatorios', menuSelector: '[onclick*="relatorios"]' },
        { modulo: 'avaliacoes', aba: 'avaliacoes', menuSelector: '[onclick*="avaliacoes"]' },
        { modulo: 'projetos', aba: 'projetos', menuSelector: '[onclick*="projetos"]' },
        { modulo: 'usuarios', aba: 'usuarios', menuSelector: '[onclick*="usuarios"]' },
        { modulo: 'configuracoes', aba: 'configuracoes', menuSelector: '[onclick*="configuracoes"]' },
        { modulo: 'backup', aba: 'backup', menuSelector: '[onclick*="backup"]' }
    ];

    modulosUI.forEach(({ modulo, aba, menuSelector }) => {
        const podeVisualizar = temPermissao(modulo, 'visualizar');
        const podeCriar = temPermissao(modulo, 'criar');
        const podeEditar = temPermissao(modulo, 'editar');
        const podeExcluir = temPermissao(modulo, 'excluir');

        // 1. Esconder item do menu se não pode visualizar
        const menuItem = document.querySelector(menuSelector);
        if (menuItem && !podeVisualizar) {
            menuItem.style.display = 'none';
        }

        // 2. Substituir conteúdo da aba se não pode visualizar
        const abaEl = document.getElementById(aba);
        if (abaEl && !podeVisualizar) {
            abaEl.innerHTML = `
                <div class="sem-permissao">
                    <div class="sem-permissao-icon">🔒</div>
                    <h2>Acesso Restrito</h2>
                    <p>Você não tem permissão para visualizar este módulo.</p>
                    <p class="text-muted">Entre em contato com o administrador para solicitar acesso.</p>
                </div>
            `;
        }

        // 3. Esconder botões conforme permissões (se pode visualizar)
        if (abaEl && podeVisualizar) {
            // Botões "Adicionar" / "Criar"
            if (!podeCriar) {
                const botoesAdicionar = abaEl.querySelectorAll('[onclick*="adicionar"], [onclick*="criar"], .btn-add, .btn-criar');
                botoesAdicionar.forEach(btn => btn.style.display = 'none');
            }

            // Botões "Editar"
            if (!podeEditar) {
                const botoesEditar = abaEl.querySelectorAll('[onclick*="editar"], .btn-editar');
                botoesEditar.forEach(btn => btn.style.display = 'none');
            }

            // Botões "Excluir"
            if (!podeExcluir) {
                const botoesExcluir = abaEl.querySelectorAll('[onclick*="excluir"], .btn-excluir, .btn-danger');
                botoesExcluir.forEach(btn => btn.style.display = 'none');
            }
        }
    });

    // Adicionar estilos para mensagem de sem permissão
    addSemPermissaoStyles();
}

/**
 * Adicionar estilos para mensagem de sem permissão
 */
function addSemPermissaoStyles() {
    if (document.getElementById('sem-permissao-styles')) return;

    const style = document.createElement('style');
    style.id = 'sem-permissao-styles';
    style.textContent = `
        .sem-permissao {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            text-align: center;
            padding: 40px 20px;
        }
        .sem-permissao-icon {
            font-size: 80px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        .sem-permissao h2 {
            margin: 0 0 12px 0;
            color: #333;
            font-size: 28px;
        }
        .sem-permissao p {
            margin: 0 0 8px 0;
            color: #666;
            font-size: 16px;
        }
        .sem-permissao .text-muted {
            color: #999;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Mostrar modal de confirmação
 * @param {string} mensagem - Mensagem a exibir (pode conter HTML)
 * @param {string} titulo - Título do modal (opcional)
 * @returns {Promise<boolean>} True se confirmou, False se cancelou
 */
export function confirmar(mensagem, titulo = 'Confirmação') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-overlay');
        const modalTitulo = document.getElementById('modal-titulo');
        const modalConteudo = document.getElementById('modal-conteudo');
        const btnConfirmar = document.getElementById('modal-confirmar');

        if (!modal || !modalTitulo || !modalConteudo || !btnConfirmar) {
            // Fallback para confirm nativo se elementos não existirem
            const textoLimpo = mensagem.replace(/<[^>]*>/g, '');
            resolve(window.confirm(textoLimpo));
            return;
        }

        // Configurar modal
        modalTitulo.textContent = titulo;
        modalConteudo.innerHTML = mensagem;

        // Mostrar modal
        modal.classList.add('show');
        modal.style.display = 'flex';

        // Handler de confirmação (executar apenas uma vez)
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        // Handler de cancelamento
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        // Cleanup - remover listeners e fechar modal
        const cleanup = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            btnConfirmar.removeEventListener('click', handleConfirm);
            modal.removeEventListener('click', handleBackdropClick);
        };

        // Click no backdrop
        const handleBackdropClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };

        // Adicionar listeners
        btnConfirmar.addEventListener('click', handleConfirm, { once: true });
        modal.addEventListener('click', handleBackdropClick);

        // Expor função fecharModal globalmente para o botão Cancelar
        window.fecharModal = handleCancel;
    });
}

/**
 * Sistema de Modais de Edição
 */
export function abrirModalEdicao(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Suporte para modais antigos (.modal) e novos (.modal-backdrop)
        if (modal.classList.contains('modal-backdrop')) {
            modal.style.display = 'flex';
            // Trigger reflow para animação funcionar
            modal.offsetHeight;
            modal.classList.add('show');
        } else {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        console.log(`✅ Modal ${modalId} aberto`);
    }
}

export function fecharModalEdicao(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Suporte para modais antigos (.modal) e novos (.modal-backdrop)
        if (modal.classList.contains('modal-backdrop')) {
            modal.classList.remove('show');
            // Aguardar animação antes de esconder
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        } else {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        console.log(`🚪 Modal ${modalId} fechado`);
    }
}

// Aliases para compatibilidade com onclick no HTML
export const abrirModal = abrirModalEdicao;
export const fecharModal = fecharModalEdicao;

/**
 * Configurar modais de edição com funcionalidades avançadas
 * - Fechar ao clicar no backdrop
 * - Fechar com tecla ESC
 */
export function configurarModaisEdicao() {
    console.log('⚙️ Configurando modais de edição...');

    const modais = [
        'modal-editar-empresa',
        'modal-editar-funcionario',
        'modal-editar-obra',
        'modal-tarefa'  // Adicionar modal de tarefa
    ];

    // Adicionar event listener para fechar ao clicar no backdrop
    modais.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', function(event) {
                // Fechar apenas se clicou no backdrop (fundo), não no conteúdo
                if (event.target === modal) {
                    fecharModalEdicao(modalId);
                }
            });
            console.log(`✅ Modal ${modalId} configurado`);
        }
    });

    // Adicionar event listener global para tecla ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            // Verificar qual modal está aberto e fechar
            modais.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && modal.classList.contains('show')) {
                    fecharModalEdicao(modalId);
                    console.log(`🚪 Modal ${modalId} fechado com ESC`);
                }
            });
        }
    });
}

/**
 * Toggle do dropdown de usuário no header
 */
export function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    const menu = document.getElementById('user-dropdown-menu');

    if (dropdown && menu) {
        const isActive = menu.classList.contains('active');

        if (isActive) {
            // Fechar
            menu.classList.remove('active');
            dropdown.classList.remove('active');
        } else {
            // Abrir
            menu.classList.add('active');
            dropdown.classList.add('active');
        }
    }
}

/**
 * Fechar dropdown ao clicar fora
 */
function setupUserDropdownClickOutside() {
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.user-dropdown');
        const menu = document.getElementById('user-dropdown-menu');

        if (dropdown && menu && menu.classList.contains('active')) {
            // Se clicou fora do dropdown, fechar
            if (!dropdown.contains(e.target)) {
                menu.classList.remove('active');
                dropdown.classList.remove('active');
            }
        }
    });
}

/**
 * Atualizar nome do usuário no header
 */
export function atualizarNomeUsuario() {
    const nomeDisplay = document.getElementById('user-name-display');
    if (nomeDisplay) {
        // Importar dinamicamente para evitar dependência circular
        import('./auth.js').then(({ obterUsuario }) => {
            const usuario = obterUsuario();
            if (usuario && usuario.nome) {
                nomeDisplay.textContent = usuario.nome;
            } else {
                nomeDisplay.textContent = 'Usuário';
            }
        });
    }
}

/**
 * Fazer logout
 */
export async function fazerLogout() {
    const confirmar = await window.confirm('Deseja realmente sair do sistema?');

    if (!confirmar) {
        return;
    }

    try {
        showLoading('Saindo...');

        // Importar módulo de autenticação
        const { logout } = await import('./auth.js');

        // Fazer logout (limpa token e localStorage)
        logout();

        // Pequeno delay para mostrar mensagem
        await new Promise(resolve => setTimeout(resolve, 500));

        // Recarregar página (vai mostrar tela de login)
        window.location.reload();

    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        hideLoading();
        showNotification('Erro ao sair. Tente novamente.', 'error');
    }
}

/**
 * Abrir configurações de usuário (Minha Conta)
 */
export function abrirConfiguracoesUsuario() {
    // Por enquanto, mostrar a tab de usuários
    // Futuramente, criar uma tab específica de "Minha Conta"
    showTab('usuarios');
    showNotification('Em breve: tela de configurações pessoais', 'info');
}

// Exportar funções globais para compatibilidade com onclick no HTML
if (typeof window !== 'undefined') {
    window.showTab = showTab;
    window.toggleSidebar = toggleSidebar;
    window.toggleSubmenu = toggleSubmenu;
    window.toggleUserDropdown = toggleUserDropdown;
    window.fazerLogout = fazerLogout;
    window.abrirConfiguracoesUsuario = abrirConfiguracoesUsuario;

    // Funções de modal
    window.abrirModal = abrirModal;
    window.fecharModal = fecharModal;
    window.abrirModalEdicao = abrirModalEdicao;
    window.fecharModalEdicao = fecharModalEdicao;

    // Setup ao carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupUserDropdownClickOutside();
            atualizarNomeUsuario();
        });
    } else {
        setupUserDropdownClickOutside();
        atualizarNomeUsuario();
    }
}
