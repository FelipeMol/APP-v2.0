import { useMemo } from 'react';
import useGrupoStore from '../store/grupoStore';
import useTenantStore from '../store/tenantStore';

const DEFAULTS = {
  corPrimaria: '#3b82f6',
  corSecundaria: '#1e293b',
  corAccent: '#f59e0b',
  nomeExibicao: 'Construtora RR',
  subtitulo: 'Sistema de gestao',
  rodapeTexto: '',
  logoUrl: '/logo.png',
};

export default function useTenantBranding() {
  const grupo = useGrupoStore(s => s.grupo);
  const tenant = useTenantStore(s => s.getTenant());

  return useMemo(() => {
    const tenantCor = tenant?.cor_primaria || null;

    const branding = {
      corPrimaria: tenantCor || grupo?.cor_primaria || DEFAULTS.corPrimaria,
      corSecundaria: grupo?.cor_secundaria || DEFAULTS.corSecundaria,
      corAccent: grupo?.cor_accent || DEFAULTS.corAccent,
      nomeExibicao: grupo?.nome_exibicao || tenant?.short_name || tenant?.name || DEFAULTS.nomeExibicao,
      subtitulo: grupo?.subtitulo || DEFAULTS.subtitulo,
      rodapeTexto: grupo?.rodape_texto || DEFAULTS.rodapeTexto,
      logoUrl: tenant?.logo_url || grupo?.logo_url || DEFAULTS.logoUrl,
    };

    return branding;
  }, [grupo, tenant]);
}
