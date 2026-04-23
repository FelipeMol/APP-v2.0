import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/store/authStore';
import funcoesService from '@/services/funcoesService';

const statusOptions = ['Sim', 'Não'];

function normalizeAtivo(value) {
  if (value === undefined || value === null || value === '') return '';

  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'sim') return 'Sim';
  if (normalized === '0' || normalized === 'false' || normalized === 'nao' || normalized === 'não') return 'Não';
  return String(value);
}

export default function Funcoes() {
  const { isAdmin, hasPermission } = useAuthStore();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [ativoFilter, setAtivoFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', ativo: 'Sim' });

  const canCreate = isAdmin() || hasPermission('base', 'criar');
  const canEdit = isAdmin() || hasPermission('base', 'editar');
  const canDelete = isAdmin() || hasPermission('base', 'excluir');

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchSearch = term ? (item?.nome || '').toLowerCase().includes(term) : true;
        const ativoLabel = normalizeAtivo(item?.ativo);
        const matchAtivo = ativoFilter ? (ativoLabel || '').toLowerCase() === ativoFilter.toLowerCase() : true;
        return matchSearch && matchAtivo;
      })
      .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
  }, [items, search, ativoFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await funcoesService.list();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.dados) ? res.dados : []);
      setItems(list);
    } catch (error) {
      toast.error('Não foi possível carregar as funções');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ nome: '', descricao: '', ativo: 'Sim' });
    setIsModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setFormData({
      nome: item.nome || '',
      descricao: item.descricao || '',
      ativo: normalizeAtivo(item.ativo) || 'Sim',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log('🔵 handleSubmit chamado', { formData, editingId });

    if (!formData.nome.trim()) {
      toast.error('Informe o nome');
      return;
    }

    try {
      console.log('🟢 Enviando para API...', formData);

      if (editingId) {
        const res = await funcoesService.update(editingId, formData);
        console.log('✅ Resposta UPDATE:', res);
        toast.success(res?.mensagem || 'Função atualizada');
      } else {
        const res = await funcoesService.create(formData);
        console.log('✅ Resposta CREATE:', res);
        toast.success(res?.mensagem || 'Função criada');
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      const message = error.response?.data?.mensagem || 'Erro ao salvar';
      toast.error(message);
    }
  }

  async function handleDelete(id) {
    if (!canDelete) return;
    const confirmed = window.confirm('Excluir esta função?');
    if (!confirmed) return;
    try {
      const res = await funcoesService.remove(id);
      toast.success(res?.mensagem || 'Função excluída');
      loadData();
    } catch (error) {
      const message = error.response?.data?.mensagem || 'Erro ao excluir';
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Funções</h1>
          <p className="text-gray-600">Cadastre os cargos utilizados nos demais cadastros.</p>
        </div>
        <Button onClick={openCreate} disabled={!canCreate}>
          <Plus className="w-4 h-4" />
          Nova função
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-xl">Lista de funções</CardTitle>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Input
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:w-64"
            />
            <select
              value={ativoFilter}
              onChange={(e) => setAtivoFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === 'Sim' ? 'Ativas' : 'Inativas'}</option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center text-gray-500 py-6">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-6">Nenhuma função encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ativa</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.descricao || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{normalizeAtivo(item.ativo) || '—'}</td>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Editar função' : 'Nova função'}
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
                  placeholder="Digite o nome da função"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes da função"
                />
              </div>

              <div className="space-y-2">
                <Label>Ativa</Label>
                <select
                  value={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Salvar alterações' : 'Criar função'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
