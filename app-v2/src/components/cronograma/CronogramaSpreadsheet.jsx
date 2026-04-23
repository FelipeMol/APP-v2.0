import { useRef, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, MoreHorizontal, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import EditableCell from './EditableCell';
import useCronogramaStore from '@/store/cronogramaStore';

// Cores disponíveis para categorias
const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#22c55e', // green
  '#eab308', // yellow
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#64748b', // slate
];

export default function CronogramaSpreadsheet({ onScrollSync, columnWidth, onColumnResize }) {
  const containerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const {
    buildTree,
    toggleExpand,
    setEditingCell,
    editingCell,
    atualizarItem,
    adicionarSubcategoria,
    excluirItem,
    calcularDuracao,
  } = useCronogramaStore();

  const items = buildTree();

  const isEditingCell = (id, field) => {
    return editingCell?.id === id && editingCell?.field === field;
  };

  const handleCellSave = (id, field, value) => {
    atualizarItem(id, field, value);
  };

  const handleCellCancel = () => {
    setEditingCell(null, null);
  };

  // Resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidth;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(200, Math.min(600, resizeStartWidth.current + diff));
      onColumnResize?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidth, onColumnResize]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      onScroll={(e) => onScrollSync?.(e.target.scrollTop)}
      style={{ cursor: isResizing ? 'col-resize' : undefined }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200" style={{ height: '45px' }}>
        <div
          className="grid gap-px px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider h-full items-center"
          style={{
            gridTemplateColumns: `32px ${columnWidth}px 75px 75px 50px 80px 75px 36px`,
          }}
        >
          <div></div>
          <div className="pl-6 flex items-center relative">
            Nome
            {/* Resize handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 transition-colors"
              onMouseDown={handleResizeStart}
              style={{ marginRight: '-2px' }}
            />
          </div>
          <div className="text-center">Início</div>
          <div className="text-center">Fim</div>
          <div className="text-center">Dias</div>
          <div className="text-center">Progresso</div>
          <div className="text-center">Status</div>
          <div></div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <CronogramaRow
            key={item.id}
            item={item}
            columnWidth={columnWidth}
            isEditingCell={isEditingCell}
            onToggleExpand={() => toggleExpand(item.id)}
            onStartEdit={(field) => setEditingCell(item.id, field)}
            onSaveCell={(field, value) => handleCellSave(item.id, field, value)}
            onCancelEdit={handleCellCancel}
            onAddChild={() => adicionarSubcategoria(item.id)}
            onDelete={() => excluirItem(item.id)}
            calcularDuracao={calcularDuracao}
          />
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum item no cronograma.</p>
            <p className="text-sm mt-1">Clique em "+ Categoria" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CronogramaRow({
  item,
  columnWidth,
  isEditingCell,
  onToggleExpand,
  onStartEdit,
  onSaveCell,
  onCancelEdit,
  onAddChild,
  onDelete,
  calcularDuracao,
}) {
  const duracao = calcularDuracao(item.data_inicio_planejada, item.data_fim_planejada);
  const isParent = item.hasChildren;
  const indentPadding = item.level * 20;

  const handleColorChange = (color) => {
    onSaveCell('cor', color);
  };

  return (
    <div
      className={`grid gap-px px-2 items-center hover:bg-gray-50 transition-colors group ${
        item.level === 0 ? 'bg-gray-50/50 font-medium' : ''
      }`}
      style={{
        height: '41px',
        gridTemplateColumns: `32px ${columnWidth}px 75px 75px 50px 80px 75px 36px`,
      }}
    >
      {/* Expand/Collapse ou botão + */}
      <div className="flex justify-center">
        {isParent ? (
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {item.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ) : (
          <button
            onClick={onAddChild}
            className="p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Adicionar subcategoria"
          >
            <Plus className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Nome */}
      <div style={{ paddingLeft: `${indentPadding}px` }} className="flex items-center gap-2 min-w-0 overflow-hidden">
        {/* Color indicator - clicável */}
        <div className="relative flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-3 h-3 rounded-full hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all"
                style={{ backgroundColor: item.cor || '#6366f1' }}
                title="Mudar cor"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 grid grid-cols-6 gap-1 min-w-0">
              {COLORS.map((color) => (
                <DropdownMenuItem
                  key={color}
                  onSelect={() => handleColorChange(color)}
                  className={`h-5 w-5 p-0 rounded-full hover:scale-110 transition-transform focus:bg-transparent ${
                    item.cor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <EditableCell
            value={item.fase}
            type="text"
            isEditing={isEditingCell(item.id, 'fase')}
            onStartEdit={() => onStartEdit('fase')}
            onSave={(value) => onSaveCell('fase', value)}
            onCancel={onCancelEdit}
            className="w-full truncate"
            placeholder="Nome da fase"
          />
        </div>
        {/* Botão + visível para adicionar subcategoria */}
        {item.level === 0 && (
          <button
            onClick={onAddChild}
            className="p-1 hover:bg-indigo-100 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Adicionar subcategoria"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
          </button>
        )}
      </div>

      {/* Data Início */}
      <EditableCell
        value={item.data_inicio_planejada}
        type="date"
        isEditing={isEditingCell(item.id, 'data_inicio_planejada')}
        onStartEdit={() => onStartEdit('data_inicio_planejada')}
        onSave={(value) => onSaveCell('data_inicio_planejada', value)}
        onCancel={onCancelEdit}
        className="text-center text-sm"
      />

      {/* Data Fim */}
      <EditableCell
        value={item.data_fim_planejada}
        type="date"
        isEditing={isEditingCell(item.id, 'data_fim_planejada')}
        onStartEdit={() => onStartEdit('data_fim_planejada')}
        onSave={(value) => onSaveCell('data_fim_planejada', value)}
        onCancel={onCancelEdit}
        className="text-center text-sm"
      />

      {/* Duração */}
      <div className="text-center text-sm text-gray-600">
        {duracao > 0 ? `${duracao}d` : '-'}
      </div>

      {/* Progresso */}
      <EditableCell
        value={item.progresso}
        type="progress"
        isEditing={isEditingCell(item.id, 'progresso')}
        onStartEdit={() => onStartEdit('progresso')}
        onSave={(value) => onSaveCell('progresso', value)}
        onCancel={onCancelEdit}
        className="px-1"
      />

      {/* Status */}
      <EditableCell
        value={item.status}
        type="status"
        isEditing={isEditingCell(item.id, 'status')}
        onStartEdit={() => onStartEdit('status')}
        onSave={(value) => onSaveCell('status', value)}
        onCancel={onCancelEdit}
        className="text-center"
      />

      {/* Ações */}
      <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onAddChild}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar subcategoria
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
