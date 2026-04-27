import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import dashboardService from '../services/dashboardService';

// ── Sparkline SVG ─────────────────────────────────────────────
function Sparkline({ data = [], w = 64, h = 22, stroke = 'currentColor' }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path
        d={'M' + pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, delta, trend, spark, sub, isLoading }) {
  const tc =
    trend === 'up' ? '#3D7A50' : trend === 'down' ? '#B84A33' : '#7F8A99';
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #DDD6C7',
        padding: '14px 16px',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, color: '#7F8A99', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: '#1C2330',
          }}
        >
          {isLoading ? (
            <span
              className="skeleton"
              style={{
                display: 'inline-block',
                height: 32,
                width: 80,
                borderRadius: 6,
              }}
            />
          ) : (
            value
          )}
        </div>
        {!isLoading && (
          <div style={{ fontSize: 11, color: tc, fontWeight: 600 }}>{delta}</div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 10, color: '#7F8A99' }}>{sub}</span>
        <Sparkline data={spark} stroke={tc} />
      </div>
    </div>
  );
}

// ── ObraCard ──────────────────────────────────────────────────
const OBRA_STATUS = {
  atrasado:    { c: '#B84A33', label: 'Atraso' },
  atencao:     { c: '#E8A628', label: 'Atenção' },
  'no-prazo':  { c: '#3D7A50', label: 'No prazo' },
  ativo:       { c: '#3D7A50', label: 'Ativo' },
  concluido:   { c: '#7F8A99', label: 'Concluído' },
  em_andamento:{ c: '#3D7A50', label: 'Em andamento' },
};

