import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TenantHead from '../shared/TenantHead';
import FloatingChat from '../shared/FloatingChat';

export default function Layout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <TenantHead />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div style={{ padding: '22px 28px 40px' }}>
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}

