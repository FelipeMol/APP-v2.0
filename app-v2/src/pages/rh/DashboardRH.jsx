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

      {/* Vagas em aberto */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
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
