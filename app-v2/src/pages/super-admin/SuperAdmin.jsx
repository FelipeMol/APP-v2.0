// src/pages/super-admin/SuperAdmin.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabase.js';
import authService from '../../services/authService.js';
import toast from 'react-hot-toast';
import GruposAdmin   from './GruposAdmin';
import TenantsAdmin  from './TenantsAdmin';
import ModulosAdmin  from './ModulosAdmin';
import UsuariosAdmin from './UsuariosAdmin';
import {
  LayoutDashboard, Building2, Store, LayoutGrid, DollarSign,
  BarChart2, PieChart, Users, Lock, AlertTriangle, Settings,
  Search, Maximize2, LogOut, ChevronDown, Plus,
  Clock, CheckCircle, AlertCircle,
} from 'lucide-react';

// ── Palette ────────────────────────────────────────────────────
const C = {
  navy:    '#17273C',
  navyMid: '#1F344E',
  amber:   '#E8A628',
  amberDk: '#B8862C',
  paper:   '#EEEBE5',
  card:    '#FFFFFF',
  border:  '#DDD6C7',
  borderLt:'#E8E2D5',
  borderXl:'#F0EBE0',
  bg2:     '#F6F3ED',
  bg3:     '#FBFAF6',
  tx1:     '#1C2330',
  tx2:     '#45505F',
  tx3:     '#7F8A99',
  tx4:     '#A8B0BD',
  green:   '#3D7A50',
  greenBg: '#E8F0E9',
  red:     '#B84A33',
  muted:   '#C9D2E0',
};

// ── Nav items ──────────────────────────────────────────────────
const SA_NAV = [
  { icon: LayoutDashboard, label: 'Visão geral',    id: 'overview' },
  { icon: Building2,       label: 'Grupos',         id: 'grupos'   },
  { icon: Store,           label: 'Empresas',       id: 'empresas' },
  { icon: LayoutGrid,      label: 'Módulos',        id: 'modulos'  },
  { section: 'Receita' },
  { icon: DollarSign,      label: 'Faturamento',    id: 'fat',      dev: true },
  { icon: BarChart2,       label: 'Métricas de uso',id: 'metrics',  dev: true },
  { icon: PieChart,        label: 'Planos & limites',id: 'plans',   dev: true },
  { section: 'Operação' },
  { icon: Users,           label: 'Usuários',       id: 'users'    },
  { icon: Lock,            label: 'Auditoria',      id: 'audit',    dev: true },
  { icon: AlertTriangle,   label: 'Incidentes',     id: 'incidents',dev: true },
  { icon: Settings,        label: 'Configurações',  id: 'config',   dev: true },
];

// O que cada página "Em desenvolvimento" precisa
const DEV_INFO = {
  fat:       { title: 'Faturamento',       needs: ['tabela `planos`', 'tabela `assinaturas`'],      desc: 'Gerenciamento de planos, valores, cobranças e inadimplência por grupo de clientes.' },
  metrics:   { title: 'Métricas de uso',   needs: ['tabela `usage_events`'],                        desc: 'Volume de requisições, sessões ativas, eventos por módulo e por tenant.' },
  plans:     { title: 'Planos & Limites',  needs: ['tabela `planos`', 'coluna `plano_id` em grupos'],desc: 'Configurar planos de acesso, limites de usuários e de módulos por grupo.' },
  audit:     { title: 'Auditoria',         needs: ['tabela `audit_logs`'],                          desc: 'Rastreamento de ações: quem fez o quê, quando e em qual empresa.' },
  incidents: { title: 'Incidentes',        needs: ['tabela `incidents`'],                           desc: 'Registro de incidentes, tempo de resolução e SLA por grupo.' },
  config:    { title: 'Configurações',     needs: [],                                               desc: 'Configurações globais da plataforma.' },
};

