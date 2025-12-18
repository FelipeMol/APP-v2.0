// ========================================
// MÓDULO: TAREFAS (Kanban Board)
// ========================================

import { TarefasAPI, ComentariosAPI, UsuariosAPI, EtiquetasAPI, TarefasEtiquetasAPI, ChecklistAPI, MembrosAPI, AnexosAPI, AtividadesAPI } from './api.js';
import { tarefasActions, comentariosActions, tarefasFiltersActions, funcionariosActions, obrasActions, empresasActions, usuariosActions } from './store.js';
import { showNotification, showLoading, hideLoading, abrirModal, fecharModal } from './ui.js';
import { KanbanColumn, TaskCard, CommentThread, TaskFilterPanel } from './components.js';
import { TrelloTaskCard, TrelloKanbanColumn, ChecklistSection, MembersSection, AttachmentsSection, ActivityTimeline, EtiquetasSection } from './trello-components.js';
import { MESSAGES, TAREFAS_CONFIG } from './config.js';
import { formatDate, gerarAvatar } from './utils.js';
import { ehAdmin as verificarEhAdmin, temPermissao, obterUsuario } from './auth.js';

// Estado local do módulo
let currentUsuario = null;
let isSavingTarefa = false; // Proteção contra double-submit

/**
 * Inicializar módulo de tarefas
 */
