import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useAuthStore from '@/store/authStore';
import permissoesService from '@/services/permissoesService';
import usuariosService from '@/services/usuariosService';

const actionList = [
  { key: 'pode_visualizar', label: 'Visualizar' },
  { key: 'pode_criar', label: 'Criar' },
  { key: 'pode_editar', label: 'Editar' },
  { key: 'pode_excluir', label: 'Excluir' },
];

const boolFrom = (value) => {
  const result = value === 1 || value === '1' || value === true;
  if (value !== 0 && value !== '0' && value !== false && value !== null && value !== undefined) {
    console.log('boolFrom:', value, '(tipo:', typeof value, ') =>', result);
  }
  return result;
};

const normalizeModule = (raw) => {
  const id = raw.modulo_id ?? raw.id;
  const title = raw.modulo_titulo ?? raw.titulo ?? raw.modulo_nome ?? raw.nome ?? 'Modulo';
  const description = raw.descricao ?? raw.modulo_descricao ?? '';
  const requiresAdmin = raw.requer_admin === 1 || raw.requer_admin === '1' || raw.requer_admin === true;

  return {
    id: String(id),
    title,
    description,
    requiresAdmin,
    // Preservar as permissões do módulo
    pode_visualizar: raw.pode_visualizar,
    pode_criar: raw.pode_criar,
    pode_editar: raw.pode_editar,
    pode_excluir: raw.pode_excluir,
  };
};

const buildSelectionFromModules = (modulesWithFlags) => {
  return modulesWithFlags.reduce((acc, module) => {
    acc[module.id] = actionList.reduce((inner, action) => {
      inner[action.key] = boolFrom(module[action.key]);
      return inner;
    }, {});
    return acc;
  }, {});
};

