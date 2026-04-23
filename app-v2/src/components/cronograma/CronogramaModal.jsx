import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  Plus,
  Download,
  ChevronLeft,
  Loader2,
  Save,
  FolderOpen,
  FolderMinus,
} from 'lucide-react';
import CronogramaSpreadsheet from './CronogramaSpreadsheet';
import CronogramaTimeline from './CronogramaTimeline';
import useCronogramaStore from '@/store/cronogramaStore';
import toast from 'react-hot-toast';

export default function CronogramaModal({ open, onOpenChange, obraId, obraNome }) {
  const [scrollTop, setScrollTop] = useState(0);
  const [columnWidth, setColumnWidth] = useState(220); // Largura inicial da coluna Nome

  const {
    carregarCronograma,
    adicionarCategoria,
    expandAll,
    collapseAll,
    salvarAlteracoes,
    reset,
    isLoading,
    isSaving,
    hasChanges,
    zoomLevel,
    setZoom,
  } = useCronogramaStore();

  // Carrega dados quando abre o modal
  useEffect(() => {
    if (open && obraId) {
      carregarCronograma(obraId);
    }

    // Cleanup quando fecha
    return () => {
      if (!open) {
        reset();
      }
    };
  }, [open, obraId, carregarCronograma, reset]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (window.confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleSave = async () => {
    const success = await salvarAlteracoes();
    if (success) {
      toast.success('Cronograma salvo com sucesso!');
    } else {
      toast.error('Erro ao salvar cronograma');
    }
  };

  const handleAddCategory = () => {
    adicionarCategoria();
    toast.success('Nova categoria adicionada');
  };

  const handleExport = () => {
    // TODO: Implementar exportação para Excel
    toast.info('Exportação em desenvolvimento');
  };

  const handleScrollSync = useCallback((top) => {
    setScrollTop(top);
  }, []);

  const handleColumnResize = useCallback((width) => {
    setColumnWidth(width);
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasChanges, handleClose]);

  // Calcula largura total do spreadsheet baseado na coluna nome
  const spreadsheetWidth = 32 + columnWidth + 75 + 75 + 50 + 80 + 75 + 36 + 20; // +20 padding

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Cronograma Detalhado
                </DialogTitle>
                {obraNome && (
                  <p className="text-sm text-gray-500">{obraNome}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Indicador de alterações */}
              {hasChanges && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Alterações não salvas
                </span>
              )}

              {/* Botão Salvar */}
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </Button>

              {/* Fechar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCategory}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Categoria
            </Button>

            <div className="h-6 w-px bg-gray-300 mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="gap-2 text-gray-600"
              title="Expandir todos"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="gap-2 text-gray-600"
              title="Recolher todos"
            >
              <FolderMinus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
              <Button
                variant={zoomLevel === 'week' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom('week')}
                className="h-7 px-2 text-xs"
              >
                Semana
              </Button>
              <Button
                variant={zoomLevel === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom('month')}
                className="h-7 px-2 text-xs"
              >
                Mês
              </Button>
              <Button
                variant={zoomLevel === 'quarter' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom('quarter')}
                className="h-7 px-2 text-xs"
              >
                Trimestre
              </Button>
              <Button
                variant={zoomLevel === 'full' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom('full')}
                className="h-7 px-2 text-xs"
              >
                Completo
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300 mx-2" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              {/* Spreadsheet (lado esquerdo) */}
              <div
                className="flex flex-col border-r border-gray-200 flex-shrink-0"
                style={{ width: `${spreadsheetWidth}px` }}
              >
                <CronogramaSpreadsheet
                  onScrollSync={handleScrollSync}
                  columnWidth={columnWidth}
                  onColumnResize={handleColumnResize}
                />
              </div>

              {/* Timeline (lado direito) */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <CronogramaTimeline
                  scrollTop={scrollTop}
                  onScroll={handleScrollSync}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 bg-gray-50 flex-shrink-0">
          <div>
            Dica: Dê duplo-clique para editar | Clique na bolinha colorida para mudar a cor
          </div>
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">Ctrl</kbd>
              {' + '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">S</kbd>
              {' para salvar'}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">Esc</kbd>
              {' para fechar'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
