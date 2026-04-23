import { useState, useRef } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  FileText as FileIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import relatoriosService from '@/services/relatoriosService';

/**
 * Seção de fotos/documentos do relatório
 * @param {Object} props
 * @param {number} props.relatorioId - ID do relatório
 * @param {Array} props.fotos - Lista de fotos
 * @param {Function} props.onUpdate - Callback para atualizar dados
 * @param {boolean} props.readOnly - Se é apenas leitura
 */
export default function FotosRelatorioSection({ relatorioId, fotos = [], onUpdate, readOnly = false }) {
  const [expandido, setExpandido] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const fileInputRef = useRef(null);

  // Formatar tamanho do arquivo
  const formatarTamanho = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Upload de arquivo
  const handleUpload = async (e) => {
    const arquivos = e.target.files;
    if (!arquivos || arquivos.length === 0) return;

    setUploading(true);

    for (const arquivo of arquivos) {
      // Validar tamanho
      if (arquivo.size > 10 * 1024 * 1024) {
        toast.error(`${arquivo.name}: Arquivo muito grande (máx 10MB)`);
        continue;
      }

      try {
        const response = await relatoriosService.uploadFotoRelatorio(relatorioId, arquivo);

        if (response?.sucesso) {
          toast.success(`${arquivo.name} enviado com sucesso!`);
        } else {
          toast.error(response?.mensagem || `Erro ao enviar ${arquivo.name}`);
        }
      } catch (error) {
        console.error('Erro no upload:', error);
        toast.error(`Erro ao enviar ${arquivo.name}`);
      }
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(false);
    onUpdate?.();
  };

  // Excluir foto
  const handleExcluir = async (fotoId) => {
    if (!confirm('Deseja excluir esta foto?')) return;

    setExcluindo(fotoId);
    try {
      const response = await relatoriosService.excluirFotoRelatorio(fotoId);

      if (response?.sucesso) {
        toast.success('Foto excluída com sucesso!');
        onUpdate?.();
      } else {
        toast.error(response?.mensagem || 'Erro ao excluir foto');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir foto');
    } finally {
      setExcluindo(null);
    }
  };

  // Verificar se é imagem
  const isImage = (foto) => {
    return foto.tipo_mime?.startsWith('image/') || foto.tipo === 'foto';
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setExpandido(!expandido)}
              >
                {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Fotos e Documentos
                <span className="text-sm font-normal text-gray-500">
                  ({fotos.length} {fotos.length === 1 ? 'arquivo' : 'arquivos'})
                </span>
              </CardTitle>
            </div>

            {expandido && !readOnly && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {expandido && (
          <CardContent>
            {fotos.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">Nenhuma foto ou documento anexado.</p>
                {!readOnly && (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Arquivo
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {fotos.map((foto) => (
                  <div
                    key={foto.id}
                    className="group relative border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
                  >
                    {/* Preview */}
                    <div
                      className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={() => isImage(foto) && setFotoAmpliada(foto)}
                    >
                      {isImage(foto) ? (
                        <img
                          src={foto.url || foto.caminho}
                          alt={foto.titulo || foto.nome_original}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                            e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full"><svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }}
                        />
                      ) : (
                        <FileIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>

                    {/* Overlay com ações */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {isImage(foto) && (
                        <button
                          onClick={() => setFotoAmpliada(foto)}
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 text-gray-700" />
                        </button>
                      )}
                      <a
                        href={foto.download_url || foto.url || foto.caminho}
                        download={foto.nome_original}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                        title="Baixar"
                      >
                        <Download className="w-4 h-4 text-gray-700" />
                      </a>
                      {!readOnly && (
                        <button
                          onClick={() => handleExcluir(foto.id)}
                          disabled={excluindo === foto.id}
                          className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          {excluindo === foto.id ? (
                            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Info do arquivo */}
                    <div className="p-2 bg-white border-t">
                      <p className="text-xs font-medium text-gray-900 truncate" title={foto.nome_original}>
                        {foto.titulo || foto.nome_original}
                      </p>
                      {foto.tamanho && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatarTamanho(foto.tamanho)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Botão de adicionar */}
                {!readOnly && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-500">Adicionar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal de visualização ampliada */}
      <Dialog open={!!fotoAmpliada} onOpenChange={() => setFotoAmpliada(null)}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">
                {fotoAmpliada?.titulo || fotoAmpliada?.nome_original}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <a
                  href={fotoAmpliada?.download_url || fotoAmpliada?.url || fotoAmpliada?.caminho}
                  download={fotoAmpliada?.nome_original}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                </a>
                <button
                  onClick={() => setFotoAmpliada(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[400px]">
            {fotoAmpliada && (
              <img
                src={fotoAmpliada.url || fotoAmpliada.caminho}
                alt={fotoAmpliada.titulo || fotoAmpliada.nome_original}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          {fotoAmpliada?.descricao && (
            <div className="p-4 border-t">
              <p className="text-sm text-gray-600">{fotoAmpliada.descricao}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
