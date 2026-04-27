// src/pages/super-admin/GruposAdmin.jsx
// CRUD de grupos de clientes.

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabase.js';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Edit2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = { id: null, nome: '', dominio: '', logo_url: '', ativo: true };

export default function GruposAdmin() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadGrupos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('admin_list_grupos');
      if (err) throw err;
      setGrupos(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGrupos(); }, [loadGrupos]);

  const openNew = () => { setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (g) => { setForm({ ...g, logo_url: g.logo_url || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.dominio.trim()) {
      toast.error('Nome e domínio são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase.rpc('admin_save_grupo', {
        p_id:       form.id,
        p_nome:     form.nome.trim(),
        p_dominio:  form.dominio.trim().toLowerCase(),
        p_logo_url: form.logo_url.trim() || null,
        p_ativo:    form.ativo,
      });
      if (err) throw err;
      toast.success(form.id ? 'Grupo atualizado' : 'Grupo criado');
      setDialogOpen(false);
      loadGrupos();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sm:flex-row flex-col gap-4 sm:gap-0 border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Grupos de Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os domínios e a identidade visual de cada grupo.</p>
        </div>
        <Button onClick={openNew} size="sm" className="w-full sm:w-auto shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>Erro ao carregar grupos: {error}</span>
          <Button variant="outline" size="sm" className="ml-4 shrink-0" onClick={loadGrupos}>Recarregar</Button>
        </div>
      )}

      {!loading && !error && grupos.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-gray-50/50">
          <ShieldAlert className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">Nenhum grupo cadastrado</h3>
          <p className="mt-1 text-sm text-gray-500">Crie o primeiro grupo para organizar as empresas.</p>
          <Button onClick={openNew} variant="outline" size="sm" className="mt-4">Criar Agora</Button>
        </div>
      )}

      {!loading && !error && grupos.length > 0 && (
        <div className="border rounded-md shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-gray-600">Nome do Grupo</TableHead>
                <TableHead className="font-semibold text-gray-600">Domínio</TableHead>
                <TableHead className="font-semibold text-gray-600">Logo</TableHead>
                <TableHead className="font-semibold text-gray-600">Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium text-gray-900">{g.nome}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {g.dominio}
                    </code>
                  </TableCell>
                  <TableCell>
                    {g.logo_url
                      ? <img src={g.logo_url} alt={g.nome} className="h-6 w-auto object-contain drop-shadow-sm mix-blend-multiply" />
                      : <span className="text-muted-foreground text-xs italic opacity-70">— sem logo —</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={g.ativo ? 'default' : 'secondary'} className={`${g.ativo ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                      {g.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(g)} className="text-gray-500 hover:text-blue-600 h-8 w-8 p-0">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">{form.id ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-gray-700 font-medium">Nome do Grupo *</Label>
              <Input id="nome" className="focus-visible:ring-blue-500" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Ramdy Raydan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dominio" className="text-gray-700 font-medium">Domínio (Hostname) *</Label>
              <Input id="dominio" className="focus-visible:ring-blue-500 font-mono text-sm" value={form.dominio} onChange={e => setForm(f => ({ ...f, dominio: e.target.value }))} placeholder="Ex: construtorarr.online" />
              <p className="text-[0.75rem] text-gray-500 mt-1 leading-tight">Sem "http://" nem "www."</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo_url" className="text-gray-700 font-medium">URL da Logo</Label>
              <Input id="logo_url" className="focus-visible:ring-blue-500" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t mt-4">
              <input type="checkbox" id="ativo" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
              <Label htmlFor="ativo" className="cursor-pointer select-none font-medium">Grupo ativo no sistema</Label>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-gray-600">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="shadow-sm">{saving ? 'Salvando...' : 'Salvar Grupo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
