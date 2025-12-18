// ========================================
// CONTROLE DE OBRAS - VERSÃO HOSTGATOR COM SIDEBAR
// Sistema completo otimizado para produção
// ========================================

// ========================================
// ATUALIZAR DATA NO HEADER
// ========================================

function atualizarDataHoje() {
    const dataEl = document.getElementById('data-hoje');
    if (dataEl) {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = String(hoje.getFullYear()).slice(-2);
        dataEl.textContent = `📅 ${dia}/${mes}/${ano}`;
    }
}

// Atualizar data quando a página carregar
document.addEventListener('DOMContentLoaded', atualizarDataHoje);

// ========================================
// CONTROLE DO SIDEBAR
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
    
    // Salvar estado no localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
}

function toggleSubmenu(element) {
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

function updateActiveMenuItem(tabName) {
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
                const parent = submenu.previousElementSibling;
                if (submenu && parent) {
                    submenu.classList.add('open');
                    parent.classList.add('open');
                }
            }
        }
    });
}

// Configuração automática da API baseada no ambiente
const API_CONFIG = {
    // Detectar automaticamente se está em produção ou desenvolvimento
    isProduction: !['localhost', '127.0.0.1'].includes(window.location.hostname),
    
    // URLs das APIs
    get baseURL() {
        return ''; // Sempre usar caminhos relativos
    },
    
    // Endpoints das APIs
    endpoints: {
        empresas: 'api_empresas.php',
        funcionarios: 'api_funcionarios.php', 
        obras: 'api_obras.php',
        lancamentos: 'api_lancamentos.php'
    }
};

// Arrays globais para dados
let empresas = [];
let funcionarios = [];
let obras = [];
let lancamentos = [];

// Versão do app para cache-busting
const APP_VERSION = '2025.12.04-1';

function aplicarCacheBusting() {
    try {
        const links = Array.from(document.getElementsByTagName('link')); 
        links.forEach(link => {
            if (link.rel === 'stylesheet' && link.href.includes('styles')) {
                const url = new URL(link.href, window.location.origin);
                url.searchParams.set('v', APP_VERSION);
                link.href = url.toString();
            }
        });
        const scripts = Array.from(document.getElementsByTagName('script'));
        scripts.forEach(script => {
            if (script.src && script.src.includes('script.js')) {
                const url = new URL(script.src, window.location.origin);
                url.searchParams.set('v', APP_VERSION);
                script.src = url.toString();
            }
        });
        console.log(`🧹 Cache busting aplicado v=${APP_VERSION}`);
    } catch (e) {
        console.warn('Cache busting falhou:', e);
    }
}

// ========================================
// SISTEMA DE API UNIFICADO
// ========================================

async function fetchAPI(endpoint, options = {}) {
    try {
        // Determinar URL completa
        const url = API_CONFIG.baseURL + endpoint;
        
        // Configurações padrão
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        console.log(`📡 API Call: ${config.method} ${url}`);
        
        // Fazer requisição
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Tentar parsear como JSON independentemente do header Content-Type
        let data;
        try {
            // Primeiro tenta via response.json()
            data = await response.json();
        } catch (e) {
            // Fallback: tentar parsear texto manualmente (alguns hosts enviam text/html)
            const text = await response.text();
            const clean = text.trim().replace(/^\uFEFF/, ''); // remove BOM
            try {
                data = JSON.parse(clean);
            } catch (e2) {
                console.error('❌ Resposta da API não pôde ser parseada como JSON:', clean.slice(0, 500));
                throw new Error('JSON inválido na resposta da API');
            }
        }
        console.log(`📥 API Response:`, data);
        
        return data;
        
    } catch (error) {
        console.error('❌ Erro na API:', error);
        
        // Em desenvolvimento, mostrar erro detalhado
        if (!API_CONFIG.isProduction) {
            alert(`Erro de API: ${error.message}`);
        }
        
        // Retornar resposta de erro padronizada
        return {
            sucesso: false,
            mensagem: API_CONFIG.isProduction ? 'Erro de conexão' : error.message,
            dados: null
        };
    }
}

// ========================================
// CARREGAMENTO DE DADOS
// ========================================

async function carregarDados() {
    console.log('🔄 Carregando dados do servidor...');
    
    try {
        // Carregar todos os dados em paralelo
        const [empresasResp, funcionariosResp, obrasResp, lancamentosResp] = await Promise.all([
            fetchAPI(API_CONFIG.endpoints.empresas),
            fetchAPI(API_CONFIG.endpoints.funcionarios),
            fetchAPI(API_CONFIG.endpoints.obras), 
            fetchAPI(API_CONFIG.endpoints.lancamentos)
        ]);
        
        // Atualizar arrays globais
        empresas = empresasResp.sucesso ? empresasResp.dados : [];
        funcionarios = funcionariosResp.sucesso ? funcionariosResp.dados : [];
        obras = obrasResp.sucesso ? obrasResp.dados : [];
        lancamentos = lancamentosResp.sucesso ? lancamentosResp.dados : [];
        
        console.log('✅ Dados carregados:', {
            empresas: empresas.length,
            funcionarios: funcionarios.length,
            obras: obras.length,
            lancamentos: lancamentos.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        
        // Inicializar arrays vazios em caso de erro
        empresas = [];
        funcionarios = [];
        obras = [];
        lancamentos = [];
    }
}

// ========================================
// FUNÇÕES DE INTERFACE
// ========================================

// Sistema de navegação entre abas
function showTab(tabName) {
    console.log(`🏷️ Abrindo aba: ${tabName}`);
    
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover classe active de todas as nav-tabs (compatibilidade)
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar a aba selecionada
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Atualizar menu sidebar ativo
    updateActiveMenuItem(tabName);
    
    // Adicionar classe active na nav-tab clicada (compatibilidade)
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Atualizar dados se necessário
    switch (tabName) {
        case 'dashboard':
            atualizarDashboard();
            break;
        case 'relatorios':
            // Inicializar novo sistema de relatórios
            setTimeout(() => {
                initRelatorios();
            }, 100);
            break;
    }
}

// Mostrar alertas na interface
function mostrarAlerta(mensagem, tipo = 'info') {
    console.log(`📢 Alerta: ${mensagem}`);
    
    // Criar elemento de alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensagem;
    alerta.style.position = 'fixed';
    alerta.style.top = '20px';
    alerta.style.right = '20px';
    alerta.style.zIndex = '9999';
    alerta.style.padding = '12px 20px';
    alerta.style.borderRadius = '5px';
    alerta.style.maxWidth = '400px';
    alerta.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    // Estilos por tipo
    switch (tipo) {
        case 'success':
            alerta.style.backgroundColor = '#d4edda';
            alerta.style.color = '#155724';
            alerta.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            alerta.style.backgroundColor = '#f8d7da';
            alerta.style.color = '#721c24';
            alerta.style.border = '1px solid #f5c6cb';
            break;
        case 'warning':
            alerta.style.backgroundColor = '#fff3cd';
            alerta.style.color = '#856404';
            alerta.style.border = '1px solid #ffeeba';
            break;
        default:
            alerta.style.backgroundColor = '#d1ecf1';
            alerta.style.color = '#0c5460';
            alerta.style.border = '1px solid #bee5eb';
    }
    
    // Adicionar na página
    document.body.appendChild(alerta);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.parentNode.removeChild(alerta);
        }
    }, 5000);
}

// ========================================
// FUNÇÕES DE ATUALIZAÇÃO DE INTERFACE
// ========================================

function atualizarDropdowns() {
    console.log('🔄 Atualizando dropdowns...');
    
    // Dropdown de empresas nos funcionários
    const selectEmpresaFunc = document.getElementById('funcionario-empresa');
    if (selectEmpresaFunc) {
        selectEmpresaFunc.innerHTML = '<option value="">Selecione uma empresa...</option>';
        empresas.forEach(empresa => {
            selectEmpresaFunc.innerHTML += `<option value="${empresa.nome}">${empresa.nome}</option>`;
        });
    }
    
    // Dropdown de funcionários nos lançamentos
    const selectFuncLanc = document.getElementById('lancamento-funcionario');
    if (selectFuncLanc) {
        selectFuncLanc.innerHTML = '<option value="">Selecione um funcionário...</option>';
        funcionarios.filter(f => f.situacao === 'Ativo').forEach(funcionario => {
            selectFuncLanc.innerHTML += `<option value="${funcionario.nome}">${funcionario.nome}</option>`;
        });
    }
    
    // Dropdown de obras nos lançamentos
    const selectObraLanc = document.getElementById('lancamento-obra');
    if (selectObraLanc) {
        selectObraLanc.innerHTML = '<option value="">Selecione uma obra...</option>';
        obras.forEach(obra => {
            selectObraLanc.innerHTML += `<option value="${obra.nome}">${obra.nome}</option>`;
        });
    }
}

// ========================================
// INICIALIZAÇÃO DO SISTEMA
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando Sistema de Controle de Obras...');
    console.log('🌐 Ambiente:', API_CONFIG.isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');
    aplicarCacheBusting();
    
    // ===== INICIALIZAR SIDEBAR =====
    // Restaurar estado do sidebar do localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        document.getElementById('sidebar').classList.add('collapsed');
        document.getElementById('mainContent').classList.add('sidebar-collapsed');
    }
    
    // Marcar item ativo inicial (Dashboard)
    updateActiveMenuItem('dashboard');
    
    // Verificar se formulários existem
    const forms = {
        empresa: document.getElementById('form-empresa'),
        obra: document.getElementById('form-obra'),
        funcionario: document.getElementById('form-funcionario'),
        lancamento: document.getElementById('form-lancamento')
    };
    
    console.log('📋 Formulários encontrados:', {
        empresa: !!forms.empresa,
        obra: !!forms.obra,
        funcionario: !!forms.funcionario,
        lancamento: !!forms.lancamento
    });
    
    // Carregar dados iniciais
    await carregarDados();
    
    // Atualizar interface
    atualizarDropdowns();
    atualizarTabelaEmpresas();
    atualizarTabelaObras();
    atualizarTabelaFuncionarios();
    atualizarTabelaLancamentos();
    
    // Configurar formulários
    configurarFormularios();
    
    // Configurar data padrão
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lancamentoData = document.getElementById('lancamento-data');
    if (lancamentoData) {
        lancamentoData.value = hoje;
    }
    
    console.log('✅ Sistema inicializado com sucesso!');
    // Wire print button for Relatórios if present
    const btnPrint = document.getElementById('btn-imprimir-relatorios');
    if (btnPrint) {
        btnPrint.addEventListener('click', imprimirRelatorios);
    }

    // Inject clean filters panel for Relatórios
    ensureRelatoriosControls();

    // ===== CONFIGURAR MODAIS DE EDIÇÃO =====
    // Fechar modal ao clicar no backdrop (fundo escuro)
    configurarModaisEdicao();
});

// Função para configurar todos os formulários
function configurarFormularios() {
    console.log('⚙️ Configurando formulários...');
    
    // Formulário de Empresas
    const formEmpresa = document.getElementById('form-empresa');
    if (formEmpresa) {
        formEmpresa.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🏢 Enviando empresa...');
            
            const dados = {
                nome: document.getElementById('empresa-nome').value.trim(),
                cnpj: document.getElementById('empresa-cnpj').value.trim(), 
                tipo: document.getElementById('empresa-tipo').value
            };
            
                if (!dados.nome) {
                mostrarToast('Nome da empresa é obrigatório!', 'warning');
                return;
            }            try {
                const response = await fetchAPI(API_CONFIG.endpoints.empresas, {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
                
                if (response.sucesso) {
                    mostrarToast('Empresa adicionada com sucesso!', 'success');
                    formEmpresa.reset();
                    await carregarDados();
                    atualizarDropdowns();
                    atualizarTabelaEmpresas();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao salvar empresa', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão. Tente novamente.', 'error');
            }
        });
    }
    
    // Configurar formulário de funcionários
    const formFuncionario = document.getElementById('form-funcionario');
    if (formFuncionario) {
        formFuncionario.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('👷 Enviando funcionário...');
            
            const dados = {
                nome: document.getElementById('funcionario-nome').value.trim(),
                funcao: document.getElementById('funcionario-funcao').value.trim(),
                // Enviar nome da empresa para API (não ID)
                empresa: (function(){
                    const sel = document.getElementById('funcionario-empresa');
                    if (!sel) return '';
                    const opt = sel.options[sel.selectedIndex];
                    return opt ? opt.text : '';
                })(),
                situacao: document.getElementById('funcionario-situacao')?.value || 'Ativo'
            };
            
            if (!dados.nome || !dados.funcao) {
                mostrarToast('Nome e função são obrigatórios!', 'warning');
                return;
            }
            
            try {
                const response = await fetchAPI(API_CONFIG.endpoints.funcionarios, {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
                
                if (response.sucesso) {
                    mostrarToast('Funcionário adicionado com sucesso!', 'success');
                    formFuncionario.reset();
                    await carregarDados();
                    atualizarDropdowns();
                    atualizarTabelaFuncionarios();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao salvar funcionário', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão. Tente novamente.', 'error');
            }
        });
    }
    
    // Configurar formulários de edição (já têm onsubmit no HTML)
    // Os eventos de submit já estão definidos inline no HTML:
    // - form-editar-funcionario → onsubmit="salvarEdicaoFuncionario(event)"
    // - form-editar-empresa → onsubmit="salvarEdicaoEmpresa(event)"
    // - form-editar-obra → onsubmit="salvarEdicaoObra(event)"
    // - form-editar-lancamento → onsubmit="salvarEdicaoLancamento(event)"
    
    // Configurar formulário de obras
    const formObra = document.getElementById('form-obra');
    if (formObra) {
        formObra.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🏗️ Enviando obra...');
            
            const dados = {
                nome: document.getElementById('obra-nome').value.trim(),
                responsavel: document.getElementById('obra-responsavel').value.trim(),
                cidade: document.getElementById('obra-cidade').value.trim()
            };
            
            if (!dados.nome) {
                mostrarToast('Nome da obra é obrigatório!', 'warning');
                return;
            }
            
            try {
                const response = await fetchAPI(API_CONFIG.endpoints.obras, {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
                
                if (response.sucesso) {
                    mostrarToast('Obra adicionada com sucesso!', 'success');
                    formObra.reset();
                    await carregarDados();
                    atualizarDropdowns();
                    atualizarTabelaObras();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao salvar obra', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão. Tente novamente.', 'error');
            }
        });
    }
    
    // Configurar formulário de lançamentos
    const formLancamento = document.getElementById('form-lancamento');
    if (formLancamento) {
        // Definir data padrão como hoje
        const dd = new Date();
        const hojeLanc = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
        document.getElementById('lancamento-data').value = hojeLanc;
        
        // Auto-preencher função e empresa ao selecionar funcionário
        const selectFuncionario = document.getElementById('lancamento-funcionario');
        selectFuncionario.addEventListener('change', function() {
            const funcionarioNome = this.options[this.selectedIndex].text;
            const funcionario = funcionarios.find(f => f.nome === funcionarioNome);
            
            if (funcionario) {
                document.getElementById('lancamento-funcao').value = funcionario.funcao || '';
                document.getElementById('lancamento-empresa').value = funcionario.empresa || '';
            } else {
                document.getElementById('lancamento-funcao').value = '';
                document.getElementById('lancamento-empresa').value = '';
            }
        });
        
        // Campo de horas sempre visível
        const campoHoras = document.getElementById('campo-horas');
        const inputHoras = document.getElementById('lancamento-horas');
        if (campoHoras) campoHoras.style.display = 'block';
        
        formLancamento.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('⏰ Enviando lançamento...');
            
            const dados = {
                data: document.getElementById('lancamento-data').value,
                funcionario: selectFuncionario.options[selectFuncionario.selectedIndex].text,
                funcao: document.getElementById('lancamento-funcao').value,
                empresa: document.getElementById('lancamento-empresa').value,
                obra: document.getElementById('lancamento-obra').options[document.getElementById('lancamento-obra').selectedIndex].text,
                horas: document.getElementById('lancamento-horas').value,
                observacao: document.getElementById('lancamento-observacao').value.trim()
            };
            
            if (!dados.data || !dados.funcionario || !dados.obra) {
                mostrarToast('Data, funcionário e obra são obrigatórios!', 'warning');
                return;
            }
            
            try {
                const response = await fetchAPI(API_CONFIG.endpoints.lancamentos, {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
                
                if (response.sucesso) {
                    mostrarToast('Lançamento registrado com sucesso!', 'success');
                    formLancamento.reset();
                    // Manter a data de hoje após reset
                    document.getElementById('lancamento-data').value = hojeLanc;
                    document.getElementById('lancamento-horas').value = '08:00';
                    if (campoHoras) campoHoras.style.display = 'block';
                    await carregarDados();
                    atualizarTabelaLancamentos();
                    atualizarDashboard();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao registrar lançamento', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão. Tente novamente.', 'error');
            }
        });
    }
    
    console.log('✅ Formulários configurados');
}

// ========================================
// FUNÇÕES DE TABELA (PLACEHOLDER)
// ========================================