// ── Sidebar ────────────────────────────────────────────────────
function SASidebar({ activeNav, onNav, counts = {} }) {
  const user = authService.getCurrentUser();
  const initials = (user?.nome || 'AD').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const getBadge = (id) => {
    if (id === 'grupos')   return counts.grupos   != null ? counts.grupos   : null;
    if (id === 'empresas') return counts.empresas != null ? counts.empresas : null;
    if (id === 'users')    return counts.users    != null ? counts.users    : null;
    return null;
  };

  return (
    <aside style={{ width: 232, background: C.navy, color: C.muted, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.amber, color: C.navy, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, fontFamily: 'Georgia, serif' }}>S</div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13, color: '#FFF', fontWeight: 600 }}>Painel Super-Admin</div>
            <div style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>CONTROLE GLOBAL</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
        {SA_NAV.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} style={{ padding: '14px 12px 6px', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>
                {item.section.toUpperCase()}
              </div>
            );
          }
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <div key={i} onClick={() => item.id && onNav(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 6,
              color: isActive ? '#FFFFFF' : item.dev ? 'rgba(255,255,255,0.4)' : C.muted,
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              fontSize: 13, cursor: 'pointer', position: 'relative',
            }}>
              {isActive && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, background: C.amber, borderRadius: 1 }} />}
              <Icon size={16} color={isActive ? '#FFF' : item.dev ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.65)'} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.dev && !isActive && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.08em' }}>EM BREVE</span>
              )}
              {(() => { const b = getBadge(item.id); return b != null && !item.dev ? <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{b}</span> : null; })()}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.amber},${C.amberDk})`, color: C.navy, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{initials}</div>
        <div style={{ lineHeight: 1.15, flex: 1 }}>
          <div style={{ fontSize: 12, color: '#FFF', fontWeight: 500 }}>{user?.nome || 'Administrador'}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>SUPER · ROOT</div>
        </div>
        <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
      </div>
    </aside>
  );
}

// ── Topbar ─────────────────────────────────────────────────────
function SATopbar({ onBackToApp, onLogout, breadcrumb }) {
  return (
    <div style={{ height: 60, background: '#FFFFFF', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20, flexShrink: 0 }}>
      <div style={{ color: C.tx3, fontSize: 12 }}>
        <span>Super-Admin</span>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>/</span>
        <span style={{ color: C.tx1 }}>{breadcrumb}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: C.bg2, borderRadius: 999, fontSize: 11 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
        <span style={{ color: C.tx2, fontWeight: 500 }}>Supabase · conectado</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, width: 240 }}>
        <Search size={14} color={C.tx3} />
        <input placeholder="Buscar grupo, empresa…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, flex: 1, color: C.tx1, fontFamily: 'inherit' }} />
      </div>
      <button onClick={onBackToApp} style={btnGhost()}>
        <Maximize2 size={14} /> Ir para o App
      </button>
      <button onClick={onLogout} style={btnGhost()}>
        <LogOut size={14} /> Sair
      </button>
    </div>
  );
}

function btnGhost() {
  return { background: 'transparent', border: `1px solid ${C.border}`, color: C.tx2, fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'inherit' };
}
function btnAccent() {
  return { background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'inherit' };
}

// ── KPI card ───────────────────────────────────────────────────
function SAStat({ label, value, sub, loading }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: C.tx3, fontWeight: 600, marginBottom: 8 }}>{label.toUpperCase()}</div>
      {loading ? (
        <div style={{ height: 36, background: C.bg2, borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: C.tx1, lineHeight: 1.05 }}>{value}</div>
      )}
      {sub && <div style={{ fontSize: 11, color: C.tx3, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Top grupos ─────────────────────────────────────────────────
function SATopGrupos({ grupos }) {
  if (grupos.length === 0) return null;
  const ranked = [...grupos].sort((a, b) => (b.qtd_tenants || 0) - (a.qtd_tenants || 0)).slice(0, 6);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.tx1, marginBottom: 4 }}>Grupos</div>
      <div style={{ fontSize: 11, color: C.tx3, marginBottom: 18 }}>Por número de empresas</div>
      {ranked.map((g, i) => {
        const initials = g.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const max = ranked[0]?.qtd_tenants || 1;
        const pct = Math.round(((g.qtd_tenants || 0) / max) * 100);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.borderXl}` }}>
            <div style={{ fontSize: 10, color: C.tx4, width: 14, fontWeight: 600, textAlign: 'right' }}>{i + 1}</div>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.navy, color: '#FFF', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'Georgia, serif', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: C.tx1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.nome}</div>
              <div style={{ fontSize: 10.5, color: C.tx3, marginTop: 2 }}>
                {g.qtd_tenants || 0} empresa{g.qtd_tenants !== 1 ? 's' : ''} · {g.qtd_usuarios || 0} usuário{g.qtd_usuarios !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ width: 80, textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.tx1, fontWeight: 600, marginBottom: 4 }}>{g.qtd_tenants || 0}</div>
              <div style={{ height: 3, background: C.borderXl, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: C.navy }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tenants sem grupo ──────────────────────────────────────────
function SASemGrupo({ tenants }) {
  const semGrupo = tenants.filter(t => !t.grupo_id);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.tx1 }}>Empresas sem grupo</div>
          <div style={{ fontSize: 11, color: C.tx3, marginTop: 2 }}>Precisam ser vinculadas a um grupo de clientes</div>
        </div>
        {semGrupo.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#FEF3C7', border: '1px solid #F59E0B33', borderRadius: 999, fontSize: 11, color: '#92400E', fontWeight: 600 }}>
            <AlertCircle size={12} color="#F59E0B" />
            {semGrupo.length} pendente{semGrupo.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      {semGrupo.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.greenBg, borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 500 }}>
          <CheckCircle size={14} color={C.green} /> Todas as empresas estão vinculadas a um grupo
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {semGrupo.slice(0, 8).map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.borderXl}` }}>
              <Store size={14} color={C.tx3} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.tx1, fontWeight: 500 }}>{t.name}</div>
                {t.short_name && <div style={{ fontSize: 10.5, color: C.tx3 }}>{t.short_name}</div>}
              </div>
              <span style={{ fontSize: 10.5, color: C.amberDk, background: C.amberDk + '15', border: `1px solid ${C.amberDk}33`, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Sem grupo</span>
            </div>
          ))}
          {semGrupo.length > 8 && (
            <div style={{ paddingTop: 10, fontSize: 11, color: C.tx3, textAlign: 'center', borderTop: `1px solid ${C.borderXl}` }}>
              +{semGrupo.length - 8} empresas sem grupo — acesse a aba Empresas para vincular
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Resumo de módulos por empresa ──────────────────────────────
function SAModulosSummary({ tenants, modules }) {
  const MODULOS = ['rh', 'financeiro', 'obras', 'relatorios'];
  const byTenant = {};
  modules.forEach(m => {
    if (m.ativo) {
      if (!byTenant[m.tenant_id]) byTenant[m.tenant_id] = [];
      byTenant[m.tenant_id].push(m.module_id);
    }
  });

  const stats = MODULOS.map(mod => ({
    mod,
    count: Object.values(byTenant).filter(mods => mods.includes(mod)).length,
    total: tenants.length,
  }));

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.tx1, marginBottom: 4 }}>Módulos habilitados</div>
      <div style={{ fontSize: 11, color: C.tx3, marginBottom: 18 }}>Quantas empresas usam cada módulo</div>
      {stats.map((s, i) => {
        const pct = s.total > 0 ? Math.round((s.count / s.total) * 100) : 0;
        return (
          <div key={s.mod} style={{ padding: '11px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.borderXl}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.tx1, fontWeight: 500, textTransform: 'capitalize' }}>{s.mod}</span>
              <span style={{ fontSize: 12, color: C.tx2 }}>
                <span style={{ fontWeight: 600, color: C.tx1 }}>{s.count}</span>
                <span style={{ color: C.tx4 }}> / {s.total}</span>
              </span>
            </div>
            <div style={{ height: 4, background: C.borderXl, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: pct > 75 ? C.navy : pct > 40 ? '#3D5A80' : C.tx3, transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Página "Em desenvolvimento" ────────────────────────────────
function SAUnderDev({ id }) {
  const info = DEV_INFO[id] || { title: id, needs: [], desc: 'Em desenvolvimento.' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 480, padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: C.bg2, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', marginBottom: 20 }}>
        <Clock size={24} color={C.tx3} />
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 500, color: C.tx1, marginBottom: 8 }}>{info.title}</div>
      <div style={{ fontSize: 13, color: C.tx3, maxWidth: 420, lineHeight: 1.6, marginBottom: 24 }}>{info.desc}</div>
      {info.needs.length > 0 && (
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 24px', textAlign: 'left', maxWidth: 380 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.16em', color: C.tx3, fontWeight: 700, marginBottom: 10 }}>PRECISA DE (banco de dados)</div>
          {info.needs.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.borderXl}` }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: C.amberDk, flexShrink: 0 }} />
              <code style={{ fontSize: 12, color: C.tx1, fontFamily: '"DM Mono", monospace' }}>{n}</code>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 24, padding: '6px 18px', background: C.amberDk + '22', border: `1px solid ${C.amberDk}55`, borderRadius: 999, fontSize: 10.5, color: C.amberDk, fontWeight: 700, letterSpacing: '0.14em' }}>EM DESENVOLVIMENTO</div>
    </div>
  );
}

