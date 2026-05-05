// RH — Painel principal
// Segue o mesmo padrão visual de financeiro/Painel.jsx
import { useState, useEffect } from 'react'
import rhService from '../../services/rhService'

// ── Palette ────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Helpers ────────────────────────────────────────────────────
function TH(extra = {}) {
  return { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, color: C.ink3, textAlign: 'left', ...extra }
}
function TD(extra = {}) {
  return { padding: '11px 10px', verticalAlign: 'middle', color: C.ink, ...extra }
}

// ── Sparkline ──────────────────────────────────────────────────
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

// ── Mock KPIs ──────────────────────────────────────────────────
const KPIS = [
  { key: 'tempo',      label: 'Tempo médio de contratação', value: '6,4 dias', meta: '≤ 7 dias',  atinge: true,  delta: '−1,2d',  spark: [9.2,8.8,8.5,8.1,7.8,7.4,7.2,7.0,6.8,6.6,6.5,6.4] },
  { key: 'regulares',  label: '% admissões regulares',      value: '100%',     meta: '100%',       atinge: true,  delta: '0pp',    spark: [96,97,98,99,100,100,100,100,100,100,100,100] },
  { key: 'experiencia',label: 'Aprovação na experiência',   value: '83%',      meta: '≥ 80%',      atinge: true,  delta: '+2pp',   spark: [76,78,79,80,81,82,81,82,83,82,82,83] },
  { key: 'turnover',   label: 'Turnover do trimestre',      value: '11,2%',    meta: '≤ 12%',      atinge: true,  delta: '−0,8pp', spark: [14,14,13,13,12.5,12,12.2,11.9,11.6,11.5,11.3,11.2] },
  { key: 'absent',     label: 'Absenteísmo médio',          value: '2,8%',     meta: '≤ 3%',       atinge: true,  delta: '−0,3pp', spark: [3.4,3.3,3.5,3.2,3.1,3.2,3.0,3.1,2.9,2.9,2.8,2.8] },
  { key: 'docs',       label: 'Tempo de regularização',     value: '1,8 dias', meta: '≤ 2 dias',   atinge: true,  delta: '−0,4d',  spark: [2.6,2.5,2.4,2.3,2.2,2.1,2.1,2.0,1.9,1.9,1.8,1.8] },
]

// ── Movimentação mock (12 meses) ───────────────────────────────
const MOVIMENTACAO = [
  { mes: 'mai', adm: 4, des: 2 }, { mes: 'jun', adm: 6, des: 1 }, { mes: 'jul', adm: 5, des: 3 },
  { mes: 'ago', adm: 8, des: 2 }, { mes: 'set', adm: 7, des: 4 }, { mes: 'out', adm: 9, des: 3 },
  { mes: 'nov', adm: 6, des: 5 }, { mes: 'dez', adm: 3, des: 6 }, { mes: 'jan', adm: 8, des: 4 },
  { mes: 'fev', adm: 7, des: 3 }, { mes: 'mar', adm: 9, des: 4 }, { mes: 'abr', adm: 11, des: 3 },
]

// ── Tarefas do dia (mock) ──────────────────────────────────────
const TAREFAS = [
  { hora: '09:00', titulo: 'Revisar avaliação · Lucas Reis (exp. em 4d)', resp: 'Beatriz · RH', urgente: true,  done: false },
  { hora: '10:30', titulo: 'Triagem · vaga Pedreiro Casa Vilma',          resp: 'Beatriz · RH', urgente: false, done: false },
  { hora: '11:00', titulo: 'Integração Vanessa Oliveira',                 resp: 'Marcos · RH',  urgente: false, done: false },
  { hora: '14:00', titulo: 'Cobrar docs faltantes (Marcos A. e Lucas R.)',resp: 'Beatriz · RH', urgente: true,  done: false },
  { hora: '15:30', titulo: 'Entrevista · Encarregado Edif. Namirá',       resp: 'Marcos · RH',  urgente: false, done: false },
  { hora: '08:30', titulo: 'Enviar exame de Pedro Souza p/ clínica',      resp: 'Beatriz · RH', urgente: false, done: true  },
]

// ── Alertas ────────────────────────────────────────────────────
const ALERTAS = [
  { nivel: 'critico', titulo: 'Lucas Reis · período de experiência vence em 4 dias',  detalhe: 'Casa George · gestor não avaliou',        acao: 'Avaliar' },
  { nivel: 'critico', titulo: 'Marcos Andrade · 7 dias para fim da experiência',       detalhe: 'Casa Brenda · documentação pendente (2)',  acao: 'Ver ficha' },
  { nivel: 'critico', titulo: 'Justa causa · Bruno Lopes aguarda diretoria',           detalhe: 'Aberta há 3 dias · bloqueia rescisão',     acao: 'Encaminhar' },
  { nivel: 'aviso',   titulo: 'Pedro Souza · exame periódico vence em 6 dias',         detalhe: 'Res. Palma · agendar com clínica',         acao: 'Agendar' },
  { nivel: 'aviso',   titulo: 'Documentação · Marcos Andrade faltam 2 itens',          detalhe: 'CTPS, comprovante residência',             acao: 'Cobrar' },
  { nivel: 'aviso',   titulo: 'Documentação · Lucas Reis faltam 3 itens',              detalhe: 'PIS, foto 3x4, reservista',                acao: 'Cobrar' },
  { nivel: 'info',    titulo: '3 vagas em aberto sem candidato selecionado',           detalhe: 'Casa Vilma, Casa George, Galpão Iritu',    acao: 'Triagem' },
  { nivel: 'info',    titulo: 'Vanessa Oliveira inicia integração hoje',               detalhe: 'Edif. Namirá · checklist EPI pendente',    acao: 'Iniciar' },
]