function atualizarTabelaEmpresas() {
    console.log('📊 Atualizando tabela de empresas...');
    const tbody = document.getElementById('tabela-empresas');
    if (!tbody) return;

    if (empresas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Nenhuma empresa cadastrada</td></tr>';
        return;
    }

    tbody.innerHTML = empresas.map(empresa => `
        <tr>
            <td>${empresa.nome}</td>
            <td>${empresa.cnpj || '-'}</td>
            <td>${empresa.tipo || '-'}</td>
            <td>
                <button onclick="editarEmpresa(${empresa.id})" class="btn btn-sm btn-secondary">✏️ Editar</button>
                <button onclick="excluirEmpresa(${empresa.id})" class="btn btn-sm btn-danger">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');
    
    // Preencher dropdowns dos filtros
    const selectFuncionario = document.getElementById('relatorio-funcionario');
    const selectObra = document.getElementById('relatorio-obra');
    const filtroMes = document.getElementById('filtro-mes');
    const filtroObraRel = document.getElementById('filtro-obra-rel');
    const filtroEmpresaRel = document.getElementById('filtro-empresa-rel');

    // Funcionários
    if (selectFuncionario) {
        selectFuncionario.innerHTML = '<option value="">Todos</option>';
        const nomes = [...new Set(funcionarios.map(f => f.nome).filter(Boolean))].sort();
        nomes.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = nome;
            selectFuncionario.appendChild(option);
        });
    }

    // Obras
    if (selectObra) {
        selectObra.innerHTML = '<option value="">Todas</option>';
        const nomes = [...new Set(obras.map(o => o.nome).filter(Boolean))].sort();
        nomes.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = nome;
            selectObra.appendChild(option);
        });
    }

    // Filtro obra (relatórios)
    if (filtroObraRel) {
        filtroObraRel.innerHTML = '<option value="">Todas as obras</option>';
        const nomes = [...new Set(obras.map(o => o.nome).filter(Boolean))].sort();
        nomes.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = nome;
            filtroObraRel.appendChild(option);
        });
    }

    // Filtro empresa (relatórios)
    if (filtroEmpresaRel) {
        filtroEmpresaRel.innerHTML = '<option value="">Todas as empresas</option>';
        const nomes = [...new Set(empresas.map(e => e.nome).filter(Boolean))].sort();
        nomes.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = nome;
            filtroEmpresaRel.appendChild(option);
        });
    }

    // Aplicar filtros e atualizar se houver alterações
    aplicarFiltrosRelatorios();
}

function aplicarFiltrosRelatorios() {
    const filtroInicio = document.getElementById('rel-data-inicio');
    const filtroFim = document.getElementById('rel-data-fim');
    const filtroObraRel = document.getElementById('filtro-obra-rel');
    const filtroEmpresaRel = document.getElementById('filtro-empresa-rel');
    const selectFuncionario = document.getElementById('relatorio-funcionario');
    const selectFuncao = document.getElementById('rel-filtro-funcao');
    const selectObra = document.getElementById('relatorio-obra');
    // Filtrar por intervalo de datas
    const inicio = filtroInicio && filtroInicio.value ? filtroInicio.value : '';
    const fim = filtroFim && filtroFim.value ? filtroFim.value : '';
    let filtrados = [...lancamentos];
    if (inicio) filtrados = filtrados.filter(l => (l.data||'') >= inicio);
    if (fim) filtrados = filtrados.filter(l => (l.data||'') <= fim);

    // Filtros adicionais
    const obraFiltro = (filtroObraRel && filtroObraRel.value) ? filtroObraRel.value : '';
    const empresaFiltro = (filtroEmpresaRel && filtroEmpresaRel.value) ? filtroEmpresaRel.value : '';
    const funcionarioFiltro = (selectFuncionario && selectFuncionario.value) ? selectFuncionario.value : '';
    const obraFiltro2 = (selectObra && selectObra.value) ? selectObra.value : '';

    if (obraFiltro) filtrados = filtrados.filter(l => l.obra === obraFiltro);
    if (empresaFiltro) filtrados = filtrados.filter(l => l.empresa === empresaFiltro);
    if (funcionarioFiltro) filtrados = filtrados.filter(l => l.funcionario === funcionarioFiltro);
    const funcaoFiltro = (selectFuncao && selectFuncao.value) ? selectFuncao.value : '';
    if (funcaoFiltro) filtrados = filtrados.filter(l => l.funcao === funcaoFiltro);
    if (obraFiltro2) filtrados = filtrados.filter(l => l.obra === obraFiltro2);

    // Estatísticas
    const totalHoras = filtrados.reduce((sum, l) => {
        const [h, m] = (l.horas || '00:00').split(':').map(Number);
        return sum + h + (m||0)/60;
    }, 0);
    const diasUnicos = new Set(filtrados.map(l => l.data)).size;

    const elTotalHoras = document.getElementById('total-horas');
    const elDias = document.getElementById('dias-trabalhados');
    const elMedia = document.getElementById('media-dia');
    const elTotalLanc = document.getElementById('total-lancamentos');
    const elTotalObras = document.getElementById('relatorio-total-obras');

    if (elTotalHoras) elTotalHoras.textContent = `${Math.floor(totalHoras)}h ${Math.round((totalHoras % 1) * 60)}m`;
    if (elDias) elDias.textContent = diasUnicos;
    if (elMedia) {
        const mediaPorDia = diasUnicos > 0 ? totalHoras / diasUnicos : 0;
        elMedia.textContent = `${Math.floor(mediaPorDia)}h ${Math.round((mediaPorDia % 1) * 60)}m`;
    }
    if (elTotalLanc) elTotalLanc.textContent = filtrados.length;
    if (elTotalObras) elTotalObras.textContent = String(new Set(filtrados.map(l=> l.obra)).size);

    // Tabelas agrupadas
    const relFuncTbody = document.getElementById('relatorio-funcionario-tbody');
    const relObraTbody = document.getElementById('relatorio-obra-tbody');
    const relTotalObras = document.getElementById('relatorio-total-obras');

    if (relFuncTbody) {
        const porFunc = {};
        filtrados.forEach(l => {
            const nome = l.funcionario || '—';
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            porFunc[nome] = (porFunc[nome] || 0) + h + (m||0)/60;
        });
        const rows = Object.entries(porFunc).sort((a,b) => b[1]-a[1]).map(([nome, horas]) => {
            const hInt = Math.floor(horas);
            const min = Math.round((horas%1)*60);
            return { nome, horasTxt: `${hInt}h ${min}m` };
        });
        renderRelGrupoTable(relFuncTbody, rows, 'funcionario');
    }

    if (relObraTbody) {
        const porObra = {};
        filtrados.forEach(l => {
            const nome = l.obra || '—';
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            porObra[nome] = (porObra[nome] || 0) + h + (m||0)/60;
        });
        const rows = Object.entries(porObra).sort((a,b) => b[1]-a[1]).map(([nome, horas]) => {
            const hInt = Math.floor(horas);
            const min = Math.round((horas%1)*60);
            return { nome, horasTxt: `${hInt}h ${min}m` };
        });
        renderRelGrupoTable(relObraTbody, rows, 'obra');
    }

    // Tabelas agrupadas - Renderização
    if (relFuncTbody) {
        const porFunc = {};
        filtrados.forEach(l => {
            const nome = l.funcionario || '—';
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            porFunc[nome] = (porFunc[nome] || 0) + h + (m||0)/60;
        });
        const rows = Object.entries(porFunc).sort((a,b) => b[1]-a[1]).map(([nome, horas]) => {
            const hInt = Math.floor(horas);
            const min = Math.round((horas%1)*60);
            return { nome, horasTxt: `${hInt}h ${min}m` };
        });
        renderRelatorioGrupo(relFuncTbody, rows, 'funcionario');
    }

    if (relObraTbody) {
        const porObra = {};
        filtrados.forEach(l => {
            const nome = l.obra || '—';
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            porObra[nome] = (porObra[nome] || 0) + h + (m||0)/60;
        });
        const rows = Object.entries(porObra).sort((a,b) => b[1]-a[1]).map(([nome, horas]) => {
            const hInt = Math.floor(horas);
            const min = Math.round((horas%1)*60);
            return { nome, horasTxt: `${hInt}h ${min}m` };
        });
        renderRelatorioGrupo(relObraTbody, rows, 'obra');
    }
    const trend = document.getElementById('relatorio-trend');
    if (trend) {
        const byDay = {};
        filtrados.forEach(l => {
            const dia = l.data;
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            byDay[dia] = (byDay[dia] || 0) + (h||0)*60 + (m||0);
        });
        const itens = Object.entries(byDay).sort((a,b)=> a[0].localeCompare(b[0]));
        trend.innerHTML = itens.map(([dia, minutos]) => {
            const h = Math.max(4, Math.round(minutos/10));
            return `<div class="mini-bar" title="${dia}: ${Math.floor(minutos/60)}h ${minutos%60}m" style="height:${h}px"></div>`;
        }).join('');
    }
}

// Dataset filtrado atual da aba Relatórios (para exportar/print)
function getLancamentosFiltradosRel() {
    const filtroInicio = document.getElementById('rel-data-inicio');
    const filtroFim = document.getElementById('rel-data-fim');
    const filtroObraRel = document.getElementById('filtro-obra-rel');
    const filtroEmpresaRel = document.getElementById('filtro-empresa-rel');
    const selectFuncionario = document.getElementById('relatorio-funcionario');
    const selectFuncao = document.getElementById('rel-filtro-funcao');
    const selectObra = document.getElementById('relatorio-obra');
    // Intervalo de datas
    const inicio = filtroInicio && filtroInicio.value ? filtroInicio.value : '';
    const fim = filtroFim && filtroFim.value ? filtroFim.value : '';
    let filtrados = [...lancamentos];
    if (inicio) filtrados = filtrados.filter(l => (l.data||'') >= inicio);
    if (fim) filtrados = filtrados.filter(l => (l.data||'') <= fim);

    const obraFiltro = (filtroObraRel && filtroObraRel.value) ? filtroObraRel.value : '';
    const empresaFiltro = (filtroEmpresaRel && filtroEmpresaRel.value) ? filtroEmpresaRel.value : '';
    const funcionarioFiltro = (selectFuncionario && selectFuncionario.value) ? selectFuncionario.value : '';
    const funcaoFiltro = (selectFuncao && selectFuncao.value) ? selectFuncao.value : '';
    const obraFiltro2 = (selectObra && selectObra.value) ? selectObra.value : '';

    if (obraFiltro) filtrados = filtrados.filter(l => l.obra === obraFiltro);
    if (empresaFiltro) filtrados = filtrados.filter(l => l.empresa === empresaFiltro);
    if (funcionarioFiltro) filtrados = filtrados.filter(l => l.funcionario === funcionarioFiltro);
    if (funcaoFiltro) filtrados = filtrados.filter(l => l.funcao === funcaoFiltro);
    if (obraFiltro2) filtrados = filtrados.filter(l => l.obra === obraFiltro2);

        return filtrados;
    }
document.addEventListener('DOMContentLoaded', () => {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroObraRel = document.getElementById('filtro-obra-rel');
    const filtroEmpresaRel = document.getElementById('filtro-empresa-rel');
    const selectFuncionario = document.getElementById('relatorio-funcionario');
    const selectObra = document.getElementById('relatorio-obra');

    [filtroInicio, filtroFim, filtroObraRel, filtroEmpresaRel, selectFuncionario, selectObra]
        .filter(Boolean)
        .forEach(el => el.addEventListener('change', aplicarFiltrosRelatorios));
});

// Corrigir tabela de obras (função estava corrompida)
function atualizarTabelaObras() {
    console.log('📊 Atualizando tabela de obras...');
    const tbody = document.getElementById('tabela-obras');
    if (!tbody) return;

    if (obras.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Nenhuma obra cadastrada</td></tr>';
        return;
    }

    tbody.innerHTML = obras.map(obra => `
        <tr>
            <td>${obra.nome}</td>
            <td>${obra.responsavel || '-'}</td>
            <td>${obra.cidade || '-'}</td>
            <td>
                <button onclick="editarObra(${obra.id})" class="btn btn-sm btn-secondary">✏️ Editar</button>
                <button onclick="excluirObra(${obra.id})" class="btn btn-sm btn-danger">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');
}
let relGrupoPageSize = 50;
let relGrupoPaginaFunc = 1;
let relGrupoPaginaObra = 1;

function renderRelatorioGrupo(tbody, rows, tipo) {
    if (!tbody) return;
    const total = rows.length;
    const pageSizeSel = document.getElementById('rel-page-size');
    if (pageSizeSel) relGrupoPageSize = Number(pageSizeSel.value) || relGrupoPageSize;
    const paginaAtual = tipo==='funcionario' ? relGrupoPaginaFunc : relGrupoPaginaObra;
    const totalPaginas = Math.max(1, Math.ceil(total / relGrupoPageSize));
    const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
    if (tipo==='funcionario') relGrupoPaginaFunc = paginaCorrigida; else relGrupoPaginaObra = paginaCorrigida;
    const inicio = (paginaCorrigida - 1) * relGrupoPageSize;
    const pageRows = rows.slice(inicio, inicio + relGrupoPageSize);

    tbody.innerHTML = pageRows.map(r => `<tr data-tipo="${tipo}" data-nome="${r.nome}"><td>${r.nome}</td><td>${r.horasTxt}</td></tr>`).join('') || '<tr><td colspan="2" class="loading">Sem dados</td></tr>';

    // Wire row click for drill-down
    Array.from(tbody.querySelectorAll('tr[data-tipo]')).forEach(tr => {
        tr.addEventListener('click', () => {
            const nome = tr.getAttribute('data-nome');
            abrirDrillDownModal(tipo, nome);
        });
    });

    // Render pagination controls if containers exist
    const contId = tipo==='funcionario' ? 'rel-func-paginacao' : 'rel-obra-paginacao';
    const cont = document.getElementById(contId);
    if (!cont) return;
    cont.innerHTML = '';
    const info = document.createElement('span');
    info.textContent = `Página ${paginaCorrigida} de ${totalPaginas}`;
    const prev = document.createElement('button'); prev.textContent = '◀'; prev.disabled = paginaCorrigida<=1;
    const next = document.createElement('button'); next.textContent = '▶'; next.disabled = paginaCorrigida>=totalPaginas;
    prev.addEventListener('click', () => { if (tipo==='funcionario'){ if (relGrupoPaginaFunc>1){ relGrupoPaginaFunc--; aplicarFiltrosRelatorios(); } } else { if (relGrupoPaginaObra>1){ relGrupoPaginaObra--; aplicarFiltrosRelatorios(); } } });
    next.addEventListener('click', () => { if (tipo==='funcionario'){ if (relGrupoPaginaFunc<totalPaginas){ relGrupoPaginaFunc++; aplicarFiltrosRelatorios(); } } else { if (relGrupoPaginaObra<totalPaginas){ relGrupoPaginaObra++; aplicarFiltrosRelatorios(); } } });
    cont.appendChild(prev);
    cont.appendChild(info);
    cont.appendChild(next);
}

function abrirDrillDownModal(tipo, nome) {
    // Build filtered dataset
    const base = getLancamentosFiltradosRel();
    const lista = base.filter(l => tipo==='funcionario' ? (l.funcionario===nome) : (l.obra===nome));
    const linhas = lista.map(l => `
        <tr>
            <td>${formatarData(l.data)}</td>
            <td>${l.funcionario||'-'}</td>
            <td>${l.obra||'-'}</td>
            <td>${l.empresa||'-'}</td>
            <td>${formatarHora(l.horas)}</td>
            <td>${l.observacao||'-'}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="loading">Sem detalhes</td></tr>';

    const conteudo = `
        <div class="modal-scroll">
          <table class="table compact">
            <thead><tr>
              <th>Data</th><th>Funcionário</th><th>Obra</th><th>Empresa</th><th>Horas</th><th>Obs.</th>
            </tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>`;
    abrirModal(`Detalhes • ${tipo==='funcionario'?'Funcionário':'Obra'}: ${nome}`, conteudo, null);
}

// Função de impressão dos relatórios
function imprimirRelatorios() {
    try {
        window.print();
    } catch (e) {
        console.warn('Falha ao imprimir:', e);
    }
}

// Compat: alias para função de renderização de grupos
function renderRelGrupoTable(tbody, rows, tipo) {
    return renderRelatorioGrupo(tbody, rows, tipo);
}

// Dataset filtrado atual da aba Relatórios (para exportar/print)
function atualizarTabelaFuncionarios() {
    console.log('📊 Atualizando tabela de funcionários...');
    const tbody = document.getElementById('tabela-funcionarios');
    
    if (funcionarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum funcionário cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = funcionarios.map(funcionario => `
        <tr>
            <td>${funcionario.nome}</td>
            <td>${funcionario.funcao || '-'}</td>
            <td>${funcionario.empresa || 'Sem empresa'}</td>
            <td><span class="badge ${funcionario.situacao === 'Ativo' ? 'badge-active' : 'badge-inactive'}">${funcionario.situacao || 'Ativo'}</span></td>
            <td>
                <button onclick="editarFuncionario(${funcionario.id})" class="btn btn-sm btn-secondary">✏️ Editar</button>
                <button onclick="excluirFuncionario(${funcionario.id})" class="btn btn-sm btn-danger">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');
}

function atualizarTabelaLancamentos() {
    console.log('📊 Atualizando tabela de lançamentos...');
    const tbody = document.getElementById('tabela-lancamentos');
    
    // Se existir filtros/paginação na aba, usar eles; caso contrário, mostrar tudo com segurança
    atualizarLancamentosUI();
}

// ===== FILTROS E PAGINAÇÃO DE LANÇAMENTOS =====
let lancFiltros = { inicio: '', fim: '', funcionario: '', funcao: '', empresa: '', obra: '' };
let lancPageSize = 50;
let lancPagina = 1;
let lancSort = { col: 'data', dir: 'desc' }; // dir: 'asc' | 'desc'

function getLancamentosFiltrados() {
    // Base: ordenar por data crescente e id para estabilidade
    let dados = [...lancamentos];

    // Período por dia (início/fim)
    if (lancFiltros.inicio) {
        dados = dados.filter(l => (l.data||'') >= lancFiltros.inicio);
    }
    if (lancFiltros.fim) {
        dados = dados.filter(l => (l.data||'') <= lancFiltros.fim);
    }
    // Funcionário, Função, Empresa, Obra
    if (lancFiltros.funcionario) {
        dados = dados.filter(l => (l.funcionario||'') === lancFiltros.funcionario);
    }
    if (lancFiltros.funcao) {
        dados = dados.filter(l => (l.funcao||'') === lancFiltros.funcao);
    }
    if (lancFiltros.empresa) {
        dados = dados.filter(l => (l.empresa||'') === lancFiltros.empresa);
    }
    if (lancFiltros.obra) {
        dados = dados.filter(l => (l.obra||'') === lancFiltros.obra);
    }

    // Ordenação dinâmica
    const col = lancSort.col;
    const dir = lancSort.dir;
    dados.sort((a,b) => {
        let va = a[col] ?? '';
        let vb = b[col] ?? '';
        // Datas como string YYYY-MM-DD
        if (col === 'data') {
            return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        // Horas HH:MM
        if (col === 'horas') {
            const toMin = v => {
                const [h,m] = String(v||'00:00').slice(0,5).split(':').map(Number);
                return (h||0)*60 + (m||0);
            };
            return dir === 'asc' ? (toMin(va)-toMin(vb)) : (toMin(vb)-toMin(va));
        }
        // Textos: alfabética
        va = String(va).toUpperCase();
        vb = String(vb).toUpperCase();
        const cmp = va.localeCompare(vb, 'pt-BR');
        return dir === 'asc' ? cmp : -cmp;
    });
    return dados;
}

function atualizarLancamentosUI() {
    const tbody = document.getElementById('tabela-lancamentos');
    if (!tbody) return;

    // Popular selects de filtros se existirem
    const selInicio = document.getElementById('lanc-data-inicio');
    const selFim = document.getElementById('lanc-data-fim');
    const selFunc = document.getElementById('lanc-filtro-funcionario');
    const selFuncao = document.getElementById('lanc-filtro-funcao');
    const selEmpresa = document.getElementById('lanc-filtro-empresa');
    const selObra = document.getElementById('lanc-filtro-obra');
    const selPageSize = document.getElementById('lanc-page-size');

    // Datas: define padrão de hoje como fim e último dia 30 como início
    if (selInicio && !selInicio.value) {
        const d = new Date();
        const pad = n => String(n).padStart(2,'0');
        const hoje = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const dIni = new Date(d.getTime() - 29*24*60*60*1000);
        const ini = `${dIni.getFullYear()}-${pad(dIni.getMonth()+1)}-${pad(dIni.getDate())}`;
        selInicio.value = ini;
        if (selFim && !selFim.value) selFim.value = hoje;
    }
    // Funcionários
    if (selFunc && selFunc.options.length <= 1) {
        const nomes = [...new Set(funcionarios.map(f => f.nome).filter(Boolean))].sort();
        selFunc.innerHTML = '<option value="">Todos os funcionários</option>' +
            nomes.map(n => `<option value="${n}">${n}</option>`).join('');
    }
    // Funções
    if (selFuncao && selFuncao.options.length <= 1) {
        const nomes = [...new Set(funcionarios.map(f => f.funcao).filter(Boolean))].sort();
        selFuncao.innerHTML = '<option value="">Todas as funções</option>' +
            nomes.map(n => `<option value="${n}">${n}</option>`).join('');
    }
    // Empresas (derivadas dos lançamentos)
    if (selEmpresa && selEmpresa.options.length <= 1) {
        const nomes = [...new Set(lancamentos.map(l => l.empresa).filter(Boolean))].sort();
        selEmpresa.innerHTML = '<option value="">Todas as empresas</option>' +
            nomes.map(n => `<option value="${n}">${n}</option>`).join('');
    }
    // Obras (derivadas dos lançamentos)
    if (selObra && selObra.options.length <= 1) {
        const nomes = [...new Set(lancamentos.map(l => l.obra).filter(Boolean))].sort();
        selObra.innerHTML = '<option value="">Todas as obras</option>' +
            nomes.map(n => `<option value="${n}">${n}</option>`).join('');
    }
    // Funcionários
    if (selFunc && selFunc.options.length <= 1) {
        const nomes = [...new Set(funcionarios.map(f => f.nome).filter(Boolean))].sort();
        selFunc.innerHTML = '<option value="">Todos os funcionários</option>' +
            nomes.map(n => `<option value="${n}">${n}</option>`).join('');
    }
    // Page size
    if (selPageSize && selPageSize.options.length === 0) {
        selPageSize.innerHTML = ['25','50','100','200','500']
            .map(v => `<option value="${v}">${v} por página</option>`).join('');
        selPageSize.value = String(lancPageSize);
    }

    // Obter dados filtrados
    const dados = getLancamentosFiltrados();

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Nenhum lançamento registrado</td></tr>';
        // Limpar paginação
        renderPaginacao(0, 0);
        return;
    }

    // Paginação
    const tamanho = Number(lancPageSize) || 50;
    const totalPaginas = Math.max(1, Math.ceil(dados.length / tamanho));
    if (lancPagina > totalPaginas) lancPagina = totalPaginas;
    const inicio = (lancPagina - 1) * tamanho;
    const paginaDados = dados.slice(inicio, inicio + tamanho);

    tbody.innerHTML = paginaDados.map(lancamento => `
        <tr>
            <td>${formatarData(lancamento.data)}</td>
            <td>${lancamento.funcionario || '-'}</td>
            <td>${lancamento.funcao || '-'}</td>
            <td>${lancamento.empresa || '-'}</td>
            <td>${lancamento.obra || '-'}</td>
            <td>${formatarHora(lancamento.horas)}</td>
            <td>${lancamento.observacao || '-'}</td>
            <td>
                <button onclick="excluirLancamento(${lancamento.id})" class="btn btn-sm btn-danger">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');

    renderPaginacao(lancPagina, totalPaginas);
}

function renderPaginacao(paginaAtual, totalPaginas) {
    const container = document.getElementById('lanc-paginacao');
    const selPageSize = document.getElementById('lanc-page-size');
    if (selPageSize) selPageSize.value = String(lancPageSize);
    if (!container) return;

    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="pagination-controls">
            <button id="lanc-prev" class="btn btn-sm" ${paginaAtual<=1?'disabled':''}>◀️ Anterior</button>
            <span class="page-info">Página ${paginaAtual} de ${totalPaginas}</span>
            <button id="lanc-next" class="btn btn-sm" ${paginaAtual>=totalPaginas?'disabled':''}>Próxima ▶️</button>
        </div>
    `;

    const btnPrev = document.getElementById('lanc-prev');
    const btnNext = document.getElementById('lanc-next');
    if (btnPrev) btnPrev.onclick = () => { if (lancPagina > 1) { lancPagina--; atualizarLancamentosUI(); } };
    if (btnNext) btnNext.onclick = () => { if (lancPagina < totalPaginas) { lancPagina++; atualizarLancamentosUI(); } };
}

// Listeners para filtros e paginação na aba Lançamentos
document.addEventListener('DOMContentLoaded', () => {
    // Criar controles na aba Lançamentos, se não existirem
    ensureLancamentosControls();

    const selInicio = document.getElementById('lanc-data-inicio');
    const selFim = document.getElementById('lanc-data-fim');
    const selFunc = document.getElementById('lanc-filtro-funcionario');
    const selFuncao = document.getElementById('lanc-filtro-funcao');
    const selEmpresa = document.getElementById('lanc-filtro-empresa');
    const selObra = document.getElementById('lanc-filtro-obra');
    const selPageSize = document.getElementById('lanc-page-size');

    if (selInicio) selInicio.addEventListener('change', () => { lancFiltros.inicio = selInicio.value; lancPagina = 1; atualizarLancamentosUI(); });
    if (selFim) selFim.addEventListener('change', () => { lancFiltros.fim = selFim.value; lancPagina = 1; atualizarLancamentosUI(); });
    if (selFunc) selFunc.addEventListener('change', () => { lancFiltros.funcionario = selFunc.value; lancPagina = 1; atualizarLancamentosUI(); });
    if (selFuncao) selFuncao.addEventListener('change', () => { lancFiltros.funcao = selFuncao.value; lancPagina = 1; atualizarLancamentosUI(); });
    if (selEmpresa) selEmpresa.addEventListener('change', () => { lancFiltros.empresa = selEmpresa.value; lancPagina = 1; atualizarLancamentosUI(); });
    if (selObra) selObra.addEventListener('change', () => { lancFiltros.obra = selObra.value; lancPagina = 1; atualizarLancamentosUI(); });
    if (selPageSize) selPageSize.addEventListener('change', () => { lancPageSize = Number(selPageSize.value)||50; lancPagina = 1; atualizarLancamentosUI(); });

    // Sort por clique no cabeçalho
    const ths = [
        {id:'th-data', col:'data'},
        {id:'th-funcionario', col:'funcionario'},
        {id:'th-funcao', col:'funcao'},
        {id:'th-empresa', col:'empresa'},
        {id:'th-obra', col:'obra'},
        {id:'th-horas', col:'horas'}
    ];
    ths.forEach(t => {
        const el = document.getElementById(t.id);
        if (el) el.addEventListener('click', () => {
            if (lancSort.col === t.col) {
                lancSort.dir = lancSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                lancSort.col = t.col;
                lancSort.dir = 'asc';
            }
            atualizarLancamentosUI();
        });
    });

    // Removidos ícones de bússola; filtros ficam no painel
});

// Cria dinamicamente os controles de filtros/paginação se não existirem no HTML
function ensureLancamentosControls() {
    const tbody = document.getElementById('tabela-lancamentos');
    if (!tbody) return;
    const table = tbody.closest('table');
    const card = table ? table.parentElement : null;

    // Cabeçalhos com IDs para sort
    const thead = table?.querySelector('thead');
    if (thead) {
        const ths = thead.querySelectorAll('th');
        // Se não houver IDs, tentar setar baseado em ordem
        if (ths.length >= 8 && !document.getElementById('th-data')) {
            ths[0].id = 'th-data'; ths[0].classList.add('sortable');
            ths[1].id = 'th-funcionario'; ths[1].classList.add('sortable');
            ths[2].id = 'th-funcao'; ths[2].classList.add('sortable');
            ths[3].id = 'th-empresa'; ths[3].classList.add('sortable');
            ths[4].id = 'th-obra'; ths[4].classList.add('sortable');
            ths[5].id = 'th-horas'; ths[5].classList.add('sortable');
            // não adicionar ícones de filtro nas colunas
        }
    }

    // Controles acima da tabela
    if (card && !document.getElementById('lanc-page-size')) {
        const controls = document.createElement('div');
        controls.className = 'lancamentos-controls';
        controls.innerHTML = `
            <div class="lanc-toolbar">
                <button id="toggle-filtros" class="btn-icon" title="Filtros">🔍 Filtros</button>
                <div class="spacer"></div>
                <label class="page-size-label" for="lanc-page-size">Padrão:</label>
                <select id="lanc-page-size" class="ctrl-select mini"></select>
                <div id="lanc-paginacao" class="pagination-container compact"></div>
            </div>
            <div id="lanc-filtros-panel" class="filters-panel">
                <div class="filters-row">
                    <div class="filter-item">
                        <span class="filter-label">Data inicial</span>
                        <input type="date" id="lanc-data-inicio" class="ctrl-input" />
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Data final</span>
                        <input type="date" id="lanc-data-fim" class="ctrl-input" />
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Funcionário</span>
                        <select id="lanc-filtro-funcionario" class="ctrl-select"><option value="">Todos os funcionários</option></select>
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Função</span>
                        <select id="lanc-filtro-funcao" class="ctrl-select"><option value="">Todas as funções</option></select>
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Empresa</span>
                        <select id="lanc-filtro-empresa" class="ctrl-select"><option value="">Todas as empresas</option></select>
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Obra</span>
                        <select id="lanc-filtro-obra" class="ctrl-select"><option value="">Todas as obras</option></select>
                    </div>
                </div>
            </div>`;
        card.insertBefore(controls, table);

        // Toggle filtros panel (collapsed by default on desktop)
        const panel = controls.querySelector('#lanc-filtros-panel');
        const btnToggle = controls.querySelector('#toggle-filtros');
        if (panel && btnToggle) {
            panel.classList.add('collapsed');
            btnToggle.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
            });
        }
    }
}

function atualizarDashboard() {
    console.log('📊 Atualizando dashboard...');
    
    // Atualizar cards de totais com checagem de elementos
    const elEmp = document.getElementById('total-empresas');
    const elFunc = document.getElementById('total-funcionarios');
    const elObras = document.getElementById('total-obras');
    const elLancHoje = document.getElementById('lancamentos-hoje');
    const elLancMes = document.getElementById('dash-lancamentos-mes');

    if (elEmp) elEmp.textContent = empresas.length;
    if (elFunc) elFunc.textContent = funcionarios.length;
    if (elObras) elObras.textContent = obras.length;
    
    // Calcular lançamentos de hoje
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lancamentosHoje = lancamentos.filter(l => l.data === hoje);
    if (elLancHoje) elLancHoje.textContent = lancamentosHoje.length;

    // Lançamentos do mês
    const anoMes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const doMes = lancamentos.filter(l => (l.data || '').slice(0,7) === anoMes);
    if (elLancMes) elLancMes.textContent = doMes.length;

    // Top Funcionários (Este Mês)
    const topContainer = document.getElementById('top-funcionarios');
    if (topContainer) {
        const horasPorFunc = {};
        doMes.forEach(l => {
            const nome = l.funcionario || '—';
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            const total = h + (m||0)/60;
            horasPorFunc[nome] = (horasPorFunc[nome] || 0) + total;
        });
        const ranking = Object.entries(horasPorFunc)
            .map(([nome, horas]) => ({ nome, horas }))
            .sort((a,b) => b.horas - a.horas)
            .slice(0,5);
        const max = Math.max(1, ...ranking.map(r => r.horas));
        topContainer.innerHTML = ranking.map(r => `
            <div class="bar" style="width:${Math.round((r.horas/max)*100)}%">
                <span class="bar-label">${r.nome} • ${Math.floor(r.horas)}h ${Math.round((r.horas%1)*60)}m</span>
            </div>
        `).join('');
    }

    // Horas por Obra (Este Mês)
    const obraContainer = document.getElementById('horas-por-obra');
    if (obraContainer) {
        const horasPorObra = {};
        doMes.forEach(l => {
            const obra = l.obra || '—';
            const [h, m] = (l.horas || '00:00').split(':').map(Number);
            const total = h + (m||0)/60;
            horasPorObra[obra] = (horasPorObra[obra] || 0) + total;
        });
        const lista = Object.entries(horasPorObra)
            .map(([obra, horas]) => ({ obra, horas }))
            .sort((a,b) => b.horas - a.horas)
            .slice(0,5);
        const maxO = Math.max(1, ...lista.map(r => r.horas));
        obraContainer.innerHTML = lista.map(r => `
            <div class="bar" style="width:${Math.round((r.horas/maxO)*100)}%">
                <span class="bar-label">${r.obra} • ${Math.floor(r.horas)}h ${Math.round((r.horas%1)*60)}m</span>
            </div>
        `).join('');
    }
    
    // Atualizar atividades recentes apenas se container existir
    const container = document.getElementById('atividades-recentes') || document.getElementById('recent-activities');
    if (container) atualizarAtividadesRecentes();
}

function atualizarAtividadesRecentes() {
    const container = document.getElementById('atividades-recentes');
    
    // Pegar os 5 lançamentos mais recentes
    const recentes = lancamentos.slice(-5).reverse();
    
    if (recentes.length === 0) {
        container.innerHTML = '<div class="loading">Nenhuma atividade recente</div>';
        return;
    }
    
    container.innerHTML = recentes.map(lancamento => {
        const funcionario = funcionarios.find(f => f.id == lancamento.funcionario_id);
        const obra = obras.find(o => o.id == lancamento.obra_id);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">⏰</div>
                <div class="activity-content">
                    <div class="activity-title">
                        ${funcionario?.nome || 'Funcionário'} trabalhou ${formatarHora(lancamento.horas)}h
                    </div>
                    <div class="activity-time">
                        ${obra?.nome || 'Obra'} • ${formatarData(lancamento.data)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function atualizarRelatorios() {
    console.log('📊 Atualizando relatórios...');
    // Função antiga do sistema legado - não é mais necessária com o novo Relatório Inteligente
}

// Função antiga removida - o novo sistema usa initRelatorios()
function ensureRelatoriosControls() {
    // Removido - painel de filtros antigo não é mais necessário
}

function popularRelatoriosSelectsMinimal() {
        const setOptions = (el, opts, firstLabel='Todos') => {
                if (!el) return;
                el.innerHTML = `<option value="">${firstLabel}</option>` + opts.map(o=> `<option value="${o.value}">${o.label}</option>`).join('');
        };
        const toAnoMes = (dataStr) => {
            if (!dataStr) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr.slice(0,7);
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
                const [dia, mes, ano] = dataStr.split('/');
                return `${ano}-${mes}`;
            }
            const mExt = /^([a-zA-Zçãéíóú]+)\s+de\s+(\d{4})$/.exec(String(dataStr).trim());
            if (mExt) {
                const mesesMap = {
                    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03', 'abril': '04',
                    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09',
                    'outubro': '10', 'novembro': '11', 'dezembro': '12'
                };
                const nome = mExt[1].toLowerCase();
                const ano = mExt[2];
                const mes = mesesMap[nome] || '';
                if (mes) return `${ano}-${mes}`;
            }
            try {
                const dt = new Date(dataStr);
                const ano = dt.getFullYear();
                const mes = String(dt.getMonth()+1).padStart(2,'0');
                return `${ano}-${mes}`;
            } catch { return ''; }
        };
        // Datas default: últimos 30 dias
        const iniEl = document.getElementById('rel-data-inicio');
        const fimEl = document.getElementById('rel-data-fim');
        if (iniEl && fimEl && !iniEl.value && !fimEl.value) {
            const d = new Date();
            const pad = n => String(n).padStart(2,'0');
            const hoje = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            const dIni = new Date(d.getTime() - 29*24*60*60*1000);
            const ini = `${dIni.getFullYear()}-${pad(dIni.getMonth()+1)}-${pad(dIni.getDate())}`;
            iniEl.value = ini;
            fimEl.value = hoje;
        }
        const funcionariosOpts = [...new Set(funcionarios.map(f=> f.nome).filter(Boolean))].sort().map(n=>({ value:n, label:n }));
    const funcoesOpts = [...new Set(funcionarios.map(f=> f.funcao).filter(Boolean))].sort().map(n=>({ value:n, label:n }));
        const obrasOpts = [...new Set(obras.map(o=> o.nome).filter(Boolean))].sort().map(n=>({ value:n, label:n }));
        const empresasOpts = [...new Set(empresas.map(e=> e.nome).filter(Boolean))].sort().map(n=>({ value:n, label:n }));
        const obrasRelOpts = [...new Set(lancamentos.map(l=> l.obra).filter(Boolean))].sort().map(n=>({ value:n, label:n }));
        // Removido seletor de mês
        setOptions(document.getElementById('relatorio-funcionario'), funcionariosOpts, 'Todos');
    setOptions(document.getElementById('rel-filtro-funcao'), funcoesOpts, 'Todas');
        setOptions(document.getElementById('relatorio-obra'), obrasOpts, 'Todas');
        setOptions(document.getElementById('filtro-empresa-rel'), empresasOpts, 'Todas');
        setOptions(document.getElementById('filtro-obra-rel'), obrasRelOpts, 'Todas');
}

// ========================================
// FUNÇÕES DE MODAL E UI
// ========================================

function abrirModal(titulo, conteudo, onConfirmar) {
    const modal = document.getElementById('modal-overlay');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalConteudo = document.getElementById('modal-conteudo');
    const btnConfirmar = document.getElementById('modal-confirmar');
    
    modalTitulo.textContent = titulo;
    modalConteudo.innerHTML = conteudo;
    modal.classList.add('show');
    
    // Configurar botão confirmar
    btnConfirmar.onclick = () => {
        if (onConfirmar) onConfirmar();
        fecharModal();
    };
}

function fecharModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('show');
}

function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = mensagem;
    toast.className = `toast show toast-${tipo}`;
    
    // Auto-fechar após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function fecharToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
}

function mostrarLoading() {
    const loading = document.getElementById('loading-global');
    loading.classList.add('show');
}

function ocultarLoading() {
    const loading = document.getElementById('loading-global');
    loading.classList.remove('show');
}

// ========================================
// FUNÇÕES DE CRUD
// ========================================

async function excluirEmpresa(id) {
    const empresa = empresas.find(e => e.id == id);
    if (!empresa) return;
    
    abrirModal(
        'Confirmar Exclusão',
        `<p>Tem certeza que deseja excluir a empresa <strong>${empresa.nome}</strong>?</p>
         <p class="text-warning">⚠️ Esta ação não pode ser desfeita!</p>`,
        async () => {
            try {
                const response = await fetchAPI(`${API_CONFIG.endpoints.empresas}?id=${id}`, {
                    method: 'DELETE'
                });
                
                if (response.sucesso) {
                    mostrarToast('Empresa excluída com sucesso!', 'success');
                    await carregarDados();
                    atualizarTabelaEmpresas();
                    atualizarDropdowns();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao excluir empresa', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão', 'error');
            }
        }
    );
}

async function excluirObra(id) {
    const obra = obras.find(o => o.id == id);
    if (!obra) return;
    
    abrirModal(
        'Confirmar Exclusão',
        `<p>Tem certeza que deseja excluir a obra <strong>${obra.nome}</strong>?</p>`,
        async () => {
            try {
                const response = await fetchAPI(`${API_CONFIG.endpoints.obras}?id=${id}`, {
                    method: 'DELETE'
                });
                
                if (response.sucesso) {
                    mostrarToast('Obra excluída com sucesso!', 'success');
                    await carregarDados();
                    atualizarTabelaObras();
                    atualizarDropdowns();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao excluir obra', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão', 'error');
            }
        }
    );
}

async function excluirFuncionario(id) {
    const funcionario = funcionarios.find(f => f.id == id);
    if (!funcionario) return;
    
    abrirModal(
        'Confirmar Exclusão',
        `<p>Tem certeza que deseja excluir o funcionário <strong>${funcionario.nome}</strong>?</p>`,
        async () => {
            try {
                const response = await fetchAPI(`${API_CONFIG.endpoints.funcionarios}?id=${id}`, {
                    method: 'DELETE'
                });
                
                if (response.sucesso) {
                    mostrarToast('Funcionário excluído com sucesso!', 'success');
                    await carregarDados();
                    atualizarTabelaFuncionarios();
                    atualizarDropdowns();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao excluir funcionário', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão', 'error');
            }
        }
    );
}

async function excluirLancamento(id) {
    const lancamento = lancamentos.find(l => l.id == id);
    if (!lancamento) return;
    
    abrirModal(
        'Confirmar Exclusão',
        `<p>Tem certeza que deseja excluir este lançamento?</p>
         <p><strong>Data:</strong> ${formatarData(lancamento.data)}</p>
         <p><strong>Horas:</strong> ${formatarHora(lancamento.horas)}</p>`,
        async () => {
            try {
                const response = await fetchAPI(`${API_CONFIG.endpoints.lancamentos}?id=${id}`, {
                    method: 'DELETE'
                });
                
                if (response.sucesso) {
                    mostrarToast('Lançamento excluído com sucesso!', 'success');
                    await carregarDados();
                    atualizarTabelaLancamentos();
                    atualizarDashboard();
                } else {
                    mostrarToast(response.mensagem || 'Erro ao excluir lançamento', 'error');
                }
            } catch (error) {
                mostrarToast('Erro de conexão', 'error');
            }
        }
    );
}

// ========================================
// FUNÇÕES DE RELATÓRIO
// ========================================

function gerarRelatorio() {
    const inicio = document.getElementById('relatorio-inicio').value;
    const fim = document.getElementById('relatorio-fim').value;
    const funcionarioId = document.getElementById('relatorio-funcionario').value;
    const obraId = document.getElementById('relatorio-obra').value;
    
    let dadosFiltrados = [...lancamentos];
    
    // Aplicar filtros
    if (inicio) {
        dadosFiltrados = dadosFiltrados.filter(l => l.data >= inicio);
    }
    
    if (fim) {
        dadosFiltrados = dadosFiltrados.filter(l => l.data <= fim);
    }
    
    if (funcionarioId) {
        dadosFiltrados = dadosFiltrados.filter(l => l.funcionario_id == funcionarioId);
    }
    
    if (obraId) {
        dadosFiltrados = dadosFiltrados.filter(l => l.obra_id == obraId);
    }
    
    // Atualizar estatísticas
    const totalHoras = dadosFiltrados.reduce((sum, l) => {
        const [h, m] = l.horas.split(':');
        return sum + parseInt(h) + parseInt(m) / 60;
    }, 0);
    
    const diasUnicos = new Set(dadosFiltrados.map(l => l.data)).size;
    const mediaPorDia = diasUnicos > 0 ? totalHoras / diasUnicos : 0;
    
    document.getElementById('total-horas').textContent = `${Math.floor(totalHoras)}h ${Math.round((totalHoras % 1) * 60)}m`;
    document.getElementById('dias-trabalhados').textContent = diasUnicos;
    document.getElementById('media-dia').textContent = `${Math.floor(mediaPorDia)}h ${Math.round((mediaPorDia % 1) * 60)}m`;
    
    // Atualizar tabela
    const tbody = document.getElementById('tabela-relatorio');
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum registro encontrado para os filtros aplicados</td></tr>';
        return;
    }
    
    tbody.innerHTML = dadosFiltrados.map(lancamento => {
        const funcionario = funcionarios.find(f => f.id == lancamento.funcionario_id);
        const obra = obras.find(o => o.id == lancamento.obra_id);
        
        return `
            <tr>
                <td>${formatarData(lancamento.data)}</td>
                <td>${funcionario ? funcionario.nome : 'N/A'}</td>
                <td>${obra ? obra.nome : 'N/A'}</td>
                <td>${formatarHora(lancamento.horas)}</td>
                <td>${lancamento.observacao || '-'}</td>
            </tr>
        `;
    }).join('');
}

function exportarCSV() {
    // Usar filtros atuais da aba Relatórios
    const dadosFiltrados = getLancamentosFiltradosRel();
    
    if (dadosFiltrados.length === 0) {
        mostrarToast('Nenhum dado para exportar com os filtros atuais', 'warning');
        return;
    }
    
    // Gerar CSV com colunas completas
    const headers = ['Data', 'Funcionário', 'Função', 'Empresa', 'Obra', 'Horas', 'Observações'];
    const esc = (v) => `"${String(v||'').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
    const csvContent = [
        headers.join(','),
        ...dadosFiltrados.map(l => [
            formatarData(l.data),
            esc(l.funcionario),
            esc(l.funcao),
            esc(l.empresa),
            esc(l.obra),
            formatarHora(l.horas),
            esc(l.observacao)
        ].join(','))
    ].join('\n');
    
    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    link.setAttribute('download', `relatorio_${hoje}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarToast('Relatório exportado com sucesso!', 'success');
}

// ========================================
// FUNÇÕES DE EDIÇÃO (PLACEHOLDERS)
// ========================================

// ========================================
// CONFIGURAÇÃO DOS MODAIS DE EDIÇÃO
// ========================================

function configurarModaisEdicao() {
    console.log('⚙️ Configurando modais de edição...');

    // Lista de modais de edição
    const modais = [
        { id: 'modal-editar-empresa', fechar: fecharModalEmpresa },
        { id: 'modal-editar-funcionario', fechar: fecharModalFuncionario },
        { id: 'modal-editar-obra', fechar: fecharModalObra }
    ];

    // Adicionar event listener para fechar ao clicar no backdrop
    modais.forEach(({ id, fechar }) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', function(event) {
                // Fechar apenas se clicou no backdrop (fundo), não no conteúdo
                if (event.target === modal) {
                    fechar();
                }
            });
            console.log(`✅ Modal ${id} configurado`);
        }
    });

    // Adicionar event listener global para tecla ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            // Verificar qual modal está aberto e fechar
            modais.forEach(({ id, fechar }) => {
                const modal = document.getElementById(id);
                if (modal && modal.classList.contains('show')) {
                    fechar();
                    console.log(`🚪 Modal ${id} fechado com ESC`);
                }
            });
        }
    });
}

