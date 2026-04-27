// src/pages/super-admin/TenantsAdmin.jsx
// Visualizar tenants e editar qual grupo pertencem.

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabase.js';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Edit2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenantsAdmin() {
  const [tenants, setTenants] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editTenant, setEditTenant] = useState(null);
  const [selectedGrupoId, setSelectedGrupoId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: tenantsData, error: t1 }, { data: gruposData, error: t2 }] = await Promise.all([
        supabase.from('tenants').select('id, name, short_name, active, grupo_id').order('name'),
        supabase.rpc('admin_list_grupos'),
      ]);
      if (t1) throw t1;
      if (t2) throw t2;
      setTenants(tenantsData || []);
      setGrupos(gruposData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (tenant) => {
    setEditTenant(tenant);
    setSelectedGrupoId(tenant.grupo_id?.toString() || '');
  };

  const handleSave = async () => {
    if (!editTenant) return;
    setSaving(true);
    try {
      const { error: err } = await supabase.rpc('admin_update_tenant_grupo', {
        p_tenant_id: String(editTenant.id),
        p_grupo_id:  selectedGrupoId ? parseInt(selectedGrupoId) : null,
      });
      if (err) throw err;
      toast.success('Empresa atualizada');
      setEditTenant(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getGrupoNome = (grupoId) => grupos.find(g => g.id === grupoId)?.nome || '—';

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Empresas (Tenants)</h2>
        <p className="text-sm text-muted-foreground mt-1">Organize as empresas do sistema em seus respectivos grupos de acesso.</p>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-4 shrink-0" onClick={load}>Recarregar</Button>
        </div>
      )}

      {!loading && !error && tenants.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-gray-50/50">
          <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">Nenhuma empresa encontrada</h3>
        </div>
      )}

      {!loading && !error && tenants.length > 0 && (
        <div className="border rounded-md shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-gray-600">Empresa</TableHead>
                <TableHead className="font-semibold text-gray-600">Short Name</TableHead>
                <TableHead className="font-semibold text-gray-600">Grupo Atual</TableHead>
                <TableHead className="font-semibold text-gray-600">Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-gray-900">{t.name}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{t.short_name || '—'}</TableCell>
                  <TableCell>
                    {t.grupo_id ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{getGrupoNome(t.grupo_id)}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Sem grupo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.active ? 'default' : 'secondary'} className={`${t.active ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                      {t.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      Alterar Grupo
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editTenant} onOpenChange={(o) => !o && setEditTenant(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Alterar Grupo</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-gray-50 p-3 rounded-md border border-gray-100 border-dashed">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Empresa Selecionada</p>
              <p className="text-sm font-semibold text-gray-900">{editTenant?.name}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Vincular ao Grupo</Label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white shadow-sm"
                value={selectedGrupoId}
                onChange={e => setSelectedGrupoId(e.target.value)}
              >
                <option value="">— Manter sem grupo —</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="ghost" onClick={() => setEditTenant(null)} className="text-gray-600">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="shadow-sm">{saving ? 'Salvando...' : 'Salvar Alteração'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
