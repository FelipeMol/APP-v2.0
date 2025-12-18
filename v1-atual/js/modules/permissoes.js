// ========================================
// MÓDULO DE GERENCIAMENTO DE PERMISSÕES
// ========================================

import { fetchAPI } from './api.js';
import { API_CONFIG } from './config.js';
import { showNotification, showLoading, hideLoading } from './ui.js';
import { ehAdmin } from './auth.js';
import { getUsuarioSelecionado } from './usuarios.js';
import { gerarAvatar } from './utils.js';

// Estado
let modulos = [];
let permissoesUsuario = [];
let usuarioAtual = null;

/**
 * Inicializa o módulo de permissões
 */
export async function initPermissoes() {
    if (!ehAdmin()) {
        showNotification('Acesso negado', 'erro');
        return;
    }

    await carregarModulos();
}

/**
 * Carrega lista de módulos disponíveis
 */
async function carregarModulos() {
    try {
        const response = await fetchAPI('permissoes', {
            method: 'GET'
        });

        if (response.sucesso) {
            modulos = response.dados || [];
        } else {
            showNotification('Erro ao carregar módulos', 'erro');
        }
    } catch (error) {
        console.error('Erro ao carregar módulos:', error);
    }
}

/**
 * Carrega permissões de um usuário específico
 */
