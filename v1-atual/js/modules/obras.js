// ========================================
// OBRAS.JS - Módulo de obras com botões bonitos
// ========================================

import { ObrasAPI } from './api.js';
import { obrasActions } from './store.js';
import { showNotification, showLoading, hideLoading, abrirModalEdicao, fecharModalEdicao } from './ui.js';

/**
 * Inicializar módulo de obras
 */
export async function initObras() {
    console.log('🏗️ Inicializando módulo de obras...');
    await carregarObras();
    setupEventListeners();
    console.log('✅ Módulo de obras inicializado');
}

/**
 * Carregar obras da API
 */
export async function carregarObras() {
    try {
        showLoading('Carregando obras...');
        const response = await ObrasAPI.listar();

        if (response.sucesso) {
            const dados = response.dados || [];
            obrasActions.set(dados);
            renderizarObras();
            console.log(`✅ ${dados.length} obras carregadas`);
        } else {
            showNotification(response.mensagem || 'Erro ao carregar obras', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar obras:', error);
        showNotification('Erro ao carregar obras', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Renderizar tabela de obras
 */
export function renderizarObras() {
    console.log('📊 Atualizando tabela de obras...');
    const tbody = document.getElementById('tabela-obras');
    if (!tbody) return;

    const obras = obrasActions.getAll();

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
                <button onclick="editarObra(${obra.id})" class="btn-icon-table btn-edit" title="Editar">
                    ✏️
                </button>
                <button onclick="excluirObra(${obra.id})" class="btn-icon-table btn-delete" title="Excluir">
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
    const form = document.getElementById('form-obra');
    if (form) {
        form.addEventListener('submit', handleSubmitObra);
    }
}

/**
 * Manipular submissão do formulário
 */
async function handleSubmitObra(e) {
    e.preventDefault();

    const form = e.target;
    const isEditing = form.dataset.isEditing === 'true';
    const obraId = form.dataset.obraId;

    const dados = {
        nome: document.getElementById('obra-nome').value.trim(),
        responsavel: document.getElementById('obra-responsavel').value.trim(),
        cidade: document.getElementById('obra-cidade').value.trim()
    };

    if (!dados.nome) {
        showNotification('Nome da obra é obrigatório!', 'warning');
        return;
    }

    if (isEditing && obraId) {
        await salvarEdicaoObra(obraId, dados);
    } else {
        try {
            showLoading('Salvando obra...');
            const response = await ObrasAPI.criar(dados);

            if (response.sucesso) {
                showNotification('Obra adicionada com sucesso!', 'success');
                form.reset();
                await carregarObras();
            } else {
                showNotification(response.mensagem || 'Erro ao salvar obra', 'error');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar obra:', error);
            showNotification('Erro de conexão. Tente novamente.', 'error');
        } finally {
            hideLoading();
        }
    }
}

/**
 * Editar obra
 */
export function editarObra(id) {
    console.log('✏️ Abrindo modal para editar obra:', id);

    const obra = obrasActions.findById(id);
    if (!obra) {
        showNotification('Obra não encontrada', 'error');
        return;
    }

    // Preencher modal com dados da obra
    document.getElementById('edit-obra-id').value = obra.id;
    document.getElementById('edit-obra-nome').value = obra.nome || '';
    document.getElementById('edit-obra-responsavel').value = obra.responsavel || '';
    document.getElementById('edit-obra-cidade').value = obra.cidade || '';

    // Abrir modal
    abrirModalEdicao('modal-editar-obra');
}

/**
 * Fechar modal de edição de obra
 */
export function fecharModalObra() {
    fecharModalEdicao('modal-editar-obra');
}

/**
 * Salvar edição de obra - CHAMADA PELO MODAL
 */
export async function salvarEdicaoObra(event) {
    event.preventDefault();

    const id = document.getElementById('edit-obra-id').value;
    const nome = document.getElementById('edit-obra-nome').value.trim();
    const responsavel = document.getElementById('edit-obra-responsavel').value.trim();
    const cidade = document.getElementById('edit-obra-cidade').value.trim();

    if (!nome) {
        showNotification('Nome é obrigatório', 'error');
        return;
    }

    try {
        showLoading('Atualizando obra...');
        const response = await ObrasAPI.atualizar(id, { nome, responsavel, cidade });

        if (response.sucesso) {
            showNotification('Obra atualizada com sucesso! ✅', 'success');
            fecharModalObra();
            await carregarObras();
        } else {
            showNotification(response.mensagem || 'Erro ao atualizar obra', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar obra:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Excluir obra
 */
export async function excluirObra(id) {
    if (!confirm('Tem certeza que deseja excluir esta obra?')) {
        return;
    }

    try {
        showLoading('Excluindo obra...');
        const response = await ObrasAPI.excluir(id);

        if (response.sucesso) {
            showNotification('Obra excluída com sucesso!', 'success');
            await carregarObras();
        } else {
            showNotification(response.mensagem || 'Erro ao excluir obra', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao excluir obra:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Exportar funções para window (compatibilidade onclick)
if (typeof window !== 'undefined') {
    window.editarObra = editarObra;
    window.excluirObra = excluirObra;
    window.fecharModalObra = fecharModalObra;
    window.salvarEdicaoObra = salvarEdicaoObra;
}
