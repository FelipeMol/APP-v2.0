// RH — Relatório de Atestados e Faltas
// Consolida registros das tabelas `atestados` e `faltas`, com filtros,
// KPIs, exportação CSV/impressão e formulários para registrar faltas e atestados.
import { useEffect, useMemo, useState } from 'react'
import supabase from '../../lib/supabase.js'
import useTenantStore from '../../store/tenantStore.js'
import { CID10_COMUM } from '../../utils/cid10_common.js'

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

  // ── Estado: Formulário de Falta ──
  const [showFalta, setShowFalta] = useState(false)
  const [novaFalta, setNovaFalta] = useState({ funcionario_id: '', data_inicio: '', data_fim: '', motivo: 'injustificada', abonada: false, justificativa: '', observacoes: '' })
  const [salvandoFalta, setSalvandoFalta] = useState(false)
  const [msgFalta, setMsgFalta] = useState('')

  // ── Estado: Formulário de Atestado ──
  const [showAtestado, setShowAtestado] = useState(false)
  const [novoAtestado, setNovoAtestado] = useState({ funcionario_id: '', data_inicio: '', data_fim: '', cid_codigo: '', cid_descricao: '', observacoes: '' })
  const [salvandoAtestado, setSalvandoAtestado] = useState(false)
  const [msgAtestado, setMsgAtestado] = useState('')
  const [cidBusca, setCidBusca] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)

  // ── Estado: Edição ──
  const [editando, setEditando] = useState(null) // null | { tipo: 'falta'|'atestado', id: uuid, dados: {...} }
  const [editSalvando, setEditSalvando] = useState(false)
  const [msgEdit, setMsgEdit] = useState('')

  // ── Estado: Exclusão ──
  const [excluindo, setExcluindo] = useState(null) // null | { tipo, id }
  const [msgExclusao, setMsgExclusao] = useState('')

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

  // CID-10 filtrado
  const cidFiltrados = useMemo(() => {
    if (!cidBusca.trim()) return CID10_COMUM.slice(0, 20)
    const q = cidBusca.toLowerCase()
    return CID10_COMUM.filter(c =>
      c.codigo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [cidBusca])

  // Linhas unificadas
  const linhas = useMemo(() => {
    const arr = []
    if (tipo !== 'falta') {
      atestados.forEach(a => {
        const f = funcById[a.funcionario_id]
          arr.push({
            id: 'a-' + a.id,
            rawId: a.id,
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
            foto_url: a.foto_url || null,
          })
      })
    }
    if (tipo !== 'atestado') {
      faltas.forEach(fa => {
        const f = funcById[fa.funcionario_id]
        arr.push({
          id: 'f-' + fa.id,
          rawId: fa.id,
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

  // Signed URLs para anexos
  const [signedUrls, setSignedUrls] = useState({})
  useEffect(() => {
    const gerarSignedUrls = async () => {
      const entries = await Promise.all(
        linhas
          .filter(r => r.foto_url)
          .map(async (r) => {
            try {
              const { data } = await supabase.storage.from('atestados').createSignedUrl(r.foto_url, 3600)
              return [r.id, data?.signedUrl || null]
            } catch { return [r.id, null] }
          })
      )
      setSignedUrls(Object.fromEntries(entries))
    }
    if (linhas.some(r => r.foto_url)) gerarSignedUrls()
  }, [linhas])

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

  // ── Registrar Falta ──
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

  // ── Registrar Atestado ──
  const setNA = (k, v) => setNovoAtestado(f => ({ ...f, [k]: v }))

  const handleFotoAtestado = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMsgAtestado('Arquivo muito grande (máx. 5 MB).'); return }
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const salvarAtestado = async () => {
    if (!novoAtestado.funcionario_id) { setMsgAtestado('Selecione o colaborador.'); return }
    if (!novoAtestado.data_inicio)    { setMsgAtestado('Informe a data de início.'); return }
    setSalvandoAtestado(true); setMsgAtestado('')
    try {
      let foto_url = null
      if (fotoFile) {
        const funcId = Number(novoAtestado.funcionario_id)
        const ext = fotoFile.name.split('.').pop()
        const path = `${getTenantId()}/${funcId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('atestados').upload(path, fotoFile, { upsert: false })
        if (upErr) throw upErr
        foto_url = path
      }
      const payload = {
        tenant_id:      getTenantId(),
        funcionario_id: Number(novoAtestado.funcionario_id),
        data_inicio:    novoAtestado.data_inicio,
        data_fim:       novoAtestado.data_fim || null,
        cid_codigo:     novoAtestado.cid_codigo?.trim() || null,
        cid_descricao:  novoAtestado.cid_descricao?.trim() || null,
        observacoes:    novoAtestado.observacoes?.trim() || null,
        foto_url,
      }
      const { error } = await supabase.from('atestados').insert(payload)
      if (error) throw error
      setMsgAtestado('Atestado registrado!')
      setNovoAtestado({ funcionario_id: '', data_inicio: '', data_fim: '', cid_codigo: '', cid_descricao: '', observacoes: '' })
      setCidBusca('')
      setFotoFile(null); setFotoPreview(null)
      setShowAtestado(false)
      carregar()
    } catch (e) {
      setMsgAtestado('Erro: ' + (e.message || 'falhou'))
    } finally {
      setSalvandoAtestado(false)
    }
  }

  // ── Editar registro ──
  const iniciarEdicao = (linha) => {
    setMsgEdit('')
    setMsgExclusao('')
    if (linha.tipo === 'Falta') {
      const fa = faltas.find(x => x.id === linha.rawId)
      if (!fa) return
      setEditando({
        tipo: 'falta',
        id: fa.id,
        dados: {
          funcionario_id: String(fa.funcionario_id),
          data_inicio: fa.data_inicio || '',
          data_fim: fa.data_fim || '',
          motivo: fa.motivo || 'injustificada',
          abonada: !!fa.abonada,
          justificativa: fa.justificativa || '',
          observacoes: fa.observacoes || '',
        },
      })
    } else {
      const at = atestados.find(x => x.id === linha.rawId)
      if (!at) return
      setEditando({
        tipo: 'atestado',
        id: at.id,
        dados: {
          funcionario_id: String(at.funcionario_id),
          data_inicio: at.data_inicio || '',
          data_fim: at.data_fim || '',
          cid_codigo: at.cid_codigo || '',
          cid_descricao: at.cid_descricao || '',
          observacoes: at.observacoes || '',
        },
      })
      setCidBusca(at.cid_codigo || '')
    }
  }

  const setEditCampo = (k, v) => setEditando(e => ({ ...e, dados: { ...e.dados, [k]: v } }))

  const salvarEdicao = async () => {
    if (!editando) return
    const { tipo: t, id, dados } = editando
    if (!dados.funcionario_id) { setMsgEdit('Selecione o colaborador.'); return }
    if (!dados.data_inicio)    { setMsgEdit('Informe a data de início.'); return }
    setEditSalvando(true); setMsgEdit('')
    try {
      let error
      if (t === 'falta') {
        const res = await supabase.from('faltas').update({
          funcionario_id: Number(dados.funcionario_id),
          data_inicio: dados.data_inicio,
          data_fim: dados.data_fim || null,
          motivo: dados.motivo || null,
          abonada: !!dados.abonada,
          justificativa: dados.justificativa?.trim() || null,
          observacoes: dados.observacoes?.trim() || null,
        }).eq('id', id)
        error = res.error
      } else {
        const res = await supabase.from('atestados').update({
          funcionario_id: Number(dados.funcionario_id),
          data_inicio: dados.data_inicio,
          data_fim: dados.data_fim || null,
          cid_codigo: dados.cid_codigo?.trim() || null,
          cid_descricao: dados.cid_descricao?.trim() || null,
          observacoes: dados.observacoes?.trim() || null,
        }).eq('id', id)
        error = res.error
      }
      if (error) throw error
      setEditando(null)
      carregar()
    } catch (e) {
      setMsgEdit('Erro: ' + (e.message || 'falhou'))
    } finally {
      setEditSalvando(false)
    }
  }

  // ── Excluir registro ──
  const confirmarExclusao = (linha) => {
    setEditando(null)
    setMsgExclusao('')
    setExcluindo({ tipo: linha.tipo, id: linha.rawId, nome: linha.colaborador })
  }

  const executarExclusao = async () => {
    if (!excluindo) return
    setMsgExclusao('')
    try {
      const tabela = excluindo.tipo === 'Falta' ? 'faltas' : 'atestados'
      const { error } = await supabase.from(tabela).delete().eq('id', excluindo.id)
      if (error) throw error
      setExcluindo(null)
      carregar()
    } catch (e) {
      setMsgExclusao('Erro ao excluir: ' + (e.message || 'falhou'))
    }
  }

  // ── Estilos rápidos ─────────────────────────────────────────
  const inputStyle = { width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 12.5, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 10.5, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }
  const TH = (extra = {}) => ({ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 10px', borderBottom: `1px solid ${C.line}`, color: C.ink3, textAlign: 'left', background: C.surface2, ...extra })
  const TD = (extra = {}) => ({ padding: '10px 10px', verticalAlign: 'middle', color: C.ink, fontSize: 12.5, borderBottom: `1px solid ${C.line2}`, ...extra })
  const btnSmall = (cor = C.ink2) => ({ background: 'transparent', border: `1px solid ${C.line}`, color: cor, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' })

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>
      {/* Cabeçalho */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Relatório de Atestados e Faltas</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>Período de {fmtDate(dataInicio)} a {fmtDate(dataFim)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setShowFalta(v => !v); setShowAtestado(false); setEditando(null) }} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showFalta ? '✕ Cancelar' : '+ Registrar falta'}
          </button>
          <button onClick={() => { setShowAtestado(v => !v); setShowFalta(false); setEditando(null) }} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.info, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showAtestado ? '✕ Cancelar' : '+ Registrar atestado'}
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

      {/* ── Formulário Nova Falta ── */}
      {showFalta && (
        <div className="no-print" style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Registrar nova falta</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
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

      {/* ── Formulário Novo Atestado ── */}
      {showAtestado && (
        <div className="no-print" style={{ background: '#EDF2F8', border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.info, marginBottom: 14 }}>Registrar novo atestado</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <div style={labelStyle}>Colaborador *</div>
              <select value={novoAtestado.funcionario_id} onChange={e => setNA('funcionario_id', e.target.value)} style={inputStyle}>
                <option value="">Selecione…</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Data início *</div>
              <input type="date" value={novoAtestado.data_inicio} onChange={e => setNA('data_inicio', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Data fim</div>
              <input type="date" value={novoAtestado.data_fim} onChange={e => setNA('data_fim', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <div style={labelStyle}>CID-10 (código / diagnóstico)</div>
              <input
                type="text"
                value={cidBusca}
                onChange={e => { setCidBusca(e.target.value); setNA('cid_codigo', ''); setNA('cid_descricao', '') }}
                placeholder="Busque por código ou descrição…"
                style={inputStyle}
              />
              {cidBusca && !novoAtestado.cid_codigo && cidFiltrados.length > 0 && (
                <div style={{ border: `1px solid ${C.line}`, borderTop: 'none', borderRadius: '0 0 7px 7px', background: C.surface, maxHeight: 160, overflowY: 'auto', position: 'relative', zIndex: 10 }}>
                  {cidFiltrados.map(c => (
                    <div
                      key={c.codigo}
                      onClick={() => { setNA('cid_codigo', c.codigo); setNA('cid_descricao', c.descricao); setCidBusca(`${c.codigo} — ${c.descricao}`) }}
                      style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${C.line2}`, color: C.ink }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = C.surface}
                    >
                      <span style={{ fontWeight: 600, marginRight: 6 }}>{c.codigo}</span>{c.descricao}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <div style={labelStyle}>Observações</div>
              <textarea value={novoAtestado.observacoes} onChange={e => setNA('observacoes', e.target.value)} rows={2} placeholder="Observações adicionais…" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <div style={labelStyle}>Anexo (imagem ou PDF)</div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: C.surface, border: `1px dashed ${C.line}`, borderRadius: 8, padding: '10px 16px', fontSize: 12.5, color: C.ink2 }}>
                📎 {fotoFile ? fotoFile.name : 'Selecionar arquivo (máx. 5 MB)'}
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFotoAtestado} />
              </label>
              {fotoPreview && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {fotoFile?.type?.startsWith('image/') ? (
                    <img src={fotoPreview} alt="Preview" style={{ height: 80, borderRadius: 7, border: `1px solid ${C.line}`, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ padding: '8px 14px', background: C.surface2, borderRadius: 7, border: `1px solid ${C.line}`, fontSize: 12, color: C.ink2 }}>📄 {fotoFile?.name}</div>
                  )}
                  <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null) }} style={{ background: 'none', border: 'none', color: C.bad, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>Remover</button>
                </div>
              )}
            </div>
          </div>
          {msgAtestado && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: msgAtestado.startsWith('Erro') ? '#FBE9E4' : '#E4F1E8', borderRadius: 7, fontSize: 12, color: msgAtestado.startsWith('Erro') ? C.bad : C.ok }}>{msgAtestado}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={salvarAtestado} disabled={salvandoAtestado} style={{ background: C.info, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 8, cursor: salvandoAtestado ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvandoAtestado ? 0.7 : 1 }}>
              {salvandoAtestado ? 'Salvando…' : 'Salvar atestado'}
            </button>
          </div>
        </div>
      )}

      {/* ── Formulário de Edição ── */}
      {editando && (
        <div className="no-print" style={{ background: '#FFF8E8', border: `2px solid ${C.amber}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.warn }}>
              Editando {editando.tipo === 'falta' ? 'Falta' : 'Atestado'}
            </div>
            <button onClick={() => setEditando(null)} style={{ background: 'transparent', border: 'none', color: C.ink3, fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>✕</button>
          </div>

          {editando.tipo === 'falta' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <div style={labelStyle}>Colaborador *</div>
                <select value={editando.dados.funcionario_id} onChange={e => setEditCampo('funcionario_id', e.target.value)} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Data início *</div>
                <input type="date" value={editando.dados.data_inicio} onChange={e => setEditCampo('data_inicio', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Data fim</div>
                <input type="date" value={editando.dados.data_fim} onChange={e => setEditCampo('data_fim', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Motivo</div>
                <select value={editando.dados.motivo} onChange={e => setEditCampo('motivo', e.target.value)} style={inputStyle}>
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
                  <input type="checkbox" checked={editando.dados.abonada} onChange={e => setEditCampo('abonada', e.target.checked)} />
                  Falta abonada (não desconta)
                </label>
              </div>
              <div />
              <div style={{ gridColumn: 'span 3' }}>
                <div style={labelStyle}>Justificativa</div>
                <input type="text" value={editando.dados.justificativa} onChange={e => setEditCampo('justificativa', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={labelStyle}>Observações</div>
                <textarea value={editando.dados.observacoes} onChange={e => setEditCampo('observacoes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <div style={labelStyle}>Colaborador *</div>
                <select value={editando.dados.funcionario_id} onChange={e => setEditCampo('funcionario_id', e.target.value)} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Data início *</div>
                <input type="date" value={editando.dados.data_inicio} onChange={e => setEditCampo('data_inicio', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Data fim</div>
                <input type="date" value={editando.dados.data_fim} onChange={e => setEditCampo('data_fim', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={labelStyle}>CID-10</div>
                <input
                  type="text"
                  value={cidBusca}
                  onChange={e => { setCidBusca(e.target.value); setEditCampo('cid_codigo', ''); setEditCampo('cid_descricao', '') }}
                  placeholder="Busque por código ou descrição…"
                  style={inputStyle}
                />
                {cidBusca && !editando.dados.cid_codigo && cidFiltrados.length > 0 && (
                  <div style={{ border: `1px solid ${C.line}`, borderTop: 'none', borderRadius: '0 0 7px 7px', background: C.surface, maxHeight: 160, overflowY: 'auto', position: 'relative', zIndex: 10 }}>
                    {cidFiltrados.map(c => (
                      <div
                        key={c.codigo}
                        onClick={() => { setEditCampo('cid_codigo', c.codigo); setEditCampo('cid_descricao', c.descricao); setCidBusca(`${c.codigo} — ${c.descricao}`) }}
                        style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${C.line2}`, color: C.ink }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = C.surface}
                      >
                        <span style={{ fontWeight: 600, marginRight: 6 }}>{c.codigo}</span>{c.descricao}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={labelStyle}>Observações</div>
                <textarea value={editando.dados.observacoes} onChange={e => setEditCampo('observacoes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {msgEdit && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: msgEdit.startsWith('Erro') ? '#FBE9E4' : '#E4F1E8', borderRadius: 7, fontSize: 12, color: msgEdit.startsWith('Erro') ? C.bad : C.ok }}>{msgEdit}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button onClick={() => setEditando(null)} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={salvarEdicao} disabled={editSalvando} style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 8, cursor: editSalvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: editSalvando ? 0.7 : 1 }}>
              {editSalvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmação de exclusão ── */}
      {excluindo && (
        <div className="no-print" style={{ background: '#FBE9E4', border: `2px solid ${C.bad}`, borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: C.bad }}>
            Excluir registro de <strong>{excluindo.tipo}</strong> — <strong>{excluindo.nome}</strong>?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {msgExclusao && <span style={{ fontSize: 12, color: C.bad, alignSelf: 'center' }}>{msgExclusao}</span>}
            <button onClick={() => setExcluindo(null)} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={executarExclusao} style={{ background: C.bad, border: 'none', color: '#FFF', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
              Excluir
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
                <th className="no-print" style={TH({ width: 70, textAlign: 'center' })}>Anexo</th>
                <th className="no-print" style={TH({ width: 100, textAlign: 'center' })}>Ações</th>
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
                  <td className="no-print" style={TD({ textAlign: 'center' })}>
                    {r.foto_url ? (
                      <a href={signedUrls[r.id] || '#'} target="_blank" rel="noopener noreferrer" style={{ color: C.info, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        Ver
                      </a>
                    ) : <span style={{ color: C.ink3, fontSize: 11 }}>—</span>}
                  </td>
                  <td className="no-print" style={TD({ textAlign: 'center', whiteSpace: 'nowrap' })}>
                    <button onClick={() => iniciarEdicao(r)} title="Editar" style={{ ...btnSmall(C.warn), marginRight: 4 }}>Editar</button>
                    <button onClick={() => confirmarExclusao(r)} title="Excluir" style={btnSmall(C.bad)}>Apagar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ ...TD(), background: C.surface2, fontWeight: 700, fontSize: 11.5 }}>TOTAIS</td>
                <td style={{ ...TD(), background: C.surface2, textAlign: 'right', fontWeight: 700 }}>{kpis.diasAtestados + kpis.diasFaltas}</td>
                <td colSpan={4} style={{ ...TD(), background: C.surface2, fontSize: 11, color: C.ink3 }}>
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
