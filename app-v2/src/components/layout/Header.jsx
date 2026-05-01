import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import useTenantBranding from '../../hooks/useTenantBranding';
import {
  User,
  LogOut,
  Search,
  Bell,
} from 'lucide-react';

const ROUTE_LABELS = {
  '/dashboard':                'Dashboard',
  '/lancamentos':              'Lançamentos',
  '/funcionarios':             'Funcionários',
  '/funcoes':                  'Funções',
  '/obras':                    'Obras',
  '/empresas':                 'Empresas',
  '/base':                     'BASE',
  '/tarefas':                  'Tarefas',
  '/relatorios-visao-geral':   'Relatórios',
  '/relatorios':               'Análise',
  '/relatorios/equipe-pdf':    'Relatório PDF',
  '/rh':                       'RH',
  '/usuarios':                 'Usuários',
  '/permissoes':               'Permissões',
  '/perfil':                   'Perfil',
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isSuperAdmin } = useAuthStore();
  const branding = useTenantBranding();
  const [isDark, setIsDark] = useState(false);

  const currentPage = ROUTE_LABELS[location.pathname] ?? 'Página';

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="bg-card border-b border-border flex items-center px-6 gap-4 flex-shrink-0" style={{ height: 60 }}>
      {/* Company switcher */}
      <button
        onClick={() => navigate('/selecionar-empresa')}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/60 transition-colors"
        style={{ background: 'hsl(var(--secondary))' }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: branding.corPrimaria, fontSize: 10, letterSpacing: '0.05em' }}
        >
          {branding.nomeExibicao?.substring(0, 2).toUpperCase() || 'AP'}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-foreground leading-tight">
            {isSuperAdmin() ? 'Super Admin' : branding.nomeExibicao}
          </span>
          <span className="text-xs leading-tight" style={{ color: '#7F8A99', letterSpacing: '0.08em', fontSize: 10 }}>
            {isSuperAdmin() ? 'PLATAFORMA' : 'EMPRESA'}
          </span>
        </div>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7F8A99" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground text-xs">Início</span>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7F8A99" strokeWidth={1.5} strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
        <span className="font-semibold text-foreground text-xs truncate">{currentPage}</span>
      </div>

      <div className="flex-1" />

      {/* Live indicator */}
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium" style={{ background: 'hsl(var(--secondary))', color: '#45505F' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: 'pulse 2s infinite' }} />
        Ao vivo
      </div>

      {/* Search */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border" style={{ background: 'hsl(var(--secondary))', width: 200 }}>
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          type="search"
          placeholder="Buscar…"
          className="bg-transparent border-none outline-none text-xs flex-1 text-foreground placeholder:text-muted-foreground"
        />
        <kbd className="text-xs text-muted-foreground border border-border px-1 py-0.5 rounded" style={{ fontSize: 9 }}>⌘K</kbd>
      </div>

      {/* Notifications */}
      <button
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all border border-border"
        style={{ width: 34, height: 34, display: 'grid', placeItems: 'center' }}
        title="Notificações"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full border-2 border-card" />
      </button>

      {/* User */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-border" style={{ height: 36 }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {user?.nome?.split(' ')[0] ?? 'Usuário'}
                </p>
                <p className="text-xs leading-tight" style={{ color: '#7F8A99', letterSpacing: '0.08em', fontSize: 10 }}>
                  {isSuperAdmin() ? 'SUPER ADMIN' : isAdmin() ? 'ACESSO TOTAL' : 'USUÁRIO'}
                </p>
              </div>
              <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--rr-navy-2), var(--rr-navy))', fontSize: 11 }}>
                {getInitials(user?.nome)}
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 animate-scale-in shadow-lg">
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--rr-navy-2), var(--rr-navy))' }}>
                  {getInitials(user?.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/perfil')} className="cursor-pointer gap-2">
              <User className="w-4 h-4" />
              Meu Perfil
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
