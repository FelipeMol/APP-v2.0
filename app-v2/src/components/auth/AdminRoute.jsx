import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isSuperAdmin } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin() && !isSuperAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
