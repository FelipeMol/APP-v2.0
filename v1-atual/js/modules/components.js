// ========================================
// MÓDULO DE COMPONENTES REUTILIZÁVEIS
// ========================================

/**
 * Componente de Badge de Status
 */
export function Badge({ texto, tipo = 'default' }) {
    const classes = {
        default: 'badge-default',
        success: 'badge-success',
        danger: 'badge-danger',
        warning: 'badge-warning',
        info: 'badge-info',
        ativo: 'badge-success',
        inativo: 'badge-danger'
    };

    const classe = classes[tipo.toLowerCase()] || classes.default;

    return `<span class="badge ${classe}">${texto}</span>`;
}

/**
 * Componente de Botão de Ação
 */
export function ActionButton({ icon, texto, onClick, classe = 'btn-primary', tipo = 'button' }) {
    return `
        <button type="${tipo}" class="btn ${classe}" onclick="${onClick}">
            ${icon ? `<span class="btn-icon">${icon}</span>` : ''}
            ${texto}
        </button>
    `;
}

/**
 * Componente de Botões de Ação em Tabela
 */
export function TableActions(item, opcoes = {}) {
    const { onEdit, onDelete, onView, customActions = [] } = opcoes;

    const botoes = [];

    if (onView) {
        botoes.push(`
            <button class="btn-icon-table btn-view"
                    onclick="${onView}(${item.id})"
                    title="Visualizar">
                👁️
            </button>
        `);
    }

    if (onEdit) {
        botoes.push(`
            <button class="btn-icon-table btn-edit"
                    onclick="${onEdit}(${item.id})"
                    title="Editar">
                ✏️
            </button>
        `);
    }

    if (onDelete) {
        botoes.push(`
            <button class="btn-icon-table btn-delete"
                    onclick="${onDelete}(${item.id})"
                    title="Excluir">
                🗑️
            </button>
        `);
    }

    // Ações customizadas
    customActions.forEach(action => {
        botoes.push(`
            <button class="btn-icon-table ${action.classe || ''}"
                    onclick="${action.onClick}(${item.id})"
                    title="${action.titulo}">
                ${action.icon}
            </button>
        `);
    });

    return botoes.join('');
}

/**
 * Componente de Card
 */
