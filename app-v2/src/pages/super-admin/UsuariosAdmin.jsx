// src/pages/super-admin/UsuariosAdmin.jsx
// Lista todos os usuários do sistema com busca e filtro por tipo.

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabase.js';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Search, Users, RefreshCw } from 'lucide-react';

const TIPO_LABELS = {
  superadmin: { label: 'Super Admin', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  admin:      { label: 'Admin',       cls: 'bg-blue-100  text-blue-800  border-blue-200'  },
  usuario:    { label: 'Usuário',     cls: 'bg-gray-100  text-gray-700  border-gray-200'  },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [tenantMap, setTenantMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: users, error: e1 }, { data: uts, error: e2 }, { data: tenants, error: e3 }] =
        await Promise.all([
          supabase.from('usuarios').select('id, nome, usuario, email, tipo, ativo, ultimo_login, criado_em').order('nome'),
          supabase.from('usuarios_tenants').select('usuario_id, tenant_id').eq('ativo', 1),
          supabase.from('tenants').select('id, name, short_name').eq('active', true),
        ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      // Monta mapa tenantId → name
      const tMap = {};
      (tenants || []).forEach(t => { tMap[t.id] = t.short_name || t.name; });

      // Agrupa tenants por usuário
      const utMap = {};
      (uts || []).forEach(ut => {
        if (!utMap[ut.usuario_id]) utMap[ut.usuario_id] = [];
        if (tMap[ut.tenant_id]) utMap[ut.usuario_id].push(tMap[ut.tenant_id]);
      });

      setUsuarios(users || []);
      setTenantMap(utMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="text-gray-500 gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => {
                const t = TIPO_LABELS[u.tipo] || TIPO_LABELS.usuario;
                const tenants = tenantMap[u.id] || [];
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{u.nome}</div>
                      {u.email && <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{u.usuario || '—'}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.cls}>{t.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {tenants.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Sem empresa</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tenants.map(tn => (
                            <span key={tn} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{tn}</span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{fmtDate(u.ultimo_login)}</TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? 'default' : 'secondary'} className={u.ativo ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
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
    </div>
  );
}
