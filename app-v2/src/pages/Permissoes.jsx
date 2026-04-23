import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

      console.group('💾 SALVANDO PERMISSÕES');
      console.log('Usuário ID:', selectedUser.id);
      console.log('Usuário Nome:', selectedUser.nome);
      console.log('Total de módulos:', modules.length);
      console.log('Estado atual da seleção:', selection);
      console.log('Payload que será enviado:', payload);
      console.groupEnd();

      const response = await permissoesService.save(selectedUser.id, payload);

      console.group('✅ RESPOSTA DA API');
      console.log('Status:', response?.sucesso ? 'Sucesso' : 'Erro');
      console.log('Mensagem:', response?.mensagem);
      console.log('Dados retornados:', response?.dados);
      console.log('Resposta completa:', response);
      console.groupEnd();

      toast.success('Permissões atualizadas com sucesso');

      // Aguardar um pouco antes de recarregar para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('🔄 Recarregando permissões do usuário...');
      await loadUserPermissions(selectedUser.id);
    } catch (error) {
      console.group('❌ ERRO AO SALVAR PERMISSÕES');
      console.error('Erro completo:', error);
      console.error('Erro response:', error.response);
      console.error('Erro response data:', error.response?.data);
      console.error('Erro message:', error.message);
      console.groupEnd();

      const message = error.response?.data?.mensagem || 'Não foi possível salvar as permissões.';
      toast.error(message);
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
      console.group('🔄 CARREGANDO PERMISSÕES DO USUÁRIO');
      console.log('User ID solicitado:', userId);

      const res = await permissoesService.getByUsuario(userId);

      console.log('Resposta bruta da API:', res);
      // service retorna array diretamente (sem envelope {dados})
      const list = Array.isArray(res) ? res : [];
      console.log('Lista validada (length):', list.length);

      if (list.length > 0) {
        console.log('Primeiro item da lista:', list[0]);
        console.log('Valores do primeiro item:');
        console.log('  - pode_visualizar:', list[0].pode_visualizar, 'tipo:', typeof list[0].pode_visualizar);
        console.log('  - pode_criar:', list[0].pode_criar, 'tipo:', typeof list[0].pode_criar);
        console.log('  - pode_editar:', list[0].pode_editar, 'tipo:', typeof list[0].pode_editar);
        console.log('  - pode_excluir:', list[0].pode_excluir, 'tipo:', typeof list[0].pode_excluir);
        console.log('Último item da lista:', list[list.length - 1]);
      }

      const normalized = list.map((mod) => normalizeModule(mod));
      console.log('Módulos após normalização:', normalized);

      const selectionBuilt = buildSelectionFromModules(normalized);
      console.log('Selection construída:', selectionBuilt);

      // Verificar se alguma permissão está marcada
      const hasAnyPermission = Object.values(selectionBuilt).some(modulePerms =>
        Object.values(modulePerms).some(perm => perm === true)
      );
      console.log('Tem alguma permissão marcada?', hasAnyPermission);

      console.groupEnd();

      setModules(normalized);
      setSelection(selectionBuilt);
    } catch (error) {
      console.group('❌ ERRO AO CARREGAR PERMISSÕES');
      console.error('Erro completo:', error);
      console.error('Erro response:', error.response);
      console.groupEnd();

      toast.error('Não foi possível carregar as permissões do usuário.');
    } finally {
      setLoadingModules(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Administração</p>
        <h1 className="text-3xl font-bold text-gray-900">Matriz de Permissões</h1>
        <p className="text-sm text-gray-600">
          Configure o que cada usuário pode visualizar, criar, editar ou excluir em cada módulo do sistema.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <Card className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8.5rem)] lg:overflow-hidden">
          <CardHeader>
            <CardTitle>Usuário</CardTitle>
            <CardDescription>Escolha um usuário para ajustar as permissões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 lg:overflow-y-auto lg:max-h-[calc(100vh-15rem)]">
            <div>
              <Label htmlFor="usuario-busca" className="text-sm">
                Buscar
              </Label>
              <Input
                id="usuario-busca"
                placeholder="Nome, email"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {loadingUsers ? (
                <div className="text-sm text-gray-500">Carregando usuários...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum usuário encontrado.</div>
              ) : (
                filteredUsers.map((user) => {
                  const isActive = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-primary/60'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{user.nome}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase text-gray-500">
                        {user.tipo}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Resumo</CardTitle>
                <CardDescription>
                  {selectedUser ? selectedUser.nome : 'Selecione um usuário para ver o progresso.'}
                </CardDescription>
              </div>
              {selectedUser && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total de módulos</p>
                  <p className="text-2xl font-bold text-gray-900">{modules.length}</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedUser ? (
              <>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Tipo</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedUser.tipo}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Status</p>
                    <p className="font-semibold text-gray-900">
                      {selectedUser.ativo === 'Sim' || selectedUser.ativo === 1 || selectedUser.ativo === '1' ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Usuário</p>
                    <p className="font-semibold text-gray-900">{selectedUser.usuario}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ações marcadas</p>
                      <p className="text-lg font-bold text-primary">{totals.marks} de {totals.possible}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Percentual</p>
                      <p className="text-lg font-bold text-primary">
                        {totals.possible > 0 ? Math.round((totals.marks / totals.possible) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem usuário selecionado.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSave}
              disabled={!selectedUser || selectedUser?.tipo === 'admin' || loadingModules}
              className="w-full"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      </div>

      {selectedUser ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Permissões por Módulo</h2>
              <p className="text-sm text-muted-foreground">
                Clique nas ações para habilitar ou desabilitar permissões
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-gray-900">{modules.length} módulos</p>
            </div>
          </div>

          <div className="grid gap-4">
            {modules.map((module) => {
              const current = selection[module.id] || {};
              const isAdminUser = selectedUser?.tipo === 'admin';
              const activeCount = actionList.reduce((acc, action) => acc + (current[action.key] ? 1 : 0), 0);
              const allActive = actionList.every((action) => Boolean(current[action.key]));

              return (
                <Card key={module.id} className="border-gray-200 transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg truncate">{module.title}</CardTitle>
                          {module.requiresAdmin && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                              Requer Admin
                            </span>
                          )}
                        </div>
                        <CardDescription className="mt-1 break-words">
                          {module.description || 'Módulo do sistema'}
                        </CardDescription>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Ativas</p>
                          <p className={`text-xl font-bold ${activeCount > 0 ? 'text-primary' : 'text-gray-400'}`}>
                            {activeCount}/{actionList.length}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant={allActive ? 'secondary' : 'default'}
                          size="sm"
                          disabled={isAdminUser}
                          onClick={() => handleToggleAllInModule(module.id)}
                          className="whitespace-nowrap"
                        >
                          {allActive ? 'Desmarcar tudo' : 'Marcar tudo'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {loadingModules ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando permissões...
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {actionList.map((action) => {
                          const active = Boolean(current[action.key]);
                          return (
                            <button
                              key={action.key}
                              type="button"
                              onClick={() => handleToggle(module.id, action.key)}
                              disabled={isAdminUser}
                              className={`group relative rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                                active
                                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/60 hover:shadow-sm'
                              } ${isAdminUser ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02]'}`}
                            >
                              <span className="flex items-center justify-center gap-2">
                                {active && (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {action.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>

                  {isAdminUser && (
                    <CardFooter className="bg-red-50/50">
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">Administradores possuem acesso total e não podem ter permissões alteradas</span>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Nenhum usuário selecionado</CardTitle>
            <CardDescription>Escolha um usuário na barra lateral para configurar suas permissões</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="mt-3 text-sm text-muted-foreground">
                Selecione um usuário para visualizar e editar suas permissões
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
