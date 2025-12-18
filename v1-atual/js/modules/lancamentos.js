// ========================================
// LANCAMENTOS.JS - Módulo completo de lançamentos com filtros e paginação
// ========================================

import { LancamentosAPI, FuncionariosAPI, ObrasAPI } from './api.js';
import { lancamentosActions, funcionariosActions, obrasActions } from './store.js';
import { showNotification, showLoading, hideLoading } from './ui.js';
import { formatarData, formatarHora } from './utils.js';
import { DataTable, createFilterPanel, setupFilterPanel, populateFilterSelect } from './table.js';

// Instância da tabela
let lancamentosTable = null;

// Estado dos filtros
let filtroState = {
    dataInicio: '',
    dataFim: '',
    funcionario: '',
    funcao: '',
    empresa: '',
    obra: ''
};

/**
 * Inicializar módulo de lançamentos
 */
export async function initLancamentos() {
    console.log('📋 Inicializando módulo de lançamentos...');

    // Garantir que campo de horas esteja visível
    setTimeout(() => {
        const campoHoras = document.getElementById('campo-horas');
        if (campoHoras) {
            campoHoras.style.display = 'block';
            console.log('✅ Campo de horas forçado a aparecer');
        }
    }, 100);

    // Configurar tabela
    setupLancamentosTable();

    // Carregar dados
    await carregarLancamentos();

    // Configurar event listeners
    setupEventListeners();

    console.log('✅ Módulo de lançamentos inicializado');
}

/**
 * Criar controles de filtros/paginação dinamicamente
 */
function ensureLancamentosControls() {
    const tbody = document.getElementById('tabela-lancamentos');
    if (!tbody) return;

    const table = tbody.closest('table');
    const card = table ? table.parentElement : null;

    // Adicionar IDs nos cabeçalhos para ordenação
    const thead = table?.querySelector('thead');
    if (thead) {
        const ths = thead.querySelectorAll('th');
        if (ths.length >= 8 && !document.getElementById('th-data')) {
            ths[0].id = 'th-data';
            ths[1].id = 'th-funcionario';
            ths[2].id = 'th-funcao';
            ths[3].id = 'th-empresa';
            ths[4].id = 'th-obra';
            ths[5].id = 'th-horas';
            ths[6].id = 'th-observacao';
        }
    }

    // Criar painel de controles se não existir
    if (card && !document.getElementById('tabela-lancamentos-page-size')) {
        const controlsHtml = createFilterPanel({
            tableId: 'tabela-lancamentos',
            filters: [
                { type: 'date', id: 'lanc-data-inicio', label: 'Data inicial' },
                { type: 'date', id: 'lanc-data-fim', label: 'Data final' },
                { type: 'select', id: 'lanc-filtro-funcionario', label: 'Funcionário', options: [] },
                { type: 'select', id: 'lanc-filtro-funcao', label: 'Função', options: [] },
                { type: 'select', id: 'lanc-filtro-empresa', label: 'Empresa', options: [] },
                { type: 'select', id: 'lanc-filtro-obra', label: 'Obra', options: [] }
            ]
        });

        const controlsDiv = document.createElement('div');
        controlsDiv.innerHTML = controlsHtml;
        card.insertBefore(controlsDiv.firstElementChild, table);
    }
}

/**
 * Configurar tabela de lançamentos
 */
function setupLancamentosTable() {
    lancamentosTable = new DataTable({
        tableId: 'tabela-lancamentos',
        data: [],
        columns: [
            { field: 'data' },
            { field: 'funcionario' },
            { field: 'funcao' },
            { field: 'empresa' },
            { field: 'obra' },
            { field: 'horas' },
            { field: 'observacao' }
        ],
        pageSize: 50,
        sortColumn: 'data',
        sortDirection: 'desc',
        filters: filtroState,
        onDelete: 'excluirLancamento',
        emptyMessage: 'Nenhum lançamento registrado'
    });

    // Configurar cabeçalhos clicáveis para ordenação
    setTimeout(() => {
        lancamentosTable.setupSortableHeaders([
            { id: 'th-data', field: 'data' },
            { id: 'th-funcionario', field: 'funcionario' },
            { id: 'th-funcao', field: 'funcao' },
            { id: 'th-empresa', field: 'empresa' },
            { id: 'th-obra', field: 'obra' },
            { id: 'th-horas', field: 'horas' }
        ]);

        // Marcar coluna de ordenação inicial
        const initialHeader = document.getElementById('th-data');
        if (initialHeader) {
            initialHeader.classList.add('sort-desc');
        }
    }, 100);
}

