import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/store/authStore';
import funcionariosService from '@/services/funcionariosService';
import empresasService from '@/services/empresasService';
import funcoesService from '@/services/funcoesService';

const situacoes = ['Ativo', 'Inativo'];

export default function Funcionarios() {
  const { isAdmin, hasPermission } = useAuthStore();

  const [items, setItems] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [funcoes, setFuncoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', funcao: '', empresa: '', situacao: 'Ativo' });

  const canView = isAdmin() || hasPermission('funcionarios', 'visualizar');
  const canCreate = isAdmin() || hasPermission('funcionarios', 'criar');
  const canEdit = isAdmin() || hasPermission('funcionarios', 'editar');
  const canDelete = isAdmin() || hasPermission('funcionarios', 'excluir');
  const canViewEmpresas = isAdmin() || hasPermission('empresas', 'visualizar');
  // Permitir carregamento de funções se o usuário for admin ou tiver permissão
  // tanto no módulo 'base' (legado) quanto no módulo 'funcoes' (mais explícito)
  const canViewFuncoes = isAdmin() || hasPermission('base', 'visualizar') || hasPermission('funcoes', 'visualizar');

  useEffect(() => {
    if (canView) {
      loadData();
      loadAuxiliaryData();
    }
  }, [canView]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchSearch = term
          ? (item?.nome || '').toLowerCase().includes(term) || (item?.funcao || '').toLowerCase().includes(term)
          : true;
        const matchSituacao = situacaoFilter ? (item?.situacao || '').toLowerCase() === situacaoFilter.toLowerCase() : true;
        return matchSearch && matchSituacao;
      })
      .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
  }, [items, search, situacaoFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await funcionariosService.list();
      const list = Array.isArray(res?.dados) ? res.dados : [];
      setItems(list);
    } catch (error) {
      toast.error('Não foi possível carregar os funcionários');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuxiliaryData() {
    try {
      const empresasPromise = canViewEmpresas ? empresasService.list() : Promise.resolve([]);
      const funcoesPromise = canViewFuncoes ? funcoesService.list() : Promise.resolve([]);

      const [empresasRes, funcoesRes] = await Promise.all([empresasPromise, funcoesPromise]);

      const empresaList = Array.isArray(empresasRes) ? empresasRes : (Array.isArray(empresasRes?.dados) ? empresasRes.dados : []);
      const funcoesList = Array.isArray(funcoesRes) ? funcoesRes : (Array.isArray(funcoesRes?.dados) ? funcoesRes.dados : []);

      empresaList.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      funcoesList.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));

      setEmpresas(empresaList);
      // Se veio vazio, tentar um fallback sem filtro (algumas instalações retornam diferente)
      if (funcoesList.length === 0) {
        try {
          console.warn('Funções vazias — tentando fallback sem filtro');
          const fallback = await funcoesService.list();
          const fallbackList = Array.isArray(fallback) ? fallback : (Array.isArray(fallback?.dados) ? fallback.dados : []);
          fallbackList.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
          setFuncoes(fallbackList);
          console.debug('Funções (fallback) carregadas:', fallbackList.length, fallbackList);
        } catch (err) {
          console.error('Erro no fallback de funções:', err);
          setFuncoes([]);
        }
      } else {
        setFuncoes(funcoesList);
      }
    } catch (error) {
      toast.error('Falha ao carregar empresas ou funções');
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ nome: '', funcao: '', empresa: '', situacao: 'Ativo' });
    setIsModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setFormData({
      nome: item.nome || '',
      funcao: item.funcao || '',
      empresa: item.empresa || '',
      situacao: item.situacao || 'Ativo',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('Informe o nome');
      return;
    }

    try {
      if (editingId) {
        const res = await funcionariosService.update(editingId, formData);
        toast.success(res?.mensagem || 'Funcionário atualizado');
      } else {
        const res = await funcionariosService.create(formData);
        toast.success(res?.mensagem || 'Funcionário criado');
      }
      closeModal();
      loadData();
    } catch (error) {
      const message = error.response?.data?.mensagem || 'Erro ao salvar';
      toast.error(message);
    }
  }

  async function handleDelete(id) {
    if (!canDelete) return;
    const confirmed = window.confirm('Excluir este funcionário?');
    if (!confirmed) return;
    try {
      const res = await funcionariosService.remove(id);
      toast.success(res?.mensagem || 'Funcionário excluído');
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
          <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-600">Cadastre e gerencie os colaboradores.</p>
        </div>
        <Button onClick={openCreate} disabled={!canCreate}>
          <Plus className="w-4 h-4" />
          Novo funcionário
        </Button>
      </div>

      {!canView ? (
        <Card>
          <CardContent className="text-center text-gray-600 py-8">
            Você não tem permissão para visualizar funcionários.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-xl">Lista de funcionários</CardTitle>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <Input
                placeholder="Buscar por nome ou função"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:w-64"
              />
              <select
                value={situacaoFilter}
                onChange={(e) => setSituacaoFilter(e.target.value)}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as situações</option>
                {situacoes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center text-gray-500 py-6">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-6">Nenhum funcionário encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Função</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Empresa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Situação</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.funcao || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.empresa || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.situacao || '—'}</td>
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
                {editingId ? 'Editar funcionário' : 'Novo funcionário'}
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
                  placeholder="Digite o nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Função</Label>
                <select
                  value={formData.funcao}
                  onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  {funcoes.map((f) => (
                    <option key={f.id} value={f.nome}>{f.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <select
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.nome}>{empresa.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Situação</Label>
                <select
                  value={formData.situacao}
                  onChange={(e) => setFormData({ ...formData, situacao: e.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {situacoes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Salvar alterações' : 'Criar funcionário'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
