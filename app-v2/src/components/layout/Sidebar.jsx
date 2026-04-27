import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Briefcase,
  UserCog,
  Wallet,
  CreditCard,
  FileSpreadsheet,
  CheckSquare,
  BarChart3,
  FileDown,
  Shield,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  UserCheck,
  HardHat,
  Layers,
  PieChart,
  BookUser,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);

  const isAdminOrSuper = () => isAdmin() || isSuperAdmin();

  // Mapa path → queries a prefetch
  const prefetchMap = {
    '/financeiro/lancamentos':   () => import('../../services/financeiroService').then(m => [
      queryClient.prefetchQuery({ queryKey: ['fin-lancamentos', {}], queryFn: () => m.lancamentosFinService.list({}) }),
      queryClient.prefetchQuery({ queryKey: ['fin-categorias'],      queryFn: () => m.categoriasService.list(),   staleTime: 5 * 60 * 1000 }),
      queryClient.prefetchQuery({ queryKey: ['fin-contas'],          queryFn: () => m.contasService.list(),       staleTime: 5 * 60 * 1000 }),
    ]),
    '/financeiro/configuracoes': () => import('../../services/financeiroService').then(m => [
      queryClient.prefetchQuery({ queryKey: ['fin-categorias'],    queryFn: () => m.categoriasService.list(),    staleTime: 5 * 60 * 1000 }),
      queryClient.prefetchQuery({ queryKey: ['fin-centros-custo'], queryFn: () => m.centrosCustoService.list(), staleTime: 5 * 60 * 1000 }),
    ]),
    '/cadastros/contatos': () => import('../../services/contatosService').then(m =>
      queryClient.prefetchQuery({ queryKey: ['contatos'], queryFn: () => m.contatosService.list() })
    ),
  };

  function handlePrefetch(path) {
    if (prefetchMap[path]) prefetchMap[path]();
  }

  const menuItems = [
    { name: 'Dashboard',        path: '/dashboard',              icon: LayoutDashboard, permission: 'dashboard' },
    { name: 'Lançamentos',      path: '/lancamentos',            icon: FileText,        permission: 'lancamentos' },
    {
      name: 'Cadastros', icon: Layers, isSubmenu: true,
      submenuItems: [
        { name: 'Contatos',     path: '/cadastros/contatos', icon: BookUser,  permission: 'base' },
        { name: 'Funcionários', path: '/funcionarios',        icon: Users,     permission: 'funcionarios' },
        { name: 'Funções',      path: '/funcoes',             icon: Briefcase, permission: 'base' },
        { name: 'Obras',        path: '/obras',               icon: Building2, permission: 'obras' },
        { name: 'Empresas',     path: '/empresas',            icon: HardHat,   permission: 'empresas' },
      ],
    },
    { name: 'Tarefas',          path: '/tarefas',                icon: CheckSquare,     permission: 'tarefas' },
    {
      name: 'Financeiro', icon: Wallet, isSubmenu: true,
      submenuItems: [
        { name: 'Painel',         path: '/financeiro/painel',          icon: PieChart,        permission: 'financeiro' },
        { name: 'Contas',         path: '/financeiro/contas',          icon: Wallet,          permission: 'financeiro' },
        { name: 'Lançamentos',    path: '/financeiro/lancamentos',     icon: CreditCard,      permission: 'financeiro' },
        { name: 'Extrato',        path: '/financeiro/extrato',         icon: FileSpreadsheet, permission: 'financeiro' },
        { name: 'Configurações',  path: '/financeiro/configuracoes',   icon: Settings,        permission: 'financeiro' },
      ],
    },
    { name: 'Relatórios',       path: '/relatorios-visao-geral', icon: BarChart3,       permission: 'relatorios' },
    { name: 'Análise',          path: '/relatorios',             icon: BarChart3,       permission: 'relatorios' },
    { name: 'Relatório PDF',    path: '/relatorios/equipe-pdf',  icon: FileDown,        permission: 'relatorios' },
    { name: 'RH',               path: '/rh',                     icon: UserCheck,       permission: 'rh' },
    { name: 'Usuários',         path: '/usuarios',               icon: UserCog,         permission: 'usuarios',  adminOnly: true },
    { name: 'Permissões',       path: '/permissoes',             icon: Shield,          permission: 'permissoes', adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.isSubmenu) {
      return item.submenuItems.some((s) => {
        if (s.adminOnly && !isAdminOrSuper()) return false;
        return isAdminOrSuper() || hasPermission(s.permission, 'visualizar');
      });
    }
    if (item.adminOnly && !isAdminOrSuper()) return false;
    if (item.permission) return isAdminOrSuper() || hasPermission(item.permission, 'visualizar');
    return true;
  });

  const renderMenuItem = (item) => {
    const Icon = item.icon;

    if (item.isSubmenu) {
      const subs = item.submenuItems.filter((s) => !s.adminOnly || isAdminOrSuper());
      return (
        <div key={item.name}>
          <button
            onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
            className={`sidebar-nav-item w-full ${isCollapsed ? 'justify-center px-2' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.38)' }}>
                  {item.name}
                </span>
                {isSubmenuOpen
                  ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </>
            )}
          </button>

          {isSubmenuOpen && !isCollapsed && (
            <div className="mt-0.5 space-y-0.5 pl-2">
              {subs.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    onMouseEnter={() => handlePrefetch(sub.path)}
                    className={({ isActive }) =>
                      `sidebar-nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{sub.name}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `sidebar-nav-item ${isCollapsed ? 'justify-center px-2' : ''} ${isActive ? 'active' : ''}`
        }
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && <span>{item.name}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={`
        sidebar-root flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
        ${isCollapsed ? 'w-[60px]' : 'w-[232px]'}
      `}
    >
      {/* Logo / brand */}
      <div
        className="flex items-center justify-between px-3 py-[18px] border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => navigate('/selecionar-empresa')}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
            title="Trocar empresa"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight truncate text-white">
                Ramdy Raydan
              </p>
              <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
                CONSTRUTORA
              </p>
            </div>
          </button>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <HardHat className="w-4 h-4 text-white" />
          </div>
        )}

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="sidebar-nav-item p-1.5 ml-1"
            title="Recolher"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {visibleMenuItems.map(renderMenuItem)}
      </nav>

      {/* Expand button (collapsed state) */}
      {isCollapsed && (
        <div className="px-2 pb-3">
          <button
            onClick={() => setIsCollapsed(false)}
            className="sidebar-nav-item w-full justify-center p-2"
            title="Expandir"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textAlign: 'center' }}>
            © 2026 · CONSTRUTORA RR
          </p>
        </div>
      )}
    </aside>
  );
}