/**
 * Carregar lançamentos da API
 */
export async function carregarLancamentos() {
    try {
        showLoading('Carregando lançamentos...');

        const response = await LancamentosAPI.listar();

        if (response.sucesso) {
            const dados = response.dados || [];
            lancamentosActions.set(dados);

            // Atualizar tabela
            if (lancamentosTable) {
                lancamentosTable.setData(dados);
            }

            // Popular filtros
            popularFiltros();

            console.log(`✅ ${dados.length} lançamentos carregados`);
        } else {
            showNotification(response.mensagem || 'Erro ao carregar lançamentos', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar lançamentos:', error);
        showNotification('Erro ao carregar lançamentos', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Popular selects de filtros
 */
function popularFiltros() {
    const lancamentos = lancamentosActions.getAll();
    const funcionarios = funcionariosActions.getAll();

    // Funcionários ativos
    populateFilterSelect(
        'lanc-filtro-funcionario',
        funcionarios.filter(f => f.situacao === 'Ativo'),
        'nome',
        'Todos os funcionários'
    );

    // Funções únicas dos funcionários
    populateFilterSelect(
        'lanc-filtro-funcao',
        funcionarios,
        'funcao',
        'Todas as funções'
    );

    // Empresas dos lançamentos
    populateFilterSelect(
        'lanc-filtro-empresa',
        lancamentos,
        'empresa',
        'Todas as empresas'
    );

    // Obras dos lançamentos
    populateFilterSelect(
        'lanc-filtro-obra',
        lancamentos,
        'obra',
        'Todas as obras'
    );

    // Configurar datas padrão (últimos 30 dias)
    const selInicio = document.getElementById('lanc-data-inicio');
    const selFim = document.getElementById('lanc-data-fim');

    if (selInicio && !selInicio.value) {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        const hoje = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const dIni = new Date(d.getTime() - 29 * 24 * 60 * 60 * 1000);
        const ini = `${dIni.getFullYear()}-${pad(dIni.getMonth() + 1)}-${pad(dIni.getDate())}`;

        selInicio.value = ini;
        if (selFim) selFim.value = hoje;

        // Aplicar filtros padrão
        filtroState.dataInicio = ini;
        filtroState.dataFim = hoje;
        if (lancamentosTable) {
            lancamentosTable.config.filters = filtroState;
            lancamentosTable.render();
        }
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Toggle do painel de filtros
    const btnToggleFiltros = document.getElementById('toggle-filtros');
    const panelFiltros = document.getElementById('lanc-filtros-panel');

    if (btnToggleFiltros && panelFiltros) {
        btnToggleFiltros.addEventListener('click', () => {
            panelFiltros.classList.toggle('collapsed');
        });
    }

    // Seletor de tamanho de página
    const pageSize = document.getElementById('tabela-lancamentos-page-size');
    if (pageSize) {
        pageSize.addEventListener('change', () => {
            if (lancamentosTable) {
                lancamentosTable.setPageSize(Number(pageSize.value));
            }
        });
    }

    // Filtros individuais
    const filtros = [
        { id: 'lanc-data-inicio', key: 'dataInicio' },
        { id: 'lanc-data-fim', key: 'dataFim' },
        { id: 'lanc-filtro-funcionario', key: 'funcionario' },
        { id: 'lanc-filtro-funcao', key: 'funcao' },
        { id: 'lanc-filtro-empresa', key: 'empresa' },
        { id: 'lanc-filtro-obra', key: 'obra' }
    ];

    filtros.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                filtroState[key] = el.value;
                if (lancamentosTable) {
                    lancamentosTable.setFilter(key, el.value);
                }
            });
        }
    });

    // Formulário de adicionar lançamento
    const form = document.getElementById('form-lancamento');
    if (form) {
        form.addEventListener('submit', handleSubmitLancamento);
    }

    // Popular dropdowns do formulário
    popularDropdownsFormulario();
}

/**
 * Popular dropdowns do formulário de lançamento
 */
function popularDropdownsFormulario() {
    const funcionarios = funcionariosActions.getAll();
    const obras = obrasActions.getAll();

    // Garantir que o campo de horas esteja visível
    const campoHoras = document.getElementById('campo-horas');
    if (campoHoras) {
        campoHoras.style.display = 'block';
    }

    // Dropdown de funcionários
    const selectFunc = document.getElementById('lancamento-funcionario');
    if (selectFunc) {
        selectFunc.innerHTML = '<option value="">Selecione um funcionário...</option>';
        funcionarios
            .filter(f => f.situacao === 'Ativo')
            .forEach(func => {
                selectFunc.innerHTML += `<option value="${func.nome}" data-funcao="${func.funcao}" data-empresa="${func.empresa}">${func.nome}</option>`;
            });

        // Auto-preencher função e empresa ao selecionar funcionário
        selectFunc.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const funcaoEl = document.getElementById('lancamento-funcao');
            const empresaInput = document.getElementById('lancamento-empresa');

            const funcao = selectedOption?.dataset.funcao || '';
            const empresa = selectedOption?.dataset.empresa || '';

            if (funcaoEl) {
                if (funcaoEl.tagName === 'SELECT') {
                    // Popular o SELECT com a função atual e selecionar
                    funcaoEl.innerHTML = '<option value="">Selecione...</option>';
                    if (funcao) {
                        const opt = document.createElement('option');
                        opt.value = funcao;
                        opt.textContent = funcao;
                        opt.selected = true;
                        funcaoEl.appendChild(opt);
                    }
                    // Travar edição manual, pois a função vem do cadastro do funcionário
                    funcaoEl.disabled = true;
                } else {
                    // Campo input/texto
                    funcaoEl.value = funcao;
                }
            }

            if (empresaInput) empresaInput.value = empresa;
        });
    }

    // Dropdown de obras
    const selectObra = document.getElementById('lancamento-obra');
    if (selectObra) {
        selectObra.innerHTML = '<option value="">Selecione uma obra...</option>';
        obras.forEach(obra => {
            selectObra.innerHTML += `<option value="${obra.nome}">${obra.nome}</option>`;
        });
    }

    // Configurar data padrão como hoje
    const dataInput = document.getElementById('lancamento-data');
    if (dataInput && !dataInput.value) {
        const d = new Date();
        const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dataInput.value = hoje;
    }
}