// ========================================
// EMPRESAS - EDIÇÃO
// ========================================

function editarEmpresa(id) {
    console.log('✏️ Abrindo modal para editar empresa:', id);
    
    // Buscar dados da empresa
    const empresa = empresas.find(e => e.id == id);
    
    if (!empresa) {
        mostrarToast('Empresa não encontrada', 'error');
        return;
    }
    
    // Preencher modal com dados
    document.getElementById('edit-empresa-id').value = empresa.id;
    document.getElementById('edit-empresa-nome').value = empresa.nome;
    document.getElementById('edit-empresa-cnpj').value = empresa.cnpj || '';
    document.getElementById('edit-empresa-tipo').value = empresa.tipo || 'Construtora';
    
    // Exibir modal
    const modal = document.getElementById('modal-editar-empresa');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function fecharModalEmpresa() {
    const modal = document.getElementById('modal-editar-empresa');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

async function salvarEdicaoEmpresa(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-empresa-id').value;
    const nome = document.getElementById('edit-empresa-nome').value.trim();
    const cnpj = document.getElementById('edit-empresa-cnpj').value.trim();
    const tipo = document.getElementById('edit-empresa-tipo').value;
    
    if (!nome) {
        mostrarToast('Nome é obrigatório', 'error');
        return;
    }
    
    mostrarLoading();
    
    try {
        const response = await fetchAPI(`api_empresas.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: nome,
                cnpj: cnpj,
                tipo: tipo
            })
        });
        
        if (response.sucesso) {
            mostrarToast('Empresa atualizada com sucesso! ✅', 'success');
            fecharModalEmpresa();
            await carregarDados();
            atualizarDropdowns();
            atualizarTabelaEmpresas();
        } else {
            mostrarToast(response.mensagem || 'Erro ao atualizar empresa', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        mostrarToast('Erro ao atualizar empresa', 'error');
    } finally {
        ocultarLoading();
    }
}

function editarObra(id) {
    console.log('✏️ Abrindo modal para editar obra:', id);
    
    // Buscar dados da obra
    const obra = obras.find(o => o.id == id);
    
    if (!obra) {
        mostrarToast('Obra não encontrada', 'error');
        return;
    }
    
    // Preencher modal com dados
    document.getElementById('edit-obra-id').value = obra.id;
    document.getElementById('edit-obra-nome').value = obra.nome;
    document.getElementById('edit-obra-responsavel').value = obra.responsavel || '';
    document.getElementById('edit-obra-cidade').value = obra.cidade || '';
    
    // Exibir modal
    const modal = document.getElementById('modal-editar-obra');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function fecharModalObra() {
    const modal = document.getElementById('modal-editar-obra');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

async function salvarEdicaoObra(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-obra-id').value;
    const nome = document.getElementById('edit-obra-nome').value.trim();
    const responsavel = document.getElementById('edit-obra-responsavel').value.trim();
    const cidade = document.getElementById('edit-obra-cidade').value.trim();
    
    if (!nome) {
        mostrarToast('Nome é obrigatório', 'error');
        return;
    }
    
    mostrarLoading();
    
    try {
        const response = await fetchAPI(`api_obras.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: nome,
                responsavel: responsavel,
                cidade: cidade
            })
        });
        
        if (response.sucesso) {
            mostrarToast('Obra atualizada com sucesso! ✅', 'success');
            fecharModalObra();
            await carregarDados();
            atualizarDropdowns();
            atualizarTabelaObras();
        } else {
            mostrarToast(response.mensagem || 'Erro ao atualizar obra', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar obra:', error);
        mostrarToast('Erro ao atualizar obra', 'error');
    } finally {
        ocultarLoading();
    }
}

function editarFuncionario(id) {
    console.log('✏️ Abrindo modal para editar funcionário:', id);
    
    // Buscar dados do funcionário
    const funcionario = funcionarios.find(f => f.id == id);
    
    if (!funcionario) {
        mostrarToast('Funcionário não encontrado', 'error');
        return;
    }
    
    // Preencher modal com dados
    document.getElementById('edit-funcionario-id').value = funcionario.id;
    document.getElementById('edit-funcionario-nome').value = funcionario.nome;
    document.getElementById('edit-funcionario-funcao').value = funcionario.funcao || '';
    document.getElementById('edit-funcionario-situacao').value = funcionario.situacao || 'Ativo';
    
    // Popular dropdown de empresas no modal
    const selectEmpresa = document.getElementById('edit-funcionario-empresa');
    selectEmpresa.innerHTML = '<option value="">Selecione...</option>';
    empresas.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.nome;
        option.textContent = emp.nome;
        if (emp.nome === funcionario.empresa) {
            option.selected = true;
        }
        selectEmpresa.appendChild(option);
    });
    
    // Exibir modal
    const modal = document.getElementById('modal-editar-funcionario');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function fecharModalFuncionario() {
    const modal = document.getElementById('modal-editar-funcionario');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

async function salvarEdicaoFuncionario(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-funcionario-id').value;
    const nome = document.getElementById('edit-funcionario-nome').value.trim();
    const funcao = document.getElementById('edit-funcionario-funcao').value.trim();
    const empresa = document.getElementById('edit-funcionario-empresa').value;
    const situacao = document.getElementById('edit-funcionario-situacao').value;
    
    if (!nome) {
        mostrarToast('Nome é obrigatório', 'error');
        return;
    }
    
    mostrarLoading();
    
    try {
        const response = await fetchAPI(`api_funcionarios.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: nome,
                funcao: funcao,
                empresa: empresa,
                situacao: situacao
            })
        });
        
        if (response.sucesso) {
            mostrarToast('Funcionário atualizado com sucesso! ✅', 'success');
            fecharModalFuncionario();
            await carregarDados();
            atualizarDropdowns();
            atualizarTabelaFuncionarios();
        } else {
            mostrarToast(response.mensagem || 'Erro ao atualizar funcionário', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar funcionário:', error);
        mostrarToast('Erro ao atualizar funcionário', 'error');
    } finally {
        ocultarLoading();
    }
}

function editarLancamento(id) {
    console.log('✏️ Abrindo modal para editar lançamento:', id);
    
    // Buscar dados do lançamento
    const lancamento = lancamentos.find(l => l.id == id);
    
    if (!lancamento) {
        mostrarToast('Lançamento não encontrado', 'error');
        return;
    }
    
    // Preencher modal com dados
    document.getElementById('edit-lancamento-id').value = lancamento.id;
    document.getElementById('edit-lancamento-data').value = lancamento.data;
    document.getElementById('edit-lancamento-funcao').value = lancamento.funcao || '';
    document.getElementById('edit-lancamento-horas').value = lancamento.horas || '08:00';
    document.getElementById('edit-lancamento-diarias').value = lancamento.diarias || 1;
    document.getElementById('edit-lancamento-observacao').value = lancamento.observacao || '';
    
    // Popular dropdown de funcionários
    const selectFuncionario = document.getElementById('edit-lancamento-funcionario');
    selectFuncionario.innerHTML = '<option value="">Selecione...</option>';
    funcionarios.forEach(func => {
        const option = document.createElement('option');
        option.value = func.nome;
        option.textContent = func.nome;
        if (func.nome === lancamento.funcionario) {
            option.selected = true;
        }
        selectFuncionario.appendChild(option);
    });
    
    // Popular dropdown de empresas
    const selectEmpresa = document.getElementById('edit-lancamento-empresa');
    selectEmpresa.innerHTML = '<option value="">Selecione...</option>';
    empresas.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.nome;
        option.textContent = emp.nome;
        if (emp.nome === lancamento.empresa) {
            option.selected = true;
        }
        selectEmpresa.appendChild(option);
    });
    
    // Popular dropdown de obras
    const selectObra = document.getElementById('edit-lancamento-obra');
    selectObra.innerHTML = '<option value="">Selecione...</option>';
    obras.forEach(obr => {
        const option = document.createElement('option');
        option.value = obr.nome;
        option.textContent = obr.nome;
        if (obr.nome === lancamento.obra) {
            option.selected = true;
        }
        selectObra.appendChild(option);
    });
    
    // Exibir modal
    const modal = document.getElementById('modal-editar-lancamento');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function fecharModalLancamento() {
    const modal = document.getElementById('modal-editar-lancamento');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

async function salvarEdicaoLancamento(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-lancamento-id').value;
    const data = document.getElementById('edit-lancamento-data').value;
    const funcionario = document.getElementById('edit-lancamento-funcionario').value;
    const funcao = document.getElementById('edit-lancamento-funcao').value.trim();
    const empresa = document.getElementById('edit-lancamento-empresa').value;
    const obra = document.getElementById('edit-lancamento-obra').value;
    const horas = document.getElementById('edit-lancamento-horas').value;
    const observacao = document.getElementById('edit-lancamento-observacao').value.trim();
    
    if (!data || !funcionario) {
        mostrarToast('Data e funcionário são obrigatórios', 'error');
        return;
    }
    
    mostrarLoading();
    
    try {
        const response = await fetchAPI(`api_lancamentos.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                data: data,
                funcionario: funcionario,
                funcao: funcao,
                empresa: empresa,
                obra: obra,
                horas: horas,
                observacao: observacao
            })
        });
        
        if (response.sucesso) {
            mostrarToast('Lançamento atualizado com sucesso! ✅', 'success');
            fecharModalLancamento();
            await carregarDados();
            atualizarTabelaLancamentos();
        } else {
            mostrarToast(response.mensagem || 'Erro ao atualizar lançamento', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar lançamento:', error);
        mostrarToast('Erro ao atualizar lançamento', 'error');
    } finally {
        ocultarLoading();
    }
}

