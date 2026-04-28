// Financeiro — Visão Geral (Painel Principal)
// Design: warm beige shell + navy banner + KPIs + charts
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { contasService, lancamentosFinService } from '@/services/financeiroService'

// ── Palette ──────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Date helpers (computed once at module load) ───────────────────
const _today     = new Date()
const HOJE       = _today.toISOString().slice(0, 10)
const ANO        = _today.getFullYear()
const MES        = _today.getMonth() + 1
const INICIO_MES = `${ANO}-${String(MES).padStart(2, '0')}-01`
const ULTIMO_DIA = new Date(ANO, MES, 0).getDate()
const FIM_MES    = `${ANO}-${String(MES).padStart(2, '0')}-${String(ULTIMO_DIA).padStart(2, '0')}`
const EM_30D     = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
const MES_LABEL  = _today.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  .toUpperCase().replace(/\. ?/, '/')

// ── Helpers ───────────────────────────────────────────────────────
function brl(n) {
  const abs = Math.abs(n)
  return (n < 0 ? '−' : '') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function brlK(n) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1_000)     return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000).toFixed(0) + 'k'
  return brl(n)
}
function fmtDate(d) {
  if (!d) return '—'
  const [, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}`
}
function TH() { return { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, color: C.ink3 } }
function TD() { return { padding: '12px 10px', verticalAlign: 'middle', color: C.ink } }

// ── Shared atoms ──────────────────────────────────────────────────
function Sparkline({ data, w = 72, h = 22, color = C.ok }) {
  if (!data?.length) return null
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1
    const y = h - 2 - ((v - min) / range) * (h - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={'M' + pts.join(' L ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatusPill({ status, dataVenc }) {
  const isAtrasado = (status === 'pendente' || status === 'agendado') && dataVenc && dataVenc < HOJE
  if (isAtrasado) {
    return (
      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#FBE9E4', color: '#B84A33', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Atrasado
      </span>
    )
  }
  const map = {
    pago:      { label: 'Pago',      bg: '#E4F1E8', fg: '#3D7A50' },
    pendente:  { label: 'A pagar',   bg: '#FDF3DF', fg: '#8A6210' },
    agendado:  { label: 'Agendado',  bg: '#E8F0FB', fg: '#2D5FA0' },
    cancelado: { label: 'Cancelado', bg: '#F6F3ED', fg: '#7F8A99' },
  }
  const m = map[status] || map.pendente
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: m.bg, color: m.fg, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {m.label}
    </span>
  )
}

function FinKPI({ label, value, delta, deltaColor, sub, sparkData, sparkColor }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: C.ink3, fontWeight: 500, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1, color: C.ink }}>{value}</div>
        {delta && <div style={{ fontSize: 11, color: deltaColor || C.ok, fontWeight: 600 }}>{delta}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: C.ink3 }}>{sub}</span>
        {sparkData && <Sparkline data={sparkData} color={sparkColor || C.ok} />}
      </div>
    </div>
  )
}

function GhostBtn({ children, to, onClick }) {
  const s = { display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }
  if (to) return <Link to={to} style={s}>{children}</Link>
  return <button style={s} onClick={onClick}>{children}</button>
}

// ── Sub-components (all receive real data via props) ──────────────
function SaldoBanner({ contas, saldosMap, totalEntradas, totalSaidas, loading }) {
  const totalSaldo = Object.values(saldosMap).reduce((s, v) => s + v, 0)
  const saldoMes   = totalEntradas - totalSaidas

  if (loading && !contas.length) {
    return (
      <div style={{ background: C.navy, borderRadius: 10, padding: '24px 28px', marginBottom: 14, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Carregando…</span>
      </div>
    )
  }

  return (
    <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '24px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 0, marginBottom: 14 }}>
      <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO TOTAL EM CAIXA</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>{brl(totalSaldo)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
          {contas.length} conta{contas.length !== 1 ? 's' : ''} ativa{contas.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>ENTRADAS · {MES_LABEL}</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: '#8ED1A5' }}>
          {totalEntradas > 0 ? '+' : ''}{brlK(totalEntradas)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>receitas pagas no mês</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SAÍDAS · {MES_LABEL}</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: '#F4B19C' }}>
          {totalSaidas > 0 ? '−' : ''}{brlK(totalSaidas)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>despesas pagas no mês</div>
      </div>
      <div style={{ paddingLeft: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO DO MÊS</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: saldoMes >= 0 ? '#8ED1A5' : '#F4B19C' }}>
          {saldoMes >= 0 ? '+' : '−'}{brlK(Math.abs(saldoMes))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
          {saldoMes >= 0 ? 'Margem operacional positiva' : 'Déficit no mês'}
        </div>
      </div>
    </div>
  )
}

function FluxoDiarioChart({ lancamentos }) {
  const fluxo = useMemo(() => {
    const map = {}
    for (let d = 1; d <= ULTIMO_DIA; d++) map[d] = { entrada: 0, saida: 0 }
    lancamentos.forEach(l => {
      if (!l.data_vencimento) return
      const dia = parseInt(l.data_vencimento.slice(8, 10), 10)
      if (dia < 1 || dia > ULTIMO_DIA) return
      if (l.tipo === 'receita') map[dia].entrada += +l.valor || 0
      else                      map[dia].saida   += +l.valor || 0
    })
    return Object.entries(map).map(([d, v]) => ({ dia: +d, ...v }))
  }, [lancamentos])

  const maxVal = Math.max(...fluxo.map(d => Math.max(d.entrada, d.saida)), 1)
  const W = 720, H = 175, PAD = 20
  const bw = (W - PAD * 2) / fluxo.length

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Fluxo diário · {MES_LABEL}</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Vencimentos por dia · todas as contas</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.ink2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: C.navy, borderRadius: 2 }} /> Entradas
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: '#B8862C', borderRadius: 2 }} /> Saídas
          </span>
        </div>
      </div>

      {lancamentos.length === 0 ? (
        <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontSize: 13 }}>
          Nenhum lançamento neste mês
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 190, display: 'block', marginTop: 8 }} preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <line key={i} x1={PAD} y1={H - p * (H - 20) - 6} x2={W - PAD} y2={H - p * (H - 20) - 6} stroke="#E8E2D5" strokeWidth="0.5" strokeDasharray="2 2" />
          ))}
          {fluxo.map((d, i) => {
            const x    = PAD + i * bw
            const eH   = (d.entrada / maxVal) * (H - 30)
            const sH   = (d.saida   / maxVal) * (H - 30)
            const barW = bw * 0.36
            return (
              <g key={i}>
                <rect x={x + bw * 0.08} y={H - 6 - eH} width={barW} height={eH || 0} fill={C.navy} rx="1" />
                <rect x={x + bw * 0.46} y={H - 6 - sH} width={barW} height={sH || 0} fill="#B8862C" rx="1" />
                {(d.dia % 5 === 0 || d.dia === 1) && (
                  <text x={x + bw * 0.5} y={H + 14} fontSize="9" fill={C.ink3} textAnchor="middle" fontFamily="Inter">
                    {String(d.dia).padStart(2, '0')}
                  </text>
                )}
              </g>
            )
          })}
          <line x1={PAD} y1={H - 6} x2={W - PAD} y2={H - 6} stroke="#DDD6C7" strokeWidth="1" />
        </svg>
      )}
    </div>
  )
}

function CategoriaRanking({ lancamentos }) {
  const data = useMemo(() => {
    const totals = {}
    lancamentos.forEach(l => {
      const nome = l.financeiro_categorias?.nome || 'Sem categoria'
      const cor  = l.financeiro_categorias?.cor  || C.ink3
      if (!totals[nome]) totals[nome] = { v: 0, cor }
      totals[nome].v += +l.valor || 0
    })
    return Object.entries(totals).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.v - a.v).slice(0, 7)
  }, [lancamentos])

  const maxVal = data[0]?.v || 1
  const total  = data.reduce((s, x) => s + x.v, 0)

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 4' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Top categorias de gasto</div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{MES_LABEL} · despesas pagas</div>
      </div>
      {data.length === 0 ? (
        <div style={{ color: C.ink3, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhuma despesa paga neste mês</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.map(c => {
            const pct = (c.v / total * 100)
            return (
              <div key={c.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: C.ink, fontWeight: 500 }}>{c.k}</span>
                  <span style={{ color: C.ink2 }}>{brlK(c.v)} · <span style={{ color: C.ink3 }}>{pct.toFixed(0)}%</span></span>
                </div>
                <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: (c.v / maxVal * 100) + '%', height: '100%', background: c.cor, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CentroCustoRanking({ lancamentos }) {
  const data = useMemo(() => {
    const totals = {}
    lancamentos
      .filter(l => l.financeiro_centros_custo?.nome)
      .forEach(l => {
        const nome = l.financeiro_centros_custo.nome
        totals[nome] = (totals[nome] || 0) + (+l.valor || 0)
      })
    return Object.entries(totals).map(([nome, v]) => ({ nome, v })).sort((a, b) => b.v - a.v).slice(0, 6)
  }, [lancamentos])

  const maxVal = data[0]?.v || 1

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 5' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Gasto por centro de custo · {MES_LABEL}</div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Apenas despesas pagas</div>
      </div>
      {data.length === 0 ? (
        <div style={{ color: C.ink3, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sem dados de centro de custo</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((o, i) => (
            <div key={o.nome} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 90px', gap: 10, alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: C.ink3, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div style={{ marginBottom: 4, fontWeight: 500, color: C.ink }}>{o.nome}</div>
                <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: (o.v / maxVal * 100) + '%', height: '100%', background: C.navy }} />
                </div>
              </div>
              <span style={{ textAlign: 'right', color: C.ink2, fontWeight: 600 }}>{brlK(o.v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ApagarBlock({ lancamentos }) {
  const data = useMemo(() => {
    return lancamentos
      .filter(l => l.tipo === 'despesa' && (l.status === 'pendente' || l.status === 'agendado'))
      .sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''))
      .slice(0, 10)
  }, [lancamentos])

  const total     = data.reduce((s, l) => s + (+l.valor || 0), 0)
  const atrasados = data.filter(l => l.data_vencimento && l.data_vencimento < HOJE).length

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Próximos vencimentos</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{data.length} conta{data.length !== 1 ? 's' : ''} · {brl(total)} no total</div>
        </div>
        {atrasados > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: C.bad, background: '#FBE9E4', padding: '4px 10px', borderRadius: 999 }}>
            {atrasados} atrasada{atrasados !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div style={{ color: C.ink3, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum vencimento pendente</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.ink3, textAlign: 'left' }}>
              <th style={TH()}>Vencimento</th>
              <th style={TH()}>Descrição</th>
              <th style={TH()}>Fornecedor</th>
              <th style={{ ...TH(), textAlign: 'right' }}>Valor</th>
              <th style={TH()}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map(l => (
              <tr key={l.id} style={{ borderTop: `1px solid ${C.line2}` }}>
                <td style={TD()}><span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>{fmtDate(l.data_vencimento)}</span></td>
                <td style={TD()}><div style={{ fontWeight: 500 }}>{l.descricao}</div></td>
                <td style={TD()}><span style={{ fontSize: 11, color: C.ink2 }}>{l.contatos?.nome || '—'}</span></td>
                <td style={{ ...TD(), textAlign: 'right', fontWeight: 700 }}>{brl(+l.valor || 0)}</td>
                <td style={TD()}><StatusPill status={l.status} dataVenc={l.data_vencimento} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function Painel() {
  const { data: contas = [], isLoading: loadingContas } = useQuery({
    queryKey: ['fin-contas'],
    queryFn: () => contasService.list(),
    staleTime: 5 * 60 * 1000,
  })

  // Current month lancamentos for charts / banner
  const { data: lancMes = [], isLoading: loadingLancs } = useQuery({
    queryKey: ['fin-lancamentos-painel', INICIO_MES, FIM_MES],
    queryFn: () => lancamentosFinService.list({ inicio: INICIO_MES, fim: FIM_MES }),
  })

  // All pending / scheduled (used for próximos vencimentos + KPIs)
  const { data: lancPendentes = [] } = useQuery({
    queryKey: ['fin-lancamentos-pendentes'],
    queryFn: () => lancamentosFinService.list({ status: 'pendente' }),
  })
  const { data: lancAgendados = [] } = useQuery({
    queryKey: ['fin-lancamentos-agendados'],
    queryFn: () => lancamentosFinService.list({ status: 'agendado' }),
  })

  // Saldos per conta (computed in Supabase from paid lancamentos)
  const contaIds = useMemo(() => contas.map(c => c.id), [contas])
  const { data: saldosMap = {} } = useQuery({
    queryKey: ['fin-saldos', contaIds],
    queryFn: () => contasService.saldos(contaIds),
    enabled: contaIds.length > 0,
  })

  // Derived values
  const lancPagos     = useMemo(() => lancMes.filter(l => l.status === 'pago'), [lancMes])
  const totalEntradas = useMemo(() => lancPagos.filter(l => l.tipo === 'receita').reduce((s, l) => s + (+l.valor || 0), 0), [lancPagos])
  const totalSaidas   = useMemo(() => lancPagos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + (+l.valor || 0), 0), [lancPagos])
  const despesasPagas = useMemo(() => lancPagos.filter(l => l.tipo === 'despesa'), [lancPagos])
  const vencimentos   = useMemo(() => [...lancPendentes, ...lancAgendados], [lancPendentes, lancAgendados])

  const aReceber = useMemo(() =>
    vencimentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + (+l.valor || 0), 0),
    [vencimentos]
  )
  const aPagar30 = useMemo(() =>
    vencimentos
      .filter(l => l.tipo === 'despesa' && l.data_vencimento && l.data_vencimento <= EM_30D)
      .reduce((s, l) => s + (+l.valor || 0), 0),
    [vencimentos]
  )
  const atrasadosQtd = useMemo(() =>
    vencimentos.filter(l => l.tipo === 'despesa' && l.data_vencimento && l.data_vencimento < HOJE).length,
    [vencimentos]
  )
  const margem = totalEntradas > 0 ? ((totalEntradas - totalSaidas) / totalEntradas * 100) : 0

  const loading = loadingContas || loadingLancs

  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Visão geral financeira</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>
            {loading ? 'Carregando…' : `Consolidado · ${contas.length} conta${contas.length !== 1 ? 's' : ''} ativa${contas.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostBtn to="/financeiro/lancamentos">Lançamentos</GhostBtn>
          <GhostBtn to="/financeiro/contas">Contas</GhostBtn>
          <Link
            to="/financeiro/lancamentos"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', textDecoration: 'none' }}
          >
            + Novo lançamento
          </Link>
        </div>
      </div>

      {/* Saldo banner */}
      <SaldoBanner
        contas={contas}
        saldosMap={saldosMap}
        totalEntradas={totalEntradas}
        totalSaidas={totalSaidas}
        loading={loading}
      />

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <FinKPI
          label="Lançamentos do mês"
          value={lancMes.length.toLocaleString('pt-BR')}
          sub={`${lancPagos.length} pago${lancPagos.length !== 1 ? 's' : ''} · ${lancMes.length - lancPagos.length} pendente${lancMes.length - lancPagos.length !== 1 ? 's' : ''}`}
        />
        <FinKPI
          label="A receber"
          value={brlK(aReceber)}
          deltaColor={C.ink3}
          sub="Receitas pendentes / agendadas"
          sparkColor={C.navy}
        />
        <FinKPI
          label="A pagar próx. 30d"
          value={brlK(aPagar30)}
          delta={atrasadosQtd > 0 ? `${atrasadosQtd} atrasada${atrasadosQtd !== 1 ? 's' : ''}` : undefined}
          deltaColor={C.bad}
          sub="Despesas até 30 dias"
          sparkColor="#B8862C"
        />
        <FinKPI
          label="Margem operacional"
          value={totalEntradas > 0 ? `${margem.toFixed(1)}%` : '—'}
          sub={`Ent. − saí. / ent. · ${MES_LABEL}`}
          sparkColor={margem >= 0 ? C.ok : C.bad}
        />
      </div>

      {/* Row 2: fluxo + categorias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, marginBottom: 14 }}>
        <FluxoDiarioChart lancamentos={lancMes} />
        <CategoriaRanking lancamentos={despesasPagas} />
      </div>

      {/* Row 3: próximos vencimentos + centro de custo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
        <ApagarBlock lancamentos={vencimentos} />
        <CentroCustoRanking lancamentos={despesasPagas} />
      </div>

    </div>
  )
}