/**
 * Manipular submissão do formulário de lançamento
 */
async function handleSubmitLancamento(e) {
    e.preventDefault();

    const dados = {
        data: document.getElementById('lancamento-data').value,
        funcionario: document.getElementById('lancamento-funcionario').value,
        funcao: document.getElementById('lancamento-funcao').value,
        empresa: document.getElementById('lancamento-empresa').value,
        obra: document.getElementById('lancamento-obra').value,
        horas: document.getElementById('lancamento-horas').value,
        observacao: document.getElementById('lancamento-observacao').value.trim()
    };

    // Validações
    if (!dados.data) {
        showNotification('Data é obrigatória!', 'warning');
        return;
    }

    if (!dados.funcionario) {
        showNotification('Funcionário é obrigatório!', 'warning');
        return;
    }

    if (!dados.obra) {
        showNotification('Obra é obrigatória!', 'warning');
        return;
    }

    if (!dados.horas) {
        showNotification('Horas é obrigatório!', 'warning');
        return;
    }

    try {
        showLoading('Salvando lançamento...');

        const response = await LancamentosAPI.criar(dados);

        if (response.sucesso) {
            showNotification('Lançamento adicionado com sucesso!', 'success');
            e.target.reset();

            // Reconfigurar data padrão
            const dataInput = document.getElementById('lancamento-data');
            if (dataInput) {
                const d = new Date();
                dataInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }

            // Recarregar dados
            await carregarLancamentos();
        } else {
            showNotification(response.mensagem || 'Erro ao salvar lançamento', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar lançamento:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Excluir lançamento
 */
export async function excluirLancamento(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) {
        return;
    }

    try {
        showLoading('Excluindo lançamento...');

        const response = await LancamentosAPI.excluir(id);

        if (response.sucesso) {
            showNotification('Lançamento excluído com sucesso!', 'success');
            await carregarLancamentos();
        } else {
            showNotification(response.mensagem || 'Erro ao excluir lançamento', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao excluir lançamento:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Renderizar tabela de lançamentos (compatibilidade)
 */
export function renderizarLancamentos() {
    if (lancamentosTable) {
        lancamentosTable.render();
    }
}

// Exportar funções para window (compatibilidade onclick)
if (typeof window !== 'undefined') {
    window.excluirLancamento = excluirLancamento;
}
