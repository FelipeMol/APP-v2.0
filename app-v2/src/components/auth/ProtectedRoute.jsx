import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '../../lib/supabase.js';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Limpa dados legados do localStorage (migração PHP → Supabase Auth)
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_permissions');
        localStorage.removeItem('allowed_tenants');
        localStorage.removeItem('selected_tenant');
        localStorage.removeItem('auth_token');
        useAuthStore.setState({ isAuthenticated: false, user: null });
      }
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  // Estado: loading
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Estado: sem sessão → redirecionar
  if (!hasSession || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
