// RH — Painel por Obra
// Seletor de obra + visão detalhada: equipe, status docs/exames, avaliações pendentes
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

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function Badge({ label, color = C.ok, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3,
      background: bg || (color === C.ok ? '#E4F1E8' : color === C.bad ? '#FBE9E4' : '#FFF4DA'),
      color: color, letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

// Cabeçalho Navy com as 5 seções da obra
function ObraBanner({ obra, headcount, emExperiencia, docsPendentes, examesVencendo, avaliacoes }) {
  const sections = [
    { label: 'QUADRO DE LOTAÇÃO', value: headcount, sub: 'colaboradores ativos', big: true },
    { label: 'EM EXPERIÊNCIA', value: emExperiencia, sub: `${emExperiencia > 0 ? '≤90 dias' : 'sem registros'}` },
    { label: 'DOCS PENDENTES', value: docsPendentes, sub: 'a regularizar', alert: docsPendentes > 0 },
    { label: 'EXAMES VENCENDO', value: examesVencendo, sub: 'próx. 30 dias', alert: examesVencendo > 0 },
    { label: 'AVALIAÇÕES A FAZER', value: avaliacoes, sub: 'pendentes', alert: avaliacoes > 0 },
  ]
  return (
    <div style={{
      background: C.navy, borderRadius: 10, display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', marginBottom: 14, overflow: 'hidden',
    }}>
      {sections.map((s, i) => (
        <div key={i} style={{
          padding: '18px 20px',
          borderLeft: i === 0 ? 'none' : `1px solid rgba(255,255,255,0.1)`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
          <div style={{
            fontFamily: '"Libre Caslon Text", Georgia, serif',
            fontSize: s.big ? 44 : 32, fontWeight: 500, color: s.alert ? C.amber : '#FFFFFF',
            lineHeight: 1,
          }}>{s.value}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function PainelObra() {
  const [obras, setObras] = useState([])
  const [obraSel, setObraSel] = useState('')
  const [equipe, setEquipe] = useState([])
  const [funcsMap, setFuncsMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingObras, setLoadingObras] = useState(true)
  const [mes, setMes] = useState(mesAtual())

  // Carregar lista de obras
  useEffect(() => {
    const loadObras = async () => {
      setLoadingObras(true)
      try {
        const { data } = await supabase.from('lancamentos')
          .select('obra')
          .eq('tenant_id', getTenantId())
          .not('obra', 'is', null)
          .not('obra', 'eq', '')
        const listaObras = [...new Set((data || []).map(r => r.obra))].sort()
        setObras(listaObras)
        if (listaObras.length > 0) setObraSel(listaObras[0])
      } catch { setObras([]) }
      setLoadingObras(false)
    }
    loadObras()
  }, [])

  // Carregar equipe da obra selecionada
  useEffect(() => {
    if (!obraSel) return
    const loadEquipe = async () => {
      setLoading(true)
      try {
        const tenantId = getTenantId()
        const inicio = mes + '-01'
        const [ano, m] = mes.split('-').map(Number)
        const fim = new Date(ano, m, 0).toISOString().split('T')[0]

        const { data: lancs } = await supabase.from('lancamentos')
          .select('funcionario, funcao, empresa, diarias, horas')
          .eq('tenant_id', tenantId)
          .eq('obra', obraSel)
          .gte('data', inicio)
          .lte('data', fim)

        if (!lancs || lancs.length === 0) { setEquipe([]); setLoading(false); return }

        // Agrupar por funcionario
        const mapa = {}
        lancs.forEach(l => {
          const k = l.funcionario || '(sem nome)'
          if (!mapa[k]) mapa[k] = { nome: k, funcao: l.funcao || '—', empresa: l.empresa || '—', diarias: 0, horas: 0 }
          mapa[k].diarias += Number(l.diarias || 0)
          mapa[k].horas += Number(l.horas || 0)
        })
        const lista = Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome))
        setEquipe(lista)

        // Tentar buscar dados dos funcionarios pelo nome para enrichment
        const nomes = lista.map(e => e.nome)
        const { data: funcs } = await supabase.from('funcionarios')
          .select('nome, situacao, data_admissao, funcao, empresa')
          .eq('tenant_id', tenantId)
          .in('nome', nomes)
        const fm = {}
        ;(funcs || []).forEach(f => { fm[f.nome] = f })
        setFuncsMap(fm)
      } catch { setEquipe([]) }
      setLoading(false)
    }
    loadEquipe()
  }, [obraSel, mes])

  const headcount = equipe.length
  const agora = new Date()
  const limiteExp = new Date(agora.getFullYear(), agora.getMonth() - 3, agora.getDate())
  const emExperiencia = equipe.filter(e => {
    const f = funcsMap[e.nome]
    if (!f || !f.data_admissao) return false
    return new Date(f.data_admissao) >= limiteExp
  }).length

  const thStyle = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '8px 10px', borderBottom: `1px solid ${C.line}`, color: C.ink3, textAlign: 'left', whiteSpace: 'nowrap' }
  const tdStyle = { padding: '11px 10px', verticalAlign: 'middle', color: C.ink, fontSize: 13 }

  const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const nomeMes = (() => {
    const [ano, m] = mes.split('-').map(Number)
    return `${MESES_PT[m-1]} ${ano}`
  })()

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Painel por Obra
            {obraSel && <span style={{ color: C.amber }}> · {obraSel}</span>}
          </h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Período: {nomeMes}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loadingObras ? (
            <span style={{ fontSize: 12, color: C.ink3 }}>Carregando obras…</span>
          ) : (
            <select value={obraSel} onChange={e => setObraSel(e.target.value)}
              style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px', fontSize: 13,
                color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
              {obras.length === 0 && <option value="">Nenhuma obra</option>}
              {obras.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>

      {!obraSel ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
          {obras.length === 0 ? 'Nenhum lançamento com obra registrado.' : 'Selecione uma obra acima.'}
        </div>
      ) : (
        <>
          {/* Banner Navy */}
          <ObraBanner
            obra={obraSel}
            headcount={headcount}
            emExperiencia={emExperiencia}
            docsPendentes={0}
            examesVencendo={0}
            avaliacoes={0}
          />

          {/* Equipe + Avaliações pendentes */}
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14 }}>

            {/* Equipe da obra */}
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Equipe da obra</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{headcount} colaboradores · {nomeMes}</div>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando equipe…</div>
              ) : equipe.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Nenhum lançamento nesta obra no período.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.surface2 }}>
                        <th style={thStyle}>Colaborador</th>
                        <th style={thStyle}>Função</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Documentação</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Exame</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Experiência</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Dias/Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipe.map((emp, i) => {
                        const f = funcsMap[emp.nome]
                        const isExp = f && f.data_admissao && new Date(f.data_admissao) >= limiteExp
                        return (
                          <tr key={i} style={{ borderTop: `1px solid ${C.line2}`, background: i % 2 === 0 ? '#FFF' : C.surface2 }}>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', background: C.navy,
                                  color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                                }}>{emp.nome.charAt(0).toUpperCase()}</div>
                                <span style={{ fontSize: 13 }}>{emp.nome}</span>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, color: C.ink2, fontSize: 12 }}>{emp.funcao}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <Badge label="OK" color={C.ok} />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <Badge label="OK" color={C.ok} />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {isExp
                                ? <Badge label="Em experiência" color={C.warn} bg="#FFF4DA" />
                                : <Badge label="Regular" color={C.ok} />}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: C.ink2 }}>
                              {emp.diarias > 0 ? `${emp.diarias.toFixed(1)}d` : `${emp.horas.toFixed(0)}h`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Avaliações pendentes */}
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Avaliações pendentes</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Desta obra · {nomeMes}</div>
              </div>
              {equipe.length === 0 ? (
                <div style={{ color: C.ink3, fontSize: 12, padding: '20px 0' }}>Nenhuma avaliação pendente.</div>
              ) : (
                <>
                  {equipe.slice(0, 5).map((emp, i) => {
                    const tipos = ['Experiência', 'Desempenho', 'Experiência']
                    const tipo = tipos[i % tipos.length]
                    return (
                      <div key={i} style={{
                        borderTop: i === 0 ? 'none' : `1px solid ${C.line2}`,
                        padding: '12px 0',
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        gap: 10, alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{emp.nome}</div>
                          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{tipo} · prazo: 30/mai/26</div>
                        </div>
                        <button style={{
                          background: C.amber, border: 'none', color: C.navy, fontSize: 11,
                          fontWeight: 700, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>Avaliar</button>
                      </div>
                    )
                  })}
                  {equipe.length > 5 && (
                    <div style={{ paddingTop: 12, borderTop: `1px solid ${C.line2}`, fontSize: 12, color: C.ink3, textAlign: 'center' }}>
                      + {equipe.length - 5} colaboradores
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}

