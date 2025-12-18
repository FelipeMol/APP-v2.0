// ========================================
// MÓDULO DE GERENCIAMENTO DE USUÁRIOS
// ========================================

import { fetchAPI } from './api.js';
import { API_CONFIG } from './config.js';
import { showNotification, showLoading, hideLoading, showConfirm } from './ui.js';
import { ehAdmin } from './auth.js';
import { formatarData, gerarAvatar } from './utils.js';

// Estado
let usuarios = [];
let usuarioSelecionado = null;
let modoEdicao = false;

/**
 * Inicializa o módulo de usuários
 */
export async function initUsuarios() {
    if (!ehAdmin()) {
        showNotification('Acesso negado. Apenas administradores podem gerenciar usuários.', 'erro');
        return;
    }

    await carregarUsuarios();
    setupEventListeners();
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
    // Busca em tempo real
    const inputBusca = document.getElementById('buscar-usuario');
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            filtrarUsuarios(e.target.value);
        });
    }
}

/**
 * Carrega todos os usuários
 */
export async function carregarUsuarios() {
    try {
        console.log('🔄 Carregando usuários...');
        showLoading('Carregando usuários...');

        const response = await fetchAPI('usuarios', {
            method: 'GET'
        });

        console.log('📦 Resposta da API:', response);

        if (response.sucesso) {
            usuarios = response.dados || [];
            console.log(`✅ ${usuarios.length} usuários carregados`);
            renderizarUsuarios(usuarios);
        } else {
            // Silenciar erros de permissão (usuário comum não precisa ver usuários)
            const isSemPermissao = response.mensagem && (
                response.mensagem.includes('permissão') ||
                response.mensagem.includes('administrador') ||
                response.mensagem.includes('Acesso negado')
            );

            if (!isSemPermissao) {
                console.error('❌ Erro na resposta:', response.mensagem);
                showNotification(response.mensagem || 'Erro ao carregar usuários', 'erro');
            } else {
                console.log('ℹ️ Usuário sem permissão para visualizar módulo de usuários');
            }
            // Renderiza empty state mesmo em caso de erro
            renderizarUsuarios([]);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        showNotification('Erro de conexão ao carregar usuários', 'erro');
        // Renderiza empty state mesmo em caso de erro
        renderizarUsuarios([]);
    } finally {
        hideLoading();
    }
}

/**
 * Renderiza lista de usuários
 */
function renderizarUsuarios(listaUsuarios) {
    console.log('🎨 Renderizando usuários:', listaUsuarios?.length || 0);
    const container = document.getElementById('lista-usuarios');
    console.log('📦 Container encontrado:', container ? 'SIM' : 'NÃO');
    console.log('📦 Container display:', container ? window.getComputedStyle(container).display : 'N/A');
    console.log('📦 Container parent:', container ? container.parentElement : 'N/A');
    
    if (!container) {
        console.error('❌ Container lista-usuarios não encontrado!');
        return;
    }

    if (!listaUsuarios || listaUsuarios.length === 0) {
        console.log('⚠️ Nenhum usuário para renderizar - mostrando empty state');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <h3>Nenhum usuário cadastrado</h3>
                <p>Clique em "Novo Usuário" para criar o primeiro usuário.</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Iniciando renderização de', listaUsuarios.length, 'usuários...');

    const html = listaUsuarios.map(usuario => `
        <div class="usuario-card ${usuarioSelecionado?.id === usuario.id ? 'selecionado' : ''}"
             data-usuario-id="${usuario.id}"
             onclick="selecionarUsuario(${usuario.id})">

            <div class="usuario-card-header">
                <div class="usuario-avatar ${usuario.tipo === 'admin' ? 'admin' : ''}">
                    ${gerarAvatar(usuario.nome)}
                </div>
                <div class="usuario-card-info">
                    <h3 class="usuario-card-nome">${usuario.nome}</h3>
                    <p class="usuario-card-username">@${usuario.usuario}</p>
                </div>
            </div>

            <div class="usuario-card-badges">
                <span class="usuario-badge ${usuario.tipo}">${usuario.tipo === 'admin' ? 'Admin' : 'Usuário'}</span>
                <span class="usuario-badge ${usuario.ativo === 'Sim' ? 'ativo' : 'inativo'}">
                    ${usuario.ativo === 'Sim' ? 'Ativo' : 'Inativo'}
                </span>
            </div>

            ${usuario.ultimo_login ? `
                <div style="margin-top: 8px; font-size: 11px; color: #9ca3af;">
                    Último acesso: ${formatarData(usuario.ultimo_login)}
                </div>
            ` : ''}

            <div class="usuario-card-acoes" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-primary" onclick="editarUsuario(${usuario.id})">
                    ✏️ Editar
                </button>
                ${usuario.id !== 1 ? `
                    <button class="btn btn-sm btn-danger" onclick="excluirUsuario(${usuario.id})">
                        🗑️ Excluir
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    console.log('📝 HTML gerado (primeiros 500 chars):', html.substring(0, 500));
    container.innerHTML = html;
    console.log('✅ HTML inserido no container');
    console.log('📊 Container tem', container.children.length, 'filhos após inserção');
}

/**
 * Filtra usuários por busca
 */
function filtrarUsuarios(termo) {
    const termoLower = termo.toLowerCase().trim();

    if (!termoLower) {
        renderizarUsuarios(usuarios);
        return;
    }

    const filtrados = usuarios.filter(usuario =>
        usuario.nome.toLowerCase().includes(termoLower) ||
        usuario.usuario.toLowerCase().includes(termoLower) ||
        (usuario.email && usuario.email.toLowerCase().includes(termoLower))
    );

    renderizarUsuarios(filtrados);
}

/**
 * Seleciona usuário para gerenciar permissões
 */
export function selecionarUsuario(id) {
    usuarioSelecionado = usuarios.find(u => u.id === id);

    // Atualiza visual dos cards
    renderizarUsuarios(usuarios);

    // Carrega permissões do usuário
    if (window.carregarPermissoesUsuario) {
        window.carregarPermissoesUsuario(id);
    }
}

/**
 * Abre modal para novo usuário
 */
export function abrirModalNovoUsuario() {
    modoEdicao = false;

    document.getElementById('modal-usuario-titulo').textContent = 'Novo Usuário';
    document.getElementById('usuario-id').value = '';
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-ativo').value = 'Sim';
    document.getElementById('usuario-tipo').value = 'usuario';
    document.getElementById('usuario-senha').required = true;
    document.getElementById('senha-hint').style.display = 'none';

    const modal = document.getElementById('modal-usuario');
    if (modal.classList) {
        modal.classList.add('active');
    } else {
        modal.className += ' active';
    }
}

/**
 * Edita usuário existente
 */
export function editarUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;

    modoEdicao = true;

    document.getElementById('modal-usuario-titulo').textContent = 'Editar Usuário';
    document.getElementById('usuario-id').value = usuario.id;
    document.getElementById('usuario-nome').value = usuario.nome;
    document.getElementById('usuario-username').value = usuario.usuario;
    document.getElementById('usuario-email').value = usuario.email || '';
    document.getElementById('usuario-senha').value = '';
    document.getElementById('usuario-senha').required = false;
    document.getElementById('usuario-tipo').value = usuario.tipo;
    document.getElementById('usuario-ativo').value = usuario.ativo;
    document.getElementById('senha-hint').style.display = 'block';

    const modal = document.getElementById('modal-usuario');
    if (modal.classList) {
        modal.classList.add('active');
    } else {
        modal.className += ' active';
    }
}

/**
 * Fecha modal de usuário
 */
export function fecharModalUsuario() {
    const modal = document.getElementById('modal-usuario');
    if (modal.classList) {
        modal.classList.remove('active');
    } else {
        modal.className = modal.className.replace(' active', '');
    }
    document.getElementById('form-usuario').reset();
}

/**
 * Salva usuário (criar ou atualizar)
 */
export async function salvarUsuario(event) {
    event.preventDefault();

    const id = document.getElementById('usuario-id').value;
    const dados = {
        nome: document.getElementById('usuario-nome').value.trim(),
        usuario: document.getElementById('usuario-username').value.trim(),
        email: document.getElementById('usuario-email').value.trim(),
        senha: document.getElementById('usuario-senha').value,
        tipo: document.getElementById('usuario-tipo').value,
        ativo: document.getElementById('usuario-ativo').value
    };

    // Validações
    if (dados.nome.length < 3) {
        showNotification('Nome deve ter pelo menos 3 caracteres', 'erro');
        return;
    }

    if (dados.usuario.length < 3) {
        showNotification('Username deve ter pelo menos 3 caracteres', 'erro');
        return;
    }

    if (!modoEdicao && dados.senha.length < 6) {
        showNotification('Senha deve ter pelo menos 6 caracteres', 'erro');
        return;
    }

    if (modoEdicao && dados.senha && dados.senha.length < 6) {
        showNotification('Nova senha deve ter pelo menos 6 caracteres', 'erro');
        return;
    }

    // Remove senha vazia no modo edição
    if (modoEdicao && !dados.senha) {
        delete dados.senha;
    }

    try {
        showLoading(modoEdicao ? 'Atualizando usuário...' : 'Criando usuário...');

        let response;
        if (modoEdicao) {
            response = await fetchAPI('usuarios', {
                method: 'PUT',
                id: parseInt(id),
                data: dados
            });
        } else {
            response = await fetchAPI('usuarios', {
                method: 'POST',
                data: dados
            });
        }

        if (response.sucesso) {
            showNotification(
                modoEdicao ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
                'sucesso'
            );
            fecharModalUsuario();
            await carregarUsuarios();
        } else {
            showNotification(response.mensagem || 'Erro ao salvar usuário', 'erro');
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        showNotification('Erro de conexão ao salvar usuário', 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Exclui usuário
 */
export function excluirUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;

    if (usuario.id === 1) {
        showNotification('Não é possível excluir o usuário administrador principal', 'erro');
        return;
    }

    showConfirm(
        `Tem certeza que deseja excluir o usuário <strong>${usuario.nome}</strong>?<br><br>
        <small>Esta ação não pode ser desfeita. Todas as permissões serão removidas.</small>`,
        async () => {
            try {
                showLoading('Excluindo usuário...');

                const response = await fetchAPI('usuarios', {
                    method: 'DELETE',
                    id: id
                });

                if (response.sucesso) {
                    showNotification('Usuário excluído com sucesso!', 'sucesso');

                    // Se era o usuário selecionado, limpa seleção
                    if (usuarioSelecionado?.id === id) {
                        usuarioSelecionado = null;
                        document.getElementById('permissoes-content').innerHTML = `
                            <div class="empty-state">
                                <div class="empty-state-icon">🔐</div>
                                <h3>Selecione um usuário</h3>
                                <p>Escolha um usuário na lista ao lado para gerenciar suas permissões.</p>
                            </div>
                        `;
                        const matrixEl = document.getElementById('permissoes-matrix');
                        if (matrixEl) matrixEl.style.display = 'none';
                    }

                    await carregarUsuarios();
                } else {
                    showNotification(response.mensagem || 'Erro ao excluir usuário', 'erro');
                }
            } catch (error) {
                console.error('Erro ao excluir usuário:', error);
                showNotification('Erro de conexão ao excluir usuário', 'erro');
            } finally {
                hideLoading();
            }
        }
    );
}

/**
 * Retorna usuário selecionado
 */
export function getUsuarioSelecionado() {
    return usuarioSelecionado;
}

// Exportar para window (compatibilidade onclick)
if (typeof window !== 'undefined') {
    window.carregarUsuarios = carregarUsuarios;
    window.selecionarUsuario = selecionarUsuario;
    window.abrirModalNovoUsuario = abrirModalNovoUsuario;
    window.editarUsuario = editarUsuario;
    window.excluirUsuario = excluirUsuario;
    window.fecharModalUsuario = fecharModalUsuario;
    window.salvarUsuario = salvarUsuario;
}
