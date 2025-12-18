// ========================================
// TABLE.JS - Sistema completo de tabelas com filtros, paginação e ordenação
// ========================================

import { formatarData, formatarHora } from './utils.js';

/**
 * Classe para gerenciar tabelas com filtros, paginação e ordenação
 */
export class DataTable {
    constructor(config) {
        this.config = {
            tableId: config.tableId,
            data: config.data || [],
            columns: config.columns || [],
            pageSize: config.pageSize || 50,
            currentPage: 1,
            filters: config.filters || {},
            sortColumn: config.sortColumn || null,
            sortDirection: config.sortDirection || 'asc',
            onEdit: config.onEdit || null,
            onDelete: config.onDelete || null,
            emptyMessage: config.emptyMessage || 'Nenhum registro encontrado',
            enableFilters: config.enableFilters !== false,
            enablePagination: config.enablePagination !== false,
            enableSort: config.enableSort !== false
        };

        this.filteredData = [];
        this.paginatedData = [];
    }

    /**
     * Atualizar dados da tabela
     */
    setData(data) {
        this.config.data = data;
        this.render();
    }

    /**
     * Aplicar filtros aos dados
     */
    applyFilters() {
        let data = [...this.config.data];

        Object.keys(this.config.filters).forEach(key => {
            const value = this.config.filters[key];
            if (!value) return;

            // Filtro de data (início/fim)
            if (key === 'dataInicio') {
                data = data.filter(row => (row.data || '') >= value);
            } else if (key === 'dataFim') {
                data = data.filter(row => (row.data || '') <= value);
            } else {
                // Filtro exato para outros campos
                data = data.filter(row => row[key] === value);
            }
        });

        return data;
    }

    /**
     * Aplicar ordenação
     */
    applySort(data) {
        if (!this.config.sortColumn) return data;

        const col = this.config.sortColumn;
        const dir = this.config.sortDirection;

        return [...data].sort((a, b) => {
            let va = a[col] ?? '';
            let vb = b[col] ?? '';

            // Datas YYYY-MM-DD
            if (col === 'data') {
                return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            }

            // Horas HH:MM
            if (col === 'horas') {
                const toMin = v => {
                    const [h, m] = String(v || '00:00').slice(0, 5).split(':').map(Number);
                    return (h || 0) * 60 + (m || 0);
                };
                return dir === 'asc' ? (toMin(va) - toMin(vb)) : (toMin(vb) - toMin(va));
            }

            // Textos
            va = String(va).toUpperCase();
            vb = String(vb).toUpperCase();
            const cmp = va.localeCompare(vb, 'pt-BR');
            return dir === 'asc' ? cmp : -cmp;
        });
    }

    /**
     * Aplicar paginação
     */
    applyPagination(data) {
        if (!this.config.enablePagination) return data;

        const totalPages = Math.max(1, Math.ceil(data.length / this.config.pageSize));
        if (this.config.currentPage > totalPages) {
            this.config.currentPage = totalPages;
        }

        const start = (this.config.currentPage - 1) * this.config.pageSize;
        return data.slice(start, start + this.config.pageSize);
    }