export default function Permissoes() {
  const { isAdmin } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modules, setModules] = useState([]);
  const allModulesRef = useRef([]); // lista completa — nunca substituída pelas permissões do usuário
  const [selection, setSelection] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
    loadModules();
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length) {
      const first = users.find((user) => user.tipo !== 'admin') ?? users[0];
      if (first) {
        setSelectedUserId(first.id);
      }
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      const target = users.find((user) => user.id === selectedUserId) || null;
      setSelectedUser(target);
      loadUserPermissions(selectedUserId);
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, users]);

  const filteredUsers = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!term) return true;
        return (user.nome || '').toLowerCase().includes(term) || (user.email || '').toLowerCase().includes(term);
      })
      .slice(0, 8);
  }, [users, searchText]);

  const totals = useMemo(() => {
    const marks = modules.reduce((acc, module) => {
      const current = selection[module.id];
      if (!current) return acc;
      return (
        acc +
        actionList.reduce((inner, action) => inner + (current[action.key] ? 1 : 0), 0)
      );
    }, 0);
    const possible = modules.length * actionList.length;
    return { marks, possible };
  }, [modules, selection]);

  if (!isAdmin()) {
    return (
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Permissões</CardTitle>
            <CardDescription>Acesso restrito a administradores.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Você precisa ser administrador para editar permissões.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const handleSelectUser = (user) => {
    setSelectedUserId(user.id);
  };

  const handleToggle = (moduleId, actionKey) => {
    setSelection((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [actionKey]: !prev[moduleId]?.[actionKey],
      },
    }));
  };

  const handleToggleAllInModule = (moduleId, nextValue) => {
    setSelection((prev) => {
      const next = { ...prev };
      const current = next[moduleId] || {};
      const resolvedNextValue = typeof nextValue === 'boolean'
        ? nextValue
        : !actionList.every((action) => Boolean(current[action.key]));

      next[moduleId] = actionList.reduce((acc, action) => {
        acc[action.key] = resolvedNextValue;
        return acc;
      }, {});

      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedUser || selectedUser.tipo === 'admin') {
      toast.error('Selecione um usuário não administrativo para salvar.');
      return;
    }

    setSaving(true);
    try {
      const payload = modules.map((mod) => ({
        modulo_id: parseInt(mod.id),
        pode_visualizar: selection[mod.id]?.pode_visualizar || false,
        pode_criar: selection[mod.id]?.pode_criar || false,
        pode_editar: selection[mod.id]?.pode_editar || false,
        pode_excluir: selection[mod.id]?.pode_excluir || false,
      }));

      await permissoesService.save(selectedUser.id, payload);

      toast.success('Permissões atualizadas com sucesso');
      await loadUserPermissions(selectedUser.id);
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Não foi possível salvar as permissões.');
    } finally {
      setSaving(false);
    }
  };

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await usuariosService.list();
      // service retorna array diretamente (sem envelope {dados})
      const list = Array.isArray(res) ? res : [];
      setUsers(list);
    } catch (error) {
      toast.error('Não foi possível carregar os usuários.');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadModules() {
    setLoadingModules(true);
    try {
      const res = await permissoesService.listModules();
      // service retorna array diretamente (sem envelope {dados})
      const list = Array.isArray(res) ? res : [];
      const normalized = list.map((mod) => normalizeModule(mod));
      allModulesRef.current = normalized; // preservar lista completa
      setModules(normalized);
      if (!selectedUserId) {
        setSelection(buildSelectionFromModules(normalized));
      }
    } catch (error) {
      toast.error('Não foi possível carregar os módulos.');
    } finally {
      setLoadingModules(false);
    }
  }

  async function loadUserPermissions(userId) {
    setLoadingModules(true);
    try {
      const res = await permissoesService.getByUsuario(userId);
      const list = Array.isArray(res) ? res : [];

      // Monta mapa: modulo_id -> flags de permissão vindas do banco
      const permMap = {};
      list.forEach(p => {
        const modId = String(p.modulo_id ?? p.id);
        permMap[modId] = {
          pode_visualizar: boolFrom(p.pode_visualizar),
          pode_criar:      boolFrom(p.pode_criar),
          pode_editar:     boolFrom(p.pode_editar),
          pode_excluir:    boolFrom(p.pode_excluir),
        };
      });

      // Aplica sobre TODOS os módulos (inclusive os sem registro ainda = tudo false)
      const selectionBuilt = allModulesRef.current.reduce((acc, module) => {
        acc[module.id] = permMap[module.id] || {
          pode_visualizar: false,
          pode_criar:      false,
          pode_editar:     false,
          pode_excluir:    false,
        };
        return acc;
      }, {});

      // Atualiza apenas a seleção — não substitui a lista de módulos
      setSelection(selectionBuilt);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      toast.error('Não foi possível carregar as permissões do usuário.');
    } finally {
      setLoadingModules(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Cabeçalho ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Administração</p>
          <h1 className="text-2xl font-bold text-gray-900">Matriz de Permissões</h1>
        </div>
      </div>

      {/* ── Layout principal ──────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── PAINEL ESQUERDO: seleção de usuário ──────── */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">

          {/* Busca */}
          <div className="p-4 border-b bg-gray-50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Usuários</p>
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Lista de usuários (scroll interno) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingUsers ? (
              <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">Nenhum usuário encontrado.</p>
            ) : (
              filteredUsers.map((user) => {
                const isActive = selectedUserId === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {(user.nome || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${isActive ? 'text-primary' : ''}`}>{user.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email || user.usuario}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      user.tipo === 'admin'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {user.tipo}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Resumo + Salvar (fixo embaixo) */}
          <div className="border-t p-4 space-y-3 bg-gray-50 flex-shrink-0">
            {selectedUser ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ações marcadas</span>
                  <span className="font-bold text-primary">{totals.marks} / {totals.possible}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${totals.possible > 0 ? (totals.marks / totals.possible) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{selectedUser.tipo}</span>
                  <span>{totals.possible > 0 ? Math.round((totals.marks / totals.possible) * 100) : 0}%</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center">Selecione um usuário</p>
            )}
            <Button
              onClick={handleSave}
              disabled={!selectedUser || selectedUser?.tipo === 'admin' || loadingModules || saving}
              className="w-full"
              size="sm"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
        </div>

        {/* ── PAINEL DIREITO: matriz de permissões ─────── */}
        <div className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm min-w-0">
          {selectedUser ? (
            <>
              {/* Barra superior da tabela */}
              <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 flex-shrink-0 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{selectedUser.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {modules.length} módulos
                    {selectedUser.tipo === 'admin' && (
                      <span className="ml-2 text-red-500 font-medium">· Administrador — acesso total</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedUser?.tipo === 'admin' || loadingModules}
                    onClick={() => modules.forEach(m => handleToggleAllInModule(m.id, true))}
                  >
                    Marcar tudo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedUser?.tipo === 'admin' || loadingModules}
                    onClick={() => modules.forEach(m => handleToggleAllInModule(m.id, false))}
                  >
                    Desmarcar tudo
                  </Button>
                </div>
              </div>

              {/* Tabela compacta com scroll */}
              <div className="flex-1 overflow-auto">
                {loadingModules ? (
                  <div className="flex items-center justify-center h-40 gap-2 text-sm text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Carregando permissões...
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10 bg-gray-50 border-b shadow-sm">
                      <tr>
                        <th className="text-left font-semibold text-gray-600 px-5 py-3">Módulo</th>
                        {actionList.map(a => (
                          <th key={a.key} className="text-center font-semibold text-gray-600 px-6 py-3 whitespace-nowrap min-w-[100px]">
                            {a.label}
                          </th>
                        ))}
                        <th className="text-center font-semibold text-gray-600 px-4 py-3 whitespace-nowrap min-w-[80px]">
                          Todos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((module, i) => {
                        const current = selection[module.id] || {};
                        const isAdminUser = selectedUser?.tipo === 'admin';
                        const allActive = actionList.every(a => Boolean(current[a.key]));
                        const anyActive = actionList.some(a => Boolean(current[a.key]));
                        const activeCount = actionList.reduce((acc, a) => acc + (current[a.key] ? 1 : 0), 0);

                        return (
                          <tr
                            key={module.id}
                            className={`border-b last:border-0 transition-colors ${
                              i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            } hover:bg-blue-50/30`}
                          >
                            {/* Nome do módulo */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{module.title}</span>
                                {module.requiresAdmin && (
                                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
                                    Admin
                                  </span>
                                )}
                                <span className={`text-[10px] font-medium ml-1 ${activeCount > 0 ? 'text-primary' : 'text-gray-300'}`}>
                                  {activeCount}/{actionList.length}
                                </span>
                              </div>
                              {module.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{module.description}</p>
                              )}
                            </td>

                            {/* Checkboxes por ação */}
                            {actionList.map(action => {
                              const active = Boolean(current[action.key]);
                              return (
                                <td key={action.key} className="text-center px-6 py-3">
                                  <button
                                    type="button"
                                    disabled={isAdminUser}
                                    onClick={() => handleToggle(module.id, action.key)}
                                    title={active ? `Remover: ${action.label}` : `Conceder: ${action.label}`}
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded border-2 transition-all ${
                                      active
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-gray-300 bg-white hover:border-primary/60'
                                    } ${isAdminUser ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:scale-110'}`}
                                  >
                                    {active && (
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            {/* Botão "todos" da linha */}
                            <td className="text-center px-4 py-3">
                              <button
                                type="button"
                                disabled={isAdminUser}
                                onClick={() => handleToggleAllInModule(module.id)}
                                className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-all whitespace-nowrap ${
                                  allActive
                                    ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                                    : anyActive
                                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'border-gray-200 text-gray-400 hover:border-primary/40 hover:text-primary'
                                } ${isAdminUser ? 'cursor-not-allowed opacity-40' : ''}`}
                              >
                                {allActive ? '✓ Todos' : anyActive ? '~ Parcial' : '+ Todos'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            /* Estado vazio */
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Selecione um usuário</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Escolha um usuário na lista à esquerda para visualizar e editar suas permissões
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
