// src/components/tenant/GrupoLogo.jsx
// Exibe o logo do grupo detectado pelo hostname.
// Usa logo_url do banco; fallback para /logo.png se não houver.

import useGrupoStore from '../../store/grupoStore.js';

export default function GrupoLogo({ className = '' }) {
  const grupo = useGrupoStore(s => s.grupo);
  const src = grupo?.logo_url || '/logo.png';
  const alt = grupo?.nome || 'Logo';
  return <img src={src} alt={alt} className={className} />;
}
