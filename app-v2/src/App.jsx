import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import router from './router';
import useGrupoStore from './store/grupoStore';
import useTenantStore from './store/tenantStore';
import { initTenantFilter } from './lib/supabase';

function App() {
  const loadGrupo = useGrupoStore(s => s.loadGrupo);

  useEffect(() => {
    loadGrupo();
    // Initialize tenant filter so all Supabase queries auto-filter by tenant
    initTenantFilter(() => useTenantStore.getState().selectedTenantId);
  }, [loadGrupo]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'hsl(222 22% 11%)',
            color: 'hsl(215 15% 92%)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontWeight: '500',
            boxShadow: '0 4px 16px hsl(222 25% 5% / 0.4)',
            border: '1px solid hsl(222 18% 18%)',
            maxWidth: '340px',
          },
          success: {
            iconTheme: { primary: 'hsl(148 55% 48%)', secondary: 'hsl(222 22% 11%)' },
          },
          error: {
            iconTheme: { primary: 'hsl(4 80% 62%)', secondary: 'hsl(222 22% 11%)' },
          },
        }}
      />
    </>
  );
}

export default App;