export async function carregarPermissoesUsuario(usuarioId) {
    try {
        showLoading('Carregando permissões...');

        usuarioAtual = getUsuarioSelecionado();

        // Se for admin, não permite editar permissões
        if (usuarioAtual.tipo === 'admin') {
            document.getElementById('permissoes-content').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👑</div>
                    <h3>Usuário Administrador</h3>
                    <p>Administradores possuem acesso total ao sistema.<br>Não é possível editar permissões de admins.</p>
                </div>
            `;
            document.getElementById('permissoes-matrix').style.display = 'none';
            hideLoading();
            return;
        }

        const response = await fetchAPI(
            `${API_CONFIG.endpoints.permissoes}?usuario_id=${usuarioId}`,
            { method: 'GET' }
        );

        if (response.sucesso) {
            permissoesUsuario = response.dados || [];
            renderizarMatrizPermissoes();

            // Mostra painel de permissões
            document.getElementById('permissoes-content').style.display = 'none';
            document.getElementById('permissoes-matrix').style.display = 'block';
        } else {
            showNotification('Erro ao carregar permissões', 'erro');
        }
    } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        showNotification('Erro de conexão', 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Renderiza matriz de permissões
 */
function renderizarMatrizPermissoes() {
    if (!usuarioAtual) return;

    // Atualiza info do usuário
    document.getElementById('perm-usuario-nome').textContent = usuarioAtual.nome;
    document.getElementById('perm-usuario-username').textContent = `@${usuarioAtual.usuario}`;

    const avatar = document.querySelector('.usuario-selecionado-info .avatar');
    if (avatar) {
        avatar.textContent = gerarAvatar(usuarioAtual.nome);
    }

    // Renderiza tabela
    const tbody = document.getElementById('matriz-permissoes-body');
    if (!tbody) return;

    tbody.innerHTML = permissoesUsuario.map(perm => {
        const isAdminOnly = perm.requer_admin == 1;
        const disabled = isAdminOnly ? 'disabled' : '';

        return `
            <tr class="${isAdminOnly ? 'modulo-admin-only' : ''}" data-modulo-id="${perm.modulo_id}">
                <td>
                    <div class="modulo-info">
                        <span class="modulo-icon">${perm.icone || '📄'}</span>
                        <div>
                            <div class="modulo-nome">
                                ${perm.modulo_titulo}
                                ${isAdminOnly ? '<span class="modulo-admin-badge">Admin</span>' : ''}
                            </div>
                            <div class="modulo-descricao">${perm.descricao || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <input type="checkbox"
                           data-tipo="visualizar"
                           ${perm.pode_visualizar == 1 ? 'checked' : ''}
                           ${disabled}
                           onchange="atualizarPermissaoLocal(${perm.modulo_id}, 'visualizar', this.checked)">
                </td>
                <td class="text-center">
                    <input type="checkbox"
                           data-tipo="criar"
                           ${perm.pode_criar == 1 ? 'checked' : ''}
                           ${disabled}
                           onchange="atualizarPermissaoLocal(${perm.modulo_id}, 'criar', this.checked)">
                </td>
                <td class="text-center">
                    <input type="checkbox"
                           data-tipo="editar"
                           ${perm.pode_editar == 1 ? 'checked' : ''}
                           ${disabled}
                           onchange="atualizarPermissaoLocal(${perm.modulo_id}, 'editar', this.checked)">
                </td>
                <td class="text-center">
                    <input type="checkbox"
                           data-tipo="excluir"
                           ${perm.pode_excluir == 1 ? 'checked' : ''}
                           ${disabled}
                           onchange="atualizarPermissaoLocal(${perm.modulo_id}, 'excluir', this.checked)">
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Atualiza permissão localmente (state)
 */
export function atualizarPermissaoLocal(moduloId, tipo, valor) {
    let perm = permissoesUsuario.find(p => p.modulo_id === moduloId);

    if (!perm) {
        perm = {
            modulo_id: moduloId,
            pode_visualizar: 0,
            pode_criar: 0,
            pode_editar: 0,
            pode_excluir: 0
        };
        permissoesUsuario.push(perm);
    }

    const campo = `pode_${tipo}`;
    perm[campo] = valor ? 1 : 0;

    // Auto-marca visualizar se marcou qualquer outra
    if (valor && tipo !== 'visualizar') {
        perm.pode_visualizar = 1;
        const row = document.querySelector(`tr[data-modulo-id="${moduloId}"]`);
        const checkVis = row.querySelector('input[data-tipo="visualizar"]');
        if (checkVis) checkVis.checked = true;
    }
}

/**
 * Toggle coluna inteira
 */
export function toggleColuna(tipo, checked) {
    const checkboxes = document.querySelectorAll(`input[data-tipo="${tipo}"]:not(:disabled)`);

    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
        const row = checkbox.closest('tr');
        const moduloId = parseInt(row.dataset.moduloId);
        atualizarPermissaoLocal(moduloId, tipo, checked);
    });
}

/**
 * Concede acesso total
 */
export function concederAcessoTotal() {
    ['visualizar', 'criar', 'editar', 'excluir'].forEach(tipo => {
        toggleColuna(tipo, true);
    });

    // Atualiza checkboxes do header
    document.querySelectorAll('.table-permissoes thead input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
}

/**
 * Revoga acesso total
 */
export function revogarAcessoTotal() {
    ['visualizar', 'criar', 'editar', 'excluir'].forEach(tipo => {
        toggleColuna(tipo, false);
    });

    // Atualiza checkboxes do header
    document.querySelectorAll('.table-permissoes thead input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

/**
 * Salva permissões no backend
 */
export async function salvarPermissoes() {
    if (!usuarioAtual) {
        showNotification('Nenhum usuário selecionado', 'erro');
        return;
    }

    try {
        const statusEl = document.getElementById('save-status');
        if (statusEl) {
            statusEl.textContent = '⏳ Salvando...';
            statusEl.className = 'save-status salvando';
        }

        showLoading('Salvando permissões...');

        const payload = {
            usuario_id: usuarioAtual.id,
            permissoes: permissoesUsuario.map(p => ({
                modulo_id: p.modulo_id,
                pode_visualizar: p.pode_visualizar,
                pode_criar: p.pode_criar,
                pode_editar: p.pode_editar,
                pode_excluir: p.pode_excluir
            }))
        };

        const response = await fetchAPI('permissoes', {
            method: 'POST',
            data: payload
        });

        if (response.sucesso) {
            showNotification('Permissões salvas com sucesso!', 'sucesso');

            if (statusEl) {
                statusEl.textContent = '✓ Salvo';
                statusEl.className = 'save-status salvo';

                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.className = 'save-status';
                }, 3000);
            }
        } else {
            showNotification(response.mensagem || 'Erro ao salvar permissões', 'erro');
        }
    } catch (error) {
        console.error('Erro ao salvar permissões:', error);
        showNotification('Erro de conexão ao salvar permissões', 'erro');
    } finally {
        hideLoading();
    }
}

// Exportar para window
if (typeof window !== 'undefined') {
    window.carregarPermissoesUsuario = carregarPermissoesUsuario;
    window.atualizarPermissaoLocal = atualizarPermissaoLocal;
    window.toggleColuna = toggleColuna;
    window.concederAcessoTotal = concederAcessoTotal;
    window.revogarAcessoTotal = revogarAcessoTotal;
    window.salvarPermissoes = salvarPermissoes;
}
