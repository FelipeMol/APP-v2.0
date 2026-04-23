import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', className: 'bg-gray-100 text-gray-700' },
  { value: 'em_andamento', label: 'Em Andamento', className: 'bg-blue-100 text-blue-700' },
  { value: 'concluida', label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  { value: 'atrasada', label: 'Atrasada', className: 'bg-rose-100 text-rose-700' },
];

export default function EditableCell({
  value,
  type = 'text',
  isEditing = false,
  onStartEdit,
  onSave,
  onCancel,
  className = '',
  placeholder = '',
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' && inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value);
      onCancel();
    }
  };

  const handleBlur = () => {
    if (editValue !== value) {
      onSave(editValue);
    } else {
      onCancel();
    }
  };

  // Renderiza valor formatado (não editando)
  const renderDisplayValue = () => {
    switch (type) {
      case 'date':
        if (!value) return <span className="text-gray-400">-</span>;
        try {
          return format(parseISO(value), 'dd/MM/yy', { locale: ptBR });
        } catch {
          return value;
        }

      case 'progress':
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${value || 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8">{value || 0}%</span>
          </div>
        );

      case 'status':
        const status = STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];
        return (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${status.className}`}>
            {status.label}
          </span>
        );

      case 'duration':
        return <span className="text-gray-600">{value || 0} dias</span>;

      default:
        return <span className="truncate block">{value || <span className="text-gray-400">{placeholder || '-'}</span>}</span>;
    }
  };

  // Renderiza input de edição
  const renderEditInput = () => {
    switch (type) {
      case 'date':
        return (
          <input
            ref={inputRef}
            type="date"
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );

      case 'progress':
        return (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="100"
              step="5"
              value={editValue || 0}
              onChange={(e) => setEditValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-12 px-1 py-0.5 text-sm text-center border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        );

      case 'status':
        return (
          <select
            ref={inputRef}
            value={editValue || 'pendente'}
            onChange={(e) => {
              setEditValue(e.target.value);
              onSave(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            ref={inputRef}
            type="text"
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
    }
  };

  if (isEditing) {
    return (
      <div className={`${className}`}>
        {renderEditInput()}
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors overflow-hidden ${className}`}
      onDoubleClick={onStartEdit}
    >
      {renderDisplayValue()}
    </div>
  );
}