// ========================================
// UTILITÁRIOS
// ========================================

function formatarData(data) {
    // Evitar deslocamento de fuso ao criar Date com string YYYY-MM-DD
    // Parse manual (ano, mês, dia) e usar Date UTC-safe
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split('-').map(Number);
        const d = new Date(ano, mes - 1, dia);
        return d.toLocaleDateString('pt-BR');
    }
    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch {
        return data;
    }
}

function formatarHora(hora) {
    if (!hora) return '00:00';
    // Aceita 'HH:MM' ou 'HH:MM:SS' e retorna 'HH:MM'
    if (hora.length >= 5) return hora.slice(0,5);
    return hora;
}

console.log('📄 Script carregado - Sistema Controle de Obras v2.0');

// Expor funções globais para handlers inline existentes
try {
    window.imprimirRelatorios = imprimirRelatorios;
    window.exportarCSV = exportarCSV;
    window.aplicarFiltrosRelatorios = aplicarFiltrosRelatorios;
    window.renderRelGrupoTable = renderRelGrupoTable;
    window.abrirDrillDownModal = abrirDrillDownModal;
} catch (e) {
    console.warn('Falha ao expor funções globais:', e);
}

/* =========================================
   RELATÓRIOS INTELIGENTE - Sistema Novo
   ========================================= */