    /**
     * Renderizar tabela completa
     */
    render() {
        const tbody = document.getElementById(this.config.tableId);
        if (!tbody) return;

        // 1. Aplicar filtros
        this.filteredData = this.applyFilters();

        // 2. Aplicar ordenação
        this.filteredData = this.applySort(this.filteredData);

        // 3. Aplicar paginação
        this.paginatedData = this.applyPagination(this.filteredData);

        // 4. Renderizar linhas
        if (this.paginatedData.length === 0) {
            const colCount = this.config.columns.length + (this.config.onEdit || this.config.onDelete ? 1 : 0);
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="loading">${this.config.emptyMessage}</td></tr>`;
        } else {
            tbody.innerHTML = this.paginatedData.map(row => this.renderRow(row)).join('');
        }

        // 5. Renderizar paginação
        if (this.config.enablePagination) {
            this.renderPagination();
        }
    }

    /**
     * Renderizar uma linha da tabela
     */
    renderRow(row) {
        const cells = this.config.columns.map(col => {
            let value = row[col.field];

            // Aplicar formatação personalizada
            if (col.format) {
                value = col.format(value, row);
            } else if (col.field === 'data') {
                value = formatarData(value);
            } else if (col.field === 'horas') {
                value = formatarHora(value);
            }

            return `<td>${value || '-'}</td>`;
        }).join('');

        // Adicionar coluna de ações se configurado
        let actions = '';
        if (this.config.onEdit || this.config.onDelete) {
            actions = '<td>';
            if (this.config.onEdit) {
                actions += `<button onclick="${this.config.onEdit}(${row.id})" class="btn btn-sm btn-secondary">✏️ Editar</button> `;
            }
            if (this.config.onDelete) {
                actions += `<button onclick="${this.config.onDelete}(${row.id})" class="btn btn-sm btn-danger">🗑️ Excluir</button>`;
            }
            actions += '</td>';
        }

        return `<tr>${cells}${actions}</tr>`;
    }

    /**
     * Renderizar controles de paginação
     */
    renderPagination() {
        // Tentar encontrar o container específico da tabela ou usar o padrão 'lanc-paginacao'
        let container = document.getElementById(`${this.config.tableId}-paginacao`);
        if (!container && this.config.tableId === 'tabela-lancamentos') {
            container = document.getElementById('lanc-paginacao');
        }

        if (!container) {
            console.warn('⚠️ Container de paginação não encontrado:', `${this.config.tableId}-paginacao ou lanc-paginacao`);
            return;
        }

        const totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.config.pageSize));
        console.log(`📄 Paginação: ${this.filteredData.length} registros, ${totalPages} páginas, tamanho: ${this.config.pageSize}`);

        // Sempre mostrar paginação para debug - comentar depois
        // if (totalPages <= 1) {
        //     container.innerHTML = '';
        //     return;
        // }

        container.innerHTML = `
            <div class="pagination-controls">
                <button id="${this.config.tableId}-prev" class="btn btn-sm" ${this.config.currentPage <= 1 ? 'disabled' : ''}>◀️ Anterior</button>
                <span class="page-info">Página ${this.config.currentPage} de ${totalPages}</span>
                <button id="${this.config.tableId}-next" class="btn btn-sm" ${this.config.currentPage >= totalPages ? 'disabled' : ''}>Próxima ▶️</button>
            </div>
        `;

        // Event listeners
        const btnPrev = document.getElementById(`${this.config.tableId}-prev`);
        const btnNext = document.getElementById(`${this.config.tableId}-next`);

        if (btnPrev) {
            btnPrev.onclick = () => {
                if (this.config.currentPage > 1) {
                    this.config.currentPage--;
                    this.render();
                }
            };
        }

        if (btnNext) {
            btnNext.onclick = () => {
                if (this.config.currentPage < totalPages) {
                    this.config.currentPage++;
                    this.render();
                }
            };
        }
    }

    /**
     * Configurar ordenação por clique no cabeçalho
     */
    setupSortableHeaders(headerIds) {
        headerIds.forEach(({ id, field }) => {
            const el = document.getElementById(id);
            if (!el) return;

            el.classList.add('sortable');
            el.style.cursor = 'pointer';

            el.addEventListener('click', () => {
                if (this.config.sortColumn === field) {
                    this.config.sortDirection = this.config.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.config.sortColumn = field;
                    this.config.sortDirection = 'asc';
                }
                this.render();

                // Atualizar indicador visual
                headerIds.forEach(h => {
                    const header = document.getElementById(h.id);
                    if (header) header.classList.remove('sort-asc', 'sort-desc');
                });
                el.classList.add(`sort-${this.config.sortDirection}`);
            });
        });
    }

    /**
     * Atualizar filtro
     */
    setFilter(key, value) {
        this.config.filters[key] = value;
        this.config.currentPage = 1; // Resetar para primeira página
        this.render();
    }

    /**
     * Atualizar tamanho da página
     */
    setPageSize(size) {
        this.config.pageSize = Number(size) || 50;
        this.config.currentPage = 1;
        this.render();
    }
}

/**
 * Criar painel de filtros para uma tabela
 */
export function createFilterPanel(config) {
    const {
        tableId,
        filters = [],
        onFilterChange = () => {}
    } = config;

    const filterItems = filters.map(filter => {
        const { type, id, label, options = [] } = filter;

        if (type === 'date') {
            return `
                <div class="filter-item">
                    <span class="filter-label">${label}</span>
                    <input type="date" id="${id}" class="ctrl-input" />
                </div>
            `;
        }

        if (type === 'select') {
            const optionsHtml = options.map(opt =>
                `<option value="${opt.value}">${opt.label}</option>`
            ).join('');

            return `
                <div class="filter-item">
                    <span class="filter-label">${label}</span>
                    <select id="${id}" class="ctrl-select">
                        <option value="">Todos</option>
                        ${optionsHtml}
                    </select>
                </div>
            `;
        }

        return '';
    }).join('');

    return `
        <div class="lancamentos-controls">
            <div class="lanc-toolbar">
                <button id="${tableId}-toggle-filtros" class="btn-icon" title="Filtros">🔍 Filtros</button>
                <div class="spacer"></div>
                <label class="page-size-label" for="${tableId}-page-size">Itens:</label>
                <select id="${tableId}-page-size" class="ctrl-select mini">
                    <option value="25">25 por página</option>
                    <option value="50" selected>50 por página</option>
                    <option value="100">100 por página</option>
                    <option value="200">200 por página</option>
                    <option value="500">500 por página</option>
                </select>
                <div id="${tableId}-paginacao" class="pagination-container compact"></div>
            </div>
            <div id="${tableId}-filtros-panel" class="filters-panel collapsed">
                <div class="filters-row">
                    ${filterItems}
                </div>
            </div>
        </div>
    `;
}

/**
 * Configurar event listeners para painel de filtros
 */
export function setupFilterPanel(tableId, onFilterChange) {
    const btnToggle = document.getElementById(`${tableId}-toggle-filtros`);
    const panel = document.getElementById(`${tableId}-filtros-panel`);
    const pageSize = document.getElementById(`${tableId}-page-size`);

    // Toggle painel de filtros
    if (btnToggle && panel) {
        btnToggle.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
        });
    }

    // Mudança de tamanho de página
    if (pageSize) {
        pageSize.addEventListener('change', () => {
            onFilterChange('pageSize', pageSize.value);
        });
    }
}

/**
 * Popular select de filtro com opções únicas dos dados
 */
export function populateFilterSelect(selectId, data, field, allLabel = 'Todos') {
    const select = document.getElementById(selectId);
    if (!select) return;

    const uniqueValues = [...new Set(data.map(item => item[field]).filter(Boolean))].sort();

    select.innerHTML = `<option value="">${allLabel}</option>` +
        uniqueValues.map(value => `<option value="${value}">${value}</option>`).join('');
}
