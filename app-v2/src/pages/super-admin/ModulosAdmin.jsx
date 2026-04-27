// src/pages/super-admin/ModulosAdmin.jsx
// Habilitar/desabilitar módulos por tenant.

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabase.js';
import { Card } from '../../components/ui/card';
import { LayoutGrid, Building2, ShieldCheck } from 'lucide-react';
import ModuloToggle from '../../components/super-admin/ModuloToggle';

const MODULOS_DISPONIVEIS = ['rh', 'financeiro', 'obras', 'relatorios'];

export default function ModulosAdmin() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [modulosAtivos, setModulosAtivos] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingModulos, setLoadingModulos] = useState(false);

  useEffect(() => {
    supabase.from('tenants').select('id, name').eq('active', true).order('name').then(({ data }) => {
      setTenants(data || []);
      setLoadingTenants(false);
    });
  }, []);

  const loadModulos = useCallback(async (tenantId) => {
    if (!tenantId) { setModulosAtivos([]); return; }
    setLoadingModulos(true);
    try {
      const { data } = await supabase.rpc('admin_get_tenant_modules', { p_tenant_id: tenantId });
      // Filtrar apenas módulos com ativo=true (evita exibir como ativos módulos desativados)
      setModulosAtivos((data || []).filter(r => r.ativo).map(r => r.module_id));
    } finally {
      setLoadingModulos(false);
    }
  }, []);

  const handleTenantChange = (e) => {
    setSelectedTenantId(e.target.value);
    loadModulos(e.target.value);
  };

  const handleToggle = (moduloNome, novoEstado) => {
    setModulosAtivos(prev =>
      novoEstado
        ? [...prev, moduloNome]
        : prev.filter(m => m !== moduloNome)
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Módulos por Empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">Habilite ou desabilite o acesso a módulos específicos para cada tenant (empresa).</p>
      </div>

      <div className="max-w-xl">
        {loadingTenants ? (
           <div className="h-10 bg-muted animate-pulse rounded-md w-full" />
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Selecione uma Empresa (Tenant)</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 border bg-white"
                value={selectedTenantId}
                onChange={handleTenantChange}
              >
                <option value="">— Nenhuma empresa selecionada —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {!selectedTenantId ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-gray-50/50 max-w-xl">
          <LayoutGrid className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">Nenhuma empresa selecionada</h3>
          <p className="mt-1 text-sm text-gray-500">Selecione uma empresa acima para gerenciar seus módulos adicionais.</p>
        </div>
      ) : loadingModulos ? (
        <Card className="p-0 overflow-hidden divide-y max-w-xl">
          {MODULOS_DISPONIVEIS.map(m => (
             <div key={m} className="h-16 bg-muted/50 animate-pulse border-b border-gray-100" />
          ))}
        </Card>
      ) : (
        <div className="space-y-4 max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="bg-blue-50/50 border border-blue-100 rounded-md p-4 flex items-start gap-3">
             <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-sm font-medium text-blue-900">Permissões de Acesso</h4>
                <p className="text-xs text-blue-700 mt-1">As alterações são salvas automaticamente em tempo real para a empresa selecionada.</p>
             </div>
           </div>
           <Card className="divide-y overflow-hidden shadow-sm border-gray-200">
             {MODULOS_DISPONIVEIS.map((modulo) => (
                <div key={modulo} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 capitalize flex items-center gap-2">
                       {modulo}
                       {modulosAtivos.includes(modulo) && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">Liberado</span>
                       )}
                    </p>
                    <p className="text-xs text-gray-500">
                       Acesso ao módulo de {modulo}.
                    </p>
                  </div>
                  <ModuloToggle
                     key={selectedTenantId + modulo}
                     tenantId={selectedTenantId}
                     moduloNome={modulo}
                     ativo={modulosAtivos.includes(modulo)}
                     onToggle={handleToggle}
                  />
                </div>
             ))}
           </Card>
        </div>
      )}
    </div>
  );
}
