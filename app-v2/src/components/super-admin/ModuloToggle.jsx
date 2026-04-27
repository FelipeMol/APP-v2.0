// src/components/super-admin/ModuloToggle.jsx
// Toggle para habilitar/desabilitar um módulo para um tenant específico.
// Chama RPC admin_toggle_tenant_module.

import { useState } from 'react';
import supabase from '../../lib/supabase.js';
import toast from 'react-hot-toast';

export default function ModuloToggle({ tenantId, moduloNome, ativo, onToggle }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const novoValor = !ativo;
    const { error } = await supabase.rpc('admin_toggle_tenant_module', {
      p_tenant_id: tenantId,
      p_module_id: moduloNome,
      p_ativo: novoValor,
    });
    if (error) {
      toast.error('Erro ao atualizar módulo: ' + error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    if (onToggle) onToggle(moduloNome, novoValor);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      aria-label={`Módulo ${moduloNome}`}
      disabled={loading}
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${ativo ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}