export async function initTarefas() {
    console.log('📋 Inicializando módulo de Tarefas...');

    // Obter usuário atual
    currentUsuario = obterUsuario();

    // Carregar usuários para dropdown
    try {
        const usuariosResponse = await UsuariosAPI.listar();
        if (usuariosResponse.sucesso) {
            usuariosActions.set(usuariosResponse.dados || []);
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }

    // Carregar tarefas
    await carregarTarefas();

    // Setup event listeners
    setupEventListeners();

    // Setup drag and drop
    setupDragAndDrop();

    console.log('  ✓ Módulo de Tarefas inicializado');
}

/**
 * Carregar tarefas da API
 */
export async function carregarTarefas() {
    try {
        showLoading('Carregando tarefas...');

        const response = await TarefasAPI.listar();

        if (response.sucesso) {
            tarefasActions.set(response.dados || []);
            renderizarKanban();
        } else {
            // Silenciar erros de permissão (403) e autenticação (401)
            const isSemPermissao = response.mensagem && (
                response.mensagem.includes('permissão') ||
                response.mensagem.includes('Token') ||
                response.mensagem.includes('Acesso negado')
            );

            if (!isSemPermissao) {
                showNotification(response.mensagem || MESSAGES.TAREFAS.ERROR.LOAD_FAILED, 'erro');
            }
            // Inicializar vazio
            tarefasActions.set([]);
            renderizarKanban();
        }
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        // Não mostrar erro para não assustar o usuário
        // Inicializar vazio
        tarefasActions.set([]);
        renderizarKanban();
    } finally {
        hideLoading();
    }
}

/**
 * Renderizar Kanban board completo
 */
export function renderizarKanban() {
    const container = document.getElementById('kanban-board');
    if (!container) return;

    // Aplicar filtros
    const tarefasFiltradas = tarefasActions.getFiltered();

    // Agrupar por status
    const porStatus = {
        'novo': tarefasFiltradas.filter(t => t.status === 'novo'),
        'em_andamento': tarefasFiltradas.filter(t => t.status === 'em_andamento'),
        'concluido': tarefasFiltradas.filter(t => t.status === 'concluido'),
        'cancelado': tarefasFiltradas.filter(t => t.status === 'cancelado')
    };

    // Renderizar colunas
    const html = `
        <div class="kanban-board">
            ${KanbanColumn({ status: 'novo', tarefas: porStatus.novo })}
            ${KanbanColumn({ status: 'em_andamento', tarefas: porStatus.em_andamento })}
            ${KanbanColumn({ status: 'concluido', tarefas: porStatus.concluido })}
            ${KanbanColumn({ status: 'cancelado', tarefas: porStatus.cancelado })}
        </div>
    `;

    container.innerHTML = html;

    // Atualizar contador de resultados
    atualizarContadorResultados(tarefasFiltradas.length, tarefasActions.getAll().length);
}

/**
 * Renderizar painel de filtros
 */
export function renderizarFiltros() {
    const container = document.getElementById('tarefas-filtros');
    if (!container) return;

    const filters = tarefasFiltersActions.get();
    const funcionarios = funcionariosActions.getAll();
    const obras = obrasActions.getAll();
    const empresas = empresasActions.getAll();

    container.innerHTML = TaskFilterPanel({ filters, funcionarios, obras, empresas });
}

/**
 * Atualizar contador de resultados
 */
function atualizarContadorResultados(filtradas, total) {
    const contador = document.getElementById('tarefas-contador');
    if (contador) {
        if (filtradas === total) {
            contador.textContent = `${total} tarefas`;
        } else {
            contador.textContent = `Exibindo ${filtradas} de ${total} tarefas`;
        }
    }
}

/**
 * Abrir formulário de nova tarefa
 */
export function abrirFormularioNovaTarefa() {
    console.log('🎯 Abrindo formulário de nova tarefa...');

    // Verificar permissão de criar tarefas
    if (!verificarEhAdmin() && !temPermissao('tarefas', 'criar')) {
        showNotification(MESSAGES.TAREFAS.ERROR.NO_PERMISSION, 'erro');
        return;
    }

    // Resetar formulário
    const form = document.getElementById('form-tarefa');
    if (form) {
        form.reset();
        form.dataset.tarefaId = '';
        console.log('✅ Formulário resetado');
    }

    // Preencher dropdowns
    console.log('📋 Preenchendo dropdowns...');
    preencherDropdownUsuarios();
    preencherDropdownObras();
    preencherDropdownEmpresas();

    // Configurar valores padrão
    const statusSelect = document.getElementById('tarefa-status');
    const prioridadeSelect = document.getElementById('tarefa-prioridade');

    if (statusSelect) statusSelect.value = 'novo';
    if (prioridadeSelect) prioridadeSelect.value = 'media';

    // Atualizar título do modal
    const modalTitle = document.querySelector('#modal-tarefa .modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Nova Tarefa';
        console.log('✅ Título do modal atualizado');
    }

    // Abrir modal
    console.log('🚀 Abrindo modal modal-tarefa...');
    abrirModal('modal-tarefa');
}

/**
 * Salvar tarefa (criar ou editar)
 */
export async function salvarTarefa(event) {
    if (event) event.preventDefault();

    // Proteção contra submissão duplicada
    if (isSavingTarefa) {
        console.warn('⚠️ Submissão já em andamento, ignorando duplicata');
        return;
    }

    const form = document.getElementById('form-tarefa');
    if (!form) return;

    const tarefaId = form.dataset.tarefaId;
    const isEdicao = !!tarefaId;

    // Ativar flag de proteção
    isSavingTarefa = true;

    // Coletar dados do formulário
    const dados = {
        titulo: document.getElementById('tarefa-titulo')?.value?.trim(),
        descricao: document.getElementById('tarefa-descricao')?.value?.trim(),
        status: document.getElementById('tarefa-status')?.value,
        prioridade: document.getElementById('tarefa-prioridade')?.value,
        usuario_responsavel_id: document.getElementById('tarefa-usuario-responsavel')?.value || null,
        obra_id: document.getElementById('tarefa-obra')?.value || null,
        empresa_id: document.getElementById('tarefa-empresa')?.value || null,
        data_prazo: document.getElementById('tarefa-prazo')?.value || null
    };

    // Validações
    if (!dados.titulo) {
        showNotification(MESSAGES.TAREFAS.ERROR.TITLE_REQUIRED, 'erro');
        isSavingTarefa = false;
        return;
    }

    if (dados.titulo.length < 3) {
        showNotification(MESSAGES.TAREFAS.ERROR.TITLE_MIN_LENGTH, 'erro');
        isSavingTarefa = false;
        return;
    }

    if (!dados.usuario_responsavel_id) {
        showNotification('Selecione um usuário responsável', 'erro');
        isSavingTarefa = false;
        return;
    }

    try {
        showLoading(isEdicao ? MESSAGES.LOADING.SAVING : 'Criando tarefa...');

        let response;
        if (isEdicao) {
            response = await TarefasAPI.atualizar(tarefaId, dados);
        } else {
            response = await TarefasAPI.criar(dados);
        }

        if (response.sucesso) {
            showNotification(
                isEdicao ? MESSAGES.TAREFAS.SUCCESS.UPDATED : MESSAGES.TAREFAS.SUCCESS.CREATED,
                'sucesso'
            );

            fecharModal('modal-tarefa');
            await carregarTarefas();
        } else {
            showNotification(response.mensagem || MESSAGES.ERROR.GENERIC, 'erro');
        }
    } catch (error) {
        console.error('Erro ao salvar tarefa:', error);
        showNotification(MESSAGES.ERROR.GENERIC, 'erro');
    } finally {
        hideLoading();
        // Resetar flag de proteção
        isSavingTarefa = false;
    }
}

/**
 * Abrir detalhes da tarefa em modal
 */
export async function abrirDetalhesTarefa(tarefaId) {
    const tarefa = tarefasActions.findById(tarefaId);
    if (!tarefa) {
        showNotification('Tarefa não encontrada', 'erro');
        return;
    }

    // Preencher modal com dados da tarefa
    const modalTitle = document.getElementById('detalhe-tarefa-titulo');
    const modalDescricao = document.getElementById('detalhe-tarefa-descricao');
    const modalStatus = document.getElementById('detalhe-tarefa-status');
    const modalPrioridade = document.getElementById('detalhe-tarefa-prioridade');
    const modalFuncionario = document.getElementById('detalhe-tarefa-funcionario');
    const modalObra = document.getElementById('detalhe-tarefa-obra');
    const modalEmpresa = document.getElementById('detalhe-tarefa-empresa');
    const modalPrazo = document.getElementById('detalhe-tarefa-prazo');
    const modalCriadoEm = document.getElementById('detalhe-tarefa-criado-em');

    if (modalTitle) modalTitle.textContent = tarefa.titulo;
    if (modalDescricao) modalDescricao.textContent = tarefa.descricao || 'Sem descrição';

    // Status
    if (modalStatus) {
        const statusConfig = TAREFAS_CONFIG.STATUS[tarefa.status.toUpperCase()];
        modalStatus.innerHTML = `
            <span class="badge" style="background: ${statusConfig?.color || '#666'}">
                ${statusConfig?.icon || ''} ${statusConfig?.label || tarefa.status}
            </span>
        `;
    }

    // Prioridade
    if (modalPrioridade) {
        const prioridadeConfig = TAREFAS_CONFIG.PRIORIDADE[tarefa.prioridade.toUpperCase()];
        modalPrioridade.innerHTML = `
            <span class="badge" style="background: ${prioridadeConfig?.color || '#666'}">
                ${prioridadeConfig?.label || tarefa.prioridade}
            </span>
        `;
    }

    if (modalFuncionario) modalFuncionario.textContent = tarefa.funcionario_nome || '-';
    if (modalObra) modalObra.textContent = tarefa.obra_nome || '-';
    if (modalEmpresa) modalEmpresa.textContent = tarefa.empresa_nome || '-';
    if (modalPrazo) modalPrazo.textContent = tarefa.data_prazo ? formatDate(tarefa.data_prazo) : '-';
    if (modalCriadoEm) modalCriadoEm.textContent = tarefa.criado_em ? formatDate(tarefa.criado_em) : '-';

    // Carregar comentários
    await carregarComentarios(tarefaId);

    // Configurar botões de ação
    const btnEditar = document.getElementById('btn-editar-tarefa');
    const btnExcluir = document.getElementById('btn-excluir-tarefa');

    if (btnEditar) {
        btnEditar.onclick = () => {
            fecharModal('modal-detalhe-tarefa');
            editarTarefa(tarefaId);
        };

        // Mostrar/ocultar baseado em permissões
        const podeEditar = verificarEhAdmin() ||
                          (temPermissao('tarefas', 'editar') && tarefa.funcionario_id == currentUsuario?.id);

        if (!podeEditar) {
            btnEditar.style.display = 'none';
        } else {
            btnEditar.style.display = 'inline-block';
        }
    }

    if (btnExcluir) {
        btnExcluir.onclick = () => excluirTarefa(tarefaId);

        // Mostrar/ocultar baseado em permissões
        const podeExcluir = verificarEhAdmin() ||
                           (temPermissao('tarefas', 'excluir') && tarefa.funcionario_id == currentUsuario?.id);

        if (!podeExcluir) {
            btnExcluir.style.display = 'none';
        } else {
            btnExcluir.style.display = 'inline-block';
        }
    }

    // Armazenar ID da tarefa no modal para uso posterior
    const modal = document.getElementById('modal-detalhe-tarefa');
    if (modal) modal.dataset.tarefaId = tarefaId;

    abrirModal('modal-detalhe-tarefa');
}

/**
 * Editar tarefa
 */
export function editarTarefa(tarefaId) {
    const tarefa = tarefasActions.findById(tarefaId);
    if (!tarefa) {
        showNotification('Tarefa não encontrada', 'erro');
        return;
    }

    // Verificar permissão de editar
    const podeEditar = verificarEhAdmin() ||
                      (temPermissao('tarefas', 'editar') && tarefa.funcionario_id == currentUsuario?.id);

    if (!podeEditar) {
        showNotification(MESSAGES.TAREFAS.ERROR.NO_PERMISSION, 'erro');
        return;
    }

    // Preencher formulário
    const form = document.getElementById('form-tarefa');
    if (form) {
        form.dataset.tarefaId = tarefaId;
    }

    const tituloInput = document.getElementById('tarefa-titulo');
    const descricaoInput = document.getElementById('tarefa-descricao');
    const statusSelect = document.getElementById('tarefa-status');
    const prioridadeSelect = document.getElementById('tarefa-prioridade');
    const funcionarioSelect = document.getElementById('tarefa-funcionario');
    const obraSelect = document.getElementById('tarefa-obra');
    const empresaSelect = document.getElementById('tarefa-empresa');
    const prazoInput = document.getElementById('tarefa-prazo');

    if (tituloInput) tituloInput.value = tarefa.titulo || '';
    if (descricaoInput) descricaoInput.value = tarefa.descricao || '';
    if (statusSelect) statusSelect.value = tarefa.status || 'novo';
    if (prioridadeSelect) prioridadeSelect.value = tarefa.prioridade || 'media';
    if (prazoInput) prazoInput.value = tarefa.data_prazo || '';

    // Preencher dropdowns
    preencherDropdownFuncionarios();
    preencherDropdownObras();
    preencherDropdownEmpresas();

    // Selecionar valores após popular dropdowns
    setTimeout(() => {
        if (funcionarioSelect) funcionarioSelect.value = tarefa.funcionario_id || '';
        if (obraSelect) obraSelect.value = tarefa.obra_id || '';
        if (empresaSelect) empresaSelect.value = tarefa.empresa_id || '';
    }, 100);

    // Atualizar título do modal
    const modalTitle = document.querySelector('#modal-tarefa .modal-title');
    if (modalTitle) modalTitle.textContent = 'Editar Tarefa';

    abrirModal('modal-tarefa');
}

/**
 * Excluir tarefa
 */
export async function excluirTarefa(tarefaId) {
    const tarefa = tarefasActions.findById(tarefaId);
    if (!tarefa) {
        showNotification('Tarefa não encontrada', 'erro');
        return;
    }

    // Verificar permissão de excluir
    const podeExcluir = verificarEhAdmin() ||
                       (temPermissao('tarefas', 'excluir') && tarefa.funcionario_id == currentUsuario?.id);

    if (!podeExcluir) {
        showNotification(MESSAGES.TAREFAS.ERROR.NO_PERMISSION, 'erro');
        return;
    }

    const confirmacao = confirm(`Tem certeza que deseja excluir a tarefa "${tarefa.titulo}"?`);
    if (!confirmacao) return;

    try {
        showLoading(MESSAGES.LOADING.DELETING);

        const response = await TarefasAPI.excluir(tarefaId);

        if (response.sucesso) {
            showNotification(MESSAGES.TAREFAS.SUCCESS.DELETED, 'sucesso');
            fecharModal('modal-detalhe-tarefa');
            await carregarTarefas();
        } else {
            showNotification(response.mensagem || MESSAGES.ERROR.GENERIC, 'erro');
        }
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        showNotification(MESSAGES.ERROR.GENERIC, 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Alterar status da tarefa (drag and drop)
 */
export async function alterarStatusTarefa(tarefaId, novoStatus) {
    try {
        const response = await TarefasAPI.atualizar(tarefaId, { status: novoStatus });

        if (response.sucesso) {
            showNotification(MESSAGES.TAREFAS.SUCCESS.STATUS_CHANGED, 'sucesso');

            // Atualizar no store
            tarefasActions.update(tarefaId, { status: novoStatus });

            // Re-renderizar
            renderizarKanban();
        } else {
            showNotification(response.mensagem || MESSAGES.ERROR.GENERIC, 'erro');
        }
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        showNotification(MESSAGES.ERROR.GENERIC, 'erro');
    }
}

/**
 * Carregar comentários de uma tarefa
 */
async function carregarComentarios(tarefaId) {
    try {
        const response = await ComentariosAPI.listar(tarefaId);

        if (response.sucesso) {
            comentariosActions.setForTarefa(tarefaId, response.dados || []);
            renderizarComentarios(tarefaId);
        }
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
    }
}

/**
 * Renderizar comentários no modal
 */
function renderizarComentarios(tarefaId) {
    const container = document.getElementById('tarefa-comentarios');
    if (!container) return;

    const comentarios = comentariosActions.getForTarefa(tarefaId);
    container.innerHTML = CommentThread({ comentarios, tarefaId });
}

/**
 * Adicionar comentário
 */
export async function adicionarComentario(tarefaId) {
    const textarea = document.getElementById('novo-comentario');
    if (!textarea) return;

    const comentario = textarea.value.trim();

    if (!comentario) {
        showNotification('Digite um comentário', 'erro');
        return;
    }

    try {
        showLoading('Adicionando comentário...');

        const response = await ComentariosAPI.criar({
            tarefa_id: tarefaId,
            comentario: comentario
        });

        if (response.sucesso) {
            showNotification(MESSAGES.TAREFAS.SUCCESS.COMMENT_ADDED, 'sucesso');

            // Limpar textarea
            textarea.value = '';

            // Recarregar comentários
            await carregarComentarios(tarefaId);
        } else {
            showNotification(response.mensagem || MESSAGES.ERROR.GENERIC, 'erro');
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showNotification(MESSAGES.ERROR.GENERIC, 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Filtrar por status
 */
export function filtrarPorStatus(status) {
    tarefasFiltersActions.update('status', status || null);
    renderizarKanban();
}

/**
 * Filtrar por prioridade
 */
export function filtrarPorPrioridade(prioridade) {
    tarefasFiltersActions.update('prioridade', prioridade || null);
    renderizarKanban();
}

/**
 * Filtrar por funcionário
 */
export function filtrarPorFuncionario(funcionarioId) {
    tarefasFiltersActions.update('funcionario', funcionarioId || null);
    renderizarKanban();
}

/**
 * Filtrar por obra
 */
export function filtrarPorObra(obraId) {
    tarefasFiltersActions.update('obra', obraId || null);
    renderizarKanban();
}

/**
 * Filtrar por empresa
 */
export function filtrarPorEmpresa(empresaId) {
    tarefasFiltersActions.update('empresa', empresaId || null);
    renderizarKanban();
}

/**
 * Filtrar por prazo
 */
export function filtrarPorPrazo(prazo) {
    tarefasFiltersActions.update('prazo', prazo || null);
    renderizarKanban();
}

/**
 * Limpar todos os filtros
 */
export function limparFiltrosTarefas() {
    tarefasFiltersActions.reset();
    renderizarFiltros();
    renderizarKanban();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Botão nova tarefa
    const btnNovaTarefa = document.getElementById('btn-nova-tarefa');
    if (btnNovaTarefa) {
        btnNovaTarefa.addEventListener('click', abrirFormularioNovaTarefa);
    }

    // Form submit
    const formTarefa = document.getElementById('form-tarefa');
    if (formTarefa) {
        formTarefa.addEventListener('submit', salvarTarefa);
    }
}

/**
 * Setup drag and drop
 */
function setupDragAndDrop() {
    window.handleTaskDragStart = (event, tarefaId) => {
        event.dataTransfer.setData('tarefaId', tarefaId);
        event.dataTransfer.effectAllowed = 'move';
        event.target.classList.add('dragging');
    };

    window.handleTaskDragEnd = (event) => {
        event.target.classList.remove('dragging');
    };

    window.handleKanbanDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    window.handleKanbanDrop = async (event, newStatus) => {
        event.preventDefault();

        const tarefaId = event.dataTransfer.getData('tarefaId');
        if (!tarefaId) return;

        // Verificar se mudou de status
        const tarefa = tarefasActions.findById(tarefaId);
        if (!tarefa || tarefa.status === newStatus) return;

        // Verificar permissão de editar
        const podeEditar = verificarEhAdmin() ||
                          (temPermissao('tarefas', 'editar') && tarefa.funcionario_id == currentUsuario?.id);

        if (!podeEditar) {
            showNotification(MESSAGES.TAREFAS.ERROR.NO_PERMISSION, 'erro');
            return;
        }

        // Alterar status
        await alterarStatusTarefa(tarefaId, newStatus);
    };
}

/**
 * Preencher dropdown de funcionários
 */
function preencherDropdownFuncionarios() {
    const select = document.getElementById('tarefa-funcionario');
    if (!select) return;

    const funcionarios = funcionariosActions.getAll();

    select.innerHTML = '<option value="">Selecione um funcionário...</option>';

    funcionarios.forEach(func => {
        const option = document.createElement('option');
        option.value = func.id;
        option.textContent = `${func.nome} - ${func.funcao || 'Sem função'}`;
        select.appendChild(option);
    });
}

/**
 * Preencher dropdown de usuários responsáveis
 */
function preencherDropdownUsuarios() {
    const select = document.getElementById('tarefa-usuario-responsavel');
    if (!select) return;

    const usuarios = usuariosActions.getAll();

    select.innerHTML = '<option value="">Selecione um usuário...</option>';

    usuarios
        .filter(usuario => usuario.ativo === 'Sim')
        .forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;

            // Generate initials for avatar display
            const initials = gerarAvatar(usuario.nome);
            const tipoLabel = usuario.tipo === 'admin' ? '👑 Admin' : '👤 Usuário';

            // Format: [XX] Nome (Tipo)
            option.textContent = `[${initials}] ${usuario.nome} (${tipoLabel})`;
            option.dataset.nome = usuario.nome;
            option.dataset.tipo = usuario.tipo;
            option.dataset.initials = initials;

            select.appendChild(option);
        });
}

/**
 * Preencher dropdown de obras
 */
function preencherDropdownObras() {
    const select = document.getElementById('tarefa-obra');
    if (!select) return;

    const obras = obrasActions.getAll();

    select.innerHTML = '<option value="">Nenhuma obra</option>';

    obras.forEach(obra => {
        const option = document.createElement('option');
        option.value = obra.id;
        option.textContent = obra.nome;
        select.appendChild(option);
    });
}

/**
 * Preencher dropdown de empresas
 */
function preencherDropdownEmpresas() {
    const select = document.getElementById('tarefa-empresa');
    if (!select) return;

    const empresas = empresasActions.getAll();

    select.innerHTML = '<option value="">Nenhuma empresa</option>';

    empresas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.id;
        option.textContent = empresa.nome;
        select.appendChild(option);
    });
}

// ========================================
// FUNÇÕES DO MODAL TRELLO
// ========================================

let currentTarefaId = null; // ID da tarefa aberta no modal
let todasEtiquetas = []; // Cache de etiquetas
let todosUsuarios = []; // Cache de usuários
let currentTarefaDados = null; // Cache da tarefa aberta
let descricaoOriginal = '';
let dataPrazoOriginal = null;

/**
 * Abrir modal Trello com detalhes da tarefa
 */
export async function abrirModalTrello(tarefaId) {
    currentTarefaId = tarefaId;
    const modal = document.getElementById('modal-tarefa-trello');

    if (!modal) {
        console.error('Modal Trello não encontrado');
        return;
    }

    showLoading('Carregando detalhes...');

    try {
        // Carregar tarefa
        const tarefa = tarefasActions.findById(tarefaId);
        if (!tarefa) {
            showNotification('Tarefa não encontrada', 'erro');
            return;
        }

        currentTarefaDados = tarefa;
        descricaoOriginal = tarefa.descricao || '';
        dataPrazoOriginal = tarefa.data_prazo || '';

        // Carregar dados em paralelo
        const [etiquetasResponse, checklistResponse, membrosResponse, anexosResponse, atividadesResponse, todasEtiquetasResponse, usuariosResponse, comentariosResponse] = await Promise.all([
            TarefasEtiquetasAPI.listar(tarefaId),
            ChecklistAPI.listar(tarefaId),
            MembrosAPI.listar(tarefaId),
            AnexosAPI.listar(tarefaId),
            AtividadesAPI.listar(tarefaId),
            EtiquetasAPI.listar(),
            UsuariosAPI.listar(),
            ComentariosAPI.listar(tarefaId)
        ]);

        // Armazenar cache
        todasEtiquetas = todasEtiquetasResponse.sucesso ? todasEtiquetasResponse.dados : [];
        todosUsuarios = usuariosResponse.sucesso ? usuariosResponse.dados : [];

        // Preencher modal
        document.getElementById('trello-tarefa-titulo').textContent = tarefa.titulo;

        const descricaoEl = document.getElementById('trello-tarefa-descricao');
        if (descricaoEl) {
            descricaoEl.innerHTML = descricaoOriginal;
            descricaoEl.addEventListener('input', syncDescricaoButtons);
        }

        const btnSalvarDescricao = document.getElementById('btn-salvar-descricao');
        if (btnSalvarDescricao) {
            btnSalvarDescricao.disabled = true;
        }

        // Detalhes na sidebar
        document.getElementById('trello-tarefa-status-text').textContent = tarefa.status || '-';
        document.getElementById('trello-tarefa-prioridade-text').textContent = tarefa.prioridade || '-';
        document.getElementById('trello-tarefa-responsavel-text').textContent = tarefa.usuario_responsavel_nome || '-';
        document.getElementById('trello-tarefa-prazo-text').textContent = tarefa.data_prazo ? formatDate(tarefa.data_prazo) : '-';
        document.getElementById('trello-tarefa-criado-text').textContent = tarefa.criado_em ? formatDate(tarefa.criado_em) : '-';

        // Renderizar seções
        renderizarEtiquetasTrello(etiquetasResponse.sucesso ? etiquetasResponse.dados : []);
        renderizarChecklistTrello(checklistResponse.sucesso ? checklistResponse.dados : checklistResponse);
        renderizarMembrosTrello(membrosResponse.sucesso ? membrosResponse.dados : []);
        renderizarAnexosTrello(anexosResponse.sucesso ? anexosResponse.dados : []);
        renderizarAtividadesTrello(atividadesResponse.sucesso ? atividadesResponse.dados.atividades : []);
        renderizarComentariosTrello(comentariosResponse.sucesso ? comentariosResponse.dados : []);

        // Mostrar modal
        modal.classList.add('show');

    } catch (error) {
        console.error('Erro ao abrir modal Trello:', error);
        showNotification('Erro ao carregar detalhes da tarefa', 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Fechar modal Trello
 */
export function fecharModalTrello() {
    const modal = document.getElementById('modal-tarefa-trello');
    if (modal) {
        modal.classList.remove('show');
    }
    currentTarefaId = null;

    // Recarregar tarefas para atualizar o board
    carregarTarefas();
}

/**
 * Renderizar seção de etiquetas
 */
function renderizarEtiquetasTrello(etiquetas) {
    const container = document.getElementById('trello-section-etiquetas');
    if (!container) return;

    container.innerHTML = EtiquetasSection({
        tarefaId: currentTarefaId,
        etiquetas,
        todasEtiquetas,
        cores: LABEL_COLORS
    });
}

/**
 * Renderizar seção de checklist
 */
function renderizarChecklistTrello(data) {
    const container = document.getElementById('trello-section-checklist');
    if (!container) return;

    const items = data.items || [];
    container.innerHTML = ChecklistSection({
        tarefaId: currentTarefaId,
        items
    });
}

/**
 * Renderizar seção de membros
 */
function renderizarMembrosTrello(membros) {
    const container = document.getElementById('trello-section-membros');
    if (!container) return;

    container.innerHTML = MembersSection({
        tarefaId: currentTarefaId,
        membros,
        todosUsuarios
    });
}

/**
 * Renderizar seção de anexos
 */
function renderizarAnexosTrello(anexos) {
    const container = document.getElementById('trello-section-anexos');
    if (!container) return;

    container.innerHTML = AttachmentsSection({
        tarefaId: currentTarefaId,
        anexos
    });
}

/**
 * Renderizar seção de atividades
 */
function renderizarAtividadesTrello(atividades) {
    const container = document.getElementById('trello-section-atividades');
    if (!container) return;

    container.innerHTML = ActivityTimeline({ atividades });
}

function renderizarComentariosTrello(comentarios) {
    const container = document.getElementById('trello-comentarios-container');
    if (!container) return;

    if (!comentarios || comentarios.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size: 14px;">Nenhum comentário ainda</p>';
        return;
    }

    const html = comentarios.map(c => {
        const autor = c.usuario_nome || c.autor || c.nome || 'Usuário';
        const texto = c.comentario || c.texto || '';
        const quando = c.criado_em || c.data_criacao || c.data || '';
        const avatar = c.usuario_avatar;
        const dataFormatada = quando ? formatDate(quando) : '';

        return `
            <div class="trello-comment-item">
                <div class="trello-comment-avatar">
                    ${avatar ? `<img src="${avatar}" alt="${autor}">` : gerarAvatar(autor)}
                </div>
                <div class="trello-comment-body">
                    <div class="trello-comment-header">
                        <span class="trello-comment-author">${autor}</span>
                        ${dataFormatada ? `<span class="trello-comment-date">${dataFormatada}</span>` : ''}
                    </div>
                    <div class="trello-comment-text">${texto}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function carregarComentariosTrello() {
    try {
        const response = await ComentariosAPI.listar(currentTarefaId);
        if (response.sucesso) {
            renderizarComentariosTrello(response.dados || []);
        }
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
    }
}

// ========================================
// FUNÇÕES DE ETIQUETAS
// ========================================

window.mostrarSeletorEtiquetas = function() {
    const panel = document.getElementById('trello-labels-panel');
    if (panel) panel.classList.remove('hidden');
};

window.cancelarSeletorEtiquetas = function() {
    const panel = document.getElementById('trello-labels-panel');
    if (panel) panel.classList.add('hidden');
};

window.filtrarEtiquetasTrello = function(term) {
    filtroEtiquetasTerm = (term || '').toLowerCase();
    const list = document.getElementById('trello-labels-list');
    if (!list) return;
    const rows = list.querySelectorAll('.trello-label-row');
    rows.forEach(row => {
        const nome = row.dataset.nome || '';
        row.style.display = nome.includes(filtroEtiquetasTerm) ? 'grid' : 'none';
    });
};

window.abrirCriarEtiqueta = function() {
    etiquetaEmEdicao = null;
    etiquetaCorSelecionada = LABEL_COLORS[0];
    const editor = document.getElementById('trello-label-editor');
    const inputNome = document.getElementById('trello-label-nome');
    if (inputNome) inputNome.value = '';
    document.querySelectorAll('.trello-label-color').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === etiquetaCorSelecionada);
    });
    if (editor) editor.classList.remove('hidden');
};

window.selecionarCorEtiqueta = function(cor, btn) {
    etiquetaCorSelecionada = cor;
    document.querySelectorAll('.trello-label-color').forEach(el => el.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
};

window.editarEtiquetaTrello = function(etiquetaId) {
    const etiqueta = (todasEtiquetas || []).find(e => Number(e.id) === Number(etiquetaId));
    if (!etiqueta) return;
    etiquetaEmEdicao = etiquetaId;
    etiquetaCorSelecionada = etiqueta.cor;
    const editor = document.getElementById('trello-label-editor');
    const inputNome = document.getElementById('trello-label-nome');
    if (inputNome) inputNome.value = etiqueta.nome;
    document.querySelectorAll('.trello-label-color').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === etiquetaCorSelecionada);
    });
    if (editor) editor.classList.remove('hidden');
};

window.cancelarEdicaoEtiqueta = function() {
    const editor = document.getElementById('trello-label-editor');
    if (editor) editor.classList.add('hidden');
    etiquetaEmEdicao = null;
};

window.salvarEtiquetaTrello = async function() {
    const nomeInput = document.getElementById('trello-label-nome');
    const nome = nomeInput?.value?.trim();
    if (!nome) {
        showNotification('Informe um nome para a etiqueta', 'erro');
        return;
    }

    const payload = { nome, cor: etiquetaCorSelecionada };

    try {
        showLoading(etiquetaEmEdicao ? 'Atualizando etiqueta...' : 'Criando etiqueta...');
        const response = etiquetaEmEdicao
            ? await EtiquetasAPI.atualizar(etiquetaEmEdicao, payload)
            : await EtiquetasAPI.criar(payload);

        if (response.sucesso) {
            showNotification('Etiqueta salva', 'sucesso');
            const todasEtiquetasResponse = await EtiquetasAPI.listar();
            todasEtiquetas = todasEtiquetasResponse.sucesso ? todasEtiquetasResponse.dados : todasEtiquetas;
            const etiquetasResponse = await TarefasEtiquetasAPI.listar(currentTarefaId);
            renderizarEtiquetasTrello(etiquetasResponse.sucesso ? etiquetasResponse.dados : []);
            cancelarEdicaoEtiqueta();
        } else {
            showNotification(response.mensagem || 'Erro ao salvar etiqueta', 'erro');
        }
    } catch (error) {
        console.error('Erro ao salvar etiqueta:', error);
        showNotification('Erro ao salvar etiqueta', 'erro');
    } finally {
        hideLoading();
    }
};

window.excluirEtiquetaTrello = async function() {
    if (!etiquetaEmEdicao) {
        showNotification('Selecione uma etiqueta para excluir', 'erro');
        return;
    }

    if (!confirm('Excluir esta etiqueta?')) return;

    try {
        showLoading('Excluindo etiqueta...');
        const response = await EtiquetasAPI.excluir(etiquetaEmEdicao);
        if (response.sucesso) {
            showNotification('Etiqueta excluída', 'sucesso');
            const todasEtiquetasResponse = await EtiquetasAPI.listar();
            todasEtiquetas = todasEtiquetasResponse.sucesso ? todasEtiquetasResponse.dados : todasEtiquetas;
            const etiquetasResponse = await TarefasEtiquetasAPI.listar(currentTarefaId);
            renderizarEtiquetasTrello(etiquetasResponse.sucesso ? etiquetasResponse.dados : []);
            cancelarEdicaoEtiqueta();
        } else {
            showNotification(response.mensagem || 'Erro ao excluir etiqueta', 'erro');
        }
    } catch (error) {
        console.error('Erro ao excluir etiqueta:', error);
        showNotification('Erro ao excluir etiqueta', 'erro');
    } finally {
        hideLoading();
    }
};

window.toggleEtiquetaTarefa = async function(etiquetaId, checkbox) {
    const marcado = checkbox.checked;
    const associacaoId = checkbox.dataset.associacaoId;

    if (marcado) {
        try {
            showLoading('Adicionando etiqueta...');
            const response = await TarefasEtiquetasAPI.adicionar({
                tarefa_id: currentTarefaId,
                etiqueta_id: etiquetaId
            });

            if (response.sucesso) {
                showNotification('Etiqueta adicionada', 'sucesso');
                const etiquetasResponse = await TarefasEtiquetasAPI.listar(currentTarefaId);
                renderizarEtiquetasTrello(etiquetasResponse.sucesso ? etiquetasResponse.dados : []);
            } else {
                showNotification(response.mensagem || 'Erro ao adicionar etiqueta', 'erro');
                checkbox.checked = false;
            }
        } catch (error) {
            console.error('Erro ao adicionar etiqueta:', error);
            showNotification('Erro ao adicionar etiqueta', 'erro');
            checkbox.checked = false;
        } finally {
            hideLoading();
        }
    } else {
        // remover
        const idParaRemover = associacaoId || etiquetaId;
        try {
            showLoading('Removendo etiqueta...');
            const response = await TarefasEtiquetasAPI.remover(idParaRemover);
            if (response.sucesso) {
                showNotification('Etiqueta removida', 'sucesso');
                const etiquetasResponse = await TarefasEtiquetasAPI.listar(currentTarefaId);
                renderizarEtiquetasTrello(etiquetasResponse.sucesso ? etiquetasResponse.dados : []);
            } else {
                showNotification(response.mensagem || 'Erro ao remover etiqueta', 'erro');
                checkbox.checked = true;
            }
        } catch (error) {
            console.error('Erro ao remover etiqueta:', error);
            showNotification('Erro ao remover etiqueta', 'erro');
            checkbox.checked = true;
        } finally {
            hideLoading();
        }
    }
};

// ========================================
// FUNÇÕES DE CHECKLIST
// ========================================

window.mostrarFormNovoItemChecklist = function() {
    const form = document.getElementById(`form-novo-item-${currentTarefaId}`);
    if (form) {
        form.classList.remove('hidden');
        document.getElementById(`input-novo-item-${currentTarefaId}`)?.focus();
    }
};

window.cancelarNovoItemChecklist = function() {
    const form = document.getElementById(`form-novo-item-${currentTarefaId}`);
    if (form) {
        form.classList.add('hidden');
        document.getElementById(`input-novo-item-${currentTarefaId}`).value = '';
    }
};

window.adicionarItemChecklist = async function() {
    const input = document.getElementById(`input-novo-item-${currentTarefaId}`);
    const titulo = input?.value?.trim();

    if (!titulo) {
        showNotification('Digite o título do item', 'erro');
        return;
    }

    try {
        showLoading('Adicionando item...');
        const response = await ChecklistAPI.criar({
            tarefa_id: currentTarefaId,
            titulo
        });

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            // Recarregar checklist
            const checklistResponse = await ChecklistAPI.listar(currentTarefaId);
            renderizarChecklistTrello(checklistResponse.sucesso ? checklistResponse.dados : checklistResponse);
            cancelarNovoItemChecklist();
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        showNotification('Erro ao adicionar item', 'erro');
    } finally {
        hideLoading();
    }
};

window.toggleChecklistItem = async function(itemId) {
    try {
        // Obter estado atual do checkbox
        const checkbox = event.target;
        const concluido = checkbox.checked;

        const response = await ChecklistAPI.atualizar(itemId, { concluido });

        if (response.sucesso) {
            // Recarregar checklist
            const checklistResponse = await ChecklistAPI.listar(currentTarefaId);
            renderizarChecklistTrello(checklistResponse.sucesso ? checklistResponse.dados : checklistResponse);
        } else {
            showNotification(response.mensagem, 'erro');
            checkbox.checked = !concluido; // Reverter
        }
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        showNotification('Erro ao atualizar item', 'erro');
    }
};

window.excluirChecklistItem = async function(itemId) {
    if (!confirm('Excluir este item?')) return;

    try {
        showLoading('Excluindo item...');
        const response = await ChecklistAPI.excluir(itemId);

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            // Recarregar checklist
            const checklistResponse = await ChecklistAPI.listar(currentTarefaId);
            renderizarChecklistTrello(checklistResponse.sucesso ? checklistResponse.dados : checklistResponse);
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showNotification('Erro ao excluir item', 'erro');
    } finally {
        hideLoading();
    }
};

// ========================================
// FUNÇÕES DE MEMBROS
// ========================================

window.mostrarSeletorMembros = function() {
    const selector = document.getElementById(`selector-membros-${currentTarefaId}`);
    if (selector) selector.classList.remove('hidden');
};

window.cancelarSeletorMembros = function() {
    const selector = document.getElementById(`selector-membros-${currentTarefaId}`);
    if (selector) selector.classList.add('hidden');
};

window.adicionarMembro = async function() {
    const selectUsuario = document.getElementById(`select-membro-${currentTarefaId}`);
    const selectPapel = document.getElementById(`select-papel-${currentTarefaId}`);

    const usuarioId = selectUsuario?.value;
    const papel = selectPapel?.value;

    if (!usuarioId) {
        showNotification('Selecione um usuário', 'erro');
        return;
    }

    try {
        showLoading('Adicionando membro...');
        const response = await MembrosAPI.adicionar({
            tarefa_id: currentTarefaId,
            usuario_id: usuarioId,
            papel
        });

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            // Recarregar membros
            const membrosResponse = await MembrosAPI.listar(currentTarefaId);
            renderizarMembrosTrello(membrosResponse.sucesso ? membrosResponse.dados : []);
            cancelarSeletorMembros();
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao adicionar membro:', error);
        showNotification('Erro ao adicionar membro', 'erro');
    } finally {
        hideLoading();
    }
};

window.removerMembro = async function(membroId) {
    if (!confirm('Remover este membro?')) return;

    try {
        showLoading('Removendo membro...');
        const response = await MembrosAPI.remover(membroId);

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            // Recarregar membros
            const membrosResponse = await MembrosAPI.listar(currentTarefaId);
            renderizarMembrosTrello(membrosResponse.sucesso ? membrosResponse.dados : []);
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao remover membro:', error);
        showNotification('Erro ao remover membro', 'erro');
    } finally {
        hideLoading();
    }
};

// ========================================
// FUNÇÕES DE ANEXOS
// ========================================

window.mostrarFormUploadAnexo = function() {
    const form = document.getElementById(`form-upload-${currentTarefaId}`);
    if (form) form.classList.remove('hidden');
};

window.cancelarUploadAnexo = function() {
    const form = document.getElementById(`form-upload-${currentTarefaId}`);
    if (form) {
        form.classList.add('hidden');
        document.getElementById(`input-arquivo-${currentTarefaId}`).value = '';
    }
};

window.uploadAnexo = async function() {
    const input = document.getElementById(`input-arquivo-${currentTarefaId}`);
    const arquivo = input?.files[0];

    if (!arquivo) {
        showNotification('Selecione um arquivo', 'erro');
        return;
    }

    try {
        showLoading('Fazendo upload...');
        const response = await AnexosAPI.upload(currentTarefaId, arquivo);

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            // Recarregar anexos
            const anexosResponse = await AnexosAPI.listar(currentTarefaId);
            renderizarAnexosTrello(anexosResponse.sucesso ? anexosResponse.dados : []);
            cancelarUploadAnexo();
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        showNotification('Erro ao fazer upload', 'erro');
    } finally {
        hideLoading();
    }
};

window.excluirAnexo = async function(anexoId) {
    if (!confirm('Excluir este anexo?')) return;

    try {
        showLoading('Excluindo anexo...');
        const response = await AnexosAPI.excluir(anexoId);

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            // Recarregar anexos
            const anexosResponse = await AnexosAPI.listar(currentTarefaId);
            renderizarAnexosTrello(anexosResponse.sucesso ? anexosResponse.dados : []);
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao excluir anexo:', error);
        showNotification('Erro ao excluir anexo', 'erro');
    } finally {
        hideLoading();
    }
};

window.verImagemAnexo = function(url) {
    window.open(url, '_blank');
};

// ========================================
// FUNÇÕES DE AÇÕES
// ========================================

window.editarTarefaTrello = function() {
    fecharModalTrello();
    editarTarefa(currentTarefaId);
};

window.excluirTarefaTrello = async function() {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
        showLoading('Excluindo tarefa...');
        const response = await TarefasAPI.excluir(currentTarefaId);

        if (response.sucesso) {
            showNotification(response.mensagem, 'sucesso');
            fecharModalTrello();
        } else {
            showNotification(response.mensagem, 'erro');
        }
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        showNotification('Erro ao excluir tarefa', 'erro');
    } finally {
        hideLoading();
    }
};

// ========================================
// AÇÕES TRELLO (mover, copiar, comentar, criar em coluna)
// ========================================

const STATUS_MAP = {
    'Pendente': 'novo',
    'Em Progresso': 'em_andamento',
    'Concluído': 'concluido',
    'Cancelado': 'cancelado'
};

const LABEL_COLORS = ['#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563'];
let etiquetaEmEdicao = null;
let etiquetaCorSelecionada = LABEL_COLORS[0];
let filtroEtiquetasTerm = '';

function mapStatusLabelToCode(labelOuCode) {
    // Se já for um dos códigos, retorna direto
    const lower = (labelOuCode || '').toLowerCase();
    const codes = ['novo', 'em_andamento', 'concluido', 'cancelado'];
    if (codes.includes(lower)) return lower;
    return STATUS_MAP[labelOuCode] || 'novo';
}

window.novaTarefaNaColuna = function(statusLabel) {
    const statusCode = mapStatusLabelToCode(statusLabel);
    abrirFormularioNovaTarefa();
    const statusSelect = document.getElementById('tarefa-status');
    if (statusSelect) statusSelect.value = statusCode;
};

window.moverTarefaTrello = async function(novoStatusOpcional) {
    const select = document.getElementById('trello-mover-status');
    const statusSelecionado = novoStatusOpcional || select?.value;
    const novoStatus = mapStatusLabelToCode(statusSelecionado);

    if (!novoStatus) {
        showNotification('Selecione o status de destino', 'erro');
        return;
    }

    try {
        showLoading('Movendo tarefa...');
        const response = await TarefasAPI.atualizar(currentTarefaId, { status: novoStatus });
        if (response.sucesso) {
            showNotification('Tarefa movida', 'sucesso');
            await carregarTarefas();
            await abrirModalTrello(currentTarefaId); // reidrata modal
        } else {
            showNotification(response.mensagem || 'Erro ao mover tarefa', 'erro');
        }
    } catch (error) {
        console.error('Erro ao mover tarefa:', error);
        showNotification('Erro ao mover tarefa', 'erro');
    } finally {
        hideLoading();
    }
};

window.copiarTarefaTrello = async function() {
    const tarefa = tarefasActions.findById(currentTarefaId);
    if (!tarefa) {
        showNotification('Tarefa não encontrada', 'erro');
        return;
    }

    const payload = {
        titulo: `${tarefa.titulo} (cópia)`,
        descricao: tarefa.descricao || '',
        status: 'novo',
        prioridade: tarefa.prioridade || 'media',
        funcionario_id: tarefa.funcionario_id || null,
        usuario_responsavel_id: tarefa.usuario_responsavel_id || null,
        obra_id: tarefa.obra_id || null,
        empresa_id: tarefa.empresa_id || null,
        data_prazo: tarefa.data_prazo || null
    };

    try {
        showLoading('Copiando tarefa...');
        const response = await TarefasAPI.criar(payload);
        if (response.sucesso) {
            showNotification('Tarefa copiada', 'sucesso');
            await carregarTarefas();
        } else {
            showNotification(response.mensagem || 'Erro ao copiar tarefa', 'erro');
        }
    } catch (error) {
        console.error('Erro ao copiar tarefa:', error);
        showNotification('Erro ao copiar tarefa', 'erro');
    } finally {
        hideLoading();
    }
};

window.adicionarComentarioTrello = async function() {
    const textarea = document.getElementById('trello-novo-comentario') || document.getElementById('novo-comentario');
    if (!textarea) return;

    const comentario = textarea.value.trim();
    if (!comentario) {
        showNotification('Digite um comentário', 'erro');
        return;
    }

    try {
        showLoading('Adicionando comentário...');
        const response = await ComentariosAPI.criar({
            tarefa_id: currentTarefaId,
            comentario
        });

        if (response.sucesso) {
            showNotification('Comentário adicionado', 'sucesso');
            textarea.value = '';
            await carregarComentariosTrello();
        } else {
            showNotification(response.mensagem || 'Erro ao adicionar comentário', 'erro');
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showNotification('Erro ao adicionar comentário', 'erro');
    } finally {
        hideLoading();
    }
};

function syncDescricaoButtons() {
    const editor = document.getElementById('trello-tarefa-descricao');
    const btnSalvar = document.getElementById('btn-salvar-descricao');
    if (!editor || !btnSalvar) return;
    const atual = (editor.innerHTML || '').trim();
    const original = (descricaoOriginal || '').trim();
    btnSalvar.disabled = atual === original;
}

window.salvarDescricaoTrello = async function() {
    const editor = document.getElementById('trello-tarefa-descricao');
    if (!editor) return;

    const novaDescricao = (editor.innerHTML || '').trim();

    try {
        showLoading('Salvando descrição...');
        const response = await TarefasAPI.atualizar(currentTarefaId, { descricao: novaDescricao });
        if (response.sucesso) {
            showNotification('Descrição salva', 'sucesso');
            descricaoOriginal = novaDescricao;
            if (currentTarefaDados) currentTarefaDados.descricao = novaDescricao;
            tarefasActions.update(currentTarefaId, { descricao: novaDescricao });
            syncDescricaoButtons();
        } else {
            showNotification(response.mensagem || 'Erro ao salvar descrição', 'erro');
        }
    } catch (error) {
        console.error('Erro ao salvar descrição:', error);
        showNotification('Erro ao salvar descrição', 'erro');
    } finally {
        hideLoading();
    }
};

window.cancelarEdicaoDescricao = function() {
    const editor = document.getElementById('trello-tarefa-descricao');
    if (editor) {
        editor.innerHTML = descricaoOriginal;
        syncDescricaoButtons();
    }
};

window.mostrarSeletorData = function() {
    const picker = document.getElementById('trello-date-picker');
    if (!picker) return;
    const input = document.getElementById('trello-date-input');
    if (input) {
        input.value = dataPrazoOriginal || '';
    }
    picker.classList.remove('hidden');
};

window.cancelarSeletorData = function() {
    const picker = document.getElementById('trello-date-picker');
    if (picker) picker.classList.add('hidden');
};

async function atualizarPrazoTrello(novoPrazo) {
    try {
        showLoading('Atualizando prazo...');
        const response = await TarefasAPI.atualizar(currentTarefaId, { data_prazo: novoPrazo });
        if (response.sucesso) {
            showNotification('Prazo atualizado', 'sucesso');
            dataPrazoOriginal = novoPrazo || '';
            if (currentTarefaDados) currentTarefaDados.data_prazo = novoPrazo || null;
            tarefasActions.update(currentTarefaId, { data_prazo: novoPrazo || null });
            const prazoText = document.getElementById('trello-tarefa-prazo-text');
            if (prazoText) prazoText.textContent = novoPrazo ? formatDate(novoPrazo) : '-';
            cancelarSeletorData();
        } else {
            showNotification(response.mensagem || 'Erro ao atualizar data', 'erro');
        }
    } catch (error) {
        console.error('Erro ao atualizar prazo:', error);
        showNotification('Erro ao atualizar data', 'erro');
    } finally {
        hideLoading();
    }
}

window.salvarDataTrello = async function() {
    const input = document.getElementById('trello-date-input');
    const valor = input?.value || null;
    await atualizarPrazoTrello(valor);
};

window.limparDataTrello = async function() {
    await atualizarPrazoTrello(null);
};

// Exportar funções para window (onclick compatibility)
if (typeof window !== 'undefined') {
    window.abrirFormularioNovaTarefa = abrirFormularioNovaTarefa;
    window.abrirDetalhesTarefa = abrirModalTrello; // Usar modal Trello por padrão
    window.abrirModalTrello = abrirModalTrello;
    window.fecharModalTrello = fecharModalTrello;
    window.editarTarefa = editarTarefa;
    window.excluirTarefa = excluirTarefa;
    window.salvarTarefa = salvarTarefa;
    window.adicionarComentario = adicionarComentario;
    window.filtrarPorStatus = filtrarPorStatus;
    window.filtrarPorPrioridade = filtrarPorPrioridade;
    window.filtrarPorFuncionario = filtrarPorFuncionario;
    window.filtrarPorObra = filtrarPorObra;
    window.filtrarPorEmpresa = filtrarPorEmpresa;
    window.filtrarPorPrazo = filtrarPorPrazo;
    window.limparFiltrosTarefas = limparFiltrosTarefas;
}