// Estado global do relatório
const RelatorioState = {
    periodo: {
        inicio: null,
        fim: null,
        preset: '7dias' // '7dias', 'mes', 'custom'
    },
    filtros: {
        funcionarios: [],
        funcoes: [],
        obras: [],
        empresas: []
    },
    visualizacao: 'top-funcionarios', // 'top-funcionarios', 'por-obra', 'por-dia'
    dados: [],
    agregados: {}
};

// Inicializar Relatórios quando a aba é aberta
function initRelatorios() {
    console.log('🚀 Inicializando Relatórios Inteligente...');
    
    // Verificar se os dados foram carregados
    if (!lancamentos || !funcionarios || !obras || !empresas) {
        console.warn('⚠️ Dados ainda não carregados, aguardando...');
        setTimeout(() => initRelatorios(), 500);
        return;
    }
    
    console.log('📊 Dados disponíveis:', {
        lancamentos: lancamentos.length,
        funcionarios: funcionarios.length,
        obras: obras.length,
        empresas: empresas.length
    });
    
    // Verificar se elementos existem
    const relTab = document.getElementById('relatorios');
    if (!relTab) {
        console.error('❌ Aba de relatórios não encontrada!');
        return;
    }
    
    // Definir período padrão (últimos 7 dias)
    setPeriodoDefault();
    
    // Setup event listeners
    setupRelatoriosEventListeners();
    
    // Renderizar chips iniciais
    renderizarChips();
    
    // Computar dados e renderizar
    atualizarRelatorio();
    
    console.log('✅ Relatórios inicializado com sucesso!');
}

// Define período padrão (últimos 7 dias)
function setPeriodoDefault() {
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    RelatorioState.periodo.inicio = formatDateToYYYYMMDD(seteDiasAtras);
    RelatorioState.periodo.fim = formatDateToYYYYMMDD(hoje);
    RelatorioState.periodo.preset = '7dias'; // Manter preset visual
    
    // Atualizar inputs se existirem
    const iniInput = document.getElementById('rel-data-inicio');
    const fimInput = document.getElementById('rel-data-fim');
    if (iniInput) iniInput.value = RelatorioState.periodo.inicio;
    if (fimInput) fimInput.value = RelatorioState.periodo.fim;
    
    console.log(`📅 Período padrão definido: ${RelatorioState.periodo.inicio} até ${RelatorioState.periodo.fim}`);
}

// Formatar data para YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Setup de todos os event listeners
function setupRelatoriosEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Presets de período
    const presetBtns = document.querySelectorAll('.rel-preset-btn');
    console.log(`📌 Presets de período: ${presetBtns.length} botões`);
    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const preset = e.currentTarget.dataset.preset;
            console.log(`🔘 Preset selecionado: ${preset}`);
            handlePresetChange(preset);
        });
    });
    
    // Aplicar período personalizado
    const btnAplicar = document.getElementById('btn-aplicar-periodo');
    if (btnAplicar) {
        console.log('✅ Botão aplicar período encontrado');
        btnAplicar.addEventListener('click', aplicarPeriodoCustom);
    }
    
    // Tabs de visualização
    const viewTabs = document.querySelectorAll('.view-tab');
    console.log(`📌 Tabs de visualização: ${viewTabs.length} tabs`);
    viewTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            console.log(`🔘 View selecionada: ${view}`);
            handleViewChange(view);
        });
    });
    
    // Botão adicionar filtro
    const btnAddFilter = document.getElementById('btn-add-filter');
    console.log('🔍 Procurando botão adicionar filtro...');
    console.log('btnAddFilter:', btnAddFilter);
    if (btnAddFilter) {
        console.log('✅ Botão adicionar filtro encontrado');
        // Remover listener anterior se existir (evitar duplicação)
        const newBtn = btnAddFilter.cloneNode(true);
        btnAddFilter.parentNode.replaceChild(newBtn, btnAddFilter);

        newBtn.addEventListener('click', (e) => {
            console.log('🔘 Botão adicionar filtro clicado!');
            e.preventDefault();
            e.stopPropagation();
            mostrarMenuFiltros();
        });
        console.log('✅ Event listener adicionado ao botão de filtro');
    } else {
        console.warn('⚠️ Botão adicionar filtro não encontrado!');
    }
    
    // Botões de ação
    const btnExportar = document.getElementById('btn-exportar-relatorio');
    if (btnExportar) {
        console.log('✅ Botão exportar encontrado');
        btnExportar.addEventListener('click', (e) => {
            console.log('🔘 Botão exportar clicado!');
            exportarRelatorio();
        });
    } else {
        console.warn('⚠️ Botão exportar não encontrado!');
    }
    
    const btnImprimir = document.getElementById('btn-imprimir-relatorio');
    if (btnImprimir) {
        console.log('✅ Botão imprimir encontrado');
        btnImprimir.addEventListener('click', () => {
            console.log('🔘 Botão imprimir clicado!');
            window.print();
        });
    } else {
        console.warn('⚠️ Botão imprimir não encontrado!');
    }
    
    console.log('✅ Event listeners configurados!');
}

// Handler de mudança de preset
function handlePresetChange(preset) {
    const hoje = new Date();
    let inicio;
    
    // Remover classe active de todos
    document.querySelectorAll('.rel-preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adicionar active ao botão clicado
    document.querySelector(`[data-preset="${preset}"]`).classList.add('active');
    
    if (preset === '7dias') {
        // Últimos 7 dias
        inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        RelatorioState.periodo.inicio = formatDateToYYYYMMDD(inicio);
        RelatorioState.periodo.fim = formatDateToYYYYMMDD(hoje);
        RelatorioState.periodo.preset = '7dias';
        
        // Atualizar inputs
        const iniInput = document.getElementById('rel-data-inicio');
        const fimInput = document.getElementById('rel-data-fim');
        if (iniInput) iniInput.value = RelatorioState.periodo.inicio;
        if (fimInput) fimInput.value = RelatorioState.periodo.fim;
        
        // Esconder custom
        const customEl = document.getElementById('rel-periodo-custom');
        if (customEl) customEl.style.display = 'none';
        
        atualizarRelatorio();
    } else if (preset === 'mes') {
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        RelatorioState.periodo.inicio = formatDateToYYYYMMDD(primeiroDia);
        RelatorioState.periodo.fim = formatDateToYYYYMMDD(hoje);
        RelatorioState.periodo.preset = 'mes';
        
        // Esconder custom
        const customEl = document.getElementById('rel-periodo-custom');
        if (customEl) customEl.style.display = 'none';
        
        atualizarRelatorio();
    } else if (preset === 'custom') {
        RelatorioState.periodo.preset = 'custom';
        
        // Mostrar custom
        const customEl = document.getElementById('rel-periodo-custom');
        if (customEl) customEl.style.display = 'flex';
        
        // Preencher com valores atuais
        const iniInput = document.getElementById('rel-data-inicio');
        const fimInput = document.getElementById('rel-data-fim');
        if (iniInput) iniInput.value = RelatorioState.periodo.inicio;
        if (fimInput) fimInput.value = RelatorioState.periodo.fim;
    }
}

// Aplicar período personalizado
function aplicarPeriodoCustom() {
    const iniInput = document.getElementById('rel-data-inicio');
    const fimInput = document.getElementById('rel-data-fim');
    
    if (!iniInput || !fimInput) return;
    
    const inicio = iniInput.value;
    const fim = fimInput.value;
    
    if (!inicio || !fim) {
        alert('Por favor, selecione ambas as datas.');
        return;
    }
    
    if (inicio > fim) {
        alert('A data inicial não pode ser posterior à data final.');
        return;
    }
    
    RelatorioState.periodo.inicio = inicio;
    RelatorioState.periodo.fim = fim;
    RelatorioState.periodo.preset = 'custom';
    
    atualizarRelatorio();
}

// Handler de mudança de view
function handleViewChange(view) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Adicionar active à tab clicada
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    RelatorioState.visualizacao = view;
    renderVisualizacao();
}

// Computar dados filtrados e agregados
function computarDados() {
    console.log('🔢 Computando dados...');
    console.log('📅 Período:', RelatorioState.periodo);
    console.log('🔍 Filtros:', RelatorioState.filtros);
    console.log('📊 Total de lançamentos disponíveis:', lancamentos.length);
    
    // Filtrar lançamentos por período
    const lancamentosFiltrados = lancamentos.filter(lanc => {
        const data = lanc.data;
        if (!data) return false;
        
        // Normalizar data para YYYY-MM-DD
        let dataComparacao = data;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
            const [dia, mes, ano] = data.split('/');
            dataComparacao = `${ano}-${mes}-${dia}`;
        }
        
        return dataComparacao >= RelatorioState.periodo.inicio && 
               dataComparacao <= RelatorioState.periodo.fim;
    });
    
    console.log('📊 Lançamentos no período:', lancamentosFiltrados.length);
    
    // Aplicar filtros adicionais
    let dadosFiltrados = lancamentosFiltrados.filter(lanc => {
        if (RelatorioState.filtros.funcionarios.length > 0) {
            const nomeFuncionario = String(lanc.funcionario);
            if (!RelatorioState.filtros.funcionarios.includes(nomeFuncionario)) return false;
        }
        
        if (RelatorioState.filtros.funcoes.length > 0) {
            const funcaoId = String(lanc.funcao_id);
            if (!RelatorioState.filtros.funcoes.includes(funcaoId)) return false;
        }
        
        if (RelatorioState.filtros.obras.length > 0) {
            const nomeObra = String(lanc.obra || lanc.obra_id);
            if (!RelatorioState.filtros.obras.includes(nomeObra)) return false;
        }
        
        if (RelatorioState.filtros.empresas.length > 0) {
            const empresaId = String(lanc.empresa_id);
            if (!RelatorioState.filtros.empresas.includes(empresaId)) return false;
        }
        
        return true;
    });
    
    RelatorioState.dados = dadosFiltrados;
    
    console.log('✅ Dados filtrados:', dadosFiltrados.length);
    
    // Computar agregados
    computarAgregados();
}

// Computar estatísticas agregadas
function computarAgregados() {
    console.log('📈 Computando agregados...');
    
    // Verificar se os dados globais existem
    if (!funcionarios || !Array.isArray(funcionarios)) {
        console.error('❌ Array funcionarios não está disponível!');
        funcionarios = [];
    }
    if (!obras || !Array.isArray(obras)) {
        console.error('❌ Array obras não está disponível!');
        obras = [];
    }
    
    console.log('👥 Funcionários disponíveis:', funcionarios.length);
    if (funcionarios.length > 0) {
        console.log('Exemplo de funcionário:', funcionarios[0]);
    }
    
    const dados = RelatorioState.dados;
    
    if (dados.length > 0) {
        console.log('Exemplo de lançamento:', dados[0]);
    }
    
    // Total de horas
    const totalHoras = dados.reduce((sum, lanc) => sum + (parseFloat(lanc.horas) || 0), 0);
    
    // Funcionários únicos
    const funcionariosSet = new Set(dados.map(lanc => lanc.funcionario));
    const totalFuncionarios = funcionariosSet.size;
    
    // Obras únicas
    const obrasSet = new Set(dados.map(lanc => lanc.obra || lanc.obra_id));
    const totalObras = obrasSet.size;
    
    // Total de lançamentos
    const totalLancamentos = dados.length;
    
    console.log('📊 Totais:', { totalHoras, totalFuncionarios, totalObras, totalLancamentos });
    
    // Agrupamentos - SIMPLIFICADO
    const porFuncionario = {};
    const porObra = {};
    const porDia = {};
    
    // Para cada lançamento no período
    dados.forEach((lanc, index) => {
        const horas = parseFloat(lanc.horas) || 0;
        
        // ====== POR FUNCIONÁRIO ======
        const nomeFuncionario = lanc.funcionario || 'Sem nome';
        const funcaoNome = lanc.funcao_id || lanc.funcao || 'Sem função';
        
        // Se não existe esse funcionário no agrupamento, criar
        if (!porFuncionario[nomeFuncionario]) {
            porFuncionario[nomeFuncionario] = {
                id: nomeFuncionario,
                nome: nomeFuncionario,
                funcao: funcaoNome,
                horas: 0,
                lancamentos: 0
            };
        }
        
        // Somar as horas deste lançamento
        porFuncionario[nomeFuncionario].horas += horas;
        porFuncionario[nomeFuncionario].lancamentos++;
        
        // ====== POR OBRA ======
        // O campo correto é 'obra' (não 'obra_id')
        const nomeObra = lanc.obra || lanc.obra_id || 'Sem obra';
        
        if (!porObra[nomeObra]) {
            porObra[nomeObra] = {
                id: nomeObra,
                nome: nomeObra,
                horas: 0,
                lancamentos: 0,
                funcionarios: new Set()
            };
        }
        
        porObra[nomeObra].horas += horas;
        porObra[nomeObra].lancamentos++;
        porObra[nomeObra].funcionarios.add(nomeFuncionario);
        
        // ====== POR DIA ======
        const data = lanc.data;
        let dataKey = data;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
            const [dia, mes, ano] = data.split('/');
            dataKey = `${ano}-${mes}-${dia}`;
        }
        
        if (!porDia[dataKey]) {
            porDia[dataKey] = {
                data: dataKey,
                horas: 0,
                lancamentos: 0,
                funcionarios: new Set(),
                obras: new Set()
            };
        }
        porDia[dataKey].horas += horas;
        porDia[dataKey].lancamentos++;
        porDia[dataKey].funcionarios.add(nomeFuncionario);
        porDia[dataKey].obras.add(nomeObra);
    });
    
    // Converter Sets para tamanhos
    Object.values(porObra).forEach(obra => {
        obra.totalFuncionarios = obra.funcionarios.size;
        delete obra.funcionarios;
    });
    
    Object.values(porDia).forEach(dia => {
        dia.totalFuncionarios = dia.funcionarios.size;
        dia.totalObras = dia.obras.size;
        delete dia.funcionarios;
        delete dia.obras;
    });
    
    const porFuncionarioArray = Object.values(porFuncionario);
    const porObraArray = Object.values(porObra);
    const porDiaArray = Object.values(porDia);
    
    RelatorioState.agregados = {
        totalHoras,
        totalFuncionarios,
        totalObras,
        totalLancamentos,
        porFuncionario: porFuncionarioArray,
        porObra: porObraArray,
        porDia: porDiaArray
    };
    
    console.log('✅ Agregados computados:', {
        porFuncionario: porFuncionarioArray.length,
        porObra: porObraArray.length,
        porDia: porDiaArray.length
    });
    console.log('📊 Primeiro funcionário:', porFuncionarioArray[0]);
}

// Atualizar relatório completo
function atualizarRelatorio() {
    console.log('🔄 Atualizando relatório completo...');
    computarDados();
    atualizarCards();
    renderVisualizacao();
    console.log('✅ Relatório atualizado!');
}

// Atualizar cards de estatísticas
function atualizarCards() {
    const { totalHoras, totalFuncionarios, totalObras, totalLancamentos } = RelatorioState.agregados;
    
    console.log('📊 Atualizando cards:', { totalHoras, totalFuncionarios, totalObras, totalLancamentos });
    
    const elFuncionarios = document.getElementById('rel-total-funcionarios');
    const elObras = document.getElementById('rel-total-obras');
    const elHoras = document.getElementById('rel-total-horas');
    const elLancamentos = document.getElementById('rel-total-lancamentos');
    
    if (elFuncionarios) elFuncionarios.textContent = totalFuncionarios || 0;
    if (elObras) elObras.textContent = totalObras || 0;
    if (elHoras) elHoras.textContent = `${(totalHoras || 0).toFixed(1)}h`;
    if (elLancamentos) elLancamentos.textContent = totalLancamentos || 0;
}

// Renderizar visualização atual
function renderVisualizacao() {
    const area = document.getElementById('rel-visualization-area');
    if (!area) {
        console.error('❌ Área de visualização não encontrada!');
        return;
    }
    
    const view = RelatorioState.visualizacao;
    console.log(`🎨 Renderizando visualização: ${view}`);
    
    if (view === 'top-funcionarios') {
        renderTopFuncionarios(area);
    } else if (view === 'por-obra') {
        renderPorObra(area);
    } else if (view === 'por-dia') {
        renderPorDia(area);
    }
}

