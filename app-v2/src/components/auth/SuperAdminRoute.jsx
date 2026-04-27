// src/components/auth/SuperAdminRoute.jsx
// Proteção de rota — apenas usuários com tipo='superadmin' acessam o super-admin.
// ATENÇÃO: esta é proteção de UI apenas. A segurança real está nos RPCs SECURITY DEFINER no banco.

import { Navigate } from 'react-router-dom';
import authService from '../../services/authService.js';

export default function SuperAdminRoute({ children }) {
  const user = authService.getCurrentUser();
  const allowed = user?.tipo === 'superadmin';

  console.log('🔐 SuperAdminRoute — user.tipo:', user?.tipo, '| allowed:', allowed);

  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}
