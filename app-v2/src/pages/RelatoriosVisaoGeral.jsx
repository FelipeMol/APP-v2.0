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