// Renderizar Top Funcionários
function renderTopFuncionarios(container) {
    console.log('👥 Renderizando Top Funcionários...');
    const { porFuncionario } = RelatorioState.agregados;
    
    console.log('📊 Dados porFuncionario:', porFuncionario);
    console.log('📊 Tipo:', Array.isArray(porFuncionario) ? 'Array' : 'Object');
    console.log('📊 Length:', porFuncionario?.length);
    
    if (!porFuncionario || porFuncionario.length === 0) {
        console.warn('⚠️ Nenhum funcionário com lançamentos no período');
        container.innerHTML = `
            <div class="rel-empty-state">
                <div class="rel-empty-state-icon">📊</div>
                <h3>Nenhum dado encontrado</h3>
                <p>Não há lançamentos no período selecionado.</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Funcionários para renderizar:', porFuncionario);
    
    // Ordenar por horas (decrescente)
    const ranking = [...porFuncionario].sort((a, b) => b.horas - a.horas);
    console.log('📊 Ranking ordenado:', ranking);
    const maxHoras = ranking[0].horas;
    
    const html = `
        <div class="rel-ranking-list">
            ${ranking.map((func, index) => {
                const porcentagem = (func.horas / maxHoras) * 100;
                const nomeSafe = (func.nome || 'Sem nome').replace(/'/g, "\\'");
                console.log(`📋 Renderizando funcionário ${index + 1}:`, {
                    id: func.id,
                    nome: func.nome,
                    horas: func.horas,
                    lancamentos: func.lancamentos
                });
                
                const funcaoSafe = (func.funcao || 'Sem função').replace(/'/g, "\\'");
                const idSafe = (func.id || func.nome).replace(/'/g, "\\'");
                
                return `
                    <div class="rel-ranking-item" onclick="abrirDetalheFuncionario('${idSafe}')">
                        <div class="rel-ranking-position">${index + 1}</div>
                        <div class="rel-ranking-info">
                            <div class="rel-ranking-name">${nomeSafe}</div>
                            <div class="rel-ranking-details">${funcaoSafe} • ${func.lancamentos} lançamento(s)</div>
                        </div>
                        <div class="rel-ranking-bar-container">
                            <div class="rel-ranking-bar" style="width: ${porcentagem}%">
                                <span class="rel-ranking-value">${func.horas.toFixed(1)}h</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    console.log('📄 HTML gerado:', html.substring(0, 500));
    container.innerHTML = html;
    console.log('✅ HTML inserido no container');
}

// Renderizar Por Obra
function renderPorObra(container) {
    console.log('🏢 Renderizando Por Obra...');
    const { porObra } = RelatorioState.agregados;
    
    console.log('📊 Dados porObra:', porObra);
    
    if (!porObra || porObra.length === 0) {
        console.warn('⚠️ Nenhuma obra com lançamentos no período');
        container.innerHTML = `
            <div class="rel-empty-state">
                <div class="rel-empty-state-icon">🏢</div>
                <h3>Nenhum dado encontrado</h3>
                <p>Não há lançamentos no período selecionado.</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Obras para renderizar:', porObra);
    
    // Ordenar por horas (decrescente)
    const ranking = [...porObra].sort((a, b) => b.horas - a.horas);
    console.log('📊 Ranking de obras ordenado:', ranking);
    const maxHoras = ranking[0].horas;
    
    const html = `
        <div class="rel-ranking-list">
            ${ranking.map((obra, index) => {
                const porcentagem = (obra.horas / maxHoras) * 100;
                const nomeSafe = (obra.nome || 'Sem obra').replace(/'/g, "\\'");
                const idSafe = (obra.id || obra.nome).replace(/'/g, "\\'");
                
                return `
                    <div class="rel-ranking-item" onclick="abrirDetalheObra('${idSafe}')">
                        <div class="rel-ranking-position">${index + 1}</div>
                        <div class="rel-ranking-info">
                            <div class="rel-ranking-name">${nomeSafe}</div>
                            <div class="rel-ranking-details">${obra.totalFuncionarios} funcionário(s) • ${obra.lancamentos} lançamento(s)</div>
                        </div>
                        <div class="rel-ranking-bar-container">
                            <div class="rel-ranking-bar" style="width: ${porcentagem}%">
                                <span class="rel-ranking-value">${obra.horas.toFixed(1)}h</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    console.log('📄 HTML gerado para obras');
    container.innerHTML = html;
    console.log('✅ HTML inserido no container de obras');
}

// Renderizar Por Dia
function renderPorDia(container) {
    const { porDia } = RelatorioState.agregados;
    
    if (!porDia || porDia.length === 0) {
        container.innerHTML = `
            <div class="rel-empty-state">
                <div class="rel-empty-state-icon">📅</div>
                <h3>Nenhum dado encontrado</h3>
                <p>Não há lançamentos no período selecionado.</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por data (crescente)
    const timeline = [...porDia].sort((a, b) => a.data.localeCompare(b.data));
    
    const html = `
        <div class="rel-timeline">
            ${timeline.map(dia => {
                // Formatar data para exibição
                const [ano, mes, d] = dia.data.split('-');
                const dataFormatada = `${d}/${mes}/${ano}`;
                
                return `
                    <div class="rel-day-card">
                        <div class="rel-day-header">
                            <div class="rel-day-date">📅 ${dataFormatada}</div>
                            <div class="rel-day-total">${dia.horas.toFixed(1)}h</div>
                        </div>
                        <div class="rel-day-details">
                            <div>📋 ${dia.lancamentos} lançamento(s)</div>
                            <div>👥 ${dia.totalFuncionarios} funcionário(s)</div>
                            <div>🏢 ${dia.totalObras} obra(s)</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Mostrar menu de filtros
function mostrarMenuFiltros() {
    console.log('📋 Abrindo menu de filtros...');
    
    const btnAddFilter = document.getElementById('btn-add-filter');
    if (!btnAddFilter) {
        console.error('❌ Botão adicionar filtro não encontrado!');
        return;
    }
    
    // Verificar se já existe menu
    const existingMenu = document.getElementById('filter-dropdown-menu');
    if (existingMenu) {
        console.log('🔄 Fechando menu existente');
        existingMenu.remove();
        return;
    }
    
    console.log('✅ Criando menu dropdown...');
    
    // Criar menu dropdown
    const menu = document.createElement('div');
    menu.id = 'filter-dropdown-menu';
    menu.className = 'filter-dropdown-menu';
    menu.innerHTML = `
        <div class="filter-dropdown-item" data-tipo="funcionario">
            <span class="filter-dropdown-icon">👤</span>
            <span>Funcionário</span>
        </div>
        <div class="filter-dropdown-item" data-tipo="funcao">
            <span class="filter-dropdown-icon">💼</span>
            <span>Função</span>
        </div>
        <div class="filter-dropdown-item" data-tipo="obra">
            <span class="filter-dropdown-icon">🏢</span>
            <span>Obra</span>
        </div>
        <div class="filter-dropdown-item" data-tipo="empresa">
            <span class="filter-dropdown-icon">🏭</span>
            <span>Empresa</span>
        </div>
    `;
    
    // Posicionar próximo ao botão
    const rect = btnAddFilter.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    
    document.body.appendChild(menu);
    
    // Event listeners nos itens
    menu.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const tipo = item.dataset.tipo;
            console.log(`✅ Tipo de filtro selecionado: ${tipo}`);
            abrirSeletorFiltro(tipo);
            menu.remove();
        });
    });
    
    // Fechar ao clicar fora
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target) && e.target !== btnAddFilter) {
                console.log('🔄 Fechando menu (clique fora)');
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
    
    console.log('✅ Menu dropdown criado e posicionado!');
}

// Abrir seletor de filtro
function abrirSeletorFiltro(tipo) {
    console.log(`🔍 Abrindo seletor para: ${tipo}`);

    let opcoes = [];
    let titulo = '';
    let icone = '';

    if (tipo === 'funcionario') {
        titulo = 'Selecione um Funcionário';
        icone = '👤';
        if (!funcionarios || funcionarios.length === 0) {
            alert('Não há funcionários cadastrados.');
            return;
        }
        opcoes = funcionarios.map(f => ({ id: String(f.id), nome: f.nome }));
    } else if (tipo === 'funcao') {
        titulo = 'Selecione uma Função';
        icone = '💼';
        if (!funcionarios || funcionarios.length === 0) {
            alert('Não há funcionários com funções cadastradas.');
            return;
        }
        // Extrair funções únicas dos funcionários
        const funcoesSet = new Set();
        funcionarios.forEach(f => {
            if (f.funcao_id && f.funcao) {
                funcoesSet.add(JSON.stringify({ id: String(f.funcao_id), nome: f.funcao }));
            }
        });
        opcoes = Array.from(funcoesSet).map(j => JSON.parse(j));
        if (opcoes.length === 0) {
            alert('Não há funções cadastradas.');
            return;
        }
    } else if (tipo === 'obra') {
        titulo = 'Selecione uma Obra';
        icone = '🏢';
        if (!obras || obras.length === 0) {
            alert('Não há obras cadastradas.');
            return;
        }
        opcoes = obras.map(o => ({ id: String(o.id), nome: o.nome }));
    } else if (tipo === 'empresa') {
        titulo = 'Selecione uma Empresa';
        icone = '🏭';
        if (!empresas || empresas.length === 0) {
            alert('Não há empresas cadastradas.');
            return;
        }
        opcoes = empresas.map(e => ({ id: String(e.id), nome: e.nome }));
    }
    
    // Criar modal de seleção
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'filter-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="filter-modal">
            <div class="filter-modal-header">
                <h3>${icone} ${titulo}</h3>
                <button class="filter-modal-close">✕</button>
            </div>
            <div class="filter-modal-search">
                <input type="text" placeholder="🔍 Buscar..." class="filter-search-input">
            </div>
            <div class="filter-modal-list" id="filter-modal-list">
                ${opcoes.map(opt => `
                    <div class="filter-modal-item" data-id="${opt.id}" data-nome="${opt.nome}">
                        ${opt.nome}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Busca
    const searchInput = modalOverlay.querySelector('.filter-search-input');
    const list = modalOverlay.querySelector('.filter-modal-list');
    
    searchInput.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        list.querySelectorAll('.filter-modal-item').forEach(item => {
            const nome = item.dataset.nome.toLowerCase();
            item.style.display = nome.includes(termo) ? 'block' : 'none';
        });
    });
    
    // Seleção de item
    list.querySelectorAll('.filter-modal-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const nome = item.dataset.nome;
            adicionarFiltro(tipo, id, nome);
            modalOverlay.remove();
        });
    });
    
    // Fechar modal
    const closeBtn = modalOverlay.querySelector('.filter-modal-close');
    closeBtn.addEventListener('click', () => modalOverlay.remove());
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
    
    // Focus no input de busca
    setTimeout(() => searchInput.focus(), 100);
}

// Adicionar filtro ao estado
function adicionarFiltro(tipo, id, nome) {
    const tipoPlural = tipo === 'funcionario' ? 'funcionarios' :
                       tipo === 'funcao' ? 'funcoes' :
                       tipo === 'obra' ? 'obras' :
                       tipo === 'empresa' ? 'empresas' : null;
    
    if (!tipoPlural) return;
    
    // Para funcionário e obra, usar o nome ao invés do ID
    const valorFiltro = (tipo === 'funcionario' || tipo === 'obra') ? nome : id;
    
    // Verificar se já existe
    if (RelatorioState.filtros[tipoPlural].includes(valorFiltro)) {
        alert('Este filtro já foi adicionado.');
        return;
    }
    
    // Adicionar ao estado
    RelatorioState.filtros[tipoPlural].push(valorFiltro);
    
    // Renderizar chips
    renderizarChips();
    
    // Atualizar relatório
    atualizarRelatorio();
}

// Remover filtro do estado
function removerFiltro(tipo, id) {
    const tipoPlural = tipo === 'funcionario' ? 'funcionarios' :
                       tipo === 'funcao' ? 'funcoes' :
                       tipo === 'obra' ? 'obras' :
                       tipo === 'empresa' ? 'empresas' : null;
    
    if (!tipoPlural) return;
    
    // Remover do estado
    RelatorioState.filtros[tipoPlural] = RelatorioState.filtros[tipoPlural].filter(fId => fId !== id);
    
    // Renderizar chips
    renderizarChips();
    
    // Atualizar relatório
    atualizarRelatorio();
}

// Renderizar chips de filtros
function renderizarChips() {
    const container = document.getElementById('rel-chips-container');
    if (!container) return;
    
    const chips = [];
    
    // Funcionários
    RelatorioState.filtros.funcionarios.forEach(nome => {
        // O filtro já contém o nome do funcionário, não o ID
        chips.push({
            tipo: 'funcionario',
            id: nome,
            icone: '👤',
            label: nome
        });
    });
    
    // Funções
    RelatorioState.filtros.funcoes.forEach(id => {
        const func = funcionarios.find(f => String(f.funcao_id) === id);
        if (func) {
            chips.push({
                tipo: 'funcao',
                id: id,
                icone: '💼',
                label: func.funcao
            });
        }
    });
    
    // Obras
    RelatorioState.filtros.obras.forEach(nome => {
        // O filtro já contém o nome da obra, não o ID
        chips.push({
            tipo: 'obra',
            id: nome,
            icone: '🏢',
            label: nome
        });
    });
    
    // Empresas
    RelatorioState.filtros.empresas.forEach(id => {
        const empresa = empresas.find(e => String(e.id) === id);
        if (empresa) {
            chips.push({
                tipo: 'empresa',
                id: id,
                icone: '🏭',
                label: empresa.nome
            });
        }
    });
    
    // Renderizar
    if (chips.length === 0) {
        container.innerHTML = '<div style="color: #999; font-size: 0.875rem;">Nenhum filtro aplicado</div>';
        return;
    }
    
    container.innerHTML = chips.map(chip => `
        <div class="chip">
            <span>${chip.icone} ${chip.label}</span>
            <button class="chip-remove" onclick="removerFiltro('${chip.tipo}', '${chip.id}')" title="Remover filtro">
                ✕
            </button>
        </div>
    `).join('');
}

// Exportar relatório
function exportarRelatorio() {
    // Criar menu de exportação
    const btnExportar = document.getElementById('btn-exportar-relatorio');
    if (!btnExportar) return;
    
    // Verificar se já existe menu
    const existingMenu = document.getElementById('export-dropdown-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }
    
    // Criar menu dropdown
    const menu = document.createElement('div');
    menu.id = 'export-dropdown-menu';
    menu.className = 'filter-dropdown-menu';
    menu.innerHTML = `
        <div class="filter-dropdown-item" data-format="csv">
            <span class="filter-dropdown-icon">📄</span>
            <span>Exportar CSV</span>
        </div>
        <div class="filter-dropdown-item" data-format="excel">
            <span class="filter-dropdown-icon">📊</span>
            <span>Exportar Excel</span>
        </div>
        <div class="filter-dropdown-item" data-format="pdf">
            <span class="filter-dropdown-icon">📑</span>
            <span>Imprimir/PDF</span>
        </div>
    `;
    
    // Posicionar próximo ao botão
    const rect = btnExportar.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    
    document.body.appendChild(menu);
    
    // Event listeners nos itens
    menu.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const format = item.dataset.format;
            if (format === 'csv') {
                exportarCSVNovo();
            } else if (format === 'excel') {
                exportarExcel();
            } else if (format === 'pdf') {
                alert('🔧 Exportação para PDF: use a função de impressão do navegador (Ctrl+P) e selecione "Salvar como PDF"');
            }
            menu.remove();
        });
    });
    
    // Fechar ao clicar fora
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target) && e.target !== btnExportar) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
}

// Exportar Excel com formatação profissional
function exportarExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca SheetJS não carregada. Por favor, recarregue a página.');
        return;
    }
    
    const dados = RelatorioState.dados;
    
    if (dados.length === 0) {
        alert('Não há dados para exportar no período selecionado.');
        return;
    }
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // ===== ABA 1: RELATÓRIO DETALHADO =====
    const wsData = [];
    
    // Título
    wsData.push(['RELATÓRIO DE HORAS TRABALHADAS']);
    wsData.push([`Período: ${formatarDataBR(RelatorioState.periodo.inicio)} a ${formatarDataBR(RelatorioState.periodo.fim)}`]);
    wsData.push([`Gerado em: ${formatarDataBR(formatDateToYYYYMMDD(new Date()))} às ${new Date().toLocaleTimeString('pt-BR')}`]);
    wsData.push([]); // Linha vazia
    
    // Cabeçalhos
    wsData.push(['Data', 'Funcionário', 'Função', 'Empresa', 'Obra', 'Horas', 'Observações']);
    
    // Dados
    dados.forEach(lanc => {
        const func = funcionarios.find(f => String(f.id) === String(lanc.funcionario_id));
        const obra = obras.find(o => String(o.id) === String(lanc.obra_id));
        const empresa = empresas.find(e => String(e.id) === String(lanc.empresa_id));
        
        wsData.push([
            formatarDataBR(lanc.data),
            func ? func.nome : '',
            func ? func.funcao : '',
            empresa ? empresa.nome : '',
            obra ? obra.nome : '',
            parseFloat(lanc.horas) || 0,
            lanc.observacoes || ''
        ]);
    });
    
    // Linha vazia antes do total
    wsData.push([]);
    
    // Total
    const totalHoras = dados.reduce((sum, lanc) => sum + (parseFloat(lanc.horas) || 0), 0);
    wsData.push(['', '', '', '', 'TOTAL:', totalHoras, '']);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Formatação da planilha
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Largura das colunas
    ws['!cols'] = [
        { wch: 12 },  // Data
        { wch: 25 },  // Funcionário
        { wch: 20 },  // Função
        { wch: 25 },  // Empresa
        { wch: 30 },  // Obra
        { wch: 10 },  // Horas
        { wch: 40 }   // Observações
    ];
    
    // Altura das linhas do cabeçalho
    ws['!rows'] = [
        { hpt: 25 },  // Título
        { hpt: 18 },  // Período
        { hpt: 18 },  // Data geração
        { hpt: 10 },  // Linha vazia
        { hpt: 22 }   // Cabeçalhos
    ];
    
    // Estilos para células (nota: estilos completos requerem xlsx-style)
    // Aplicar formato de número para coluna de horas
    for (let R = 5; R <= range.e.r; R++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: 5 }); // Coluna F (Horas)
        if (ws[cellAddress]) {
            ws[cellAddress].t = 'n'; // Tipo número
            ws[cellAddress].z = '0.0'; // Formato com 1 casa decimal
        }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Detalhado');
    
    // ===== ABA 2: RESUMO POR FUNCIONÁRIO =====
    const { porFuncionario } = RelatorioState.agregados;
    const wsFuncData = [];
    
    wsFuncData.push(['RESUMO POR FUNCIONÁRIO']);
    wsFuncData.push([]);
    wsFuncData.push(['Posição', 'Funcionário', 'Total de Horas', 'Lançamentos']);
    
    const rankingFunc = [...porFuncionario].sort((a, b) => b.horas - a.horas);
    rankingFunc.forEach((func, index) => {
        wsFuncData.push([
            index + 1,
            func.nome,
            func.horas,
            func.lancamentos
        ]);
    });
    
    wsFuncData.push([]);
    wsFuncData.push(['', 'TOTAL:', rankingFunc.reduce((sum, f) => sum + f.horas, 0), rankingFunc.reduce((sum, f) => sum + f.lancamentos, 0)]);
    
    const wsFunc = XLSX.utils.aoa_to_sheet(wsFuncData);
    wsFunc['!cols'] = [
        { wch: 10 },  // Posição
        { wch: 30 },  // Funcionário
        { wch: 15 },  // Total Horas
        { wch: 15 }   // Lançamentos
    ];
    
    XLSX.utils.book_append_sheet(wb, wsFunc, 'Por Funcionário');
    
    // ===== ABA 3: RESUMO POR OBRA =====
    const { porObra } = RelatorioState.agregados;
    const wsObraData = [];
    
    wsObraData.push(['RESUMO POR OBRA']);
    wsObraData.push([]);
    wsObraData.push(['Obra', 'Total de Horas', 'Funcionários', 'Lançamentos']);
    
    const rankingObra = [...porObra].sort((a, b) => b.horas - a.horas);
    rankingObra.forEach(obra => {
        wsObraData.push([
            obra.nome,
            obra.horas,
            obra.totalFuncionarios,
            obra.lancamentos
        ]);
    });
    
    wsObraData.push([]);
    wsObraData.push(['TOTAL:', rankingObra.reduce((sum, o) => sum + o.horas, 0), '', rankingObra.reduce((sum, o) => sum + o.lancamentos, 0)]);
    
    const wsObra = XLSX.utils.aoa_to_sheet(wsObraData);
    wsObra['!cols'] = [
        { wch: 35 },  // Obra
        { wch: 15 },  // Total Horas
        { wch: 15 },  // Funcionários
        { wch: 15 }   // Lançamentos
    ];
    
    XLSX.utils.book_append_sheet(wb, wsObra, 'Por Obra');
    
    // ===== ABA 4: RESUMO POR DIA =====
    const { porDia } = RelatorioState.agregados;
    const wsDiaData = [];
    
    wsDiaData.push(['RESUMO POR DIA']);
    wsDiaData.push([]);
    wsDiaData.push(['Data', 'Total de Horas', 'Funcionários', 'Obras', 'Lançamentos']);
    
    const timelineDia = [...porDia].sort((a, b) => a.data.localeCompare(b.data));
    timelineDia.forEach(dia => {
        wsDiaData.push([
            formatarDataBR(dia.data),
            dia.horas,
            dia.totalFuncionarios,
            dia.totalObras,
            dia.lancamentos
        ]);
    });
    
    wsDiaData.push([]);
    wsDiaData.push(['TOTAL:', timelineDia.reduce((sum, d) => sum + d.horas, 0), '', '', timelineDia.reduce((sum, d) => sum + d.lancamentos, 0)]);
    
    const wsDia = XLSX.utils.aoa_to_sheet(wsDiaData);
    wsDia['!cols'] = [
        { wch: 12 },  // Data
        { wch: 15 },  // Total Horas
        { wch: 15 },  // Funcionários
        { wch: 15 },  // Obras
        { wch: 15 }   // Lançamentos
    ];
    
    XLSX.utils.book_append_sheet(wb, wsDia, 'Por Dia');
    
    // Salvar arquivo
    const hoje = new Date();
    const filename = `relatorio_${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}.xlsx`;
    
    XLSX.writeFile(wb, filename);
}

