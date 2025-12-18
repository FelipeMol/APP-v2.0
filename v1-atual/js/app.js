// ========================================
// APP.JS - ENTRY POINT DA APLICAÇÃO
// ========================================

/**
 * Ponto de entrada principal da aplicação refatorada
 * Este arquivo inicializa todos os módulos e configura a aplicação
 */

// Importar módulos base
import { APP_VERSION } from './modules/config.js';
import { initUI, aplicarPermissoesUI, configurarModaisEdicao, atualizarNomeUsuario } from './modules/ui.js';
import store, { useSubscribe } from './modules/store.js';

// Importar autenticação
import { estaAutenticado, validarToken, obterUsuario } from './modules/auth.js';

// Importar módulos de entidades
import { initEmpresas, carregarEmpresas } from './modules/empresas.js';
import { initFuncionarios, carregarFuncionarios } from './modules/funcionarios.js';
import { initObras, carregarObras } from './modules/obras.js';
import { initLancamentos, carregarLancamentos } from './modules/lancamentos.js';
import { initUsuarios, carregarUsuarios } from './modules/usuarios.js';
import { initPermissoes } from './modules/permissoes.js';
import { initRelatorios } from './modules/relatorios.js';
import { initTarefas, carregarTarefas } from './modules/tarefas.js';

// Importar API de funções
import { FuncoesAPI } from './modules/api.js';

/**
 * Mostrar tela de login
 */
function mostrarTelaLogin() {
    console.log('🔐 Mostrando tela de login');
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.add('active');
    }

    // Esconder loading inicial
    const loadingGlobal = document.getElementById('loading-global');
    if (loadingGlobal) {
        loadingGlobal.style.display = 'none';
    }
}

/**
 * Inicialização da aplicação
 */
async function initApp() {
    console.log(`🚀 Inicializando Controle de Obras v${APP_VERSION}`);

    try {
        // 0. VERIFICAR AUTENTICAÇÃO
        console.log('0️⃣ Verificando autenticação...');

        if (!estaAutenticado()) {
            console.log('❌ Não autenticado - mostrando tela de login');
            mostrarTelaLogin();
            return; // Para aqui
        }

        // Validar token no backend
        const tokenValido = await validarToken();
        if (!tokenValido) {
            console.log('❌ Token inválido - mostrando tela de login');
            mostrarTelaLogin();
            return; // Para aqui
        }

        console.log('✓ Autenticação válida');

        // Salvar usuário no store
        const usuario = obterUsuario();
        store.setState('usuario', usuario);
        console.log(`✓ Usuário logado: ${usuario.nome} (${usuario.tipo})`);

        // 1. Inicializar UI (sidebar, tabs, notificações)
        console.log('1️⃣ Iniciando UI...');
        initUI();
        atualizarNomeUsuario(); // Atualizar nome do usuário no header
        console.log('✓ UI inicializada');

        // 2. Carregar dados iniciais
        console.log('2️⃣ Carregando dados iniciais...');
        await carregarDadosIniciais();
        console.log('✓ Dados iniciais carregados');

        // 3. Inicializar módulos de entidades
        console.log('3️⃣ Inicializando módulos...');
        await initEmpresas();
        console.log('  ✓ Módulo de Empresas');

        await initFuncionarios();
        console.log('  ✓ Módulo de Funcionários');

        await initObras();
        console.log('  ✓ Módulo de Obras');

        await initLancamentos();
        console.log('  ✓ Módulo de Lançamentos');

        await initUsuarios();
        console.log('  ✓ Módulo de Usuários');

        // Inicializar Permissões apenas para admin
        const { ehAdmin } = await import('./modules/auth.js');
        if (ehAdmin()) {
            await initPermissoes();
            console.log('  ✓ Módulo de Permissões');
        }

        await initRelatorios();
        console.log('  ✓ Módulo de Relatórios');

        await initTarefas();
        console.log('  ✓ Módulo de Tarefas');

        // 4. Aplicar permissões na UI
        console.log('4️⃣ Aplicando permissões na UI...');
        await aplicarPermissoesUI();
        console.log('✓ Permissões aplicadas');

        // 5. Configurar observadores de estado
        console.log('5️⃣ Configurando observadores...');
        setupStateObservers();
        console.log('✓ Observadores configurados');

        // 6. Configurar modais de edição (ESC, backdrop)
        console.log('6️⃣ Configurando modais de edição...');
        configurarModaisEdicao();
        console.log('✓ Modais configurados');

        // 7. Aplicação pronta
        console.log('✅ Aplicação iniciada com sucesso!');
        store.debug();

        // 7. Remover loading inicial do HTML
        const loadingGlobal = document.getElementById('loading-global');
        if (loadingGlobal) {
            loadingGlobal.style.display = 'none';
            console.log('✓ Loading inicial removido');
        }

    } catch (error) {
        console.error('❌ Erro ao inicializar aplicação:', error);
        console.error('Stack:', error.stack);

        // Remover loading mesmo em caso de erro
        const loadingGlobal = document.getElementById('loading-global');
        if (loadingGlobal) {
            loadingGlobal.style.display = 'none';
        }

        alert('Erro ao inicializar a aplicação. Verifique o console para mais detalhes.');
    }
}

/**
 * Carrega dados iniciais de todas as entidades
 */
async function carregarDadosIniciais() {
    const promises = [
        carregarEmpresas(),
        carregarFuncionarios(),
        carregarObras(),
        carregarLancamentos(),
        carregarUsuarios(),
        carregarFuncoes(),
        carregarTarefas()
    ];

    await Promise.all(promises);
    console.log('  → Todas as promises resolvidas');
}

/**
 * Carrega funções do backend
 */
async function carregarFuncoes() {
    try {
        const response = await FuncoesAPI.listar();
        if (response.sucesso) {
            store.setState('funcoes', response.dados || []);
            console.log(`  → Funções carregadas: ${response.dados?.length || 0}`);
        }
    } catch (error) {
        console.error('Erro ao carregar funções:', error);
        store.setState('funcoes', []);
    }
}

/**
 * Configura observadores de mudanças de estado
 */
function setupStateObservers() {
    // Observar mudanças em empresas
    useSubscribe('empresas', (empresas) => {
        console.log(`📊 Empresas atualizadas: ${empresas.length} registros`);
    });

    // Observar mudanças na tab atual
    useSubscribe('currentTab', (tab) => {
        console.log(`📑 Tab alterada para: ${tab}`);
    });

    // Observar loading global
    useSubscribe('loading', (isLoading) => {
        console.log(`⏳ Loading: ${isLoading ? 'ON' : 'OFF'}`);
    });
}

/**
 * Iniciar quando o DOM estiver pronto
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/**
 * Exportar para debug no console
 */
if (typeof window !== 'undefined') {
    window.AppStore = store;
    window.AppDebug = {
        getState: () => store.getState(),
        getHistory: () => store.getHistory(),
        reset: () => store.reset()
    };
}
