// Relatórios — Visão Geral  (redesenho completo v2)
// Centro de operações: horas por dia, rankings de obras/funções/equipe, feed
import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import lancamentosService from '@/services/lancamentosService'

// ── Palette ──────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

const PALETTE = [C.navy, C.info, C.warn, C.ok, C.bad, '#7A5C3D', '#5A3D7A', '#3D7A6A']

// ── Helpers ──────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0')
const HOJE_ISO = new Date().toISOString().slice(0, 10)

function getRange(period) {
  const end   = new Date()
  const start = new Date(end)
  if      (period === '7d')  start.setDate(end.getDate() - 6)
  else if (period === '30d') start.setDate(end.getDate() - 29)
  else if (period === 'mes') start.setDate(1)
  else if (period === 'ano') { start.setMonth(0); start.setDate(1) }
  const fmt = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  return { inicio: fmt(start), fim: fmt(end) }
}

function parseMin(str) {
  const [h, m] = String(str || '').split(':')
  const hh = Number(h), mm = Number(m || 0)
  return (isNaN(hh) ? 0 : hh) * 60 + (isNaN(mm) ? 0 : mm)
}

function hhmm(mins) {
  const m = Math.max(0, Math.round(mins || 0))
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`
}

function fmtDateBR(iso) {
  if (!iso) return '—'
  const [, mm, dd] = iso.split('-')
  return `${dd}/${mm}`
}

function fmtDateFull(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const sortMap = obj =>
  Object.entries(obj)
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => b.v - a.v)

// ── Period selector ───────────────────────────────────────────────
const PERIOD_OPTS = [
  { value: '7d',  label: '7 dias'    },
  { value: '30d', label: '30 dias'   },
  { value: 'mes', label: 'Mês atual' },
  { value: 'ano', label: 'Ano'       },
]

function PeriodBtn({ value, current, onClick, label }) {
  const on = value === current
  return (
    <button
      onClick={() => onClick(value)}
      style={{
        background: on ? C.navy : C.surface,
        color: on ? '#FFF' : C.ink2,
        border: `1px solid ${on ? C.navy : C.line}`,
        fontSize: 12, fontWeight: on ? 700 : 500,
        padding: '6px 14px', borderRadius: 7,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── Hero Banner ───────────────────────────────────────────────────
function HeroBanner({ totalMin, funcionarios, obras, total, loading }) {
  const items = [
    { label: 'HORAS TOTAIS',   val: loading ? '…' : hhmm(totalMin),      sub: 'no período'     },
    { label: 'FUNCIONÁRIOS',   val: loading ? '…' : String(funcionarios), sub: 'com lançamento' },
    { label: 'OBRAS ATIVAS',   val: loading ? '…' : String(obras),        sub: 'no período'     },
    { label: 'LANÇAMENTOS',    val: loading ? '…' : String(total),        sub: 'registros'      },
  ]
  return (
    <div style={{
      background: C.navy, color: '#FFF', borderRadius: 12,
      padding: '22px 28px', display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          paddingLeft:  i > 0 ? 24 : 0,
          paddingRight: i < 3 ? 24 : 0,
          borderRight: i < 3 ? '1px solid rgba(255,255,255,.12)' : 'none',
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>
            {item.val}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Gráfico de barras diário ──────────────────────────────────────
function HorasPorDiaChart({ lancamentos }) {
  const data = useMemo(() => {
    const map = {}
    lancamentos.forEach(l => {
      if (!l.data) return
      map[l.data] = (map[l.data] || 0) + parseMin(l.horas)
    })
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, m]) => ({ d, m }))
  }, [lancamentos])

  if (!data.length) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontSize: 13 }}>
        Sem dados no período
      </div>
    )
  }

  const W = 760, H = 160, PAD = 8
  const maxVal = Math.max(...data.map(d => d.m), 1)
  const bw     = (W - PAD * 2) / Math.max(data.length, 1)
  const tickEvery = data.length <= 14 ? 1 : data.length <= 31 ? 2 : Math.ceil(data.length / 20)

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H + 28}`}
        style={{ width: '100%', height: 190, display: 'block' }}
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i}
            x1={PAD} y1={H - p * (H - 18) + 2}
            x2={W - PAD} y2={H - p * (H - 18) + 2}
            stroke={C.line} strokeWidth="0.5" strokeDasharray="3 3"
          />
        ))}
        {data.map((d, i) => {
          const x     = PAD + i * bw
          const barH  = Math.max(2, (d.m / maxVal) * (H - 22))
          const barW  = Math.max(4, bw * 0.65)
          const isHoj = d.d === HOJE_ISO
          const fill  = isHoj ? C.amber : C.navy
          const opac  = isHoj ? 1 : 0.78
          return (
            <g key={d.d}>
              <rect
                x={x + (bw - barW) / 2}
                y={H - barH + 2}
                width={barW} height={barH}
                fill={fill} rx="2" opacity={opac}
              />
              {barH > 22 && (
                <text
                  x={x + bw / 2} y={H - barH + 15}
                  fontSize="8" fill={isHoj ? C.navy : '#FFF'}
                  textAnchor="middle" fontFamily="Inter" fontWeight="700"
                >
                  {hhmm(d.m)}
                </text>
              )}
              {i % tickEvery === 0 && (
                <text
                  x={x + bw / 2} y={H + 20}
                  fontSize="9" fill={C.ink3}
                  textAnchor="middle" fontFamily="Inter"
                >
                  {fmtDateBR(d.d)}
                </text>
              )}
            </g>
          )
        })}
        <line x1={PAD} y1={H + 2} x2={W - PAD} y2={H + 2} stroke={C.line} strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Card "Hoje" ───────────────────────────────────────────────────