// ── KpiCard ────────────────────────────────────────────────────
function KpiCard({ kpi }) {
  const ok = kpi.atinge
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: C.ink3, fontWeight: 500, letterSpacing: '0.03em', lineHeight: 1.35 }}>{kpi.label}</div>
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: ok ? '#E4F1E8' : '#FBE9E4', color: ok ? C.ok : C.bad, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0, marginLeft: 6 }}>
          {ok ? 'NA META' : 'FORA'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1, color: C.ink }}>{kpi.value}</div>
        <div style={{ fontSize: 11, color: ok ? C.ok : C.bad, fontWeight: 600 }}>{kpi.delta}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: C.ink3 }}>Meta · {kpi.meta}</span>
        <Sparkline data={kpi.spark} w={68} h={20} color={ok ? C.ok : C.bad} />
      </div>
    </div>
  )
}

// ── AlertaItem ─────────────────────────────────────────────────
function AlertaItem({ a }) {
  const paleta = {
    critico: { dot: C.bad,  bg: '#FBE9E4' },
    aviso:   { dot: C.warn, bg: '#FDF3DF' },
    info:    { dot: C.info, bg: '#E2E9F2' },
  }[a.nivel] || { dot: C.ink3, bg: C.surface2 }
  return (
    <div style={{ display: 'flex', gap: 10, padding: '11px 12px', border: `1px solid ${C.line2}`, borderRadius: 8, background: C.surface }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: paleta.dot, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.titulo}</div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{a.detalhe}</div>
      </div>
      <button style={{ alignSelf: 'center', background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 }}>
        {a.acao}
      </button>
    </div>
  )
}

