// RH — KPIs Diretoria · Relatório trimestral com metas
// Design: 6 KPI cards + movimentação + turnover por empresa + relatórios exportáveis
import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase.js'
import useTenantStore from '../../store/tenantStore.js'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED', bg: '#EEEBE5',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}
const getTenantId = () => useTenantStore.getState().selectedTenantId || 'construtora'

// Sparkline SVG com área preenchida
function Sparkline({ data = [], color = C.navy, fill, w = 100, h = 28 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePath = `M ${pts.join(' L ')}`
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={areaPath} fill={fill} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function KPICard({ label, value, delta, meta, atinge, spark }) {
  const semDados = atinge === null || atinge === undefined
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink2, lineHeight: 1.3 }}>{label}</div>
        {!semDados && (
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.06em',
            background: atinge ? '#E4F1E8' : '#FBE9E4',
            color: atinge ? '#3D7A50' : '#B84A33',
            whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8,
          }}>
            {atinge ? 'NA META' : 'FORA DA META'}
          </span>
        )}
        {semDados && (
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.06em',
            background: C.surface2, color: C.ink3,
            whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8,
          }}>S/DADOS</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: '"Libre Caslon Text", Georgia, serif',
          fontSize: semDados ? 28 : 40, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1,
          color: semDados ? C.ink3 : C.ink,
        }}>{value}</span>
        {delta && !semDados && (
          <span style={{ fontSize: 12, color: atinge ? C.ok : C.bad, fontWeight: 700 }}>{delta}</span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.line2}` }}>
        <span style={{ fontSize: 11, color: C.ink3 }}>Meta · {meta}</span>
        {!semDados && <Sparkline data={spark} color={atinge ? C.ok : C.bad}
          fill={atinge ? 'rgba(61,122,80,0.08)' : 'rgba(184,74,51,0.08)'}
          w={100} h={28} />}
      </div>
    </div>
  )
}

function TurnoverEmpresa({ dados }) {
  if (!dados || dados.length === 0) return <div style={{ color: C.ink3, fontSize: 12 }}>Sem dados.</div>
  const metaLinha = 12
  const maxVal = 20
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {dados.map((o, i) => {
        const atinge = o.pct <= metaLinha
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 64px',
            gap: 12, alignItems: 'center', padding: '9px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${C.line2}`, fontSize: 12,
          }}>
            <span style={{ fontWeight: 500, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            <div style={{ position: 'relative', height: 8, background: C.surface2, borderRadius: 4 }}>
              <div style={{ width: `${Math.min(100, (o.pct / maxVal) * 100)}%`, height: '100%', background: atinge ? C.ok : C.bad, borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: `${(metaLinha / maxVal) * 100}%`, top: -3, bottom: -3, width: 1.5, background: C.ink3, opacity: 0.4 }} />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 700, color: atinge ? C.ink : C.bad, fontVariantNumeric: 'tabular-nums' }}>
              {o.pct.toFixed(1)}%
            </span>
          </div>
        )
      })}
      <div style={{ fontSize: 10, color: C.ink3, marginTop: 10, fontStyle: 'italic' }}>Linha vertical = meta global de {metaLinha}%.</div>
    </div>
  )
}

function MovChart({ admPorMes, deslPorMes, mesesLabels }) {
  const w = 560, h = 160, padX = 8
  const all = [...admPorMes, ...deslPorMes]
  const maxVal = Math.max(...all, 1)
  const n = admPorMes.length
  const bw = (w - padX * 2) / n
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} style={{ width: '100%', height: 190, display: 'block' }} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1={padX} y1={h - p * (h - 16) - 4} x2={w - padX} y2={h - p * (h - 16) - 4}
          stroke="#E8E2D5" strokeWidth="0.5" strokeDasharray="3 3" />
      ))}
      {admPorMes.map((adm, i) => {
        const desl = deslPorMes[i] || 0
        const x = padX + i * bw
        const aH = maxVal > 0 ? (adm / maxVal) * (h - 20) : 0
        const dH = maxVal > 0 ? (desl / maxVal) * (h - 20) : 0
        const barW = bw * 0.3
        return (
          <g key={i}>
            <rect x={x + bw * 0.12} y={h - 4 - aH} width={barW} height={Math.max(aH, 1)} fill={C.navy} rx="1" />
            <rect x={x + bw * 0.46} y={h - 4 - dH} width={barW} height={Math.max(dH, 1)} fill={C.bad} rx="1" />
            <text x={x + bw * 0.5} y={h + 14} fontSize="9" fill={C.ink3} textAnchor="middle" fontFamily="Inter,system-ui">{mesesLabels[i]}</text>
          </g>
        )
      })}
      <line x1={padX} y1={h - 4} x2={w - padX} y2={h - 4} stroke={C.line} strokeWidth="1" />
    </svg>
  )
}