// Formatar data para exibição BR (DD/MM/YYYY)
function formatarDataBR(dataStr) {
    if (!dataStr) return '';
    
    // Se já está em DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        return dataStr;
    }
    
    // Se está em YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    
    return dataStr;
}

// Exportar CSV com dados filtrados
function exportarCSVNovo() {
    const dados = RelatorioState.dados;
    
    if (dados.length === 0) {
        alert('Não há dados para exportar no período selecionado.');
        return;
    }
    
    // Cabeçalho
    const headers = ['Data', 'Funcionário', 'Função', 'Empresa', 'Obra', 'Horas', 'Observações'];
    
    // Linhas
    const rows = dados.map(lanc => {
        const func = funcionarios.find(f => String(f.id) === String(lanc.funcionario_id));
        const obra = obras.find(o => String(o.id) === String(lanc.obra_id));
        const empresa = empresas.find(e => String(e.id) === String(lanc.empresa_id));
        
        return [
            lanc.data || '',
            func ? func.nome : '',
            func ? func.funcao : '',
            empresa ? empresa.nome : '',
            obra ? obra.nome : '',
            lanc.horas || '',
            lanc.observacoes || ''
        ];
    });
    
    // Construir CSV
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // Escapar aspas e vírgulas
            const cellStr = String(cell).replace(/"/g, '""');
            return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') 
                ? `"${cellStr}"` 
                : cellStr;
        }).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const hoje = new Date();
    const filename = `relatorio_${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Drill-down: Detalhes do Funcionário
window.abrirDetalheFuncionario = function(nomeFuncionario) {
    console.log('📋 Abrindo detalhes do funcionário:', nomeFuncionario);
    
    // Filtrar lançamentos deste funcionário no período
    const lancamentosFunc = RelatorioState.dados.filter(lanc => String(lanc.funcionario) === String(nomeFuncionario));
    
    console.log('📊 Lançamentos encontrados:', lancamentosFunc.length);
    
    if (lancamentosFunc.length === 0) {
        alert('Não há lançamentos para este funcionário no período selecionado.');
        return;
    }
    
    // Calcular totais
    const totalHoras = lancamentosFunc.reduce((sum, lanc) => sum + (parseFloat(lanc.horas) || 0), 0);
    const obrasSet = new Set(lancamentosFunc.map(lanc => lanc.obra || lanc.obra_id));
    const funcaoFunc = lancamentosFunc[0].funcao_id || lancamentosFunc[0].funcao || 'Função não informada';
    
    // Criar modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'filter-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="drill-down-modal">
            <div class="drill-down-header">
                <div>
                    <h3>👤 ${nomeFuncionario}</h3>
                    <p class="drill-down-subtitle">${funcaoFunc}</p>
                </div>
                <button class="filter-modal-close">✕</button>
            </div>
            
            <div class="drill-down-stats">
                <div class="drill-down-stat">
                    <div class="drill-down-stat-value">${totalHoras.toFixed(1)}h</div>
                    <div class="drill-down-stat-label">Total de Horas</div>
                </div>
                <div class="drill-down-stat">
                    <div class="drill-down-stat-value">${lancamentosFunc.length}</div>
                    <div class="drill-down-stat-label">Lançamentos</div>
                </div>
                <div class="drill-down-stat">
                    <div class="drill-down-stat-value">${obrasSet.size}</div>
                    <div class="drill-down-stat-label">Obras</div>
                </div>
            </div>
            
            <div class="drill-down-table-container">
                <table class="drill-down-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Obra</th>
                            <th>Empresa</th>
                            <th>Horas</th>
                            <th>Observações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lancamentosFunc.map(lanc => {
                            const nomeObra = lanc.obra || lanc.obra_id || '-';
                            const nomeEmpresa = lanc.empresa || lanc.empresa_id || '-';
                            return `
                                <tr>
                                    <td>${formatarDataBR(lanc.data)}</td>
                                    <td>${nomeObra}</td>
                                    <td>${nomeEmpresa}</td>
                                    <td style="font-weight: 600; color: var(--rel-primary);">${lanc.horas}h</td>
                                    <td>${lanc.observacoes || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Fechar modal
    const closeBtn = modalOverlay.querySelector('.filter-modal-close');
    closeBtn.addEventListener('click', () => modalOverlay.remove());
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
};