// ── Tabs (overview) ────────────────────────────────────────────
function SATabs({ active, onChange, counts }) {
  const tabs = [
    { id: 'grupos',   label: 'Grupos',   count: counts.grupos },
    { id: 'empresas', label: 'Empresas', count: counts.tenants },
    { id: 'modulos',  label: 'Módulos',  count: null },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, width: 'fit-content', marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          background: active === t.id ? C.card : 'transparent',
          border: active === t.id ? `1px solid ${C.border}` : '1px solid transparent',
          boxShadow: active === t.id ? '0 1px 2px rgba(23,39,60,0.04)' : 'none',
          fontSize: 12.5, fontWeight: active === t.id ? 600 : 500,
          color: active === t.id ? C.tx1 : C.tx3,
          padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          {t.label}
          {t.count != null && (
            <span style={{ fontSize: 10, fontWeight: 600, color: active === t.id ? C.tx3 : C.tx4, background: active === t.id ? C.bg2 : 'transparent', padding: '1px 6px', borderRadius: 4 }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function SuperAdmin() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('overview');
  const [tab, setTab] = useState('grupos');
  const [grupos, setGrupos] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tenantCount, setTenantCount] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [modules, setModules] = useState([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      setLoadingCounts(true);
      const [g, tc, uc, mod, ten] = await Promise.allSettled([
        supabase.rpc('admin_list_grupos'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        supabase.from('tenant_modules').select('tenant_id, module_id, ativo'),
        supabase.from('tenants').select('id, name, short_name, active, grupo_id').eq('active', true),
      ]);
      if (g.status === 'fulfilled') setGrupos(g.value.data || []);
      if (tc.status === 'fulfilled') setTenantCount(tc.value.count ?? 0);
      if (uc.status === 'fulfilled') setUserCount(uc.value.count ?? 0);
      if (mod.status === 'fulfilled') setModules(mod.value.data || []);
      if (ten.status === 'fulfilled') setTenants(ten.value.data || []);
      setLoadingCounts(false);
    }
    loadOverview();
  }, []);

  const handleLogout = async () => { await authService.logout(); navigate('/login'); };
  const handleBackToApp = () => navigate('/dashboard');

  const handleNav = (id) => {
    setActiveNav(id);
    if (['grupos', 'empresas', 'modulos'].includes(id)) setTab(id);
  };

  const breadcrumbMap = {
    overview: 'Visão geral', grupos: 'Grupos', empresas: 'Empresas', modulos: 'Módulos',
    fat: 'Faturamento', metrics: 'Métricas de uso', plans: 'Planos & Limites',
    users: 'Usuários', audit: 'Auditoria', incidents: 'Incidentes', config: 'Configurações',
  };

  const totalUsers = grupos.reduce((s, g) => s + (g.qtd_usuarios || 0), 0) || userCount || 0;
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const isDevPage = DEV_INFO[activeNav] !== undefined;
  const isOverview = activeNav === 'overview';
  const isManagement = ['grupos', 'empresas', 'modulos'].includes(activeNav);
  const isUsers = activeNav === 'users';

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif', color: C.tx1, background: C.paper, display: 'flex', width: '100vw', height: '100vh', fontSize: 13, lineHeight: 1.4, overflow: 'hidden' }}>
      <SASidebar
        activeNav={activeNav}
        onNav={handleNav}
        counts={{ grupos: grupos.length, empresas: tenantCount, users: userCount }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <SATopbar onBackToApp={handleBackToApp} onLogout={handleLogout} breadcrumb={breadcrumbMap[activeNav] || 'Visão geral'} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px', display: 'flex', flexDirection: 'column' }}>

          {/* ── Páginas "Em desenvolvimento" ── */}
          {isDevPage && <SAUnderDev id={activeNav} />}

          {/* ── Usuários ── */}
          {isUsers && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: C.tx3, fontWeight: 600, marginBottom: 6 }}>GESTÃO CENTRAL · USUÁRIOS</div>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', color: C.tx1 }}>Usuários do Sistema</h1>
                <div style={{ fontSize: 13, color: C.tx2, marginTop: 6, textTransform: 'capitalize' }}>{hoje}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
                <UsuariosAdmin />
              </div>
            </>
          )}

          {/* ── Visão geral ── */}
          {isOverview && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: C.tx3, fontWeight: 600, marginBottom: 6 }}>GESTÃO CENTRAL · MULTI-TENANT</div>
                  <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', color: C.tx1 }}>Visão geral da plataforma</h1>
                  <div style={{ fontSize: 13, color: C.tx2, marginTop: 6, textTransform: 'capitalize' }}>
                    {hoje} · Configure grupos, filiais e módulos.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btnAccent()} onClick={() => { setActiveNav('grupos'); setTab('grupos'); }}>
                    <Plus size={14} color={C.navy} /> Novo Grupo
                  </button>
                </div>
              </div>

              {/* KPIs reais */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                <SAStat label="Grupos ativos" value={String(grupos.length)} sub={`${grupos.length} grupo${grupos.length !== 1 ? 's' : ''} cadastrado${grupos.length !== 1 ? 's' : ''}`} loading={loadingCounts} />
                <SAStat label="Empresas ativas" value={tenantCount != null ? String(tenantCount) : '—'} sub="tenants com acesso ativo" loading={loadingCounts} />
                <SAStat label="Usuários cadastrados" value={totalUsers > 0 ? String(totalUsers) : (userCount != null ? String(userCount) : '—')} sub={grupos.length > 0 && totalUsers > 0 ? `média ${Math.round(totalUsers / grupos.length)}/grupo` : 'no sistema'} loading={loadingCounts} />
              </div>

              {/* Grid de cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <SATopGrupos grupos={grupos} />
                <SASemGrupo tenants={tenants} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <SAModulosSummary tenants={tenants} modules={modules} />
              </div>

              {/* Gestão Central (tabs) */}
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 500, color: C.tx1 }}>Gestão Central</div>
                  <div style={{ fontSize: 12, color: C.tx3, marginTop: 4 }}>Configure grupos, filiais e módulos.</div>
                </div>
                <SATabs active={tab} onChange={setTab} counts={{ grupos: grupos.length, tenants: tenantCount }} />
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  {tab === 'grupos'   && <div style={{ padding: 24 }}><GruposAdmin /></div>}
                  {tab === 'empresas' && <div style={{ padding: 24 }}><TenantsAdmin /></div>}
                  {tab === 'modulos'  && <div style={{ padding: 24 }}><ModulosAdmin /></div>}
                </div>
              </div>
            </>
          )}

          {/* ── Gestão (nav lateral clicada diretamente) ── */}
          {isManagement && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: C.tx3, fontWeight: 600, marginBottom: 6 }}>GESTÃO CENTRAL</div>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', color: C.tx1 }}>
                  {activeNav === 'grupos' ? 'Grupos de Clientes' : activeNav === 'empresas' ? 'Empresas (Tenants)' : 'Módulos por Empresa'}
                </h1>
                <div style={{ fontSize: 13, color: C.tx2, marginTop: 6, textTransform: 'capitalize' }}>{hoje}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {activeNav === 'grupos'   && <div style={{ padding: 24 }}><GruposAdmin /></div>}
                {activeNav === 'empresas' && <div style={{ padding: 24 }}><TenantsAdmin /></div>}
                {activeNav === 'modulos'  && <div style={{ padding: 24 }}><ModulosAdmin /></div>}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
