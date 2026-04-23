import useTenantStore from '../../store/tenantStore';

/**
 * Logo dinamica por empresa (tenant).
 * Usa os arquivos do /public: logo.png, workmall.png, houseclub.png
 */
export default function TenantLogo({ className = 'h-10 w-auto object-contain', alt = 'Logo' }) {
  const tenant = useTenantStore((s) => s.getTenant());

  const src = tenant?.logoSrc || new URL('../../../public/logo.png', import.meta.url).toString();

  return <img src={src} alt={alt} className={className} />;
}