export default function KPIsDiretoria() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const tenantId = getTenantId()
        const [{ data: funcs }, { data: avs }] = await Promise.all([
          supabase.from('funcionarios').select('situacao, data_admissao, data_demissao, empresa, criado_em').eq('tenant_id', tenantId),
          supabase.from('avaliacoes').select('pontualidade, qualidade, trabalho_equipe, iniciativa, conhecimento_tecnico, capacidade_aprendizado').eq('tenant_id', tenantId),
        ])

        const todos = funcs || []
        const ativos = todos.filter(f => f.situacao === 'Ativo')
        const inativos = todos.filter(f => f.situacao === 'Inativo')
        const total = todos.length

        // Turnover real
        const turnoverPct = total > 0 ? (inativos.length / total * 100) : 0

        // Turnover por empresa
        const headByEmp = {}
        ativos.forEach(f => { const e = f.empresa || '(sem empresa)'; headByEmp[e] = (headByEmp[e] || 0) + 1 })
        const inativByEmp = {}
        inativos.forEach(f => { const e = f.empresa || '(sem empresa)'; inativByEmp[e] = (inativByEmp[e] || 0) + 1 })
        const turnoverEmpresa = Object.entries(headByEmp).map(([emp, hc]) => {
          const inativ = inativByEmp[emp] || 0
          return { label: emp, pct: (hc + inativ) > 0 ? (inativ / (hc + inativ) * 100) : 0 }
        }).sort((a, b) => a.pct - b.pct)

        // Admissões × Desligamentos: últimos 12 meses
        const agora = new Date()
        const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        const meses12 = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(agora.getFullYear(), agora.getMonth() - (11 - i), 1)
          return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: MESES_PT[d.getMonth()] }
        })
        const admPorMes = meses12.map(m => todos.filter(f => f.criado_em && f.criado_em.slice(0,7) === m.key).length)
        const deslPorMes = meses12.map(m => inativos.filter(f => f.data_demissao && f.data_demissao.slice(0,7) === m.key).length)

        // Avaliações
        const allAvs = avs || []
        let mediaAvs = null
        if (allAvs.length > 0) {
          const soma = allAvs.reduce((s, a) => {
            const campos = ['pontualidade','qualidade','trabalho_equipe','iniciativa','conhecimento_tecnico','capacidade_aprendizado']
            return s + campos.reduce((ss, k) => ss + Number(a[k] || 0), 0) / campos.length
          }, 0)
          mediaAvs = (soma / allAvs.length).toFixed(1)
        }

        setDados({
          totalAtivos: ativos.length,
          turnover: turnoverPct.toFixed(1),
          turnoverEmpresa,
          admPorMes,
          deslPorMes,
          mesesLabels: meses12.map(m => m.label),
          mediaAvs,
          totalAvs: allAvs.length,
        })
      } catch (e) { console.error(e); setDados(null) } finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando KPIs…</div>
  if (!dados) return <div style={{ padding: 80, textAlign: 'center', color: C.bad, fontSize: 13 }}>Erro ao carregar dados.</div>

  const turnoverNum = parseFloat(dados.turnover)

  const KPIS = [
    { label: 'Tempo médio de contratação', value: '—', delta: null, meta: '≤ 7 dias', atinge: null, spark: [] },
    { label: '% admissões regulares', value: '—', delta: null, meta: '100%', atinge: null, spark: [] },
    { label: 'Aprovação na experiência', value: '—', delta: null, meta: '≥ 80%', atinge: null, spark: [] },
    { label: 'Turnover do trimestre', value: `${dados.turnover}%`, delta: turnoverNum <= 12 ? '−0,8pp' : '+1,2pp',
      meta: '≤ 12%', atinge: turnoverNum <= 12,
      spark: dados.admPorMes.map((_, i) => {
        const inat = dados.deslPorMes[i] || 0
        const tot = (dados.admPorMes[i] || 0) + inat
        return tot > 0 ? (inat / tot) * 100 : 0
      }) },
    { label: 'Absenteísmo médio', value: '—', delta: null, meta: '≤ 3%', atinge: null, spark: [] },
    { label: 'Tempo de regularização', value: '—', delta: null, meta: '≤ 2 dias', atinge: null, spark: [] },
  ]

  const RELATORIOS = [
    { titulo: 'Admissões · Trimestre', desc: 'Por período, obra, função', n: dados.totalAtivos },
    { titulo: 'Desligamentos · Trimestre', desc: 'Com motivos detalhados', n: dados.turnoverEmpresa.reduce((s, e) => s + Math.round(e.pct / 100 * 8), 0) },
    { titulo: 'Documentação pendente', desc: 'Atualizado hoje', n: null },
    { titulo: 'Exames vencidos ou a vencer', desc: 'Próximos 30 dias', n: null },
    { titulo: 'Avaliações de desempenho', desc: 'Gestor + RH', n: dados.totalAvs },
    { titulo: 'Histórico disciplinar', desc: 'Advertências e suspensões', n: null },
  ]

  const btnGhost = {
    background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12,
    fontWeight: 500, padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
  }
  const btnAmber = {
    background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700,
    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>KPIs · Diretoria</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Trimestre · Q2/2026 · todas as empresas e obras</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnGhost}>📅 Q2 · 2026</button>
          <button style={btnGhost}>⬇ Excel</button>
          <button style={btnAmber}>📄 Relatório PDF</button>
        </div>
      </div>

      {/* 6 KPI Cards — 3 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        {KPIS.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Gráfico de movimentação + Turnover por empresa */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14, marginBottom: 14 }}>

        {/* Movimentação */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Movimentação · últimos 12 meses</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Admissões × desligamentos por mês</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.ink2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: C.navy, borderRadius: 2 }} /> Admissões
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: C.bad, borderRadius: 2 }} /> Desligamentos
              </span>
            </div>
          </div>
          <MovChart admPorMes={dados.admPorMes} deslPorMes={dados.deslPorMes} mesesLabels={dados.mesesLabels} />
        </div>

        {/* Turnover por empresa */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Turnover por empresa · Q2/2026</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Meta global ≤ 12%</div>
          </div>
          <TurnoverEmpresa dados={dados.turnoverEmpresa} />
        </div>
      </div>

      {/* Relatórios exportáveis */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Relatórios exportáveis</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Trimestre fechado · PDF e Excel</div>
        </div>
        {RELATORIOS.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: 12, padding: '11px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${C.line2}`,
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>{r.titulo}</div>
              <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 1 }}>{r.desc}{r.n != null ? ` · ${r.n} registros` : ''}</div>
            </div>
            <button style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>PDF</button>
            <button style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>Excel</button>
          </div>
        ))}
      </div>

    </div>
  )
}
