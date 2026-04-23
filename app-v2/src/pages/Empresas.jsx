import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import empresasService from '@/services/empresasService';
import useAuthStore from '@/store/authStore';

const formatCnpj = (value) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12, 14),
  ];
  if (digits.length <= 2) return parts[0];
  if (digits.length <= 5) return `${parts[0]}.${parts[1]}`;
  if (digits.length <= 8) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  if (digits.length <= 12) return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}-${parts[4]}`;
};

const ROWS_PER_PAGE = 10;

export default function Empresas() {
  const { isAdmin, hasPermission } = useAuthStore();

  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', cnpj: '', tipo: 'Construtora' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formFeedback, setFormFeedback] = useState('');
  const [actionStatus, setActionStatus] = useState(null);
  const statusTimeoutRef = useRef();

  const canCreate = isAdmin() || hasPermission('empresas', 'criar');
  const canEdit = isAdmin() || hasPermission('empresas', 'editar');
  const canDelete = isAdmin() || hasPermission('empresas', 'excluir');

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const showActionStatus = (type, message) => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    setActionStatus({ type, text: message });
    statusTimeoutRef.current = setTimeout(() => {
      setActionStatus(null);
    }, 4200);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredEmpresas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return empresas;
    return empresas.filter((empresa) => {
      const nome = empresa?.nome?.toLowerCase() || '';
      const cnpj = empresa?.cnpj?.toLowerCase() || '';
      return nome.includes(term) || cnpj.includes(term);
    });
  }, [empresas, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmpresas.length / ROWS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((prev) => (prev > totalPages ? totalPages : prev));
  }, [totalPages]);

  const paginatedEmpresas = filteredEmpresas.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const startIndex = filteredEmpresas.length
    ? (currentPage - 1) * ROWS_PER_PAGE + 1
    : 0;
  const endIndex = filteredEmpresas.length
    ? Math.min(startIndex + paginatedEmpresas.length - 1, filteredEmpresas.length)
    : 0;

  async function loadEmpresas() {
    setLoading(true);
    try {
      const response = await empresasService.list();
      const list = Array.isArray(response) ? response : (Array.isArray(response?.dados) ? response.dados : []);
      list.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      setEmpresas(list);
    } catch (error) {
      toast.error('Não foi possível carregar as empresas');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setFormData({ nome: '', cnpj: '', tipo: 'Construtora' });
    setFormStatus('idle');
    setFormFeedback('');
    setIsModalOpen(true);
  }

  function openEditModal(empresa) {
    setEditingId(empresa.id);
    setFormData({
      nome: empresa.nome || '',
      cnpj: formatCnpj(empresa.cnpj || ''),
      tipo: empresa.tipo || 'Construtora',
    });
    setFormStatus('idle');
    setFormFeedback('');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormStatus('idle');
    setFormFeedback('');
    setIsSubmitting(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.nome.trim()) {
      const message = 'Informe o nome da empresa';
      setFormStatus('error');
      setFormFeedback(message);
      showActionStatus('error', message);
      toast.error(message);
      return;
    }

    const cleanCnpj = formData.cnpj.replace(/\D/g, '');
    if (cleanCnpj && cleanCnpj.length !== 14) {
      const message = 'CNPJ deve ter 14 dígitos';
      setFormStatus('error');
      setFormFeedback(message);
      showActionStatus('error', message);
      toast.error(message);
      return;
    }

    setFormStatus('loading');
    setFormFeedback('');
    setIsSubmitting(true);

    try {
      const payload = { ...formData, cnpj: formData.cnpj };
      let response;
      if (editingId) {
        response = await empresasService.update(editingId, payload);
      } else {
        response = await empresasService.create(payload);
      }

      const successMessage = editingId
        ? response?.mensagem || 'Empresa atualizada com sucesso'
        : response?.mensagem || 'Empresa criada com sucesso';
      toast.success(successMessage);
      showActionStatus('success', successMessage);

      await loadEmpresas();
      closeModal();
    } catch (error) {
      const message = error.response?.data?.mensagem || 'Erro ao salvar empresa';
      setFormStatus('error');
      setFormFeedback(message);
      showActionStatus('error', message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!canDelete) return;

    const confirmed = window.confirm('Excluir esta empresa? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
      const response = await empresasService.remove(id);
      toast.success(response?.mensagem || 'Empresa excluída');
      loadEmpresas();
    } catch (error) {
      const message = error.response?.data?.mensagem || 'Erro ao excluir empresa';
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Cadastre e gerencie as empresas associadas às obras.</p>
        </div>

        <Button onClick={openCreateModal} disabled={!canCreate}>
          <Plus className="w-4 h-4" />
          Nova empresa
        </Button>
      </div>

      {actionStatus && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            actionStatus.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {actionStatus.text}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-xl">Lista de empresas</CardTitle>
          <div className="w-full md:w-72">
            <Input
              placeholder="Buscar por nome ou CNPJ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center text-gray-500 py-6">Carregando empresas...</div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="text-center text-gray-500 py-6">Nenhuma empresa encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CNPJ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedEmpresas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{empresa.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatCnpj(empresa.cnpj) || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{empresa.tipo || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(empresa)}
                          disabled={!canEdit}
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(empresa.id)}
                          disabled={!canDelete}
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredEmpresas.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
              <span>
                Exibindo {startIndex}-{endIndex} de {filteredEmpresas.length} empresas
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Editar empresa' : 'Nova empresa'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-md">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite o nome da empresa"
                    required
                    disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="Construtora, Fornecedor, etc"
                  disabled={isSubmitting}
                />
              </div>

              {(formStatus === 'loading' || formFeedback) && (
                <p className={`text-sm ${formStatus === 'error' ? 'text-rose-600' : 'text-gray-500'}`}>
                  {formStatus === 'loading'
                    ? 'Salvando empresa, aguarde...'
                    : formFeedback}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? editingId
                      ? 'Salvando alterações...'
                      : 'Criando empresa...'
                    : editingId
                      ? 'Salvar alterações'
                      : 'Criar empresa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