// Drill-down: Detalhes da Obra
window.abrirDetalheObra = function(nomeObra) {
    console.log('🏢 Abrindo detalhes da obra:', nomeObra);
    
    // Filtrar lançamentos desta obra no período
    const lancamentosObra = RelatorioState.dados.filter(lanc => String(lanc.obra || lanc.obra_id) === String(nomeObra));
    
    console.log('📊 Lançamentos encontrados:', lancamentosObra.length);
    
    if (lancamentosObra.length === 0) {
        alert('Não há lançamentos para esta obra no período selecionado.');
        return;
    }
    
    // Calcular totais
    const totalHoras = lancamentosObra.reduce((sum, lanc) => sum + (parseFloat(lanc.horas) || 0), 0);
    const funcionariosSet = new Set(lancamentosObra.map(lanc => lanc.funcionario));
    
    // Pegar endereço da obra (se houver nos lançamentos ou buscar na lista)
    const obraObj = obras.find(o => o.nome === nomeObra);
    const enderecoObra = obraObj?.endereco || 'Endereço não informado';
    
    // Criar modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'filter-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="drill-down-modal">
            <div class="drill-down-header">
                <div>
                    <h3>🏢 ${nomeObra}</h3>
                    <p class="drill-down-subtitle">${enderecoObra}</p>
                </div>
                <button class="filter-modal-close">✕</button>
            </div>
            
            <div class="drill-down-stats">
                <div class="drill-down-stat">
                    <div class="drill-down-stat-value">${totalHoras.toFixed(1)}h</div>
                    <div class="drill-down-stat-label">Total de Horas</div>
                </div>
                <div class="drill-down-stat">
                    <div class="drill-down-stat-value">${lancamentosObra.length}</div>
                    <div class="drill-down-stat-label">Lançamentos</div>
                </div>
                <div class="drill-down-stat">
                    <div class="drill-down-stat-value">${funcionariosSet.size}</div>
                    <div class="drill-down-stat-label">Funcionários</div>
                </div>
            </div>
            
            <div class="drill-down-table-container">
                <table class="drill-down-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Funcionário</th>
                            <th>Função</th>
                            <th>Empresa</th>
                            <th>Horas</th>
                            <th>Observações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lancamentosObra.map(lanc => {
                            const nomeFuncionario = lanc.funcionario || '-';
                            const funcaoFuncionario = lanc.funcao_id || lanc.funcao || '-';
                            const nomeEmpresa = lanc.empresa || lanc.empresa_id || '-';
                            return `
                                <tr>
                                    <td>${formatarDataBR(lanc.data)}</td>
                                    <td>${nomeFuncionario}</td>
                                    <td>${funcaoFuncionario}</td>
                                    <td>${nomeEmpresa}</td>
                                    <td style="font-weight: 600; color: var(--rel-primary);">${lanc.horas}h</td>
                                    <td>${lanc.observacoes || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Fechar modal
    const closeBtn = modalOverlay.querySelector('.filter-modal-close');
    closeBtn.addEventListener('click', () => modalOverlay.remove());
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
};

// Expor função removerFiltro globalmente
window.removerFiltro = removerFiltro;

// Interceptar troca de aba para inicializar relatórios
const originalMostrarAba = window.mostrarAba;
window.mostrarAba = function(abaId) {
    if (originalMostrarAba) {
        originalMostrarAba(abaId);
    } else {
        // Fallback caso mostrarAba não exista
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const abaEl = document.getElementById(abaId);
        if (abaEl) abaEl.classList.add('active');
        
        const btnEl = document.querySelector(`[data-tab="${abaId}"]`);
        if (btnEl) btnEl.classList.add('active');
    }
    
    // Se for a aba de relatórios, inicializar
    if (abaId === 'relatorios') {
        setTimeout(() => {
            initRelatorios();
        }, 100);
    }
};

console.log('✅ Relatórios Inteligente carregado!');
/* =========================================
   AVALIA��ES - Sistema de Avalia��o de Desempenho
   ========================================= */

// Estado global de avalia��es
const AvaliacaoState = {
    funcionarios: [],
    avaliacoes: [],
    filtros: {
        busca: ''
    }
};

// Inicializar sistema de avaliações
function initAvaliacoes() {
    console.log('⭐ Inicializando Sistema de Avaliações...');
    console.log('Debug - funcionarios:', window.funcionarios);
    console.log('Debug - typeof funcionarios:', typeof window.funcionarios);
    console.log('Debug - funcionarios.length:', window.funcionarios ? window.funcionarios.length : 'undefined');
    
    // Aguardar dados (usar window.funcionarios para garantir acesso à variável global)
    if (!window.funcionarios || window.funcionarios.length === 0) {
        console.log('⏳ Aguardando carregamento de funcionários...');
        setTimeout(() => initAvaliacoes(), 500);
        return;
    }
    
    console.log(`✅ ${window.funcionarios.length} funcionários carregados`);
    
    AvaliacaoState.funcionarios = window.funcionarios;
    carregarAvaliacoes();
    atualizarStatsAvaliacoes();
    renderizarFuncionarios();
    setupBuscaFuncionarios();
    
    console.log('✅ Sistema de Avaliações inicializado!');
}

// Carregar avalia��es do localStorage
function carregarAvaliacoes() {
    const saved = localStorage.getItem('avaliacoes');
    if (saved) {
        try {
            AvaliacaoState.avaliacoes = JSON.parse(saved);
            console.log(` ${AvaliacaoState.avaliacoes.length} avalia��es carregadas`);
        } catch (e) {
            console.error('Erro ao carregar avalia��es:', e);
            AvaliacaoState.avaliacoes = [];
        }
    }
}

// Salvar avalia��es no localStorage
function salvarAvaliacoesLocal() {
    localStorage.setItem('avaliacoes', JSON.stringify(AvaliacaoState.avaliacoes));
}

// Atualizar cards de estat�sticas
function atualizarStatsAvaliacoes() {
    const total = AvaliacaoState.funcionarios.length;
    
    // Calcular m�dia geral
    let somaNotas = 0;
    let countNotas = 0;
    AvaliacaoState.avaliacoes.forEach(aval => {
        if (aval.mediaGeral) {
            somaNotas += parseFloat(aval.mediaGeral);
            countNotas++;
        }
    });
    const mediaGeral = countNotas > 0 ? (somaNotas / countNotas).toFixed(1) : '0.0';
    
    // Contar funcion�rios que precisam aten��o (m�dia < 3.0)
    const precisamAtencao = AvaliacaoState.avaliacoes.filter(aval => 
        parseFloat(aval.mediaGeral) < 3.0
    ).length;
    
    // Calcular melhoria (comparar �ltimo m�s com anterior)
    // Por enquanto, simulado
    const melhoria = '+0.0';
    
    // Atualizar DOM
    document.getElementById('aval-total-funcionarios').textContent = total;
    document.getElementById('aval-media-geral').textContent = mediaGeral;
    document.getElementById('aval-melhoria').textContent = melhoria;
    document.getElementById('aval-atencao').textContent = precisamAtencao;
}

// Renderizar grid de funcion�rios
function renderizarFuncionarios() {
    const container = document.getElementById('aval-funcionarios-grid');
    if (!container) return;
    
    const busca = AvaliacaoState.filtros.busca.toLowerCase();
    
    // Filtrar funcion�rios
    let funcionariosFiltrados = AvaliacaoState.funcionarios;
    if (busca) {
        funcionariosFiltrados = funcionariosFiltrados.filter(f => 
            f.nome.toLowerCase().includes(busca) || 
            (f.funcao && f.funcao.toLowerCase().includes(busca))
        );
    }
    
    if (funcionariosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="aval-empty-state">
                <div class="aval-empty-state-icon"></div>
                <h3>Nenhum funcion�rio encontrado</h3>
                <p>Tente ajustar os filtros de busca</p>
            </div>
        `;
        return;
    }
    
    // Renderizar cards
    container.innerHTML = funcionariosFiltrados.map(func => {
        // Buscar �ltima avalia��o
        const ultimaAval = AvaliacaoState.avaliacoes
            .filter(a => String(a.funcionario_id) === String(func.id))
            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
        
        const mediaGeral = ultimaAval ? parseFloat(ultimaAval.mediaGeral).toFixed(1) : '0.0';
        const estrelas = gerarEstrelas(parseFloat(mediaGeral));
        
        // Verificar se precisa avalia��o (exemplo: mensal)
        const precisaAvaliar = !ultimaAval || precisaAvaliacaoNovamente(ultimaAval.data);
        
        // Iniciais do nome
        const iniciais = func.nome.split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
        
        return `
            <div class="aval-funcionario-card" onclick="abrirFormularioAvaliacao(${func.id})">
                <div class="aval-funcionario-header">
                    <div class="aval-funcionario-avatar">${iniciais}</div>
                    <div class="aval-funcionario-info">
                        <div class="aval-funcionario-nome" title="${func.nome}">${func.nome}</div>
                        <div class="aval-funcionario-funcao">${func.funcao || 'Sem fun��o'}</div>
                    </div>
                </div>
                <div class="aval-funcionario-footer">
                    <div class="aval-funcionario-rating">
                        <span class="aval-rating-stars">${estrelas}</span>
                        <span class="aval-rating-value">${mediaGeral}</span>
                    </div>
                    ${precisaAvaliar ? 
                        '<span class="aval-badge-pendente"> Avaliar</span>' : 
                        '<span class="aval-badge-ok"> OK</span>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Gerar estrelas baseado na nota
function gerarEstrelas(nota) {
    const cheias = Math.floor(nota);
    const vazia = 5 - Math.ceil(nota);
    const meia = nota % 1 >= 0.5 ? 1 : 0;
    
    return ''.repeat(cheias) + (meia ? '' : '') + ''.repeat(vazia);
}

// Verificar se precisa avalia��o novamente
function precisaAvaliacaoNovamente(dataUltima) {
    if (!dataUltima) return true;
    
    const ultima = new Date(dataUltima);
    const hoje = new Date();
    const diasDesde = Math.floor((hoje - ultima) / (1000 * 60 * 60 * 24));
    
    // Se passou mais de 30 dias, precisa nova avalia��o
    return diasDesde > 30;
}

// Setup busca de funcion�rios
function setupBuscaFuncionarios() {
    // Popular o select de funcionários
    const select = document.getElementById('aval-select-funcionario');
    if (select) {
        select.innerHTML = '<option value="">👤 Selecione um funcionário...</option>';
        AvaliacaoState.funcionarios.forEach(func => {
            const option = document.createElement('option');
            option.value = func.id;
            option.textContent = func.nome;
            select.appendChild(option);
        });
        
        // Evento de seleção
        select.addEventListener('change', (e) => {
            if (e.target.value) {
                abrirFormularioAvaliacao(parseInt(e.target.value));
                e.target.value = ''; // Resetar select
            }
        });
    }
    
    // Input de busca
    const input = document.getElementById('aval-search-funcionario');
    if (input) {
        input.addEventListener('input', (e) => {
            AvaliacaoState.filtros.busca = e.target.value;
            renderizarFuncionarios();
        });
    }
}

// Abrir formul�rio de avalia��o (placeholder)
window.abrirFormularioAvaliacao = function(funcId) {
    const func = AvaliacaoState.funcionarios.find(f => f.id === funcId);
    if (!func) return;
    
    console.log(' Abrindo avalia��o para:', func.nome);
    alert(`Formul�rio de avalia��o para ${func.nome}\n\nEm desenvolvimento... `);
    
    // TODO: Implementar formul�rio completo na Fase 2
};

// Interceptar troca de aba para inicializar avalia��es
const originalMostrarAba2 = window.mostrarAba;
window.mostrarAba = function(abaId) {
    if (originalMostrarAba2) {
        originalMostrarAba2(abaId);
    }
    
    // Se for a aba de avalia��es, inicializar
    if (abaId === 'avaliacoes') {
        setTimeout(() => {
            initAvaliacoes();
        }, 100);
    }
};

console.log('✅ Sistema de Avaliações carregado!');

/* =========================================
   DASHBOARD EXECUTIVO - Sistema Completo
   ========================================= */

// Estado global do dashboard
const DashboardState = {
    atividadesCarregadas: 10,
    filtroAtivo: 'hoje',
    ultimaAtualizacao: null
};

// Inicializar dashboard quando abrir a aba
function initDashboard() {
    console.log('📊 Inicializando Dashboard Executivo...');
    
    if (!lancamentos || !funcionarios || !obras) {
        console.log('⏳ Aguardando dados...');
        setTimeout(() => initDashboard(), 300);
        return;
    }
    
    atualizarRelogioHeader();
    setInterval(atualizarRelogioHeader, 1000);
    
    atualizarCardsMetricas();
    renderizarGraficoHorasPorObra();
    renderizarTopFuncionarios();
    renderizarCronogramaSemanal();
    renderizarAlertas();
    renderizarAtividadeRecente();
    setupFiltrosAtividade();
    
    console.log('✅ Dashboard inicializado!');
}

// Atualizar relógio e data no header
function atualizarRelogioHeader() {
    const now = new Date();
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    const diaSemana = dias[now.getDay()];
    const dia = now.getDate();
    const mes = meses[now.getMonth()];
    const ano = now.getFullYear();
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');
    const segundos = String(now.getSeconds()).padStart(2, '0');
    
    const el = document.getElementById('dash-datetime');
    if (el) {
        el.textContent = `${diaSemana}, ${dia} de ${mes} de ${ano} • ${horas}:${minutos}:${segundos}`;
    }
}

// Atualizar cards de métricas principais
function atualizarCardsMetricas() {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    // Card 1: Custo do Mês
    const lancamentosMes = lancamentos.filter(l => {
        const data = new Date(l.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    
    let custoTotal = 0;
    lancamentosMes.forEach(lanc => {
        const func = funcionarios.find(f => f.nome === lanc.funcionario);
        if (func && func.salario_dia) {
            custoTotal += parseFloat(func.salario_dia) * parseFloat(lanc.horas || 0) / 8;
        }
    });
    
    document.getElementById('metric-custo').textContent = `R$ ${custoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Simular variação (aqui você pode calcular comparando com mês anterior)
    const variacao = Math.random() > 0.5 ? '+' : '-';
    const percent = (Math.random() * 20).toFixed(0);
    const badge = document.querySelector('#metric-custo-change .change-badge');
    if (badge) {
        badge.textContent = `${variacao}${percent}%`;
        badge.className = `change-badge ${variacao === '+' ? 'negative' : 'positive'}`;
    }
    
    // Card 2: Funcionários Ativos
    const lancamentosHoje = lancamentos.filter(l => l.data === hoje);
    const funcionariosAtivosHoje = new Set(lancamentosHoje.map(l => l.funcionario)).size;
    const totalFuncionarios = funcionarios.length;
    const ausentes = totalFuncionarios - funcionariosAtivosHoje;
    
    document.getElementById('metric-ativos').textContent = `${funcionariosAtivosHoje}/${totalFuncionarios}`;
    
    const ausentesEl = document.querySelector('.ausentes-count');
    if (ausentesEl) {
        ausentesEl.textContent = `${ausentes} ausentes`;
        ausentesEl.style.color = ausentes > 0 ? '#ef4444' : '#10b981';
    }
    
    // Card 3: Obras
    const obrasAndamento = obras.filter(o => o.status === 'Em andamento' || o.status === 'em_andamento').length;
    
    // Simular obras atrasadas (aqui você pode comparar prazo_final com hoje)
    const obrasAtrasadas = obras.filter(o => {
        if (!o.prazo_final) return false;
        const prazo = new Date(o.prazo_final);
        return prazo < new Date() && (o.status === 'Em andamento' || o.status === 'em_andamento');
    }).length;
    
    document.getElementById('metric-obras').textContent = `${obrasAndamento} em andamento`;
    
    const atrasadasEl = document.querySelector('.atrasadas-badge');
    if (atrasadasEl) {
        atrasadasEl.textContent = obrasAtrasadas > 0 ? `${obrasAtrasadas} atrasadas ⚠️` : '✓ no prazo';
        atrasadasEl.style.color = obrasAtrasadas > 0 ? '#f59e0b' : '#10b981';
    }
    
    // Card 4: Horas Hoje
    let horasHoje = 0;
    lancamentosHoje.forEach(l => {
        horasHoje += parseFloat(l.horas || 0);
    });
    
    document.getElementById('metric-horas').textContent = `${horasHoje.toFixed(1)}h`;
    document.querySelector('.lancamentos-count').textContent = `${lancamentosHoje.length} lançamentos`;
    
    // Atualizar resumo do header
    document.getElementById('dash-summary-obras').textContent = `${obrasAndamento} obras ativas`;
    document.getElementById('dash-summary-func').textContent = `${funcionariosAtivosHoje} de ${totalFuncionarios} funcionários trabalhando`;
    document.getElementById('dash-summary-ausentes').textContent = `${ausentes} ausentes hoje`;
}

// Renderizar gráfico de horas por obra (barras horizontais)
function renderizarGraficoHorasPorObra() {
    const container = document.getElementById('chart-horas-obra');
    if (!container) return;
    
    // Calcular horas dos últimos 30 dias por obra
    const data30DiasAtras = new Date();
    data30DiasAtras.setDate(data30DiasAtras.getDate() - 30);
    
    const horasPorObra = {};
    lancamentos.forEach(lanc => {
        const dataLanc = new Date(lanc.data);
        if (dataLanc >= data30DiasAtras) {
            const obraNome = lanc.obra || 'Sem obra';
            if (!horasPorObra[obraNome]) {
                horasPorObra[obraNome] = 0;
            }
            horasPorObra[obraNome] += parseFloat(lanc.horas || 0);
        }
    });
    
    // Ordenar e pegar top 5
    const obrasOrdenadas = Object.entries(horasPorObra)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (obrasOrdenadas.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Nenhum lançamento nos últimos 30 dias</p>';
        return;
    }
    
    const maxHoras = Math.max(...obrasOrdenadas.map(o => o[1]));
    
    container.innerHTML = obrasOrdenadas.map(([nome, horas]) => {
        const percent = (horas / maxHoras * 100).toFixed(0);
        const statusClass = horas > maxHoras * 0.7 ? 'success' : horas > maxHoras * 0.4 ? 'warning' : 'danger';
        const statusIcon = horas > maxHoras * 0.7 ? '✅' : horas > maxHoras * 0.4 ? '⚠️' : '🔴';
        
        return `
            <div class="bar-item" onclick="abrirDetalheObra('${nome}')">
                <div class="bar-label">
                    <span class="bar-status-icon">${statusIcon}</span>
                    <span title="${nome}">${nome.length > 25 ? nome.substring(0, 25) + '...' : nome}</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill ${statusClass}" style="width: ${percent}%">
                        ${horas.toFixed(0)}h
                    </div>
                </div>
                <div class="bar-value">${percent}%</div>
            </div>
        `;
    }).join('');
}

// Renderizar top 5 funcionários
function renderizarTopFuncionarios() {
    const container = document.getElementById('top-funcionarios-list');
    if (!container) return;
    
    // Calcular horas do mês por funcionário
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    const horasPorFunc = {};
    const obrasPorFunc = {};
    
    lancamentos.forEach(lanc => {
        const data = new Date(lanc.data);
        if (data.getMonth() === mesAtual && data.getFullYear() === anoAtual) {
            const funcNome = lanc.funcionario;
            if (!horasPorFunc[funcNome]) {
                horasPorFunc[funcNome] = 0;
                obrasPorFunc[funcNome] = new Set();
            }
            horasPorFunc[funcNome] += parseFloat(lanc.horas || 0);
            if (lanc.obra) {
                obrasPorFunc[funcNome].add(lanc.obra);
            }
        }
    });
    
    // Ordenar e pegar top 5
    const topFuncs = Object.entries(horasPorFunc)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (topFuncs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Nenhum lançamento este mês</p>';
        return;
    }
    
    container.innerHTML = topFuncs.map(([nome, horas], index) => {
        const func = funcionarios.find(f => f.nome === nome);
        const funcao = func ? func.funcao : 'Função não informada';
        const iniciais = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const numObras = obrasPorFunc[nome] ? obrasPorFunc[nome].size : 0;
        
        // Simular estrelas (5 estrelas para top 3, 4 para 4º, 3 para 5º)
        const numEstrelas = index < 3 ? 5 : index === 3 ? 4 : 3;
        const estrelas = '⭐'.repeat(numEstrelas);
        
        return `
            <div class="top-func-item" onclick="abrirDetalheFunc('${nome}')">
                <div class="top-func-rank">${index + 1}</div>
                <div class="top-func-avatar">${iniciais}</div>
                <div class="top-func-info">
                    <div class="top-func-name">${nome}</div>
                    <div class="top-func-role">${funcao} • ${numObras} obras</div>
                </div>
                <div class="top-func-stats">
                    <div class="top-func-hours">${horas.toFixed(0)}h</div>
                    <div class="top-func-stars">${estrelas}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar cronograma semanal
function renderizarCronogramaSemanal() {
    const container = document.getElementById('cronograma-semanal');
    if (!container) return;
    
    const hoje = new Date();
    const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    
    let html = '';
    let totalHoras = 0;
    let maxHoras = 0;
    let diaPico = '';
    
    for (let i = 6; i >= 0; i--) {
        const dia = new Date(hoje);
        dia.setDate(hoje.getDate() - i);
        const diaStr = dia.toISOString().split('T')[0];
        
        const lancsNoDia = lancamentos.filter(l => l.data === diaStr);
        const horasNoDia = lancsNoDia.reduce((sum, l) => sum + parseFloat(l.horas || 0), 0);
        const numLancs = lancsNoDia.length;
        
        const isFuturo = dia > hoje;
        const isHoje = diaStr === hoje.toISOString().split('T')[0];
        const statusIcon = isFuturo ? '⚫' : horasNoDia > 40 ? '🟢' : horasNoDia > 0 ? '🟡' : '🔴';
        
        if (!isFuturo) {
            totalHoras += horasNoDia;
            if (horasNoDia > maxHoras) {
                maxHoras = horasNoDia;
                diaPico = diasSemana[dia.getDay()];
            }
        }
        
        html += `
            <div class="cronograma-day ${isHoje ? 'active' : ''} ${isFuturo ? 'future' : ''}" 
                 onclick="filtrarAtividadePorDia('${diaStr}')">
                <div class="day-name">${diasSemana[dia.getDay()]}</div>
                <div class="day-lancamentos">${isFuturo ? '-' : numLancs}</div>
                <div class="day-horas">${isFuturo ? '-' : horasNoDia.toFixed(0) + 'h'}</div>
                <div class="day-status">${statusIcon}</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    const mediaDiaria = (totalHoras / 7).toFixed(1);
    document.getElementById('cronograma-stats').innerHTML = 
        `Média diária: <strong>${mediaDiaria}h</strong> | Pico: <strong>${diaPico} (${maxHoras.toFixed(0)}h)</strong>`;
}

// Renderizar alertas automáticos
function renderizarAlertas() {
    const container = document.getElementById('alertas-list');
    if (!container) return;
    
    const alertas = [];
    const hoje = new Date();
    
    // Alerta 1: Obras sem lançamento há mais de 2 dias
    obras.forEach(obra => {
        if (obra.status === 'Em andamento' || obra.status === 'em_andamento') {
            const ultimoLanc = lancamentos
                .filter(l => l.obra === obra.nome)
                .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
            
            if (ultimoLanc) {
                const diasSemLanc = Math.floor((hoje - new Date(ultimoLanc.data)) / (1000 * 60 * 60 * 24));
                if (diasSemLanc >= 3) {
                    alertas.push({
                        tipo: 'atencao',
                        icone: '⚠️',
                        titulo: obra.nome,
                        descricao: `Sem lançamentos há ${diasSemLanc} dias`,
                        acao: 'Ir para obra →',
                        onClick: `mostrarAba('obras')`
                    });
                }
            }
        }
    });
    
    // Alerta 2: Obras próximas do prazo
    obras.forEach(obra => {
        if (obra.prazo_final) {
            const prazo = new Date(obra.prazo_final);
            const diasRestantes = Math.floor((prazo - hoje) / (1000 * 60 * 60 * 24));
            
            if (diasRestantes > 0 && diasRestantes <= 7) {
                alertas.push({
                    tipo: 'informativo',
                    icone: '⏰',
                    titulo: obra.nome,
                    descricao: `Prazo em ${diasRestantes} dias (${prazo.toLocaleDateString('pt-BR')})`,
                    acao: 'Ver cronograma →',
                    onClick: `mostrarAba('obras')`
                });
            }
        }
    });
    
    // Alerta 3: Funcionários sem avaliação (se houver sistema de avaliações)
    // Placeholder - você pode implementar verificação real aqui
    
    // Limitar a 3 alertas
    const alertasTop = alertas.slice(0, 3);
    
    if (alertasTop.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#10b981;">
                <div style="font-size:3rem;margin-bottom:0.5rem;">✓</div>
                <div style="font-weight:700;">Tudo em ordem!</div>
                <div style="font-size:0.9rem;color:#64748b;">Nenhum alerta pendente</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alertasTop.map(alerta => `
        <div class="alerta-item ${alerta.tipo}" onclick="${alerta.onClick}">
            <div class="alerta-icon">${alerta.icone}</div>
            <div class="alerta-content">
                <div class="alerta-titulo">${alerta.titulo}</div>
                <div class="alerta-descricao">${alerta.descricao}</div>
                <div class="alerta-action">${alerta.acao}</div>
            </div>
        </div>
    `).join('');
}

// Renderizar atividade recente
function renderizarAtividadeRecente() {
    const container = document.getElementById('atividade-recente');
    if (!container) return;
    
    let lancsParaMostrar = [...lancamentos];
    
    // Aplicar filtro
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    if (DashboardState.filtroAtivo === 'hoje') {
        const hojeStr = hoje.toISOString().split('T')[0];
        lancsParaMostrar = lancsParaMostrar.filter(l => l.data === hojeStr);
    } else if (DashboardState.filtroAtivo === 'semana') {
        lancsParaMostrar = lancsParaMostrar.filter(l => new Date(l.data) >= inicioSemana);
    } else if (DashboardState.filtroAtivo === 'mes') {
        lancsParaMostrar = lancsParaMostrar.filter(l => new Date(l.data) >= inicioMes);
    }
    
    // Ordenar por data/hora decrescente
    lancsParaMostrar.sort((a, b) => {
        const dataA = new Date(a.criado_em || a.data);
        const dataB = new Date(b.criado_em || b.data);
        return dataB - dataA;
    });
    
    // Limitar quantidade
    const lancsLimitados = lancsParaMostrar.slice(0, DashboardState.atividadesCarregadas);
    
    if (lancsLimitados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Nenhuma atividade neste período</p>';
        return;
    }
    
    container.innerHTML = lancsLimitados.map(lanc => {
        const func = funcionarios.find(f => f.nome === lanc.funcionario);
        const iniciais = lanc.funcionario ? lanc.funcionario.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '??';
        const funcao = func ? func.funcao : 'Função não informada';
        
        const dataLanc = new Date(lanc.criado_em || lanc.data);
        const horasAtras = Math.floor((hoje - dataLanc) / (1000 * 60 * 60));
        const minutosAtras = Math.floor((hoje - dataLanc) / (1000 * 60));
        
        let tempoRelativo = '';
        if (minutosAtras < 60) {
            tempoRelativo = `há ${minutosAtras} min`;
        } else if (horasAtras < 24) {
            tempoRelativo = `há ${horasAtras}h`;
        } else {
            const diasAtras = Math.floor(horasAtras / 24);
            tempoRelativo = `há ${diasAtras} dias`;
        }
        
        const horaFormatada = String(dataLanc.getHours()).padStart(2, '0') + ':' + String(dataLanc.getMinutes()).padStart(2, '0');
        
        return `
            <div class="activity-item">
                <div class="activity-avatar">${iniciais}</div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-time">🕐 ${horaFormatada}</span>
                        <span class="activity-relative">• ${tempoRelativo}</span>
                    </div>
                    <div class="activity-text">${lanc.funcionario} → ${lanc.obra || 'Sem obra'}</div>
                    <div class="activity-details">
                        <span>${parseFloat(lanc.horas || 0).toFixed(1)} horas</span>
                        <span>•</span>
                        <span class="activity-badge" style="background:#e3f2fd;color:#1976d2;">${funcao}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Mostrar/ocultar botão "carregar mais"
    const btnLoadMore = document.getElementById('load-more-activities');
    if (btnLoadMore) {
        btnLoadMore.style.display = lancsParaMostrar.length > DashboardState.atividadesCarregadas ? 'block' : 'none';
    }
}

// Setup filtros de atividade
function setupFiltrosAtividade() {
    const botoes = document.querySelectorAll('.filter-pill');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            botoes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            DashboardState.filtroAtivo = btn.dataset.filter;
            DashboardState.atividadesCarregadas = 10;
            renderizarAtividadeRecente();
        });
    });
}

// Carregar mais atividades
window.carregarMaisAtividades = function() {
    DashboardState.atividadesCarregadas += 10;
    renderizarAtividadeRecente();
};

// Filtrar atividade por dia específico
window.filtrarAtividadePorDia = function(diaStr) {
    const btnHoje = document.querySelector('.filter-pill[data-filter="hoje"]');
    if (btnHoje) {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btnHoje.classList.add('active');
    }
    DashboardState.filtroAtivo = 'hoje';
    // Aqui você pode adicionar lógica para filtrar dia específico se necessário
    renderizarAtividadeRecente();
};

// Funções auxiliares de navegação dos cards
window.abrirDetalheCusto = function() {
    console.log('📊 Abrindo detalhes de custo...');
    alert('Modal de breakdown de custos por obra (em desenvolvimento)');
};

window.abrirListaFuncionarios = function() {
    mostrarAba('funcionarios');
};

window.abrirCronogramaObras = function() {
    mostrarAba('obras');
};

window.abrirLancamentosHoje = function() {
    mostrarAba('lancamentos');
};

window.abrirDetalheObra = function(nomeObra) {
    console.log('🏗️ Abrindo detalhes da obra:', nomeObra);
    mostrarAba('obras');
};

window.abrirDetalheFunc = function(nomeFunc) {
    console.log('👷 Abrindo detalhes do funcionário:', nomeFunc);
    mostrarAba('funcionarios');
};

window.verTodosAlertas = function() {
    alert('Modal com todos os alertas (em desenvolvimento)');
};

// Interceptar abertura da aba dashboard
const originalMostrarAba3 = window.mostrarAba;
window.mostrarAba = function(abaId) {
    if (originalMostrarAba3) {
        originalMostrarAba3(abaId);
    }
    
    if (abaId === 'dashboard') {
        setTimeout(() => {
            initDashboard();
        }, 100);
    }
    
    // Manter avaliações funcionando
    if (abaId === 'avaliacoes') {
        setTimeout(() => {
            initAvaliacoes();
        }, 100);
    }
};

console.log('✅ Dashboard Executivo carregado!');
