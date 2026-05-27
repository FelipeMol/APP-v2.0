// src/pages/super-admin/UsuariosAdmin.jsx
// Lista todos os usuários do sistema com busca e filtro por tipo.

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabase.js';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Search, Users, RefreshCw, Pencil, Loader2, UserPlus, Eye, EyeOff, Mail, AtSign } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  nome: '',
  usuario: '',
  email: '',
  senha: '',
  tipo: 'usuario',
  ativo: 'Sim',
  tipo_login: 'usuario',
  tenant_ids: [],
};

const TIPO_LABELS = {
  superadmin: { label: 'Super Admin', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  admin:      { label: 'Admin',       cls: 'bg-blue-100  text-blue-800  border-blue-200'  },
  usuario:    { label: 'Usuário',     cls: 'bg-gray-100  text-gray-700  border-gray-200'  },
};

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  // Estado do modal de edição de tenants
  const [editingUser, setEditingUser] = useState(null);
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [saving, setSaving] = useState(false);

  // Estado do modal de criação
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSenha, setShowSenha] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: users, error: e1 }, { data: tenants, error: e2 }] = await Promise.all([
        // RPC retorna todos os usuários (bypassa filtro de tenant do frontend) + seus tenant_ids
        supabase.rpc('listar_todos_usuarios_superadmin'),
        supabase.from('tenants').select('id, name, short_name').eq('active', true).order('name'),
      ]);

      if (e1) throw e1;
      if (e2) throw e2;

      setUsuarios(users || []);
      setAllTenants(tenants || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Abre modal para editar tenants do usuário
  const openEdit = (u) => {
    setEditingUser(u);
    setSelectedTenants(u.tenant_ids || []);
  };

  const toggleTenant = (tenantId) => {
    setSelectedTenants(prev =>
      prev.includes(tenantId) ? prev.filter(t => t !== tenantId) : [...prev, tenantId]
    );
  };

  const handleSaveTenants = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('atualizar_tenants_usuario', {
        p_usuario_id: editingUser.id,
        p_tenant_ids: selectedTenants,
      });
      if (error) throw error;
      if (!data?.sucesso) throw new Error(data?.mensagem || 'Erro ao salvar');
      toast.success('Empresas atualizadas com sucesso');
      setEditingUser(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tMap = {};
  allTenants.forEach(t => { tMap[t.id] = t.short_name || t.name; });

  // --- Criar usuário ---
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowSenha(false);
    setShowCreate(true);
  };

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleCreateTenant = (id) =>
    setField('tenant_ids', form.tenant_ids.includes(id)
      ? form.tenant_ids.filter(t => t !== id)
      : [...form.tenant_ids, id]);

  const handleCreate = async () => {
    if (!form.nome.trim() || !form.usuario.trim() || !form.senha) {
      toast.error('Nome, usuário e senha são obrigatórios');
      return;
    }
    if (form.tipo_login === 'email' && !form.email.trim()) {
      toast.error('E-mail é obrigatório para login por e-mail');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('criar_usuario_superadmin', {
        p_nome:       form.nome.trim(),
        p_usuario:    form.usuario.trim(),
        p_senha:      form.senha,
        p_email:      form.email.trim() || null,
        p_tipo:       form.tipo,
        p_ativo:      form.ativo,
        p_tenant_ids: form.tenant_ids,
        p_tipo_login: form.tipo_login,
      });
      if (error) throw error;
      if (!data?.sucesso) throw new Error(data?.mensagem || 'Erro ao criar usuário');
      toast.success('Usuário criado com sucesso');
      setShowCreate(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = usuarios.filter(u => {
    const matchBusca = !busca || u.nome?.toLowerCase().includes(busca.toLowerCase()) || u.usuario?.toLowerCase().includes(busca.toLowerCase()) || u.email?.toLowerCase().includes(busca.toLowerCase());
    const matchTipo  = filtroTipo === 'todos' || u.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const tipoCount = { todos: usuarios.length, admin: 0, usuario: 0, superadmin: 0 };
  usuarios.forEach(u => { if (tipoCount[u.tipo] !== undefined) tipoCount[u.tipo]++; });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Usuários do Sistema</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? '…' : `${usuarios.length} usuários cadastrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="text-gray-500 gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Buscar por nome, usuário ou e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {['todos', 'admin', 'usuario', 'superadmin'].map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                filtroTipo === tipo
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tipo === 'todos' ? 'Todos' : TIPO_LABELS[tipo]?.label}
              <span className={`ml-1.5 ${filtroTipo === tipo ? 'opacity-70' : 'text-gray-400'}`}>
                {tipoCount[tipo] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-4 shrink-0" onClick={load}>Tentar novamente</Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-md" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 border border-dashed rounded-lg bg-gray-50/50">
          <Users className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">
            {busca || filtroTipo !== 'todos' ? 'Nenhum usuário encontrado com esses filtros' : 'Nenhum usuário cadastrado'}
          </h3>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="border rounded-md shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-gray-600">Usuário</TableHead>
                <TableHead className="font-semibold text-gray-600">Login</TableHead>
                <TableHead className="font-semibold text-gray-600">Tipo</TableHead>
                <TableHead className="font-semibold text-gray-600">Empresas</TableHead>
                <TableHead className="font-semibold text-gray-600">Último acesso</TableHead>
                <TableHead className="font-semibold text-gray-600">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => {
                const t = TIPO_LABELS[u.tipo] || TIPO_LABELS.usuario;
                const tenantNames = (u.tenant_ids || []).map(id => tMap[id] || id);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{u.nome}</div>
                      {u.email && <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{u.usuario || '—'}</code>
                        {u.tipo_login === 'email'
                          ? <Mail className="w-3 h-3 text-blue-400 shrink-0" title="Login por e-mail" />
                          : <AtSign className="w-3 h-3 text-gray-400 shrink-0" title="Login por nome de usuário" />
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.cls}>{t.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {tenantNames.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Sem empresa</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tenantNames.map(tn => (
                            <span key={tn} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{tn}</span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{fmtDate(u.ultimo_login)}</TableCell>
                    <TableCell>
                      <Badge variant={u.ativo === 'Sim' ? 'default' : 'secondary'} className={u.ativo === 'Sim' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500'}>
                        {u.ativo === 'Sim' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-gray-700"
                        title="Editar empresas"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filtered.length < usuarios.length && (
            <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-right">
              Exibindo {filtered.length} de {usuarios.length} usuários
            </div>
          )}
        </div>
      )}

      {/* Modal: editar empresas do usuário */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Empresas de {editingUser?.nome}</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">
            Selecione as empresas que este usuário pode acessar.
          </p>

          <div className="space-y-2 py-2 max-h-64 overflow-y-auto pr-1">
            {allTenants.map(t => (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTenants.includes(t.id)
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600"
                  checked={selectedTenants.includes(t.id)}
                  onChange={() => toggleTenant(t.id)}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t.short_name || t.name}</div>
                  <div className="text-xs text-gray-400">{t.id}</div>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTenants} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando…</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: criar novo usuário */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div>
              <FieldLabel required>Nome completo</FieldLabel>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: João da Silva"
                value={form.nome}
                onChange={e => setField('nome', e.target.value)}
              />
            </div>

            {/* Tipo de Login */}
            <div>
              <FieldLabel required>Tipo de login</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.tipo_login === 'usuario' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" className="accent-blue-600" name="tipo_login" value="usuario"
                    checked={form.tipo_login === 'usuario'}
                    onChange={() => setField('tipo_login', 'usuario')} />
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-gray-500" />
                      Nome de usuário
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Loga só com o usuário</div>
                  </div>
                </label>
                <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.tipo_login === 'email' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" className="accent-blue-600" name="tipo_login" value="email"
                    checked={form.tipo_login === 'email'}
                    onChange={() => setField('tipo_login', 'email')} />
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      E-mail
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Loga com e-mail e senha</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Usuário + E-mail (side by side when email required) */}
            <div className={`grid gap-3 ${form.tipo_login === 'email' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <FieldLabel required>Nome de usuário</FieldLabel>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="sem espaços (ex: joao.silva)"
                  value={form.usuario}
                  onChange={e => setField('usuario', e.target.value.toLowerCase().replace(/\s/g, ''))}
                />
                <p className="text-xs text-gray-400 mt-1">Deve ser único no sistema</p>
              </div>
              {form.tipo_login === 'email' && (
                <div>
                  <FieldLabel required>E-mail</FieldLabel>
                  <input
                    type="email"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="usuario@empresa.com"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* E-mail opcional quando tipo_login = usuario */}
            {form.tipo_login === 'usuario' && (
              <div>
                <FieldLabel>E-mail (opcional)</FieldLabel>
                <input
                  type="email"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Para contato, não usado no login"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                />
              </div>
            )}

            {/* Senha */}
            <div>
              <FieldLabel required>Senha</FieldLabel>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                  value={form.senha}
                  onChange={e => setField('senha', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowSenha(v => !v)}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tipo + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Tipo de acesso</FieldLabel>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.tipo}
                  onChange={e => setField('tipo', e.target.value)}
                >
                  <option value="usuario">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.ativo}
                  onChange={e => setField('ativo', e.target.value)}
                >
                  <option value="Sim">Ativo</option>
                  <option value="Não">Inativo</option>
                </select>
              </div>
            </div>

            {/* Empresas */}
            <div>
              <FieldLabel>Empresas com acesso</FieldLabel>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {allTenants.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      form.tenant_ids.includes(t.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-blue-600 shrink-0"
                      checked={form.tenant_ids.includes(t.id)}
                      onChange={() => toggleCreateTenant(t.id)}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t.short_name || t.name}</div>
                      <div className="text-xs text-gray-400">{t.id}</div>
                    </div>
                  </label>
                ))}
              </div>
              {form.tenant_ids.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5">Nenhuma empresa selecionada — o usuário não conseguirá acessar o sistema.</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando…</>
                : <><UserPlus className="w-4 h-4 mr-2" />Criar Usuário</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
