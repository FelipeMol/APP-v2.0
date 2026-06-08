// RH — Relatório de Atestados e Faltas
// Consolida registros das tabelas `atestados` e `faltas`, com filtros,
// KPIs, exportação CSV/impressão e formulário rápido para registrar faltas.
import { useEffect, useMemo, useState } from 'react'
import supabase from '../../lib/supabase.js'
import useTenantStore from '../../store/tenantStore.js'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

const getTenantId = () => useTenantStore.getState().selectedTenantId || 'construtora'

// Default: mês corrente
function firstDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function lastDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00').toLocaleDateString('pt-BR')
}

function csvEscape(v) {
  if (v == null) return ''
  const s = String(v).replace(/"/g, '""')
  return /[",;\n]/.test(s) ? `"${s}"` : s
}

// ── Cabeçalho/KPIs ─────────────────────────────────────────────
function KPICard({ titulo, valor, sub, cor }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cor || C.ink, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function RelatorioAtestadosFaltas() {
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth())
  const [dataFim, setDataFim]       = useState(lastDayOfMonth())
  const [tipo, setTipo]             = useState('todos') // 'todos' | 'atestado' | 'falta'
  const [funcionarioId, setFuncionarioId] = useState('todos')
  const [empresa, setEmpresa]       = useState('todas')

  const [funcionarios, setFuncionarios] = useState([])
  const [atestados, setAtestados]       = useState([])
  const [faltas, setFaltas]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [erro, setErro]                 = useState('')

  const [showFalta, setShowFalta] = useState(false)
  const [novaFalta, setNovaFalta] = useState({ funcionario_id: '', data_inicio: '', data_fim: '', motivo: 'injustificada', abonada: false, justificativa: '', observacoes: '' })
  const [salvandoFalta, setSalvandoFalta] = useState(false)
  const [msgFalta, setMsgFalta] = useState('')

  const carregar = async () => {
    setLoading(true); setErro('')
    try {
      const tenantId = getTenantId()
      const [funcRes, atRes, faRes] = await Promise.all([
        supabase.from('funcionarios')
          .select('id,nome,funcao,empresa,situacao')
          .eq('tenant_id', tenantId)
          .order('nome'),
        supabase.from('atestados')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('data_inicio', dataInicio)
          .lte('data_inicio', dataFim)
          .order('data_inicio', { ascending: false }),
        supabase.from('faltas')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('data_inicio', dataInicio)
          .lte('data_inicio', dataFim)
          .order('data_inicio', { ascending: false }),
      ])
      if (funcRes.error) throw funcRes.error
      if (atRes.error)   throw atRes.error
      if (faRes.error)   throw faRes.error
      setFuncionarios(funcRes.data || [])
      setAtestados(atRes.data || [])
      setFaltas(faRes.data || [])
    } catch (e) {
      setErro(e.message || 'Falha ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() /* eslint-disable-next-line */ }, [dataInicio, dataFim])

  // Indexa funcionários por id
  const funcById = useMemo(() => {
    const m = {}
    funcionarios.forEach(f => { m[f.id] = f })
    return m
  }, [funcionarios])

  const empresas = useMemo(() => {
    const s = new Set()
    funcionarios.forEach(f => { if (f.empresa) s.add(f.empresa) })
    return Array.from(s).sort()
  }, [funcionarios])

  // Linhas unificadas
  const linhas = useMemo(() => {
    const arr = []
    if (tipo !== 'falta') {
      atestados.forEach(a => {
        const f = funcById[a.funcionario_id]
        arr.push({
          id: 'a-' + a.id,
          tipo: 'Atestado',
          funcionario_id: a.funcionario_id,
          colaborador: f?.nome || '—',
          empresa: f?.empresa || '—',
          funcao: f?.funcao || '—',
          data_inicio: a.data_inicio,
          data_fim: a.data_fim,
          dias: a.dias,
          motivo: [a.cid_codigo, a.cid_descricao].filter(Boolean).join(' — ') || '—',
          abonada: true,
          observacoes: a.observacoes || '',
        })
      })
    }
    if (tipo !== 'atestado') {
      faltas.forEach(fa => {
        const f = funcById[fa.funcionario_id]
        arr.push({
          id: 'f-' + fa.id,
          tipo: 'Falta',
          funcionario_id: fa.funcionario_id,
          colaborador: f?.nome || '—',
          empresa: f?.empresa || '—',
          funcao: f?.funcao || '—',
          data_inicio: fa.data_inicio,
          data_fim: fa.data_fim,
          dias: fa.dias,
          motivo: fa.motivo || '—',
          abonada: !!fa.abonada,
          observacoes: [fa.justificativa, fa.observacoes].filter(Boolean).join(' · ') || '',
        })
      })
    }
    // filtros
    return arr
      .filter(r => funcionarioId === 'todos' || String(r.funcionario_id) === String(funcionarioId))
      .filter(r => empresa === 'todas' || r.empresa === empresa)
      .sort((a, b) => (b.data_inicio || '').localeCompare(a.data_inicio || ''))
  }, [atestados, faltas, funcById, tipo, funcionarioId, empresa])

  // KPIs
  const kpis = useMemo(() => {
    const at = linhas.filter(r => r.tipo === 'Atestado')
    const fa = linhas.filter(r => r.tipo === 'Falta')
    const diasAt = at.reduce((s, r) => s + (r.dias || 0), 0)
    const diasFa = fa.reduce((s, r) => s + (r.dias || 0), 0)
    const colabs = new Set(linhas.map(r => r.funcionario_id)).size
    const faltasInjust = fa.filter(r => !r.abonada).reduce((s, r) => s + (r.dias || 0), 0)
    return {
      totalAtestados: at.length, diasAtestados: diasAt,
      totalFaltas: fa.length, diasFaltas: diasFa,
      colaboradores: colabs,
      diasInjustificados: faltasInjust,
    }
  }, [linhas])

  // Exportar CSV
  const exportarCSV = () => {
    const headers = ['Tipo', 'Colaborador', 'Empresa', 'Função', 'Data início', 'Data fim', 'Dias', 'Motivo/CID', 'Abonada', 'Observações']
    const rows = linhas.map(r => [
      r.tipo, r.colaborador, r.empresa, r.funcao,
      fmtDate(r.data_inicio), fmtDate(r.data_fim), r.dias,
      r.motivo, r.abonada ? 'Sim' : 'Não', r.observacoes,
    ].map(csvEscape).join(';'))
    const csv = '\uFEFF' + [headers.map(csvEscape).join(';'), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `relatorio-atestados-faltas_${dataInicio}_a_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Registrar falta
  const setNF = (k, v) => setNovaFalta(f => ({ ...f, [k]: v }))
  const salvarFalta = async () => {
    if (!novaFalta.funcionario_id) { setMsgFalta('Selecione o colaborador.'); return }
    if (!novaFalta.data_inicio)    { setMsgFalta('Informe a data da falta.'); return }
    setSalvandoFalta(true); setMsgFalta('')
    try {
      const payload = {
        tenant_id:      getTenantId(),
        funcionario_id: Number(novaFalta.funcionario_id),
        data_inicio:    novaFalta.data_inicio,
        data_fim:       novaFalta.data_fim || null,
        motivo:         novaFalta.motivo || null,
        abonada:        !!novaFalta.abonada,
        justificativa:  novaFalta.justificativa?.trim() || null,
        observacoes:    novaFalta.observacoes?.trim() || null,
      }
      const { error } = await supabase.from('faltas').insert(payload)
      if (error) throw error
      setMsgFalta('Falta registrada!')
      setNovaFalta({ funcionario_id: '', data_inicio: '', data_fim: '', motivo: 'injustificada', abonada: false, justificativa: '', observacoes: '' })
      setShowFalta(false)
      carregar()
    } catch (e) {
      setMsgFalta('Erro: ' + (e.message || 'falhou'))
    } finally {
      setSalvandoFalta(false)
    }
  }

  // ── Estilos rápidos ─────────────────────────────────────────
  const inputStyle = { width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 12.5, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 10.5, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }
  const TH = (extra = {}) => ({ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 10px', borderBottom: `1px solid ${C.line}`, color: C.ink3, textAlign: 'left', background: C.surface2, ...extra })
  const TD = (extra = {}) => ({ padding: '10px 10px', verticalAlign: 'middle', color: C.ink, fontSize: 12.5, borderBottom: `1px solid ${C.line2}`, ...extra })

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>
      {/* Cabeçalho */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Relatório de Atestados e Faltas</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>Período de {fmtDate(dataInicio)} a {fmtDate(dataFim)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFalta(v => !v)} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showFalta ? '✕ Cancelar' : '+ Registrar falta'}
          </button>
          <button onClick={exportarCSV} disabled={!linhas.length} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: linhas.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: linhas.length ? 1 : 0.5 }}>
            Exportar CSV
          </button>
          <button onClick={() => window.print()} style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="no-print" style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        <div>
          <div style={labelStyle}>Data início</div>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Data fim</div>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Tipo</div>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
            <option value="todos">Todos</option>
            <option value="atestado">Apenas atestados</option>
            <option value="falta">Apenas faltas</option>
          </select>
        </div>
        <div>
          <div style={labelStyle}>Colaborador</div>
          <select value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)} style={inputStyle}>
            <option value="todos">Todos</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Empresa</div>
          <select value={empresa} onChange={e => setEmpresa(e.target.value)} style={inputStyle}>
            <option value="todas">Todas</option>
            {empresas.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Formulário Nova Falta */}
      {showFalta && (
        <div className="no-print" style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Registrar nova falta</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={labelStyle}>Colaborador *</div>
              <select value={novaFalta.funcionario_id} onChange={e => setNF('funcionario_id', e.target.value)} style={inputStyle}>
                <option value="">Selecione…</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Data início *</div>
              <input type="date" value={novaFalta.data_inicio} onChange={e => setNF('data_inicio', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Data fim</div>
              <input type="date" value={novaFalta.data_fim} onChange={e => setNF('data_fim', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Motivo</div>
              <select value={novaFalta.motivo} onChange={e => setNF('motivo', e.target.value)} style={inputStyle}>
                <option value="injustificada">Injustificada</option>
                <option value="justificada">Justificada</option>
                <option value="pessoal">Motivo pessoal</option>
                <option value="transporte">Transporte</option>
                <option value="familia">Família</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>Abonada</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 12.5, color: C.ink2 }}>
                <input type="checkbox" checked={novaFalta.abonada} onChange={e => setNF('abonada', e.target.checked)} />
                Falta abonada (não desconta)
              </label>
            </div>
            <div />
            <div style={{ gridColumn: 'span 3' }}>
              <div style={labelStyle}>Justificativa</div>
              <input type="text" value={novaFalta.justificativa} onChange={e => setNF('justificativa', e.target.value)} placeholder="Ex: problema de transporte" style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <div style={labelStyle}>Observações</div>
              <textarea value={novaFalta.observacoes} onChange={e => setNF('observacoes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
          {msgFalta && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: msgFalta.startsWith('Erro') ? '#FBE9E4' : '#E4F1E8', borderRadius: 7, fontSize: 12, color: msgFalta.startsWith('Erro') ? C.bad : C.ok }}>{msgFalta}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={salvarFalta} disabled={salvandoFalta} style={{ background: C.ok, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 8, cursor: salvandoFalta ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvandoFalta ? 0.7 : 1 }}>
              {salvandoFalta ? 'Salvando…' : 'Salvar falta'}
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard titulo="Atestados" valor={kpis.totalAtestados} sub={`${kpis.diasAtestados} dia${kpis.diasAtestados !== 1 ? 's' : ''}`} cor={C.info} />
        <KPICard titulo="Faltas" valor={kpis.totalFaltas} sub={`${kpis.diasFaltas} dia${kpis.diasFaltas !== 1 ? 's' : ''}`} cor={C.bad} />
        <KPICard titulo="Faltas injustificadas" valor={kpis.diasInjustificados} sub="dias não abonados" cor={C.warn} />
        <KPICard titulo="Colaboradores afetados" valor={kpis.colaboradores} sub="no período" />
        <KPICard titulo="Total registros" valor={linhas.length} sub="atestados + faltas" cor={C.navy} />
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ padding: '11px 14px', background: '#FBE9E4', borderRadius: 8, fontSize: 12, color: C.bad, marginBottom: 14 }}>{erro}</div>
      )}

      {/* Tabela */}
      <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando…</div>
        ) : linhas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
            Nenhum registro no período selecionado.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH({ width: 86 })}>Tipo</th>
                <th style={TH()}>Colaborador</th>
                <th style={TH()}>Empresa</th>
                <th style={TH()}>Função</th>
                <th style={TH({ width: 110 })}>Início</th>
                <th style={TH({ width: 110 })}>Fim</th>
                <th style={TH({ width: 70, textAlign: 'right' })}>Dias</th>
                <th style={TH()}>Motivo / CID</th>
                <th style={TH({ width: 90, textAlign: 'center' })}>Abonada</th>
                <th style={TH()}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(r => (
                <tr key={r.id}>
                  <td style={TD()}>
                    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', background: r.tipo === 'Atestado' ? '#E2E9F2' : '#FBE9E4', color: r.tipo === 'Atestado' ? C.info : C.bad }}>{r.tipo}</span>
                  </td>
                  <td style={TD({ fontWeight: 600 })}>{r.colaborador}</td>
                  <td style={TD({ color: C.ink2 })}>{r.empresa}</td>
                  <td style={TD({ color: C.ink2 })}>{r.funcao}</td>
                  <td style={TD()}>{fmtDate(r.data_inicio)}</td>
                  <td style={TD()}>{fmtDate(r.data_fim)}</td>
                  <td style={TD({ textAlign: 'right', fontWeight: 600 })}>{r.dias ?? '—'}</td>
                  <td style={TD({ color: C.ink2 })}>{r.motivo}</td>
                  <td style={TD({ textAlign: 'center', color: r.abonada ? C.ok : C.bad, fontWeight: 600 })}>{r.abonada ? 'Sim' : 'Não'}</td>
                  <td style={TD({ color: C.ink3, fontSize: 11.5 })}>{r.observacoes || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ ...TD(), background: C.surface2, fontWeight: 700, fontSize: 11.5 }}>TOTAIS</td>
                <td style={{ ...TD(), background: C.surface2, textAlign: 'right', fontWeight: 700 }}>{kpis.diasAtestados + kpis.diasFaltas}</td>
                <td colSpan={3} style={{ ...TD(), background: C.surface2, fontSize: 11, color: C.ink3 }}>
                  {kpis.totalAtestados} atestado{kpis.totalAtestados !== 1 ? 's' : ''} ({kpis.diasAtestados}d) · {kpis.totalFaltas} falta{kpis.totalFaltas !== 1 ? 's' : ''} ({kpis.diasFaltas}d)
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
