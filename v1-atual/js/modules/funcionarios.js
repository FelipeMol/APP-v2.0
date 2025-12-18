// ========================================
// FUNCIONARIOS.JS - Módulo de funcionários com botões bonitos
// ========================================

import { FuncionariosAPI } from './api.js';
import { funcionariosActions, empresasActions } from './store.js';
import { showNotification, showLoading, hideLoading, abrirModalEdicao, fecharModalEdicao } from './ui.js';

/**
 * Inicializar módulo de funcionários
 */
export async function initFuncionarios() {
    console.log('👥 Inicializando módulo de funcionários...');
    await carregarFuncionarios();
    setupEventListeners();
    console.log('✅ Módulo de funcionários inicializado');
}

/**
 * Carregar funcionários da API
 */
export async function carregarFuncionarios() {
    try {
        showLoading('Carregando funcionários...');
        const response = await FuncionariosAPI.listar();

        if (response.sucesso) {
            const dados = response.dados || [];
            funcionariosActions.set(dados);
            renderizarFuncionarios();
            console.log(`✅ ${dados.length} funcionários carregados`);
        } else {
            showNotification(response.mensagem || 'Erro ao carregar funcionários', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar funcionários:', error);
        showNotification('Erro ao carregar funcionários', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Renderizar tabela de funcionários
 */
export function renderizarFuncionarios() {
    console.log('📊 Atualizando tabela de funcionários...');
    const tbody = document.getElementById('tabela-funcionarios');
    if (!tbody) return;

    const funcionarios = funcionariosActions.getAll();

    if (funcionarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum funcionário cadastrado</td></tr>';
        return;
    }

    tbody.innerHTML = funcionarios.map(func => `
        <tr>
            <td>${func.nome}</td>
            <td>${func.funcao || '-'}</td>
            <td>${func.empresa || 'Sem empresa'}</td>
            <td>
                <span class="badge ${func.situacao === 'Ativo' ? 'badge-active' : 'badge-inactive'}">
                    ${func.situacao || 'Ativo'}
                </span>
            </td>
            <td>
                <button onclick="editarFuncionario(${func.id})" class="btn-icon-table btn-edit" title="Editar">
                    ✏️
                </button>
                <button onclick="excluirFuncionario(${func.id})" class="btn-icon-table btn-delete" title="Excluir">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('form-funcionario');
    if (form) {
        form.addEventListener('submit', handleSubmitFuncionario);
    }
}

/**
 * Manipular submissão do formulário
 */
async function handleSubmitFuncionario(e) {
    e.preventDefault();

    const form = e.target;
    const isEditing = form.dataset.isEditing === 'true';
    const funcId = form.dataset.funcId;

    const dados = {
        nome: document.getElementById('funcionario-nome').value.trim(),
        funcao: document.getElementById('funcionario-funcao').value.trim(),
        empresa: document.getElementById('funcionario-empresa').value,
        situacao: document.getElementById('funcionario-situacao')?.value || 'Ativo'
    };

    if (!dados.nome) {
        showNotification('Nome do funcionário é obrigatório!', 'warning');
        return;
    }

    if (isEditing && funcId) {
        await salvarEdicaoFuncionario(funcId, dados);
    } else {
        try {
            showLoading('Salvando funcionário...');
            const response = await FuncionariosAPI.criar(dados);

            if (response.sucesso) {
                showNotification('Funcionário adicionado com sucesso!', 'success');
                form.reset();
                await carregarFuncionarios();
            } else {
                showNotification(response.mensagem || 'Erro ao salvar funcionário', 'error');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar funcionário:', error);
            showNotification('Erro de conexão. Tente novamente.', 'error');
        } finally {
            hideLoading();
        }
    }
}

/**
 * Editar funcionário
 */
export function editarFuncionario(id) {
    console.log('✏️ Abrindo modal para editar funcionário:', id);

    const func = funcionariosActions.findById(id);
    if (!func) {
        showNotification('Funcionário não encontrado', 'error');
        return;
    }

    // Preencher modal com dados do funcionário
    document.getElementById('edit-funcionario-id').value = func.id;
    document.getElementById('edit-funcionario-nome').value = func.nome || '';
    document.getElementById('edit-funcionario-funcao').value = func.funcao || '';
    document.getElementById('edit-funcionario-situacao').value = func.situacao || 'Ativo';

    // Popular dropdown de empresas no modal
    const selectEmpresa = document.getElementById('edit-funcionario-empresa');
    selectEmpresa.innerHTML = '<option value="">Selecione...</option>';
    const empresas = empresasActions.getAll();
    empresas.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.nome;
        option.textContent = emp.nome;
        if (emp.nome === func.empresa) {
            option.selected = true;
        }
        selectEmpresa.appendChild(option);
    });

    // Abrir modal
    abrirModalEdicao('modal-editar-funcionario');
}

/**
 * Fechar modal de edição de funcionário
 */
export function fecharModalFuncionario() {
    fecharModalEdicao('modal-editar-funcionario');
}

/**
 * Salvar edição de funcionário - CHAMADA PELO MODAL
 */
export async function salvarEdicaoFuncionario(event) {
    event.preventDefault();

    const id = document.getElementById('edit-funcionario-id').value;
    const nome = document.getElementById('edit-funcionario-nome').value.trim();
    const funcao = document.getElementById('edit-funcionario-funcao').value.trim();
    const empresa = document.getElementById('edit-funcionario-empresa').value;
    const situacao = document.getElementById('edit-funcionario-situacao').value;

    if (!nome) {
        showNotification('Nome é obrigatório', 'error');
        return;
    }

    try {
        showLoading('Atualizando funcionário...');
        const response = await FuncionariosAPI.atualizar(id, { nome, funcao, empresa, situacao });

        if (response.sucesso) {
            showNotification('Funcionário atualizado com sucesso! ✅', 'success');
            fecharModalFuncionario();
            await carregarFuncionarios();
        } else {
            showNotification(response.mensagem || 'Erro ao atualizar funcionário', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar funcionário:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Excluir funcionário
 */
export async function excluirFuncionario(id) {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) {
        return;
    }

    try {
        showLoading('Excluindo funcionário...');
        const response = await FuncionariosAPI.excluir(id);

        if (response.sucesso) {
            showNotification('Funcionário excluído com sucesso!', 'success');
            await carregarFuncionarios();
        } else {
            showNotification(response.mensagem || 'Erro ao excluir funcionário', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao excluir funcionário:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Exportar funções para window (compatibilidade onclick)
if (typeof window !== 'undefined') {
    window.editarFuncionario = editarFuncionario;
    window.excluirFuncionario = excluirFuncionario;
    window.fecharModalFuncionario = fecharModalFuncionario;
    window.salvarEdicaoFuncionario = salvarEdicaoFuncionario;
}
