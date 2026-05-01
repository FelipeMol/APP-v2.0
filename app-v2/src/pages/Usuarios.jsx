import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/store/authStore';
import usuariosService from '@/services/usuariosService';

const tipos = ['admin', 'usuario'];
const status = ['Sim', 'Não'];

export default function Usuarios() {
  const { isAdmin, user } = useAuthStore();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    usuario: '',
    email: '',
    senha: '',
    confirmar_senha: '',
    tipo: 'usuario',
    ativo: 'Sim'
  });

  const canManage = isAdmin();

  useEffect(() => {
    if (canManage) {
      loadData();
    }
  }, [canManage]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchSearch = term
          ? (item?.nome || '').toLowerCase().includes(term) ||
            (item?.usuario || '').toLowerCase().includes(term) ||
            (item?.email || '').toLowerCase().includes(term)
          : true;
        const matchTipo = tipoFilter ? (item?.tipo || '').toLowerCase() === tipoFilter.toLowerCase() : true;
        return matchSearch && matchTipo;
      })
      .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
  }, [items, search, tipoFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await usuariosService.list();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.dados) ? res.dados : []);
      setItems(list);
    } catch (error) {
      toast.error('Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({
      nome: '',
      usuario: '',
      email: '',
      senha: '',
      confirmar_senha: '',
      tipo: 'usuario',
      ativo: 'Sim'
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setFormData({
      nome: item.nome || '',
      usuario: item.usuario || '',
      email: item.email || '',
      senha: '',
      confirmar_senha: '',
      tipo: item.tipo || 'usuario',
      ativo: item.ativo || 'Sim',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validações
    if (!formData.nome.trim()) {
      toast.error('Informe o nome');
      return;
    }

    if (!formData.usuario.trim()) {
      toast.error('Informe o nome de usuário');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Informe o e-mail');
      return;
    }

    // Validar e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('E-mail inválido');
      return;
    }

    // Validar senha (obrigatória apenas na criação)
    if (!editingId) {
      if (!formData.senha) {
        toast.error('Informe a senha');
        return;
      }
      if (formData.senha.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (formData.senha !== formData.confirmar_senha) {
        toast.error('As senhas não coincidem');
        return;
      }
    } else {
      // Se está editando e informou senha, validar
      if (formData.senha) {
        if (formData.senha.length < 6) {
          toast.error('A senha deve ter no mínimo 6 caracteres');
          return;
        }
        if (formData.senha !== formData.confirmar_senha) {
          toast.error('As senhas não coincidem');
          return;
        }
      }
    }

    // Não permitir desativar o próprio usuário
    if (editingId === user?.id && formData.ativo === 'Não') {
      toast.error('Você não pode desativar seu próprio usuário');
      return;
    }

    try {
      const payload = {
        nome: formData.nome,
        usuario: formData.usuario,
        email: formData.email,
        tipo: formData.tipo,
        ativo: formData.ativo
      };

      // Adicionar senha apenas se foi informada
      if (formData.senha) {
        payload.senha = formData.senha;
      }

      if (editingId) {
        const res = await usuariosService.update(editingId, payload);
        toast.success(res?.mensagem || 'Usuário atualizado');
      } else {
        const res = await usuariosService.create(payload);
        toast.success(res?.mensagem || 'Usuário criado');
      }
      closeModal();
      loadData();
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar');
    }
  }

  async function handleDelete(id) {
    if (!canManage) return;

    // Não permitir excluir o próprio usuário
    if (id === user?.id) {
      toast.error('Você não pode excluir seu próprio usuário');
      return;
    }

    const confirmed = window.confirm('Remover este usuário da empresa?');
    if (!confirmed) return;

    try {
      const res = await usuariosService.remove(id);
      toast.success(res?.mensagem || 'Usuário removido');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Erro ao remover');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie os usuários do sistema e suas permissões.</p>
        </div>
        <Button onClick={openCreate} disabled={!canManage}>
          <Plus className="w-4 h-4" />
          Novo usuário
        </Button>
      </div>

      {!canManage ? (
        <Card>
          <CardContent className="text-center text-gray-600 py-8">
            Apenas administradores podem gerenciar usuários.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-xl">Lista de usuários</CardTitle>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <Input
                placeholder="Buscar por nome, usuário ou e-mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:w-80"
              />
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os tipos</option>
                {tipos.map((t) => (
                  <option key={t} value={t}>{t === 'admin' ? 'Administrador' : 'Usuário'}</option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center text-gray-500 py-6">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-6">Nenhum usuário encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">E-mail</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Último Login</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((item) => (
                      <tr key={item.id} className={item.id === user?.id ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {item.nome}
                          {item.id === user?.id && (
                            <span className="ml-2 text-xs text-blue-600 font-semibold">(Você)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.usuario || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.email || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.tipo === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.tipo === 'admin' ? 'Administrador' : 'Usuário'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.ativo === 'Sim'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.ativo === 'Sim' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.ultimo_login ? new Date(item.ultimo_login).toLocaleString('pt-BR') : 'Nunca'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            disabled={!canManage}
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(item.id)}
                            disabled={!canManage || item.id === user?.id}
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
                {editingId ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-md">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Nome de usuário *</Label>
                <Input
                  value={formData.usuario}
                  onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                  placeholder="Digite o nome de usuário"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Digite o e-mail"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Senha {editingId ? '(deixe em branco para não alterar)' : '*'}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Digite a senha"
                    autoComplete="new-password"
                    required={!editingId}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label>Confirmar senha {editingId && '(se alterou a senha)'}</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmar_senha}
                    onChange={(e) => setFormData({ ...formData, confirmar_senha: e.target.value })}
                    placeholder="Confirme a senha"
                    autoComplete="new-password"
                    required={!editingId || !!formData.senha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de usuário *</Label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-xs text-gray-500">
                  Administradores têm acesso total ao sistema
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status *</Label>
                <select
                  value={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editingId === user?.id}
                >
                  {status.map((s) => (
                    <option key={s} value={s}>{s === 'Sim' ? 'Ativo' : 'Inativo'}</option>
                  ))}
                </select>
                {editingId === user?.id && (
                  <p className="text-xs text-amber-600">
                    Você não pode desativar seu próprio usuário
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Salvar alterações' : 'Criar usuário'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
