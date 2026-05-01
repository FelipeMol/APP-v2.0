import { useMemo } from 'react';
import useGrupoStore from '../store/grupoStore';
import useTenantStore from '../store/tenantStore';

// Nomes personalizados do assistente por tenant
const ASSISTENTE_NAMES = {
  transformar: 'Assistente Transformar',
  voltuz:      'Assistente Voltuz',
};

const DEFAULTS = {
  corPrimaria:    '#3b82f6',
  corSecundaria:  '#1e293b',
  corAccent:      '#f59e0b',
  nomeExibicao:   'Sistema de Gestao',
  subtitulo:      'Sistema de gestao',
  rodapeTexto:    '',
  logoUrl:        '/logo.png',
  logoLocalUrl:   '/logo.png',
  mascoteUrl:     null,
  nomeAssistente: 'Assistente IA',
};

export default function useTenantBranding() {
  const grupo    = useGrupoStore(s => s.grupo);
  const tenant   = useTenantStore(s => s.getTenant());
  const tenantId = useTenantStore(s => s.selectedTenantId);

  return useMemo(() => {
    const tenantCor = tenant?.cor_primaria || null;
    const tId       = tenantId || '';

    const logoLocalUrl = tId ? `/logos/${tId}.jpg`         : DEFAULTS.logoLocalUrl;
    const mascoteUrl   = tId ? `/logos/${tId}-mascote.jpg` : null;

    const branding = {
      corPrimaria:    tenantCor || grupo?.cor_primaria || DEFAULTS.corPrimaria,
      corSecundaria:  grupo?.cor_secundaria || DEFAULTS.corSecundaria,
      corAccent:      grupo?.cor_accent || DEFAULTS.corAccent,
      nomeExibicao:   grupo?.nome_exibicao || tenant?.short_name || tenant?.name || DEFAULTS.nomeExibicao,
      subtitulo:      grupo?.subtitulo || DEFAULTS.subtitulo,
      rodapeTexto:    grupo?.rodape_texto || DEFAULTS.rodapeTexto,
      logoUrl:        tenant?.logo_url || grupo?.logo_url || DEFAULTS.logoUrl,
      logoLocalUrl,
      mascoteUrl,
      nomeAssistente: ASSISTENTE_NAMES[tId] || `Assistente ${tenant?.short_name || tenant?.name || 'IA'}`,
    };

    return branding;
  }, [grupo, tenant, tenantId]);
}