function ObraCard({ obra }) {
  const key = (obra.status ?? '').toLowerCase().replace(/\s+/g, '_');
  const { c, label } = OBRA_STATUS[key] ?? {
    c: '#7F8A99',
    label: obra.status ?? 'Em andamento',
  };
  const prog = Math.min(Number(obra.progresso ?? 0), 100);

  const prazoText = obra.data_entrega
    ? new Date(obra.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      })
    : obra.prazo ?? '—';

  const valorText = obra.valor_contrato
    ? 'R$ ' +
      (Number(obra.valor_contrato) / 1e6).toFixed(1).replace('.', ',') +
      'M'
    : '—';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #DDD6C7',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#1C2330',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {obra.nome}
          </div>
          <div style={{ fontSize: 11, color: '#7F8A99', marginTop: 2 }}>
            {obra.empresa ?? obra.empresa_nome ?? '—'}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 4,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: c + '1A',
            color: c,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            marginBottom: 4,
          }}
        >
          <span style={{ color: '#45505F' }}>
            {obra.etapa ?? obra.fase ?? 'Em andamento'}
          </span>
          <span style={{ fontWeight: 700 }}>{prog}%</span>
        </div>
        <div
          style={{
            height: 6,
            background: '#F6F3ED',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${prog}%`,
              height: '100%',
              borderRadius: 3,
              background: c,
              transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#7F8A99',
          paddingTop: 6,
          borderTop: '1px dashed #DDD6C7',
        }}
      >
        <span>{prazoText}</span>
        <span style={{ fontWeight: 600 }}>{valorText}</span>
      </div>
    </div>
  );
}

// ── Recent Entries ────────────────────────────────────────────
function RecentEntries({ items = [], isLoading }) {
  const navigate = useNavigate();
  const shimmer = {
    background:
      'linear-gradient(90deg,#EDE9E1 25%,#E0DBD0 50%,#EDE9E1 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #DDD6C7',
        borderRadius: 10,
        padding: 18,
        gridColumn: 'span 4',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2330' }}>
          Últimos lançamentos
        </div>
        <span
          onClick={() => navigate('/lancamentos')}
          style={{
            fontSize: 11,
            color: '#17273C',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Ver todos
        </span>
      </div>

      {isLoading
        ? [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '9px 0',
                borderBottom: '1px solid #E8E2D5',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  flexShrink: 0,
                  ...shimmer,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 12,
                    borderRadius: 4,
                    marginBottom: 6,
                    ...shimmer,
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: '60%',
                    borderRadius: 4,
                    ...shimmer,
                  }}
                />
              </div>
            </div>
          ))
        : items.map((l, i) => (
            <div
              key={l.id ?? i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderBottom:
                  i < items.length - 1 ? '1px solid #E8E2D5' : 'none',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#F6F3ED',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#45505F"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12h4l3-8 4 16 3-8h4" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#1C2330',
                  }}
                >
                  {l.funcionario}
                </div>
                <div
                  style={{ fontSize: 10, color: '#7F8A99', marginTop: 1 }}
                >
                  {l.obra} ·{' '}
                  {l.data
                    ? new Date(l.data + 'T00:00:00').toLocaleDateString(
                        'pt-BR',
                        { day: '2-digit', month: 'short' }
                      )
                    : '—'}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#1C2330',
                  whiteSpace: 'nowrap',
                }}
              >
                {l.horas ? `${l.horas}h` : l.diarias ? `${l.diarias}d` : '—'}
              </div>
            </div>
          ))}
    </div>
  );
}

// ── Cash Banner (setor em desenvolvimento) ────────────────────
function CashBanner() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #DDD6C7',
        borderRadius: 10,
        padding: '22px 24px',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2330' }}>
          Fluxo de caixa
        </div>
        <div style={{ fontSize: 11, color: '#7F8A99', marginTop: 2 }}>
          Últimos 12 meses · consolidado do grupo
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 0',
          gap: 10,
          borderTop: '1px solid #E8E2D5',
        }}
      >
        <svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C8C0B0"
          strokeWidth={1.2}
          strokeLinecap="round"
        >
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#7F8A99' }}>
          Setor financeiro em desenvolvimento
        </div>
        <div style={{ fontSize: 11, color: '#7F8A99' }}>
          Dados de fluxo de caixa estarão disponíveis em breve
        </div>
      </div>
    </div>
  );
}

// ── Site Map (em desenvolvimento) ────────────────────────────
function SiteMapPlaceholder({ obrasCount }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg,#F6F3ED 0%,#EEEBE5 100%)',
        borderRadius: 10,
        border: '1px solid #DDD6C7',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 320,
        gridColumn: 'span 7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      {/* Grid texture */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        viewBox="0 0 100 80"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="rr-mapgrid"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 5 0 L 0 0 0 5"
              fill="none"
              stroke="#D8D1C1"
              strokeWidth="0.08"
            />
          </pattern>
        </defs>
        <rect width="100" height="80" fill="url(#rr-mapgrid)" />
      </svg>

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          right: 20,
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2330' }}>
          Obras no mapa
        </div>
        <div style={{ fontSize: 11, color: '#7F8A99', marginTop: 2 }}>
          {obrasCount} canteiros · visualização geográfica em desenvolvimento
        </div>
      </div>

      <svg
        width={48}
        height={48}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C8C0B0"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ zIndex: 2, marginTop: 32 }}
      >
        <path d="M3 20h18" />
        <path d="M5 20V9l7-5 7 5v11" />
        <rect x="10" y="13" width="4" height="7" />
      </svg>
      <div
        style={{ fontSize: 13, fontWeight: 600, color: '#7F8A99', zIndex: 2 }}
      >
        Mapa de obras em desenvolvimento
      </div>
      <div style={{ fontSize: 11, color: '#7F8A99', zIndex: 2 }}>
        Localização geográfica dos canteiros será adicionada em breve
      </div>
    </div>
  );
}

// ── Alerts Panel (em desenvolvimento) ────────────────────────
function AlertsPanel() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #DDD6C7',
        borderRadius: 10,
        padding: 18,
        gridColumn: 'span 5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2330' }}>
          Pendências & alertas
        </div>
        <div style={{ fontSize: 11, color: '#7F8A99', marginTop: 2 }}>
          Itens que precisam de atenção
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '30px 0',
        }}
      >
        <svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C8C0B0"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 16V10a6 6 0 0112 0v6l1.5 2h-15z" />
          <path d="M10 20a2 2 0 004 0" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#7F8A99' }}>
          Sistema de alertas em desenvolvimento
        </div>
        <div
          style={{ fontSize: 11, color: '#7F8A99', textAlign: 'center' }}
        >
          Notificações automáticas estarão disponíveis em breve
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { isAdmin, isSuperAdmin, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    funcionarios: 0,
    obras: 0,
    lancamentos: 0,
    tarefas: 0,
  });
  const [datasets, setDatasets] = useState({
    obras: [],
    lancamentosRecentes: [],
  });
  const controllerRef = useRef(null);

  const isSA = isSuperAdmin();
  const canView = {
    funcionarios: isSA || isAdmin() || hasPermission('funcionarios', 'visualizar'),
    obras: isSA || isAdmin() || hasPermission('obras', 'visualizar'),
    lancamentos: isSA || isAdmin() || hasPermission('lancamentos', 'visualizar'),
    tarefas: isSA || isAdmin() || hasPermission('tarefas', 'visualizar'),
  };

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    dashboardService
      .fetchKpis({ canView })
      .then((kpis) => {
        setStats(kpis.counts);
        setDatasets(kpis.data);
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        console.error('[Dashboard]', err);
      })
      .finally(() => setIsLoading(false));

    return () => {
      controller.abort();
      controllerRef.current = null;
    };
  }, []);

  const n = stats;
  const kpis = [
    {
      key: 'funcionarios',
      label: 'Funcionários ativos',
      value: n.funcionarios,
      delta: 'cadastrados',
      trend: 'up',
      spark: [70, 74, 76, 73, 78, 80, 79, 82, 84, 83, 85, Math.max(n.funcionarios, 1)],
      sub: 'no sistema',
    },
    {
      key: 'obras',
      label: 'Obras em andamento',
      value: n.obras,
      delta: 'ativas',
      trend: 'flat',
      spark: [6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, Math.max(n.obras, 1)],
      sub: 'em execução',
    },
    {
      key: 'lancamentos',
      label: 'Total de lançamentos',
      value: n.lancamentos.toLocaleString('pt-BR'),
      delta: 'registrados',
      trend: 'up',
      spark: [820, 910, 880, 1020, 970, 1100, 1080, 1150, 1190, 1220, 1240, Math.min(n.lancamentos || 1, 9999)],
      sub: 'no acumulado',
    },
    {
      key: 'tarefas',
      label: 'Tarefas',
      value: n.tarefas,
      delta: 'total',
      trend: n.tarefas > 5 ? 'down' : 'flat',
      spark: [12, 11, 13, 10, 9, 11, 10, 9, 8, 9, 8, Math.max(n.tarefas, 1)],
      sub: 'no sistema',
    },
  ];

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);
  const mesAno = new Date()
    .toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  const shimmer = {
    background: 'linear-gradient(90deg,#EDE9E1 25%,#E0DBD0 50%,#EDE9E1 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
  };

  return (
    <div style={{ fontSize: 13, color: '#1C2330', lineHeight: 1.4 }}>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.02em',
              color: '#1C2330',
            }}
          >
            Painel operacional
          </h1>
          <div style={{ fontSize: 12, color: '#7F8A99', marginTop: 4 }}>
            {todayCap} · Vista em tempo real do grupo
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              fontSize: 11,
              padding: '6px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              background: '#fff',
              color: '#45505F',
              border: '1px solid #DDD6C7',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {mesAno}
          </button>
          <button
            onClick={() => navigate('/lancamentos')}
            style={{
              background: '#E8A628',
              border: 'none',
              color: '#17273C',
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#17273C"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo lançamento
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 14,
        }}
      >
        {kpis.map(({ key, ...rest }) => (
          <KpiCard key={key} {...rest} isLoading={isLoading} />
        ))}
      </div>

      {/* ── Cash Banner ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <CashBanner />
      </div>

      {/* ── Map + Alerts ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <SiteMapPlaceholder obrasCount={stats.obras} />
        <AlertsPanel />
      </div>

      {/* ── Obras + Recent Entries ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 14,
          marginBottom: 40,
        }}
      >
        {/* Obras (8 cols) */}
        <div style={{ gridColumn: 'span 8' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                color: '#1C2330',
              }}
            >
              Obras ativas
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: '#17273C',
                  color: '#fff',
                  fontWeight: 500,
                  cursor: 'default',
                }}
              >
                Todas · {datasets.obras?.length ?? 0}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{ height: 148, borderRadius: 10, ...shimmer }}
                />
              ))}
            </div>
          ) : (datasets.obras ?? []).length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#7F8A99',
                fontSize: 13,
              }}
            >
              Nenhuma obra cadastrada
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {datasets.obras.slice(0, 6).map((o, i) => (
                <ObraCard key={o.id ?? i} obra={o} />
              ))}
            </div>
          )}
        </div>

        {/* Recent entries (4 cols) */}
        <RecentEntries
          items={datasets.lancamentosRecentes}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
