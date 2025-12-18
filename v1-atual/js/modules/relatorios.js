// ========================================
// MÓDULO DE RELATÓRIOS INTELIGENTES
// Sistema completo de análise e visualização de horas trabalhadas
// ========================================

// Imports
import store from './store.js';
import { showNotification, showLoading, hideLoading } from './ui.js';
import { formatarData, formatarDataInput, formatDateToYYYYMMDD, formatarDataBR } from './utils.js';

// Estado local do módulo
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

// ========================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ========================================

export async function initRelatorios() {
    console.log('🚀 Inicializando Relatórios Inteligente...');

    // Obter dados do store
    const lancamentos = store.getState('lancamentos');
    const funcionarios = store.getState('funcionarios');
    const obras = store.getState('obras');
    const empresas = store.getState('empresas');

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

// ========================================
// CONFIGURAÇÃO INICIAL
// ========================================

function setPeriodoDefault() {
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    RelatorioState.periodo.inicio = formatDateToYYYYMMDD(seteDiasAtras);
    RelatorioState.periodo.fim = formatDateToYYYYMMDD(hoje);
    RelatorioState.periodo.preset = '7dias';

    // Atualizar inputs se existirem
    const iniInput = document.getElementById('rel-data-inicio');
    const fimInput = document.getElementById('rel-data-fim');
    if (iniInput) iniInput.value = RelatorioState.periodo.inicio;
    if (fimInput) fimInput.value = RelatorioState.periodo.fim;

    console.log(`📅 Período padrão definido: ${RelatorioState.periodo.inicio} até ${RelatorioState.periodo.fim}`);
}

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
    }

    const btnImprimir = document.getElementById('btn-imprimir-relatorio');
    if (btnImprimir) {
        console.log('✅ Botão imprimir encontrado');
        btnImprimir.addEventListener('click', () => {
            console.log('🔘 Botão imprimir clicado!');
            window.print();
        });
    }

    console.log('✅ Event listeners configurados!');
}

// ========================================
// HANDLERS DE EVENTOS
// ========================================

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

// ========================================
// COMPUTAÇÃO DE DADOS
// ========================================

function computarDados() {
    console.log('🔢 Computando dados...');
    console.log('📅 Período:', RelatorioState.periodo);
    console.log('🔍 Filtros:', RelatorioState.filtros);

    // Obter dados do store
    const lancamentos = store.getState('lancamentos');

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

function computarAgregados() {
    console.log('📈 Computando agregados...');

    // Obter dados do store
    const funcionarios = store.getState('funcionarios') || [];
    const obras = store.getState('obras') || [];

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

    // Agrupamentos
    const porFuncionario = {};
    const porObra = {};
    const porDia = {};

    // Para cada lançamento no período
    dados.forEach((lanc, index) => {
        const horas = parseFloat(lanc.horas) || 0;

        // ====== POR FUNCIONÁRIO ======
        const nomeFuncionario = lanc.funcionario || 'Sem nome';
        const funcaoNome = lanc.funcao_id || lanc.funcao || 'Sem função';

        if (!porFuncionario[nomeFuncionario]) {
            porFuncionario[nomeFuncionario] = {
                id: nomeFuncionario,
                nome: nomeFuncionario,
                funcao: funcaoNome,
                horas: 0,
                lancamentos: 0
            };
        }

        porFuncionario[nomeFuncionario].horas += horas;
        porFuncionario[nomeFuncionario].lancamentos++;

        // ====== POR OBRA ======
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

// ========================================
// ATUALIZAÇÃO E RENDERIZAÇÃO
// ========================================

function atualizarRelatorio() {
    console.log('🔄 Atualizando relatório completo...');
    computarDados();
    atualizarCards();
    renderVisualizacao();
    console.log('✅ Relatório atualizado!');
}

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

// ========================================
// VISUALIZAÇÕES
// ========================================

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

// ========================================
// SISTEMA DE FILTROS
// ========================================

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

function abrirSeletorFiltro(tipo) {
    console.log(`🔍 Abrindo seletor para: ${tipo}`);

    // Obter dados do store
    const funcionarios = store.getState('funcionarios') || [];
    const obras = store.getState('obras') || [];
    const empresas = store.getState('empresas') || [];
    const funcoes = store.getState('funcoes') || [];

    let opcoes = [];
    let titulo = '';
    let icone = '';

    if (tipo === 'funcionario') {
        titulo = 'Selecione um Funcionário';
        icone = '👤';
        if (funcionarios.length === 0) {
            alert('Não há funcionários cadastrados.');
            return;
        }
        opcoes = funcionarios.map(f => ({ id: String(f.id), nome: f.nome }));
    } else if (tipo === 'funcao') {
        titulo = 'Selecione uma Função';
        icone = '💼';
        if (funcoes.length === 0) {
            alert('Não há funções cadastradas.');
            return;
        }
        opcoes = funcoes.map(f => ({ id: String(f.id), nome: f.nome }));
    } else if (tipo === 'obra') {
        titulo = 'Selecione uma Obra';
        icone = '🏢';
        if (obras.length === 0) {
            alert('Não há obras cadastradas.');
            return;
        }
        opcoes = obras.map(o => ({ id: String(o.id), nome: o.nome }));
    } else if (tipo === 'empresa') {
        titulo = 'Selecione uma Empresa';
        icone = '🏭';
        if (empresas.length === 0) {
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

function renderizarChips() {
    const container = document.getElementById('rel-chips-container');
    if (!container) return;

    // Obter dados do store
    const funcionarios = store.getState('funcionarios') || [];
    const empresas = store.getState('empresas') || [];

    const chips = [];

    // Funcionários
    RelatorioState.filtros.funcionarios.forEach(nome => {
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

// ========================================
// EXPORTAÇÃO
// ========================================

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

    // Obter dados do store
    const funcionarios = store.getState('funcionarios') || [];
    const obras = store.getState('obras') || [];
    const empresas = store.getState('empresas') || [];

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

function exportarCSVNovo() {
    const dados = RelatorioState.dados;

    if (dados.length === 0) {
        alert('Não há dados para exportar no período selecionado.');
        return;
    }

    // Obter dados do store
    const funcionarios = store.getState('funcionarios') || [];
    const obras = store.getState('obras') || [];
    const empresas = store.getState('empresas') || [];

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

// ========================================
// DRILL-DOWN (DETALHES)
// ========================================

function abrirDetalheFuncionario(nomeFuncionario) {
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
}

function abrirDetalheObra(nomeObra) {
    console.log('🏢 Abrindo detalhes da obra:', nomeObra);

    // Obter dados do store
    const obras = store.getState('obras') || [];

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
}

// ========================================
// EXPOR FUNÇÕES GLOBALMENTE (para onclick no HTML)
// ========================================

window.initRelatorios = initRelatorios;
window.abrirDetalheFuncionario = abrirDetalheFuncionario;
window.abrirDetalheObra = abrirDetalheObra;
window.removerFiltro = removerFiltro;

console.log('✅ Módulo de Relatórios carregado!');
