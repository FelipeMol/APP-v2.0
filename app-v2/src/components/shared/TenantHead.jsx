import { useEffect } from 'react';
import useTenantBranding from '../../hooks/useTenantBranding';
import useTenantStore from '../../store/tenantStore';

export default function TenantHead() {
  const branding = useTenantBranding();
  const tenantId = useTenantStore(s => s.selectedTenantId);

  useEffect(() => {
    // Título da aba
    const name = branding.nomeExibicao;
    document.title = name && name !== 'Sistema de Gestao'
      ? `${name} — Gestão de Obras`
      : 'Controle de Obras';

    // Favicon dinâmico por tenant
    if (tenantId) {
      const faviconUrl = `/logos/${tenantId}.png`;
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        document.head.appendChild(link);
      }
      // Só troca se a imagem existir (testa carregamento)
      const img = new Image();
      img.onload  = () => { link.href = faviconUrl; };
      img.onerror = () => { link.href = '/logo.png'; };
      img.src = faviconUrl;
    }
  }, [branding.nomeExibicao, tenantId]);

  return null;
}