export function Card({ titulo, conteudo, footer, icone, classe = '' }) {
    return `
        <div class="card ${classe}">
            ${titulo ? `
                <div class="card-header">
                    ${icone ? `<span class="card-icon">${icone}</span>` : ''}
                    <h3>${titulo}</h3>
                </div>
            ` : ''}
            <div class="card-body">
                ${conteudo}
            </div>
            ${footer ? `
                <div class="card-footer">
                    ${footer}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Componente de Input de Busca
 */
export function SearchInput({ id, placeholder = 'Buscar...', onSearch }) {
    return `
        <div class="search-input-container">
            <input type="text"
                   id="${id}"
                   class="search-input"
                   placeholder="${placeholder}"
                   oninput="${onSearch}(this.value)">
            <span class="search-icon">🔍</span>
        </div>
    `;
}

/**
 * Componente de Filtro
 */
export function FilterSelect({ id, label, opcoes, onChange, valorPadrao = '' }) {
    return `
        <div class="filter-group">
            ${label ? `<label for="${id}">${label}</label>` : ''}
            <select id="${id}" class="filter-select" onchange="${onChange}(this.value)">
                <option value="">Todos</option>
                ${opcoes.map(opt => `
                    <option value="${opt.value}" ${opt.value === valorPadrao ? 'selected' : ''}>
                        ${opt.label}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}

/**
 * Componente de Paginação
 */
export function Pagination({ totalItens, itensPorPagina, paginaAtual, onChange }) {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    if (totalPaginas <= 1) return '';

    const paginas = [];
    const maxPaginas = 5;

    let inicio = Math.max(1, paginaAtual - Math.floor(maxPaginas / 2));
    let fim = Math.min(totalPaginas, inicio + maxPaginas - 1);

    if (fim - inicio < maxPaginas - 1) {
        inicio = Math.max(1, fim - maxPaginas + 1);
    }

    for (let i = inicio; i <= fim; i++) {
        paginas.push(i);
    }

    return `
        <div class="pagination">
            <button class="pagination-btn"
                    ${paginaAtual === 1 ? 'disabled' : ''}
                    onclick="${onChange}(${paginaAtual - 1})">
                ‹
            </button>

            ${inicio > 1 ? `
                <button class="pagination-btn" onclick="${onChange}(1)">1</button>
                ${inicio > 2 ? '<span class="pagination-dots">...</span>' : ''}
            ` : ''}

            ${paginas.map(p => `
                <button class="pagination-btn ${p === paginaAtual ? 'active' : ''}"
                        onclick="${onChange}(${p})">
                    ${p}
                </button>
            `).join('')}

            ${fim < totalPaginas ? `
                ${fim < totalPaginas - 1 ? '<span class="pagination-dots">...</span>' : ''}
                <button class="pagination-btn" onclick="${onChange}(${totalPaginas})">${totalPaginas}</button>
            ` : ''}

            <button class="pagination-btn"
                    ${paginaAtual === totalPaginas ? 'disabled' : ''}
                    onclick="${onChange}(${paginaAtual + 1})">
                ›
            </button>
        </div>
    `;
}

/**
 * Componente de Form Field
 */
export function FormField({
    id,
    label,
    tipo = 'text',
    required = false,
    placeholder = '',
    valor = '',
    opcoes = [], // Para select
    disabled = false,
    classe = ''
}) {
    const requiredAttr = required ? 'required' : '';
    const disabledAttr = disabled ? 'disabled' : '';

    if (tipo === 'select') {
        return `
            <div class="form-group ${classe}">
                <label for="${id}">
                    ${label}
                    ${required ? '<span class="required">*</span>' : ''}
                </label>
                <select id="${id}"
                        class="form-control"
                        ${requiredAttr}
                        ${disabledAttr}>
                    <option value="">Selecione...</option>
                    ${opcoes.map(opt => `
                        <option value="${opt.value || opt}" ${(opt.value || opt) === valor ? 'selected' : ''}>
                            ${opt.label || opt}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    if (tipo === 'textarea') {
        return `
            <div class="form-group ${classe}">
                <label for="${id}">
                    ${label}
                    ${required ? '<span class="required">*</span>' : ''}
                </label>
                <textarea id="${id}"
                          class="form-control"
                          placeholder="${placeholder}"
                          ${requiredAttr}
                          ${disabledAttr}>${valor}</textarea>
            </div>
        `;
    }

    return `
        <div class="form-group ${classe}">
            <label for="${id}">
                ${label}
                ${required ? '<span class="required">*</span>' : ''}
            </label>
            <input type="${tipo}"
                   id="${id}"
                   class="form-control"
                   placeholder="${placeholder}"
                   value="${valor}"
                   ${requiredAttr}
                   ${disabledAttr}>
        </div>
    `;
}

/**
 * Componente de Estatística (para dashboard)
 */
export function StatCard({ titulo, valor, icone, cor = 'blue', trend }) {
    return `
        <div class="stat-card stat-card-${cor}">
            <div class="stat-card-content">
                <div class="stat-card-header">
                    <span class="stat-card-titulo">${titulo}</span>
                    <span class="stat-card-icone">${icone}</span>
                </div>
                <div class="stat-card-valor">${valor}</div>
                ${trend ? `
                    <div class="stat-card-trend ${trend.tipo}">
                        <span class="trend-icon">${trend.tipo === 'up' ? '↑' : '↓'}</span>
                        <span class="trend-valor">${trend.valor}</span>
                        <span class="trend-label">${trend.label || 'vs mês anterior'}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Componente de Tabela Responsiva
 */
/**
 * Gerar linhas <tr> para tbody (usado quando a tabela já existe no HTML)
 */
export function TableRows({ colunas, dados, acoes }) {
    if (!dados || dados.length === 0) {
        const colspan = colunas.length + (acoes ? 1 : 0);
        return `<tr><td colspan="${colspan}" class="loading">Nenhum registro encontrado</td></tr>`;
    }

    return dados.map(item => `
        <tr>
            ${colunas.map(col => `
                <td data-label="${col.label}" class="${col.classe || ''}">
                    ${col.render ? col.render(item[col.field], item) : (item[col.field] || '-')}
                </td>
            `).join('')}
            ${acoes ? `
                <td class="td-acoes" data-label="Ações">
                    ${acoes(item)}
                </td>
            ` : ''}
        </tr>
    `).join('');
}

export function ResponsiveTable({ colunas, dados, acoes, emptyMessage = 'Nenhum registro encontrado' }) {
    if (!dados || dados.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>${emptyMessage}</h3>
            </div>
        `;
    }

    return `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        ${colunas.map(col => `
                            <th class="${col.classe || ''}">${col.label}</th>
                        `).join('')}
                        ${acoes ? '<th class="th-acoes">Ações</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${TableRows({ colunas, dados, acoes })}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Componente de Avaliação com Estrelas
 */
export function StarRating({ id, valor = 0, max = 5, readonly = false }) {
    const stars = [];
    for (let i = 1; i <= max; i++) {
        const filled = i <= valor;
        stars.push(`
            <span class="star ${filled ? 'star-filled' : 'star-empty'}"
                  ${!readonly ? `onclick="document.getElementById('${id}').value=${i}; updateStars('${id}', ${i}, ${max})"` : ''}
                  style="cursor: ${readonly ? 'default' : 'pointer'}">
                ${filled ? '★' : '☆'}
            </span>
        `);
    }

    return `
        <div class="star-rating" id="${id}-container">
            ${stars.join('')}
            <input type="hidden" id="${id}" value="${valor}">
        </div>
    `;
}

/**
 * Componente de Alert
 */
export function Alert({ tipo = 'info', mensagem, titulo, dismissible = false }) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    return `
        <div class="alert alert-${tipo}">
            <div class="alert-content">
                <span class="alert-icon">${icons[tipo]}</span>
                <div class="alert-message">
                    ${titulo ? `<div class="alert-titulo">${titulo}</div>` : ''}
                    <div>${mensagem}</div>
                </div>
            </div>
            ${dismissible ? '<button class="alert-close" onclick="this.parentElement.remove()">×</button>' : ''}
        </div>
    `;
}

// Função helper para atualizar estrelas (usada no StarRating)
if (typeof window !== 'undefined') {
    window.updateStars = function(id, valor, max) {
        const container = document.getElementById(id + '-container');
        const stars = container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < valor) {
                star.classList.add('star-filled');
                star.classList.remove('star-empty');
                star.textContent = '★';
            } else {
                star.classList.remove('star-filled');
                star.classList.add('star-empty');
                star.textContent = '☆';
            }
        });
    };
}

// ========================================
// COMPONENTES DE TAREFAS (KANBAN)
// ========================================

/**
 * Helper: Obter iniciais do nome
 */
function getInitials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Helper: Formatar data (dd/mm)
 */
function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

/**
 * Helper: Tempo relativo (ex: "2h atrás")
 */
function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    return 'agora';
}

/**
 * Helper: Verificar se tarefa está atrasada
 */
function isTaskOverdue(tarefa) {
    if (!tarefa.data_prazo) return false;
    if (tarefa.status === 'concluido' || tarefa.status === 'cancelado') return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(tarefa.data_prazo + 'T00:00:00');
    prazo.setHours(0, 0, 0, 0);

    return prazo < hoje;
}

/**
 * Componente: Coluna do Kanban
 */
export function KanbanColumn({ status, tarefas }) {
    const statusConfig = {
        'novo': { label: 'Novo', icon: '📋', color: '#3b82f6' },
        'em_andamento': { label: 'Em Andamento', icon: '⚙️', color: '#f59e0b' },
        'concluido': { label: 'Concluído', icon: '✅', color: '#10b981' },
        'cancelado': { label: 'Cancelado', icon: '❌', color: '#6b7280' }
    };

    const config = statusConfig[status];
    const count = tarefas.length;

    return `
        <div class="kanban-column"
             data-status="${status}"
             ondrop="window.handleKanbanDrop && window.handleKanbanDrop(event, '${status}')"
             ondragover="event.preventDefault(); event.dataTransfer.dropEffect = 'move';">
            <div class="kanban-column-header" style="border-left: 4px solid ${config.color}">
                <span class="kanban-column-icon">${config.icon}</span>
                <h3 class="kanban-column-title">${config.label}</h3>
                <span class="kanban-column-count">${count}</span>
            </div>
            <div class="kanban-column-body">
                ${tarefas.length === 0 ? `
                    <div class="kanban-empty">
                        <span style="opacity: 0.5; font-size: 14px;">Nenhuma tarefa</span>
                    </div>
                ` : tarefas.map(tarefa => TaskCard({ tarefa })).join('')}
            </div>
        </div>
    `;
}

/**
 * Componente: Card de Tarefa
 */
export function TaskCard({ tarefa }) {
    const prioridadeColors = {
        'baixa': '#6b7280',
        'media': '#3b82f6',
        'alta': '#f59e0b',
        'urgente': '#ef4444'
    };

    const prioridadeLabels = {
        'baixa': 'Baixa',
        'media': 'Média',
        'alta': 'Alta',
        'urgente': 'Urgente'
    };

    const isOverdue = isTaskOverdue(tarefa);

    return `
        <div class="task-card"
             draggable="true"
             data-task-id="${tarefa.id}"
             ondragstart="window.handleTaskDragStart && window.handleTaskDragStart(event, ${tarefa.id})"
             onclick="window.abrirDetalhesTarefa && window.abrirDetalhesTarefa(${tarefa.id})">

            <!-- Header -->
            <div class="task-card-header">
                <span class="task-priority-badge"
                      style="background-color: ${prioridadeColors[tarefa.prioridade]}">
                    ${prioridadeLabels[tarefa.prioridade]}
                </span>
                ${isOverdue ? '<span class="task-overdue-badge">⚠️ Atrasada</span>' : ''}
            </div>

            <!-- Título -->
            <h4 class="task-card-title">${tarefa.titulo}</h4>

            <!-- Descrição (truncada) -->
            ${tarefa.descricao ? `
                <p class="task-card-description">
                    ${tarefa.descricao.substring(0, 80)}${tarefa.descricao.length > 80 ? '...' : ''}
                </p>
            ` : ''}

            <!-- Metadata -->
            <div class="task-card-meta">
                ${tarefa.funcionario_nome ? `
                    <div class="task-meta-item">
                        <span class="task-avatar">${getInitials(tarefa.funcionario_nome)}</span>
                        <span class="task-meta-text">${tarefa.funcionario_nome}</span>
                    </div>
                ` : ''}

                ${tarefa.obra_nome ? `
                    <div class="task-meta-item">
                        <span class="task-meta-icon">🏗️</span>
                        <span class="task-meta-text">${tarefa.obra_nome}</span>
                    </div>
                ` : ''}

                ${tarefa.data_prazo ? `
                    <div class="task-meta-item ${isOverdue ? 'task-meta-overdue' : ''}">
                        <span class="task-meta-icon">📅</span>
                        <span class="task-meta-text">${formatShortDate(tarefa.data_prazo)}</span>
                    </div>
                ` : ''}

                ${tarefa.comentarios_count > 0 ? `
                    <div class="task-meta-item">
                        <span class="task-meta-icon">💬</span>
                        <span class="task-meta-text">${tarefa.comentarios_count}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Componente: Thread de Comentários
 */
export function CommentThread({ comentarios, tarefaId }) {
    return `
        <div class="comment-thread">
            <div class="comment-thread-header">
                <h4>💬 Comentários (${comentarios.length})</h4>
            </div>

            <div class="comment-list">
                ${comentarios.length === 0 ? `
                    <div class="comment-empty">
                        <p style="text-align: center; color: #6b7280; padding: 20px;">
                            Nenhum comentário ainda. Seja o primeiro!
                        </p>
                    </div>
                ` : comentarios.map(c => CommentItem({ comentario: c })).join('')}
            </div>

            <div class="comment-form">
                <textarea id="novo-comentario-${tarefaId}"
                          class="comment-textarea"
                          placeholder="Adicionar um comentário..."
                          rows="3"></textarea>
                <button class="btn btn-primary"
                        onclick="window.adicionarComentario && window.adicionarComentario(${tarefaId})">
                    📤 Comentar
                </button>
            </div>
        </div>
    `;
}

/**
 * Componente: Item de Comentário
 */
export function CommentItem({ comentario }) {
    return `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-avatar">${getInitials(comentario.usuario_nome)}</span>
                <div class="comment-info">
                    <span class="comment-author">${comentario.usuario_nome}</span>
                    <span class="comment-time">${formatRelativeTime(comentario.criado_em)}</span>
                </div>
            </div>
            <div class="comment-body">
                ${comentario.comentario}
            </div>
        </div>
    `;
}

/**
 * Componente: Painel de Filtros de Tarefas
 */
export function TaskFilterPanel({ filters, funcionarios, obras, empresas }) {
    return `
        <div class="task-filter-panel">
            <div class="filter-header">
                <h3>🔍 Filtros</h3>
                <button class="btn-link" onclick="window.limparFiltrosTarefas && window.limparFiltrosTarefas()">
                    🔄 Limpar
                </button>
            </div>

            <div class="filter-grid">
                <!-- Filtro de Status -->
                <div class="filter-group">
                    <label>Status</label>
                    <select id="filtro-status" class="filter-select"
                            onchange="window.filtrarPorStatus && window.filtrarPorStatus(this.value)">
                        <option value="">Todos</option>
                        <option value="novo" ${filters.status === 'novo' ? 'selected' : ''}>Novo</option>
                        <option value="em_andamento" ${filters.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido" ${filters.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                        <option value="cancelado" ${filters.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>

                <!-- Filtro de Prioridade -->
                <div class="filter-group">
                    <label>Prioridade</label>
                    <select id="filtro-prioridade" class="filter-select"
                            onchange="window.filtrarPorPrioridade && window.filtrarPorPrioridade(this.value)">
                        <option value="">Todas</option>
                        <option value="urgente" ${filters.prioridade === 'urgente' ? 'selected' : ''}>Urgente</option>
                        <option value="alta" ${filters.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                        <option value="media" ${filters.prioridade === 'media' ? 'selected' : ''}>Média</option>
                        <option value="baixa" ${filters.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                    </select>
                </div>

                <!-- Filtro de Funcionário -->
                <div class="filter-group">
                    <label>Responsável</label>
                    <select id="filtro-funcionario" class="filter-select"
                            onchange="window.filtrarPorFuncionario && window.filtrarPorFuncionario(this.value)">
                        <option value="">Todos</option>
                        ${funcionarios.map(f => `
                            <option value="${f.id}" ${filters.funcionario == f.id ? 'selected' : ''}>
                                ${f.nome}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Filtro de Obra -->
                <div class="filter-group">
                    <label>Obra</label>
                    <select id="filtro-obra" class="filter-select"
                            onchange="window.filtrarPorObra && window.filtrarPorObra(this.value)">
                        <option value="">Todas</option>
                        ${obras.map(o => `
                            <option value="${o.id}" ${filters.obra == o.id ? 'selected' : ''}>
                                ${o.nome}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Filtro de Prazo -->
                <div class="filter-group">
                    <label>Prazo</label>
                    <select id="filtro-prazo" class="filter-select"
                            onchange="window.filtrarPorPrazo && window.filtrarPorPrazo(this.value)">
                        <option value="">Todas</option>
                        <option value="atrasada" ${filters.prazo === 'atrasada' ? 'selected' : ''}>🔥 Atrasadas</option>
                        <option value="hoje" ${filters.prazo === 'hoje' ? 'selected' : ''}>⚡ Hoje</option>
                        <option value="semana" ${filters.prazo === 'semana' ? 'selected' : ''}>📅 Esta Semana</option>
                        <option value="mes" ${filters.prazo === 'mes' ? 'selected' : ''}>📆 Este Mês</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}
