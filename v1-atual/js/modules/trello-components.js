/**
 * Componentes específicos estilo Trello
 * Task cards, checklist, members, anexos, activities
 */

import { formatDate, formatarTamanhoArquivo, gerarAvatar } from './utils.js';

/**
 * Card de tarefa estilo Trello
 */
export function TrelloTaskCard({ tarefa, etiquetas = [], membros = [], checklist = {}, anexos = [] }) {
    const prioridadeClass = tarefa.prioridade?.toLowerCase() || 'baixa';
    const statusClass = tarefa.status?.toLowerCase().replace(' ', '-') || 'pendente';

    // Primeira imagem como capa
    const capa = anexos.find(a => a.is_imagem);

    // Calcular progresso do checklist
    const checklistTotal = checklist.total || 0;
    const checklistConcluidos = checklist.concluidos || 0;
    const checklistCompleto = checklistTotal > 0 && checklistTotal === checklistConcluidos;

    // Verificar prazo
    const hoje = new Date();
    const prazo = tarefa.data_prazo ? new Date(tarefa.data_prazo + 'T00:00:00') : null;
    let prazoClass = '';
    let prazoIcon = '📅';

    if (prazo) {
        const diffDays = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        if (tarefa.status === 'Concluído') {
            prazoClass = 'due-complete';
            prazoIcon = '✅';
        } else if (diffDays < 0) {
            prazoClass = 'overdue';
            prazoIcon = '⚠️';
        } else if (diffDays <= 2) {
            prazoClass = 'due-soon';
            prazoIcon = '⏰';
        }
    }

    return `
        <div class="trello-card" data-tarefa-id="${tarefa.id}" draggable="true" onclick="abrirDetalhesTarefa(${tarefa.id})">
            ${capa ? `
                <div class="trello-card-cover" style="background-image: url('${capa.preview_url}')"></div>
            ` : ''}

            ${tarefa.prioridade && tarefa.prioridade !== 'Baixa' ? `
                <div class="trello-card-priority ${prioridadeClass}" title="Prioridade: ${tarefa.prioridade}"></div>
            ` : ''}

            ${etiquetas.length > 0 ? `
                <div class="trello-card-labels">
                    ${etiquetas.map(e => `
                        <span class="trello-label" style="background: ${e.cor}">${e.nome}</span>
                    `).join('')}
                </div>
            ` : ''}

            <div class="trello-card-title">${tarefa.titulo}</div>

            <div class="trello-card-badges">
                ${prazo ? `
                    <div class="trello-badge ${prazoClass}">
                        <span>${prazoIcon}</span>
                        <span>${formatDate(tarefa.data_prazo)}</span>
                    </div>
                ` : ''}

                ${tarefa.descricao ? `
                    <div class="trello-badge">
                        <span>📝</span>
                        <span>Descrição</span>
                    </div>
                ` : ''}

                ${checklistTotal > 0 ? `
                    <div class="trello-badge ${checklistCompleto ? 'checklist-complete' : 'checklist-incomplete'}">
                        <span>${checklistCompleto ? '✅' : '☑️'}</span>
                        <span>${checklistConcluidos}/${checklistTotal}</span>
                    </div>
                ` : ''}

                ${tarefa.total_comentarios > 0 ? `
                    <div class="trello-badge">
                        <span>💬</span>
                        <span>${tarefa.total_comentarios}</span>
                    </div>
                ` : ''}

                ${anexos.length > 0 ? `
                    <div class="trello-badge">
                        <span>📎</span>
                        <span>${anexos.length}</span>
                    </div>
                ` : ''}
            </div>

            ${membros.length > 0 ? `
                <div class="trello-card-members">
                    ${membros.slice(0, 5).map(m => `
                        <div class="trello-avatar" title="${m.usuario_nome} (${m.papel})">
                            ${m.usuario_avatar
                                ? `<img src="${m.usuario_avatar}" alt="${m.usuario_nome}">`
                                : gerarAvatar(m.usuario_nome)
                            }
                        </div>
                    `).join('')}
                    ${membros.length > 5 ? `
                        <div class="trello-avatar" title="+${membros.length - 5} membros">
                            +${membros.length - 5}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Coluna Kanban estilo Trello
 */
export function TrelloKanbanColumn({ status, tarefas, total }) {
    const statusConfig = {
        'Pendente': { color: '#94a3b8', icon: '📋' },
        'Em Progresso': { color: '#3b82f6', icon: '🔄' },
        'Concluído': { color: '#10b981', icon: '✅' },
        'Cancelado': { color: '#ef4444', icon: '❌' }
    };

    const config = statusConfig[status] || { color: '#64748b', icon: '📌' };

    return `
        <div class="kanban-column-trello" data-status="${status}">
            <div class="kanban-column-header">
                <div class="kanban-column-title">
                    <span>${config.icon}</span>
                    <span>${status}</span>
                    <span class="kanban-column-count">${total}</span>
                </div>
                <button class="kanban-column-add" onclick="novaTarefaNaColuna('${status}')" title="Adicionar tarefa">
                    +
                </button>
            </div>

            <div class="kanban-cards-container" id="kanban-${status.toLowerCase().replace(' ', '-')}" data-status="${status}">
                ${tarefas.length > 0
                    ? tarefas.map(t => TrelloTaskCard(t)).join('')
                    : `<div class="kanban-cards-container empty">Nenhuma tarefa</div>`
                }
            </div>
        </div>
    `;
}

/**
 * Seção de checklist com progress bar
 */
export function ChecklistSection({ tarefaId, items = [] }) {
    const total = items.length;
    const concluidos = items.filter(i => i.concluido).length;
    const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

    return `
        <div class="trello-section">
            <div class="trello-section-header">
                <h3 class="trello-section-title">
                    <span class="icon">☑️</span>
                    <span>Checklist</span>
                </h3>
                ${total > 0 ? `
                    <button class="trello-section-action" onclick="limparChecklistConcluidos(${tarefaId})">
                        Limpar concluídos
                    </button>
                ` : ''}
            </div>

            ${total > 0 ? `
                <div class="checklist-progress">
                    <span class="checklist-progress-text">${progresso}%</span>
                    <div class="checklist-progress-bar">
                        <div class="checklist-progress-fill" style="width: ${progresso}%"></div>
                    </div>
                </div>
            ` : ''}

            <div class="checklist-items" id="checklist-items-${tarefaId}">
                ${items.map(item => ChecklistItem({ tarefaId, item })).join('')}
            </div>

            <button class="checklist-add-item" onclick="mostrarFormNovoItemChecklist(${tarefaId})">
                + Adicionar item
            </button>

            <div id="form-novo-item-${tarefaId}" class="hidden" style="margin-top: 12px;">
                <input
                    type="text"
                    id="input-novo-item-${tarefaId}"
                    class="form-input-new"
                    placeholder="Adicionar um item..."
                    style="margin-bottom: 8px;"
                >
                <div style="display: flex; gap: 8px;">
                    <button class="btn-new btn-primary-new" onclick="adicionarItemChecklist(${tarefaId})">
                        Adicionar
                    </button>
                    <button class="btn-new btn-secondary-new" onclick="cancelarNovoItemChecklist(${tarefaId})">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Item individual de checklist
 */
export function ChecklistItem({ tarefaId, item }) {
    return `
        <div class="checklist-item ${item.concluido ? 'completed' : ''}" data-item-id="${item.id}">
            <input
                type="checkbox"
                ${item.concluido ? 'checked' : ''}
                onchange="toggleChecklistItem(${item.id}, ${tarefaId})"
            >
            <span class="checklist-item-text">${item.titulo}</span>
            <button class="checklist-item-delete" onclick="excluirChecklistItem(${item.id}, ${tarefaId})">
                🗑️
            </button>
        </div>
    `;
}

/**
 * Seção de membros
 */
export function MembersSection({ tarefaId, membros = [], todosUsuarios = [] }) {
    return `
        <div class="trello-section">
            <div class="trello-section-header">
                <h3 class="trello-section-title">
                    <span class="icon">👥</span>
                    <span>Membros</span>
                </h3>
                <button class="trello-section-action" onclick="mostrarSeletorMembros(${tarefaId})">
                    + Adicionar
                </button>
            </div>

            <div class="members-list" id="members-list-${tarefaId}">
                ${membros.length > 0
                    ? membros.map(m => MemberItem({ tarefaId, membro: m })).join('')
                    : '<p class="text-muted" style="font-size: 14px;">Nenhum membro atribuído</p>'
                }
            </div>

            <div id="selector-membros-${tarefaId}" class="hidden" style="margin-top: 12px;">
                <select id="select-membro-${tarefaId}" class="form-select-new" style="margin-bottom: 8px;">
                    <option value="">Selecione um usuário...</option>
                    ${todosUsuarios.map(u => `
                        <option value="${u.id}">${u.nome}</option>
                    `).join('')}
                </select>
                <select id="select-papel-${tarefaId}" class="form-select-new" style="margin-bottom: 8px;">
                    <option value="responsavel">Responsável</option>
                    <option value="observador">Observador</option>
                    <option value="revisor">Revisor</option>
                </select>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-new btn-primary-new" onclick="adicionarMembro(${tarefaId})">
                        Adicionar
                    </button>
                    <button class="btn-new btn-secondary-new" onclick="cancelarSeletorMembros(${tarefaId})">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Item de membro
 */
export function MemberItem({ tarefaId, membro }) {
    const papelLabel = {
        'responsavel': 'Responsável',
        'observador': 'Observador',
        'revisor': 'Revisor'
    };

    return `
        <div class="member-item" data-membro-id="${membro.id}">
            <div class="member-avatar">
                ${membro.usuario_avatar
                    ? `<img src="${membro.usuario_avatar}" alt="${membro.usuario_nome}">`
                    : gerarAvatar(membro.usuario_nome)
                }
            </div>
            <div class="member-info">
                <div class="member-name">${membro.usuario_nome}</div>
                <div class="member-role">${papelLabel[membro.papel] || membro.papel}</div>
            </div>
            <button class="member-remove" onclick="removerMembro(${membro.id}, ${tarefaId})" title="Remover membro">
                ✕
            </button>
        </div>
    `;
}

/**
 * Seção de anexos
 */
export function AttachmentsSection({ tarefaId, anexos = [] }) {
    return `
        <div class="trello-section">
            <div class="trello-section-header">
                <h3 class="trello-section-title">
                    <span class="icon">📎</span>
                    <span>Anexos</span>
                </h3>
                <button class="trello-section-action" onclick="mostrarFormUploadAnexo(${tarefaId})">
                    + Adicionar
                </button>
            </div>

            <div class="attachments-list" id="attachments-list-${tarefaId}">
                ${anexos.length > 0
                    ? anexos.map(a => AttachmentItem({ tarefaId, anexo: a })).join('')
                    : '<p class="text-muted" style="font-size: 14px;">Nenhum anexo</p>'
                }
            </div>

            <div id="form-upload-${tarefaId}" class="hidden" style="margin-top: 12px;">
                <input
                    type="file"
                    id="input-arquivo-${tarefaId}"
                    class="form-input-new"
                    style="margin-bottom: 8px;"
                >
                <div style="display: flex; gap: 8px;">
                    <button class="btn-new btn-primary-new" onclick="uploadAnexo(${tarefaId})">
                        Upload
                    </button>
                    <button class="btn-new btn-secondary-new" onclick="cancelarUploadAnexo(${tarefaId})">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Item de anexo
 */
export function AttachmentItem({ tarefaId, anexo }) {
    const iconesPorTipo = {
        'application/pdf': '📄',
        'application/msword': '📝',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
        'application/vnd.ms-excel': '📊',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
        'text/plain': '📃',
        'application/zip': '📦',
        'application/x-zip-compressed': '📦'
    };

    const icone = anexo.is_imagem ? '' : (iconesPorTipo[anexo.tipo_mime] || '📎');

    return `
        <div class="attachment-item" data-anexo-id="${anexo.id}">
            <div class="attachment-preview">
                ${anexo.is_imagem
                    ? `<img src="${anexo.preview_url}" alt="${anexo.nome_original}">`
                    : `<span>${icone}</span>`
                }
            </div>
            <div class="attachment-info">
                <div class="attachment-name" title="${anexo.nome_original}">${anexo.nome_original}</div>
                <div class="attachment-meta">
                    <span>${anexo.tamanho_formatado}</span>
                    <span>${anexo.usuario_nome}</span>
                </div>
                <div class="attachment-actions">
                    <a href="${anexo.download_url}" target="_blank" class="attachment-action-btn">
                        ⬇️ Download
                    </a>
                    ${anexo.is_imagem ? `
                        <button class="attachment-action-btn" onclick="verImagemAnexo('${anexo.preview_url}')">
                            👁️ Ver
                        </button>
                    ` : ''}
                    <button class="attachment-action-btn danger" onclick="excluirAnexo(${anexo.id}, ${tarefaId})">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Timeline de atividades
 */
export function ActivityTimeline({ atividades = [] }) {
    return `
        <div class="trello-section">
            <div class="trello-section-header">
                <h3 class="trello-section-title">
                    <span class="icon">📊</span>
                    <span>Atividades</span>
                </h3>
            </div>

            <div class="activity-timeline" id="activity-timeline">
                ${atividades.length > 0
                    ? atividades.map(a => ActivityItem({ atividade: a })).join('')
                    : '<p class="text-muted" style="font-size: 14px;">Nenhuma atividade ainda</p>'
                }
            </div>
        </div>
    `;
}

/**
 * Item de atividade
 */
export function ActivityItem({ atividade }) {
    return `
        <div class="activity-item">
            <div class="activity-avatar">
                ${atividade.usuario_avatar
                    ? `<img src="${atividade.usuario_avatar}" alt="${atividade.usuario_nome}">`
                    : gerarAvatar(atividade.usuario_nome)
                }
            </div>
            <div class="activity-content">
                <div class="activity-header">
                    <span class="activity-author">${atividade.usuario_nome}</span>
                    <span class="activity-action"> ${atividade.descricao}</span>
                </div>
                <div class="activity-time">${atividade.tempo_relativo}</div>
                ${atividade.valor_anterior && atividade.valor_novo ? `
                    <div class="activity-description">
                        De: <strong>${atividade.valor_anterior}</strong> → Para: <strong>${atividade.valor_novo}</strong>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Seção de etiquetas
 */
export function EtiquetasSection({ tarefaId, etiquetas = [], todasEtiquetas = [], cores = [] }) {
    const palette = cores && cores.length ? cores : ['#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563'];
    const associacoes = new Map(
        (etiquetas || []).map(e => [Number(e.id), e.associacao_id || e.id_associacao || e.tarefa_etiqueta_id || null])
    );

    return `
        <div class="trello-section" id="trello-labels-panel">
            <div class="trello-section-header">
                <h3 class="trello-section-title">
                    <span class="icon">🏷️</span>
                    <span>Etiquetas</span>
                </h3>
                <button class="trello-section-action" onclick="abrirCriarEtiqueta()">
                    + Nova
                </button>
            </div>

            <div class="trello-labels-search">
                <input
                    id="trello-label-search"
                    type="text"
                    class="form-input-new"
                    placeholder="Buscar etiquetas..."
                    oninput="filtrarEtiquetasTrello(this.value)"
                >
            </div>

            <div class="trello-labels-list" id="trello-labels-list">
                ${(todasEtiquetas || []).length > 0
                    ? todasEtiquetas.map(e => EtiquetaRow({ tarefaId, etiqueta: e, marcado: associacoes.has(Number(e.id)), associacaoId: associacoes.get(Number(e.id)) || '' })).join('')
                    : '<p class="text-muted" style="font-size: 14px;">Nenhuma etiqueta cadastrada</p>'
                }
            </div>

            <div class="trello-labels-footer">
                <button class="trello-sidebar-btn" onclick="abrirCriarEtiqueta()">Criar uma nova etiqueta</button>
                <button class="trello-sidebar-btn" onclick="abrirCriarEtiqueta()">Editar etiqueta selecionada</button>
            </div>

            <div id="trello-label-editor" class="trello-label-editor hidden">
                <label for="trello-label-nome">Nome da etiqueta</label>
                <input type="text" id="trello-label-nome" class="form-input-new" placeholder="Ex: Prioridade, Houseclub">

                <div class="trello-label-colors" id="trello-label-cores">
                    ${palette.map((cor, idx) => `
                        <button
                            type="button"
                            class="trello-label-color ${idx === 0 ? 'selected' : ''}"
                            style="background: ${cor};"
                            data-color="${cor}"
                            onclick="selecionarCorEtiqueta('${cor}', this)"
                        ></button>
                    `).join('')}
                </div>

                <div class="trello-label-editor-actions">
                    <button class="btn-new btn-primary-new" onclick="salvarEtiquetaTrello()">Salvar</button>
                    <button class="btn-new btn-secondary-new" onclick="cancelarEdicaoEtiqueta()">Cancelar</button>
                    <button class="btn-new btn-secondary-new danger" onclick="excluirEtiquetaTrello()">Excluir</button>
                </div>
            </div>
        </div>
    `;
}

export function EtiquetaRow({ tarefaId, etiqueta, marcado = false, associacaoId = '' }) {
    return `
        <label class="trello-label-row" data-nome="${etiqueta.nome.toLowerCase()}">
            <input
                type="checkbox"
                ${marcado ? 'checked' : ''}
                onclick="toggleEtiquetaTarefa(${etiqueta.id}, this)"
                data-associacao-id="${associacaoId}"
            >
            <span class="trello-label-swatch" style="background: ${etiqueta.cor};"></span>
            <span class="trello-label-name">${etiqueta.nome}</span>
            <button type="button" class="trello-label-edit" onclick="editarEtiquetaTrello(${etiqueta.id})" title="Editar etiqueta">
                ✏️
            </button>
        </label>
    `;
}