// ── MovimentacaoChart ──────────────────────────────────────────
function MovimentacaoChart() {
  const max = Math.max(...MOVIMENTACAO.map(d => Math.max(d.adm, d.des)))
  const w = 700, h = 190, pad = 20
  const bw = (w - pad * 2) / MOVIMENTACAO.length
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', gridColumn: 'span 7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Movimentação · últimos 12 meses</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Admissões × desligamentos por mês</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.ink2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: C.navy, borderRadius: 2, display: 'inline-block' }} /> Admissões
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: C.bad, borderRadius: 2, display: 'inline-block' }} /> Desligamentos
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 20}`} style={{ width: '100%', height: 200, display: 'block' }} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={pad} y1={h - p * (h - 20) - 6} x2={w - pad} y2={h - p * (h - 20) - 6} stroke={C.line2} strokeWidth="0.5" strokeDasharray="2 2" />
        ))}
        {MOVIMENTACAO.map((d, i) => {
          const x = pad + i * bw
          const aH = (d.adm / max) * (h - 30)
          const dH = (d.des / max) * (h - 30)
          const bwBar = bw * 0.3
          return (
            <g key={i}>
              <rect x={x + bw * 0.16} y={h - 6 - aH} width={bwBar} height={aH} fill={C.navy} rx="1" />
              <rect x={x + bw * 0.48} y={h - 6 - dH} width={bwBar} height={dH} fill={C.bad} rx="1" />
              <text x={x + bw * 0.5} y={h + 14} fontSize="9" fill={C.ink3} textAnchor="middle" fontFamily="Inter">{d.mes}</text>
            </g>
          )
        })}
        <line x1={pad} y1={h - 6} x2={w - pad} y2={h - 6} stroke={C.line} strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── TarefasDoDia ───────────────────────────────────────────────
function TarefasDoDia() {
  const ativas = TAREFAS.filter(t => !t.done).sort((a, b) => a.hora.localeCompare(b.hora))
  const feitas = TAREFAS.filter(t => t.done)
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', gridColumn: 'span 5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Tarefas do dia · RH</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{ativas.length} pendentes · {feitas.length} concluída</div>
        </div>
        <span style={{ fontSize: 11, color: C.ink2, fontWeight: 600, cursor: 'pointer' }}>Ver todas</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ativas.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.line2}` }}>
            <span style={{ width: 14, height: 14, border: `1.5px solid ${C.ink3}`, borderRadius: 3, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.35 }}>{t.titulo}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2, fontSize: 10, color: C.ink3 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: t.urgente ? C.bad : C.ink2 }}>{t.hora}</span>
                <span>·</span>
                <span>{t.resp}</span>
              </div>
            </div>
          </div>
        ))}
        {feitas.map((t, i) => (
          <div key={'f' + i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: `1px solid ${C.line2}`, opacity: 0.5 }}>
            <span style={{ width: 14, height: 14, background: C.ok, borderRadius: 3, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.ink2, textDecoration: 'line-through', lineHeight: 1.35 }}>{t.titulo}</div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>{t.hora} · {t.resp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────
export default function DashboardRH() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    rhService.getDashboard()
      .then(d => setDados(d))
      .catch(() => setErro('Não foi possível carregar os dados do painel.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: C.ink3, fontSize: 13 }}>
        Carregando painel de RH…
      </div>
    )
  }

  const totalAtivos   = dados?.total_ativos ?? 0
  const totalEmpresas = dados?.total_empresas ?? 0
  const vagasAbertas  = dados?.vagas_abertas ?? 0
  const vagasCriticas = dados?.vagas_criticas ?? 0
  const reqAbertas    = dados?.requisicoes_abertas ?? []
  const headcountEmp  = dados?.headcount_por_empresa ?? []

  const criticos = ALERTAS.filter(a => a.nivel === 'critico')
  const avisos   = ALERTAS.filter(a => a.nivel === 'aviso')
  const infos    = ALERTAS.filter(a => a.nivel === 'info')

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Painel de Recursos Humanos</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4, textTransform: 'capitalize' }}>{hoje} · {totalEmpresas} empresa{totalEmpresas !== 1 ? 's' : ''} · {totalAtivos} colaboradores ativos</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
            Exportar
          </button>
          <button style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nova requisição
          </button>
        </div>
      </div>

      {erro && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FBE9E4', borderRadius: 8, fontSize: 12, color: C.bad }}>{erro}</div>
      )}

      {/* Banner Headcount */}
      <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '22px 26px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 0, marginBottom: 14 }}>
        <div style={{ paddingRight: 22, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>FUNCIONÁRIOS ATIVOS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 4 }}>{totalAtivos || '—'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{totalEmpresas} empresa{totalEmpresas !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ paddingLeft: 22, paddingRight: 22, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>EM EXPERIÊNCIA</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, fontWeight: 500, marginTop: 4 }}>—</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>a implementar</div>
        </div>
        <div style={{ paddingLeft: 22, paddingRight: 22, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>DOCS PENDENTES</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, fontWeight: 500, marginTop: 4, color: '#F4B19C' }}>—</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>a implementar</div>
        </div>
        <div style={{ paddingLeft: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>VAGAS EM ABERTO</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, fontWeight: 500, marginTop: 4, color: '#FFD78A' }}>{vagasAbertas || '—'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{vagasCriticas > 0 ? `${vagasCriticas} críticas` : 'nenhuma crítica'}</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 14 }}>
        {KPIS.map(k => <KpiCard key={k.key} kpi={k} />)}
      </div>

      {/* Alertas + Tarefas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, marginBottom: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', gridColumn: 'span 8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Alertas que exigem ação</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{criticos.length} críticos · {avisos.length} avisos · {infos.length} info</div>
            </div>
            <span style={{ fontSize: 11, color: C.ink2, fontWeight: 600, cursor: 'pointer' }}>Configurar notificações →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ALERTAS.map((a, i) => <AlertaItem key={i} a={a} />)}
          </div>
        </div>
        <TarefasDoDia />
      </div>

      {/* Movimentação + Vagas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, marginBottom: 14 }}>
        <MovimentacaoChart />
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', gridColumn: 'span 5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Vagas em aberto</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{reqAbertas.length} requisições ativas</div>
            </div>
            <button style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nova vaga
            </button>
          </div>
          {reqAbertas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.ink3, fontSize: 12 }}>Nenhuma vaga aberta no momento</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reqAbertas.slice(0, 6).map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '9px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.line2}`, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.funcao || 'Sem função'}</div>
                    <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 2 }}>{r.obras?.nome || '—'}</div>
                  </div>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: r.urgencia === 'critica' ? '#FBE9E4' : '#FDF3DF', color: r.urgencia === 'critica' ? C.bad : C.warn, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {(r.urgencia || 'normal').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Headcount por empresa */}
      {headcountEmp.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Headcount por empresa</div>
          <div style={{ fontSize: 11, color: C.ink3, marginBottom: 14 }}>Distribuição dos {totalAtivos} colaboradores ativos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '4px 24px' }}>
            {headcountEmp.map((e, i) => {
              const pct = Math.round((e.n / (headcountEmp[0]?.n || 1)) * 100)
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 36px', gap: 10, alignItems: 'center', fontSize: 12, padding: '5px 0' }}>
                  <div style={{ fontWeight: 500, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.empresa}</div>
                  <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: C.navy }} />
                  </div>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{e.n}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
