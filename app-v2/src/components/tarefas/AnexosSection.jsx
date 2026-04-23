import { useState, useRef } from 'react';
import { Paperclip, Upload, Download, Eye, Trash2, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import tarefasService from '@/services/tarefasService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AnexosSection = ({ tarefaId, anexos, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    // Validar tamanho (max 10MB)
    if (arquivo.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    setUploading(true);
    try {
      await tarefasService.uploadAnexo(tarefaId, arquivo);
      toast.success('Arquivo enviado com sucesso!');
      onUpdate();

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleExcluir = async (anexoId) => {
    if (!confirm('Excluir este anexo?')) return;

    try {
      await tarefasService.excluirAnexo(anexoId);
      toast.success('Anexo excluído!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir anexo:', error);
      toast.error('Erro ao excluir anexo');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (tipo_mime) => {
    if (tipo_mime?.startsWith('image/')) return null; // Usa preview
    if (tipo_mime?.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (tipo_mime?.includes('word')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (tipo_mime?.includes('excel') || tipo_mime?.includes('spreadsheet')) {
      return <FileText className="w-8 h-8 text-green-500" />;
    }
    if (tipo_mime?.includes('zip') || tipo_mime?.includes('rar')) {
      return <File className="w-8 h-8 text-orange-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          Anexos
        </h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Enviando...' : 'Upload'}
          </Button>
        </div>
      </div>

      {/* Grid de Anexos */}
      {anexos.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          Nenhum anexo
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {anexos.map((anexo) => {
            const isImage = anexo.tipo_mime?.startsWith('image/');

            return (
              <div
                key={anexo.id}
                className="group relative border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Preview ou Ícone */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={anexo.caminho}
                      alt={anexo.nome_original}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getFileIcon(anexo.tipo_mime)
                  )}
                </div>

                {/* Overlay com ações (hover) */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {isImage && (
                    <a
                      href={anexo.caminho}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4 text-gray-700" />
                    </a>
                  )}
                  <a
                    href={anexo.caminho}
                    download
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </a>
                  <button
                    onClick={() => handleExcluir(anexo.id)}
                    className="p-2 bg-white rounded-full hover:bg-red-50"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                {/* Info do arquivo */}
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-gray-900 truncate" title={anexo.nome_original}>
                    {anexo.nome_original}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{formatFileSize(anexo.tamanho)}</span>
                    {anexo.criado_em && (
                      <span title={format(new Date(anexo.criado_em), 'PPp', { locale: ptBR })}>
                        {format(new Date(anexo.criado_em), 'dd/MM', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnexosSection;