function HojeCard({ lancamentos }) {
  const hoje = useMemo(() => {
    const arr    = lancamentos.filter(l => l.data === HOJE_ISO)
    const totalM = arr.reduce((s, l) => s + parseMin(l.horas), 0)
    const funcs  = new Set(arr.map(l => l.funcionario).filter(Boolean)).size
    const obras  = new Set(arr.map(l => l.obra).filter(Boolean)).size
    return { count: arr.length, totalM, funcs, obras }
  }, [lancamentos])

  const temDados = hoje.count > 0

  return (
    <div style={{
      background: temDados ? C.navy : C.surface,
      border: `1px solid ${temDados ? C.navy : C.line2}`,
      borderRadius: 10, padding: '22px 24px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.12em', fontWeight: 700,
        color: temDados ? 'rgba(255,255,255,.5)' : C.ink3,
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        Hoje · {fmtDateFull(HOJE_ISO)}
      </div>

      {temDados ? (
        <>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#FFF', lineHeight: 1.05, marginBottom: 4 }}>
            {hhmm(hoje.totalM)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 22 }}>horas registradas hoje</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {[
              { label: 'Funcionários', val: hoje.funcs },
              { label: 'Obras',        val: hoje.obras },
              { label: 'Lançamentos',  val: hoje.count },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{item.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>{item.val}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 0' }}>
          <div style={{ fontSize: 36 }}>📋</div>
          <div style={{ fontSize: 13, color: C.ink3, textAlign: 'center' }}>
            Nenhum lançamento<br />registrado hoje ainda
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ranking genérico (barra horizontal) ──────────────────────────
function RankCard({ title, sub, items, color, loading, emptyMsg = 'Sem dados no período' }) {
  const max = items[0]?.v || 1
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>{sub}</div>}
      {loading ? (
        <div style={{ color: C.ink3, fontSize: 13, paddingTop: 8 }}>Carregando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: C.ink3, fontSize: 13, paddingTop: 8 }}>{emptyMsg}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: sub ? 0 : 14 }}>
          {items.map(o => (
            <div key={o.k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.ink, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {o.k}
                </span>
                <span style={{ color: C.ink2, fontWeight: 700, whiteSpace: 'nowrap' }}>{hhmm(o.v)}</span>
              </div>
              <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: (o.v / max * 100) + '%', height: '100%', background: color || C.navy, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ranking de funcionários (numerado + barra âmbar) ─────────────
function EquipeCard({ items, loading }) {
  const max = items[0]?.v || 1
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Equipe</div>
      <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>Top funcionários por horas</div>
      {loading ? (
        <div style={{ color: C.ink3, fontSize: 13 }}>Carregando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: C.ink3, fontSize: 13 }}>Sem dados no período</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {items.map((f, i) => (
            <div key={f.k} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: i < 3 ? C.amber : C.ink3, fontFamily: 'monospace' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  {f.k}
                </div>
                <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: (f.v / max * 100) + '%', height: '100%', background: C.amber, borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>{hhmm(f.v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Funções com cores distintas ───────────────────────────────────
function FuncoesCard({ items, loading }) {
  const max = items[0]?.v || 1
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Funções</div>
      <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>Horas por cargo / especialidade</div>
      {loading ? (
        <div style={{ color: C.ink3, fontSize: 13 }}>Carregando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: C.ink3, fontSize: 13 }}>Sem dados no período</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {items.map((o, i) => (
            <div key={o.k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.ink, fontWeight: 500 }}>
                    {o.k}
                  </span>
                </span>
                <span style={{ color: C.ink2, fontWeight: 700, whiteSpace: 'nowrap', paddingLeft: 8 }}>{hhmm(o.v)}</span>
              </div>
              <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: (o.v / max * 100) + '%', height: '100%', background: PALETTE[i % PALETTE.length], borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Donut de distribuição de horas ───────────────────────────────
function DonutChart({ items, totalMin, size = 100 }) {
  if (!items.length || !totalMin) return null
  const r = (size - 16) / 2
  const cx = size / 2, cy = size / 2
  let angle = -Math.PI / 2
  const slices = items.slice(0, 6).map((item, i) => {
    const pct   = item.v / totalMin
    const sweep = pct * 2 * Math.PI
    const x1    = cx + r * Math.cos(angle)
    const y1    = cy + r * Math.sin(angle)
    angle      += sweep
    const x2    = cx + r * Math.cos(angle)
    const y2    = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { x1, y1, x2, y2, large, sweep, color: PALETTE[i % PALETTE.length] }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface2} strokeWidth={14} />
      {slices.map((s, i) => (
        s.sweep > 0.01 &&
        <path key={i}
          d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
          fill={s.color} opacity={0.9}
        />
      ))}
      <circle cx={cx} cy={cy} r={r - 14} fill={C.surface} />
    </svg>
  )
}

// ── Feed de lançamentos recentes ──────────────────────────────────
function FeedLancamentos({ lancamentos, loading }) {
  const recent = useMemo(
    () => [...lancamentos]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .slice(0, 15),
    [lancamentos]
  )

  if (loading) return <div style={{ color: C.ink3, fontSize: 13, padding: 16 }}>Carregando…</div>
  if (!recent.length) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
      Nenhum lançamento no período
    </div>
  )

  return (
    <div>
      {recent.map((l, i) => {
        const ini   = (l.funcionario || '?')[0].toUpperCase()
        const isHoj = l.data === HOJE_ISO
        return (
          <div key={l.id || i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < recent.length - 1 ? `1px solid ${C.line2}` : 'none',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: C.navy + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.navy,
            }}>
              {ini}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.funcionario || '—'}
              </div>
              <div style={{ fontSize: 11, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.obra || 'Sem obra'}{l.funcao ? ` · ${l.funcao}` : ''}{l.empresa ? ` · ${l.empresa}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{l.horas || '—'}</div>
              <div style={{ fontSize: 10.5, color: isHoj ? C.amber : C.ink3, fontWeight: isHoj ? 700 : 400 }}>
                {isHoj ? 'Hoje' : fmtDateBR(l.data)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Distribuição por obra (donut + legenda) ───────────────────────
function DistribuicaoObras({ items, totalMin, loading }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Distribuição</div>
      <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>% de horas por obra</div>
      {loading ? (
        <div style={{ color: C.ink3, fontSize: 13 }}>Carregando…</div>
      ) : !totalMin ? (
        <div style={{ color: C.ink3, fontSize: 13 }}>Sem dados</div>
      ) : (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <DonutChart items={items} totalMin={totalMin} size={100} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.slice(0, 6).map((o, i) => (
              <div key={o.k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: C.ink2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.k}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>
                  {(o.v / totalMin * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function RelatoriosVisaoGeral() {
  const [period, setPeriod]         = useState('30d')
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading]       = useState(true)
  const [erro, setErro]             = useState('')

  useEffect(() => {
    setLoading(true); setErro('')
    const { inicio, fim } = getRange(period)
    lancamentosService.list({ inicio, fim })
      .then(res => {
        const rows = Array.isArray(res?.dados) ? res.dados : Array.isArray(res) ? res : []
        setLancamentos(rows)
      })
      .catch(() => { setErro('Falha ao carregar lançamentos.'); setLancamentos([]) })
      .finally(() => setLoading(false))
  }, [period])

  const agg = useMemo(() => {
    let totalMin = 0
    const obraMap = {}, funcMap = {}, funcaoMap = {}, empMap = {}

    lancamentos.forEach(l => {
      const min  = parseMin(l.horas)
      totalMin  += min
      const obra = (l.obra        || 'Sem obra').trim()
      const func = (l.funcionario || 'Sem funcionário').trim()
      const fnc  = (l.funcao      || 'Sem função').trim()
      const emp  = (l.empresa     || 'Sem empresa').trim()

      obraMap[obra]  = (obraMap[obra]  || 0) + min
      funcMap[func]  = (funcMap[func]  || 0) + min
      funcaoMap[fnc] = (funcaoMap[fnc] || 0) + min
      empMap[emp]    = (empMap[emp]    || 0) + min
    })

    return {
      totalMin,
      funcionarios: Object.keys(funcMap).length,
      obras:        Object.keys(obraMap).length,
      obraRank:     sortMap(obraMap).slice(0, 8),
      funcRank:     sortMap(funcMap).slice(0, 8),
      funcaoRank:   sortMap(funcaoMap).slice(0, 7),
      empRank:      sortMap(empMap).slice(0, 5),
    }
  }, [lancamentos])

  const { inicio: ini, fim } = getRange(period)

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>
            Visão Geral de Operações
          </h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>
            {fmtDateFull(ini)} → {fmtDateFull(fim)}
            {!loading && ` · ${lancamentos.length} lançamento${lancamentos.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIOD_OPTS.map(p => (
            <PeriodBtn key={p.value} value={p.value} current={period} onClick={setPeriod} label={p.label} />
          ))}
          <Link
            to="/relatorios"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: C.amber, border: 'none', color: C.navy,
              fontSize: 12, fontWeight: 700, padding: '6px 14px',
              borderRadius: 7, textDecoration: 'none',
            }}
          >
            Análise por obra →
          </Link>
        </div>
      </div>

      {erro && (
        <div style={{ marginBottom: 14, padding: '11px 14px', background: '#FBE9E4', borderRadius: 8, fontSize: 12, color: C.bad }}>
          {erro}
        </div>
      )}

      {/* Hero Banner */}
      <div style={{ marginBottom: 14 }}>
        <HeroBanner
          totalMin={agg.totalMin}
          funcionarios={agg.funcionarios}
          obras={agg.obras}
          total={lancamentos.length}
          loading={loading}
        />
      </div>

      {/* Gráfico diário + Hoje */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Horas por dia</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Lançamentos registrados dia a dia no período</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.ink3 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: C.navy, borderRadius: 2, display: 'inline-block' }} /> Período
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: C.amber, borderRadius: 2, display: 'inline-block' }} /> Hoje
              </span>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontSize: 13 }}>
              Carregando…
            </div>
          ) : (
            <HorasPorDiaChart lancamentos={lancamentos} />
          )}
        </div>
        <HojeCard lancamentos={lancamentos} />
      </div>

      {/* Rankings: obras | funções | equipe */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <RankCard title="Obras" sub="Horas por obra no período" items={agg.obraRank} color={C.navy} loading={loading} />
        <FuncoesCard items={agg.funcaoRank} loading={loading} />
        <EquipeCard  items={agg.funcRank}   loading={loading} />
      </div>

      {/* Empresas + Distribuição + Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 14 }}>
        <RankCard title="Empresas" sub="Horas por empresa" items={agg.empRank} color={C.info} loading={loading} />

        <DistribuicaoObras items={agg.obraRank} totalMin={agg.totalMin} loading={loading} />

        <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Lançamentos recentes</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Últimos 15 registros</div>
            </div>
            <Link to="/lancamentos" style={{ fontSize: 12, fontWeight: 600, color: C.navy, textDecoration: 'none' }}>
              Ver todos →
            </Link>
          </div>
          <FeedLancamentos lancamentos={lancamentos} loading={loading} />
        </div>
      </div>

    </div>
  )
}

function MetricCard({ title, value, deltaLabel, tone = 'neutral', icon: Icon, footer }) {
  const toneStyles = {
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };

  const chipStyles = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-indigo-100 text-indigo-800'
  };

  return (
    <Card className="border bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${chipStyles[tone] || chipStyles.neutral}`}>
                {deltaLabel}
              </span>
            </div>
            {footer ? <p className="text-xs text-slate-500">{footer}</p> : null}
          </div>

          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneStyles[tone] || toneStyles.neutral}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskDot({ level = 'baixo' }) {
  const map = {
    baixo: 'bg-emerald-500',
    medio: 'bg-amber-500',
    alto: 'bg-rose-500'
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[level] || map.baixo}`} />;
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Progresso</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function MiniPill({ children, tone = 'default' }) {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-indigo-100 text-indigo-800'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone] || styles.default}`}>
      {children}
    </span>
  );
}

function Drawer({ open, onClose, children, title }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-sm text-slate-500">Detalhe da obra</p>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-[calc(100vh-73px)] overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export default function RelatoriosVisaoGeral() {
  const [period, setPeriod] = useState('30d');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [obraAtiva, setObraAtiva] = useState(null);

  const [drawerFuncionarioOpen, setDrawerFuncionarioOpen] = useState(false);
  const [funcionarioAtivo, setFuncionarioAtivo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [lancamentos, setLancamentos] = useState([]);

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toDateInput(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function getRangeFromPeriod(p) {
    const end = new Date();
    const start = new Date(end);

    if (p === '7d') start.setDate(end.getDate() - 6);
    else if (p === '30d') start.setDate(end.getDate() - 29);
    else if (p === 'mes') start.setDate(1);
    else if (p === 'ano') {
      start.setMonth(0);
      start.setDate(1);
    } else {
      // fallback
      start.setDate(end.getDate() - 29);
    }

    return { inicio: toDateInput(start), fim: toDateInput(end) };
  }

  function parseHorasToMinutes(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const [h, m] = raw.split(':');
    const hours = Number(h);
    const minutes = Number(m || 0);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  }

  function minutesToHHMM(totalMinutes) {
    const m = Math.max(0, Math.round(totalMinutes || 0));
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${pad2(hh)}:${pad2(mm)}`;
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { inicio, fim } = getRangeFromPeriod(period);
        const res = await lancamentosService.list({ inicio, fim });

        // api.js interceptor retorna response.data; api_lancamentos.php retorna: { sucesso, dados }
        const rows = Array.isArray(res?.dados) ? res.dados : Array.isArray(res) ? res : [];
        setLancamentos(rows);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar lançamentos para relatórios');
        setLancamentos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const aggregates = useMemo(() => {
    const byObra = new Map();
    const byFuncionario = new Map();

    let totalMinutes = 0;

    for (const l of lancamentos) {
      const obra = (l?.obra || 'Sem obra').trim() || 'Sem obra';
      const funcionario = (l?.funcionario || 'Sem funcionário').trim() || 'Sem funcionário';
      const funcao = (l?.funcao || 'Sem função').trim() || 'Sem função';

      const mins = parseHorasToMinutes(l?.horas);
      totalMinutes += mins;

      // por obra
      if (!byObra.has(obra)) {
        byObra.set(obra, {
          nome: obra,
          status: '—',
          risco: 'baixo',
          horasMin: 0,
          funcionariosSet: new Set(),
          funcoesMin: new Map(),
          lancamentos: []
        });
      }
      const o = byObra.get(obra);
      o.horasMin += mins;
      o.funcionariosSet.add(funcionario);
      o.lancamentos.push(l);
      o.funcoesMin.set(funcao, (o.funcoesMin.get(funcao) || 0) + mins);

      // por funcionário
      if (!byFuncionario.has(funcionario)) {
        byFuncionario.set(funcionario, {
          nome: funcionario,
          horasMin: 0,
          obrasMin: new Map(),
          lancamentos: []
        });
      }
      const f = byFuncionario.get(funcionario);
      f.horasMin += mins;
      f.lancamentos.push(l);
      f.obrasMin.set(obra, (f.obrasMin.get(obra) || 0) + mins);
    }

    const obrasList = Array.from(byObra.values()).map((o, idx) => {
      const funcoesSorted = Array.from(o.funcoesMin.entries())
        .map(([label, min]) => ({ label, minutes: min }))
        .sort((a, b) => b.minutes - a.minutes);

      return {
        id: idx + 1,
        nome: o.nome,
        status: o.status,
        risco: o.risco,
        funcionariosCount: o.funcionariosSet.size,
        horasPeriodoMin: o.horasMin,
        funcoesSorted,
        lancamentos: o.lancamentos,
        // placeholders para futuro financeiro:
        custoReal: 0,
        custoOrcado: 0,
        progresso: 0,
        prazoDias: 0,
      };
    });

    obrasList.sort((a, b) => b.horasPeriodoMin - a.horasPeriodoMin);

    const funcionariosList = Array.from(byFuncionario.values())
      .map((f) => {
        const obrasSorted = Array.from(f.obrasMin.entries())
          .map(([obra, min]) => ({ obra, minutes: min }))
          .sort((a, b) => b.minutes - a.minutes);
        return { ...f, obrasSorted };
      })
      .sort((a, b) => b.horasMin - a.horasMin);

    const abs = 0; // ainda não dá pra calcular sem RH

    return {
      totalMinutes,
      obrasList,
      funcionariosList,
      absenteismo: abs,
    };
  }, [lancamentos]);

  const obras = aggregates.obrasList;

  const obrasFiltradas = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return obras;
    return obras.filter((o) => o.nome.toLowerCase().includes(s));
  }, [obras, search]);

  const kpis = useMemo(() => {
    return {
      horas: aggregates.totalMinutes,
      funcionarios: aggregates.funcionariosList.length,
      obras: aggregates.obrasList.length,
    };
  }, [aggregates]);

  const handleOpenObra = (obra) => {
    setObraAtiva(obra);
    setDrawerOpen(true);
  };

  const handleOpenFuncionario = (func) => {
    setFuncionarioAtivo(func);
    setDrawerFuncionarioOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-600">
            Dados vindos de <span className="font-medium text-slate-900">Lançamentos</span> (horas por obra, funcionário e função).
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2">
            <Button variant={period === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('7d')}>
              7d
            </Button>
            <Button variant={period === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('30d')}>
              30d
            </Button>
            <Button variant={period === 'mes' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('mes')}>
              Mês
            </Button>
            <Button variant={period === 'ano' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('ano')}>
              Ano
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm">
              <ArrowRight className="mr-2 h-4 w-4" />
              Abrir Dashboard por Obra
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-slate-50 p-6 text-sm text-slate-600">Carregando lançamentos…</div>
      ) : null}

      {/* KPIs (agora baseados em lançamentos) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi title="Obras (no período)" value={String(kpis.obras)} icon={Building2} deltaLabel="—" tone="info" footer="Com lançamento registrado" />
        <Kpi title="Funcionários (no período)" value={String(kpis.funcionarios)} icon={Users} deltaLabel="—" tone="info" footer="Com lançamento registrado" />
        <Kpi title="Horas totais" value={minutesToHHMM(kpis.horas)} icon={TrendingUp} deltaLabel="—" tone="info" footer="Somatório das horas" />
        <Kpi title="Lançamentos" value={String(lancamentos.length)} icon={BarChart3} deltaLabel="—" tone="neutral" footer="Registros no período" />
        <Kpi title="Custo real (R$)" value="—" icon={Wallet} deltaLabel="Em breve" tone="warning" footer="Habilitar no financeiro" />
        <Kpi title="Prazo (risco)" value="—" icon={AlertTriangle} deltaLabel="Em breve" tone="danger" footer="Habilitar via cronograma" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="executivo" className="w-full">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-xl bg-transparent p-0 sm:grid-cols-4">
          <TabsTrigger value="executivo" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="funcionarios" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="diario" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Diário
          </TabsTrigger>
          <TabsTrigger value="atalhos" className="rounded-xl border bg-white data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50">
            Atalhos
          </TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="executivo" className="mt-6 space-y-6">
          {/* Substitui as 3 bolhas (confuso) por um resumo claro */}
          <Card className="border bg-white overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-slate-900">Resumo por Obra (baseado em Lançamentos)</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    Esta visão usa apenas os dados de <span className="font-medium">horas</span>. Prazo/custo entram depois.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MiniPill tone="info">Clique numa obra para horas por função</MiniPill>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">Obra com mais horas</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{obras[0]?.nome || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">{obras[0] ? `${minutesToHHMM(obras[0].horasPeriodoMin)}h` : '—'}</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">Função mais usada (geral)</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">—</p>
                  <p className="mt-1 text-xs text-slate-500">(calcular por soma de função depois)</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">Funcionário com mais horas</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{aggregates.funcionariosList[0]?.nome || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {aggregates.funcionariosList[0] ? `${minutesToHHMM(aggregates.funcionariosList[0].horasMin)}h` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Obras */}
          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <SectionHeader
                title="Obras"
                subtitle="Clique em uma obra para ver os lançamentos dela e horas por função."
                right={
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-[320px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar obra…"
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filtros
                    </Button>
                  </div>
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {obrasFiltradas.map((obra) => (
                <button
                  key={obra.nome}
                  onClick={() => handleOpenObra(obra)}
                  className="group w-full rounded-xl border bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-50 text-slate-700">
                          <Building2 className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="max-w-full truncate text-base font-semibold text-slate-900">{obra.nome}</p>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">{obra.funcionariosCount} func.</Badge>
                            <MiniPill tone="info">{minutesToHHMM(obra.horasPeriodoMin)}h</MiniPill>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-600">{obra.lancamentos.length} lançamentos no período</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-2 lg:flex-col lg:items-end">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                        Ver detalhes
                        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {obrasFiltradas.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Nenhuma obra encontrada</p>
                  <p className="mt-1 text-sm text-slate-600">Ajuste a busca ou limpe os filtros.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNCIONÁRIOS */}
        <TabsContent value="funcionarios" className="mt-6 space-y-6">
          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <SectionHeader
                title="Funcionários (baseado em lançamentos)"
                subtitle="Clique em um funcionário para ver todos os lançamentos dele e o total por obra."
              />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {aggregates.funcionariosList.slice(0, 20).map((f) => (
                <button
                  key={f.nome}
                  onClick={() => handleOpenFuncionario(f)}
                  className="rounded-xl border bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{f.nome}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{f.lancamentos.length} lançamentos • {f.obrasSorted.length} obras</p>
                    </div>
                    <MiniPill tone="info">{minutesToHHMM(f.horasMin)}h</MiniPill>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Clique para detalhar por obra</p>
                  </div>
                </button>
              ))}

              {aggregates.funcionariosList.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center lg:col-span-2">
                  <p className="text-sm font-medium text-slate-900">Sem dados</p>
                  <p className="mt-1 text-sm text-slate-600">Não há lançamentos no período selecionado.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIÁRIO (continua como preview) */}
        <TabsContent value="diario" className="mt-6 space-y-6">
          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <SectionHeader
                title="Relatório Diário (placeholder)"
                subtitle="Você pode ligar aqui um agrupamento por data usando os lançamentos."
              />
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-900">Pronto para conectar</p>
                <p className="mt-1 text-sm text-slate-600">Agrupar lançamentos por dia e mostrar horas/equipe/obras.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATALHOS */}
        <TabsContent value="atalhos" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <PieChart className="h-5 w-5 text-indigo-600" />
                  Dashboards por obra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Acesse a página completa com gráficos, cronograma e relatórios mensais/semanais/diários.</p>
                <Button className="mt-4 w-full">
                  Abrir Relatórios &gt; Obras
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Exportação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Exportar relatórios in Excel/PDF e manter histórico de auditoria (quando conectado).</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="w-full">
                    Excel
                  </Button>
                  <Button variant="outline" className="w-full">
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  Metas & Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Base para “metas por obra” e alertas automáticos (prazo/custo/equipe).</p>
                <Button variant="outline" className="mt-4 w-full">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawer: detalhe da obra */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={obraAtiva?.nome || 'Obra'}
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Lançamentos da obra</p>
                <p className="mt-1 text-sm text-slate-600">
                  {obraAtiva ? `${obraAtiva.lancamentos.length} lançamentos • ${minutesToHHMM(obraAtiva.horasPeriodoMin)}h no período` : '—'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <ArrowRight className="mr-2 h-4 w-4" />
                Abrir dashboard completo
              </Button>
            </div>
          </div>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-slate-900">Horas por Função</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">Calculado a partir dos lançamentos desta obra.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default">Horas</Button>
                  <Button size="sm" variant="outline" disabled title="Em breve">
                    Custo (R$)
                  </Button>
                  <Button size="sm" variant="outline" disabled title="Em breve">
                    Custo/hora
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(obraAtiva?.funcoesSorted || []).slice(0, 10).map((row) => (
                <div key={row.label} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{minutesToHHMM(row.minutes)}h</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                      style={{ width: `${Math.min(100, (row.minutes / Math.max(1, (obraAtiva?.funcoesSorted?.[0]?.minutes || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {(obraAtiva?.funcoesSorted || []).length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Sem dados por função</p>
                  <p className="mt-1 text-sm text-slate-600">Não há lançamentos com função preenchida nesta obra.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900">Últimos lançamentos (obra)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(obraAtiva?.lancamentos || []).slice(0, 12).map((l) => (
                <div key={l.id || `${l.data}-${l.funcionario}-${l.horas}`} className="flex flex-col gap-1 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{l.funcionario}</p>
                    <p className="text-xs text-slate-600">{l.data} • {l.funcao || 'Sem função'} • {l.empresa || '—'}</p>
                  </div>
                  <MiniPill tone="info">{l.horas || '00:00'}h</MiniPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Drawer>

      {/* Drawer: detalhe do funcionário */}
      <Drawer
        open={drawerFuncionarioOpen}
        onClose={() => setDrawerFuncionarioOpen(false)}
        title={funcionarioAtivo?.nome || 'Funcionário'}
      >
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Resumo</p>
            <p className="mt-1 text-sm text-slate-600">
              {funcionarioAtivo ? `${funcionarioAtivo.lancamentos.length} lançamentos • ${minutesToHHMM(funcionarioAtivo.horasMin)}h no período` : '—'}
            </p>
          </div>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900">Horas por Obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(funcionarioAtivo?.obrasSorted || []).map((row) => (
                <div key={row.obra} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{row.obra}</p>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{minutesToHHMM(row.minutes)}h</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                      style={{ width: `${Math.min(100, (row.minutes / Math.max(1, (funcionarioAtivo?.obrasSorted?.[0]?.minutes || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {(funcionarioAtivo?.obrasSorted || []).length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-900">Sem obras</p>
                  <p className="mt-1 text-sm text-slate-600">Este funcionário não tem lançamentos com obra preenchida.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900">Últimos lançamentos (funcionário)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(funcionarioAtivo?.lancamentos || []).slice(0, 12).map((l) => (
                <div key={l.id || `${l.data}-${l.obra}-${l.horas}`} className="flex flex-col gap-1 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{l.obra || 'Sem obra'}</p>
                    <p className="text-xs text-slate-600">{l.data} • {l.funcao || 'Sem função'} • {l.empresa || '—'}</p>
                  </div>
                  <MiniPill tone="info">{l.horas || '00:00'}h</MiniPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Drawer>

      <div className="text-xs text-slate-500">
        * Esta página usa a tabela de lançamentos como fonte principal. Custo/prazo entram quando o financeiro/cronograma estiver pronto.
      </div>
    </div>
  );
}
