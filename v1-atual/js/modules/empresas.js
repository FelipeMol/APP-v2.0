// ========================================
// EMPRESAS.JS - Módulo de empresas com botões bonitos
// ========================================

import { EmpresasAPI } from './api.js';
import { empresasActions } from './store.js';
import { showNotification, showLoading, hideLoading, abrirModalEdicao, fecharModalEdicao } from './ui.js';

/**
 * Inicializar módulo de empresas
 */
export async function initEmpresas() {
    console.log('🏢 Inicializando módulo de empresas...');
    await carregarEmpresas();
    setupEventListeners();
    console.log('✅ Módulo de empresas inicializado');
}

/**
 * Carregar empresas da API
 */
export async function carregarEmpresas() {
    try {
        showLoading('Carregando empresas...');
        const response = await EmpresasAPI.listar();

        if (response.sucesso) {
            const dados = response.dados || [];
            empresasActions.set(dados);
            renderizarEmpresas();
            console.log(`✅ ${dados.length} empresas carregadas`);
        } else {
            showNotification(response.mensagem || 'Erro ao carregar empresas', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar empresas:', error);
        showNotification('Erro ao carregar empresas', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Renderizar tabela de empresas
 */
export function renderizarEmpresas() {
    console.log('📊 Atualizando tabela de empresas...');
    const tbody = document.getElementById('tabela-empresas');
    if (!tbody) return;

    const empresas = empresasActions.getAll();

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
                <button onclick="editarEmpresa(${empresa.id})" class="btn-icon-table btn-edit" title="Editar">
                    ✏️
                </button>
                <button onclick="excluirEmpresa(${empresa.id})" class="btn-icon-table btn-delete" title="Excluir">
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
    const form = document.getElementById('form-empresa');
    if (form) {
        form.addEventListener('submit', handleSubmitEmpresa);
    }
}

/**
 * Manipular submissão do formulário
 */
async function handleSubmitEmpresa(e) {
    e.preventDefault();

    const form = e.target;
    const isEditing = form.dataset.isEditing === 'true';
    const empresaId = form.dataset.empresaId;

    const dados = {
        nome: document.getElementById('empresa-nome').value.trim(),
        cnpj: document.getElementById('empresa-cnpj').value.trim(),
        tipo: document.getElementById('empresa-tipo').value
    };

    if (!dados.nome) {
        showNotification('Nome da empresa é obrigatório!', 'warning');
        return;
    }

    if (isEditing && empresaId) {
        await salvarEdicaoEmpresa(empresaId, dados);
    } else {
        try {
            showLoading('Salvando empresa...');
            const response = await EmpresasAPI.criar(dados);

            if (response.sucesso) {
                showNotification('Empresa adicionada com sucesso!', 'success');
                form.reset();
                await carregarEmpresas();
            } else {
                showNotification(response.mensagem || 'Erro ao salvar empresa', 'error');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar empresa:', error);
            showNotification('Erro de conexão. Tente novamente.', 'error');
        } finally {
            hideLoading();
        }
    }
}

/**
 * Editar empresa - ABRE MODAL DE EDIÇÃO
 */
export async function editarEmpresa(id) {
    console.log('✏️ Abrindo modal para editar empresa:', id);

    const empresa = empresasActions.findById(id);
    if (!empresa) {
        showNotification('Empresa não encontrada', 'error');
        return;
    }

    // Preencher modal com dados da empresa
    document.getElementById('edit-empresa-id').value = empresa.id;
    document.getElementById('edit-empresa-nome').value = empresa.nome || '';
    document.getElementById('edit-empresa-cnpj').value = empresa.cnpj || '';
    document.getElementById('edit-empresa-tipo').value = empresa.tipo || 'Construtora';

    // Abrir modal
    abrirModalEdicao('modal-editar-empresa');
}

/**
 * Fechar modal de edição de empresa
 */
export function fecharModalEmpresa() {
    fecharModalEdicao('modal-editar-empresa');
}

/**
 * Salvar edição de empresa - CHAMADA PELO MODAL
 */
export async function salvarEdicaoEmpresa(event) {
    event.preventDefault();

    const id = document.getElementById('edit-empresa-id').value;
    const nome = document.getElementById('edit-empresa-nome').value.trim();
    const cnpj = document.getElementById('edit-empresa-cnpj').value.trim();
    const tipo = document.getElementById('edit-empresa-tipo').value;

    if (!nome) {
        showNotification('Nome é obrigatório', 'error');
        return;
    }

    try {
        showLoading('Atualizando empresa...');
        const response = await EmpresasAPI.atualizar(id, { nome, cnpj, tipo });

        if (response.sucesso) {
            showNotification('Empresa atualizada com sucesso! ✅', 'success');
            fecharModalEmpresa();
            await carregarEmpresas();
        } else {
            showNotification(response.mensagem || 'Erro ao atualizar empresa', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar empresa:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Excluir empresa
 */
export async function excluirEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) {
        return;
    }

    try {
        showLoading('Excluindo empresa...');
        const response = await EmpresasAPI.excluir(id);

        if (response.sucesso) {
            showNotification('Empresa excluída com sucesso!', 'success');
            await carregarEmpresas();
        } else {
            showNotification(response.mensagem || 'Erro ao excluir empresa', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao excluir empresa:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Exportar funções para window (compatibilidade onclick)
if (typeof window !== 'undefined') {
    window.editarEmpresa = editarEmpresa;
    window.excluirEmpresa = excluirEmpresa;
    window.fecharModalEmpresa = fecharModalEmpresa;
    window.salvarEdicaoEmpresa = salvarEdicaoEmpresa;
}
