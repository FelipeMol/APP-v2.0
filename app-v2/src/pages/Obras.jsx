import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/store/authStore';
import obrasService from '@/services/obrasService';
import funcionariosService from '@/services/funcionariosService';

export default function Obras() {
  const { isAdmin, hasPermission } = useAuthStore();

  const [items, setItems] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', responsavel: '', cidade: '' });
  const [responsavelManual, setResponsavelManual] = useState('');
  const [useCustomResponsavel, setUseCustomResponsavel] = useState(false);

  const canView = isAdmin() || hasPermission('obras', 'visualizar');
  const canCreate = isAdmin() || hasPermission('obras', 'criar');
  const canEdit = isAdmin() || hasPermission('obras', 'editar');
  const canDelete = isAdmin() || hasPermission('obras', 'excluir');
  const canViewFuncionarios = isAdmin() || hasPermission('funcionarios', 'visualizar');

  useEffect(() => {
    if (canView) {
      loadData();
      loadFuncionarios();
    }
  }, [canView]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const nome = item?.nome?.toLowerCase() || '';
      const responsavel = item?.responsavel?.toLowerCase() || '';
      const cidade = item?.cidade?.toLowerCase() || '';
      return nome.includes(term) || responsavel.includes(term) || cidade.includes(term);
    });
  }, [items, search]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await obrasService.list();
      const list = Array.isArray(res?.dados) ? res.dados : [];
      list.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      setItems(list);
    } catch (error) {
      toast.error('Não foi possível carregar as obras');
    } finally {
      setLoading(false);
    }
  }

  async function loadFuncionarios() {
    if (!canViewFuncionarios) {
      setFuncionarios([]);
      return;
    }

    try {
      const res = await funcionariosService.list();
      const list = Array.isArray(res?.dados) ? res.dados : [];
      list.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      setFuncionarios(list);
    } catch (error) {
      toast.error('Falha ao carregar responsáveis');
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ nome: '', responsavel: '', cidade: '' });
    setResponsavelManual('');
    setUseCustomResponsavel(false);
    setIsModalOpen(true);
  }

  function openEdit(item) {
    const isKnownResponsavel = funcionarios.some((f) => f.nome === item.responsavel);

    setEditingId(item.id);
    setFormData({
      nome: item.nome || '',
      responsavel: isKnownResponsavel ? item.responsavel || '' : '',
      cidade: item.cidade || '',
    });
    setUseCustomResponsavel(!isKnownResponsavel && !!item.responsavel);
    setResponsavelManual(!isKnownResponsavel ? item.responsavel || '' : '');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('Informe o nome da obra');
      return;
    }

    if (useCustomResponsavel && !responsavelManual.trim()) {
      toast.error('Informe o responsável');
      return;
    }

    const payload = {
      ...formData,
      responsavel: useCustomResponsavel ? responsavelManual : formData.responsavel,
    };

    try {
      if (editingId) {
        const res = await obrasService.update(editingId, payload);
        toast.success(res?.mensagem || 'Obra atualizada');
      } else {
        const res = await obrasService.create(payload);
        toast.success(res?.mensagem || 'Obra criada');
      }
      closeModal();
      loadData();
    } catch (error) {
      const message = error.response?.data?.mensagem || 'Erro ao salvar obra';
      toast.error(message);
    }
  }

  async function handleDelete(id) {
    if (!canDelete) return;
    const confirmed = window.confirm('Excluir esta obra?');
    if (!confirmed) return;
    try {
      const res = await obrasService.remove(id);
      toast.success(res?.mensagem || 'Obra excluída');
      loadData();
    } catch (error) {
      const message = error.response?.data?.mensagem || 'Erro ao excluir obra';
      toast.error(message);
    }
  }

  function handleResponsavelChange(value) {
    if (value === '__custom__') {
      setUseCustomResponsavel(true);
      setFormData({ ...formData, responsavel: '' });
      setResponsavelManual('');
    } else {
      setUseCustomResponsavel(false);
      setFormData({ ...formData, responsavel: value });
      setResponsavelManual('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Obras</h1>
          <p className="text-gray-600">Gerencie as obras e vincule responsáveis existentes.</p>
        </div>
        <Button onClick={openCreate} disabled={!canCreate}>
          <Plus className="w-4 h-4" />
          Nova obra
        </Button>
      </div>

      {!canView ? (
        <Card>
          <CardContent className="text-center text-gray-600 py-8">
            Você não tem permissão para visualizar obras.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-xl">Lista de obras</CardTitle>
            <div className="w-full md:w-72">
              <Input
                placeholder="Buscar por nome, responsável ou cidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center text-gray-500 py-6">Carregando obras...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-6">Nenhuma obra encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Responsável</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cidade</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.responsavel || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.cidade || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            disabled={!canEdit}
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(item.id)}
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
          </CardContent>
        </Card>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Editar obra' : 'Nova obra'}
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
                  placeholder="Nome da obra"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <select
                  value={useCustomResponsavel ? '__custom__' : formData.responsavel}
                  onChange={(e) => handleResponsavelChange(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.nome}>{f.nome}</option>
                  ))}
                  <option value="__custom__">Outro (digitar manualmente)</option>
                </select>
                {useCustomResponsavel && (
                  <Input
                    className="mt-2"
                    placeholder="Digite o nome do responsável"
                    value={responsavelManual}
                    onChange={(e) => setResponsavelManual(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade da obra"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Salvar alterações' : 'Criar obra'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
