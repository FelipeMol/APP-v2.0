// Financeiro — Previsto x Realizado
// Filtro por obra + ano | Categorias hierarquicas | Edicao inline de previsto
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriasService, orcamentosService, lancamentosFinService, buildCategoriasTree } from '@/services/financeiroService'
import obrasService from '@/services/obrasService'
import { ChevronRight, ChevronDown, Building2, Check, X, AlertCircle } from 'lucide-react'

const C = {
  navy: '#17273C', amber: '#E8A628',
  ok: '#3D7A50', bad: '#B84A33', warn: '#B8862C',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ANO_ATUAL = new Date().getFullYear()
const ANOS = [ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1]

function brl(n) {
  if (!n && n !== 0) return 'R$ 0'
  const abs = Math.abs(n)
  return (n < 0 ? '-' : '') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function brlK(n) {
  if (!n && n !== 0) return '—'
  const abs = Math.abs(n)
  if (abs === 0) return '—'
  if (abs >= 1_000_000) return (n < 0 ? '-' : '') + 'R$ ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1_000)     return (n < 0 ? '-' : '') + 'R$ ' + (abs / 1_000).toFixed(0) + 'k'
  return brl(n)
}
function parseValor(str) {
  const clean = str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? '#FFF0EE' : '#EAF5EE',
      border: `1px solid ${type === 'error' ? C.bad : C.ok}`,
      borderRadius: 10, padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      minWidth: 260, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
    }}>
      {type === 'error' ? <AlertCircle size={16} color={C.bad} /> : <Check size={16} color={C.ok} />}
      <span style={{ fontSize: 14, color: C.ink }}>{msg}</span>
    </div>
  )
}

function Banner({ totalPrevisto, totalRealizado, obraNome, ano }) {
  const diff    = totalPrevisto - totalRealizado
  const execPct = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0
  return (
    <div style={{
      background: C.navy, borderRadius: 12, padding: '22px 28px',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 16,
    }}>
      <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.15em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>OBRA</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginTop: 6, lineHeight: 1.2 }}>
          {obraNome || 'Todas as obras'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Ano {ano}</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.15em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>PREVISTO</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', marginTop: 6 }}>{brl(totalPrevisto)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Orcamento total</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.15em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>REALIZADO</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#F4B19C', marginTop: 6 }}>{brl(totalRealizado)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Despesas pagas</div>
      </div>
      <div style={{ paddingLeft: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '.15em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>EXECUCAO</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: diff >= 0 ? '#8ED1A5' : '#F4B19C', marginTop: 6 }}>
          {totalPrevisto > 0 ? `${execPct}%` : '—'}
        </div>
        <div style={{ fontSize: 11, color: diff >= 0 ? '#8ED1A5' : '#F4B19C', marginTop: 4 }}>
          {diff >= 0 ? `${brlK(diff)} de saldo` : `${brlK(Math.abs(diff))} acima do orcamento`}
        </div>
      </div>
    </div>
  )
}

function CelulaPrevisto({ value, onSave, disabled }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  function startEdit() {
    if (disabled) return
    setDraft(value > 0 ? String(value) : '')
    setEditing(true)
  }
  function commit() { onSave(parseValor(draft)); setEditing(false) }
  function cancel() { setEditing(false) }
  function handleKey(e) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey} onBlur={commit}
          style={{ width: 72, fontSize: 11, padding: '2px 5px', borderRadius: 4,
            border: `1.5px solid ${C.navy}`, outline: 'none', textAlign: 'right',
            background: '#fff', color: C.ink, fontFamily: 'inherit' }}
          placeholder="0"
        />
        <button onMouseDown={commit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1 }}><Check size={11} color={C.ok} /></button>
        <button onMouseDown={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1 }}><X size={11} color={C.bad} /></button>
      </div>
    )
  }
  return (
    <div onClick={startEdit} title={disabled ? '' : 'Clique para editar previsto'}
      style={{ fontSize: 10, color: value > 0 ? C.ink2 : C.line, textAlign: 'right',
        cursor: disabled ? 'default' : 'pointer', borderRadius: 3, padding: '1px 2px',
        borderBottom: disabled ? 'none' : `1px dashed ${value > 0 ? C.line : 'transparent'}` }}>
      {value > 0 ? brlK(value) : (disabled ? '—' : '+ prev')}
    </div>
  )
}

function CelulaTriple({ previsto, realizado, onSavePrevisto, obraId }) {
  const diff = realizado - previsto
  let status = 'neutro'
  if (previsto > 0) {
    const p = realizado / previsto
    status = p <= 0.85 ? 'ok' : p <= 1.0 ? 'warn' : 'bad'
  }
  const SC = { ok: { fg: C.ok, bg: '#E4F1E8' }, warn: { fg: C.warn, bg: '#FDF3DF' }, bad: { fg: C.bad, bg: '#FBE9E4' }, neutro: { fg: C.ink3, bg: 'transparent' } }
  const sc = SC[status]
  const execPct = previsto > 0 ? Math.min(Math.round((realizado / previsto) * 100), 100) : 0
  return (
    <td style={{ padding: '5px 7px', verticalAlign: 'top', minWidth: 90, borderLeft: `1px solid ${C.line2}` }}>
      {previsto > 0 && (
        <div style={{ height: 2, background: C.line2, borderRadius: 1, marginBottom: 4, overflow: 'hidden' }}>
          <div style={{ width: execPct + '%', height: '100%', borderRadius: 1, background: sc.fg }} />
        </div>
      )}
      <CelulaPrevisto value={previsto} onSave={onSavePrevisto} disabled={!obraId} />
      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, textAlign: 'right', marginTop: 2 }}>
        {realizado > 0 ? brlK(realizado) : <span style={{ color: C.line2 }}>—</span>}
      </div>
      {(previsto > 0 || realizado > 0) && (
        <div style={{ fontSize: 9, textAlign: 'right', marginTop: 2, color: sc.fg,
          background: (diff > 0 && status !== 'neutro') ? sc.bg : 'transparent',
          borderRadius: 3, padding: (diff > 0 && status !== 'neutro') ? '1px 4px' : 0 }}>
          {diff > 0 ? `+${brlK(diff)}` : diff < 0 ? brlK(diff) : '='}
        </div>
      )}
    </td>
  )
}

function LinhaGrupo({ cat, isExpanded, onToggle, prevPorMes, realPorMes, obraId, onSave }) {
  const totalPrev = Object.values(prevPorMes).reduce((s, v) => s + v, 0)
  const totalReal = Object.values(realPorMes).reduce((s, v) => s + v, 0)
  return (
    <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.line}` }}>
      <td style={{ padding: '9px 12px', position: 'sticky', left: 0, zIndex: 2, background: C.surface2, minWidth: 200, maxWidth: 200, borderRight: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.ink3, flexShrink: 0 }}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{cat.nome}</span>
          {cat.subcategorias?.length > 0 && (
            <span style={{ fontSize: 10, color: C.ink3, background: C.line2, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>
              {cat.subcategorias.length}
            </span>
          )}
        </div>
      </td>
      {MESES.map((_, i) => (
        <CelulaTriple key={i} previsto={prevPorMes[i+1]||0} realizado={realPorMes[i+1]||0}
          obraId={obraId} onSavePrevisto={(val) => onSave(cat.id, i+1, val)} />
      ))}
      <td style={{ padding: '5px 10px', borderLeft: `2px solid ${C.line}`, background: C.surface2, minWidth: 90, textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: C.ink3 }}>{brlK(totalPrev)}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{brlK(totalReal)}</div>
      </td>
    </tr>
  )
}

function LinhaSubcat({ cat, isExpanded, onToggle, prevPorMes, realPorMes, obraId, onSave }) {
  const totalPrev = Object.values(prevPorMes).reduce((s, v) => s + v, 0)
  const totalReal = Object.values(realPorMes).reduce((s, v) => s + v, 0)
  const hasChildren = cat.subcategorias?.length > 0
  return (
    <tr style={{ background: C.surface, borderBottom: `1px solid ${C.line2}` }}>
      <td style={{ padding: '7px 12px 7px 30px', position: 'sticky', left: 0, zIndex: 2, background: C.surface, minWidth: 200, maxWidth: 200, borderRight: `1px solid ${C.line2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasChildren ? (
            <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.ink3, flexShrink: 0 }}>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: cat.cor || C.ink3, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, color: C.ink2 }}>{cat.nome}</span>
          {hasChildren && (
            <span style={{ fontSize: 10, color: C.ink3, background: C.line2, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>
              {cat.subcategorias.length}
            </span>
          )}
        </div>
      </td>
      {MESES.map((_, i) => (
        <CelulaTriple key={i} previsto={prevPorMes[i+1]||0} realizado={realPorMes[i+1]||0}
          obraId={obraId} onSavePrevisto={(val) => onSave(cat.id, i+1, val)} />
      ))}
      <td style={{ padding: '5px 10px', borderLeft: `2px solid ${C.line}`, minWidth: 90, textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: C.ink3 }}>{brlK(totalPrev)}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{brlK(totalReal)}</div>
      </td>
    </tr>
  )
}

function LinhaCategoria({ cat, prevPorMes, realPorMes, obraId, onSave }) {
  const totalPrev = Object.values(prevPorMes).reduce((s, v) => s + v, 0)
  const totalReal = Object.values(realPorMes).reduce((s, v) => s + v, 0)
  return (
    <tr style={{ background: '#FAFAF8', borderBottom: `1px solid ${C.line2}` }}>
      <td style={{ padding: '6px 12px 6px 56px', position: 'sticky', left: 0, zIndex: 2, background: '#FAFAF8', minWidth: 200, maxWidth: 200, borderRight: `1px solid ${C.line2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: cat.cor || C.ink3, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.ink3 }}>{cat.nome}</span>
        </div>
      </td>
      {MESES.map((_, i) => (
        <CelulaTriple key={i} previsto={prevPorMes[i+1]||0} realizado={realPorMes[i+1]||0}
          obraId={obraId} onSavePrevisto={(val) => onSave(cat.id, i+1, val)} />
      ))}
      <td style={{ padding: '5px 10px', borderLeft: `2px solid ${C.line}`, background: '#FAFAF8', minWidth: 90, textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: C.ink3 }}>{brlK(totalPrev)}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.ink2 }}>{brlK(totalReal)}</div>
      </td>
    </tr>
  )
}

export default function PrevistoRealizado() {
  const qc = useQueryClient()
  const [obraId, setObraId] = useState(null)
  const [ano, setAno]       = useState(ANO_ATUAL)
  const [periodoTipo, setPeriodoTipo] = useState('ano') // 'ano' | 'custom'
  const [dataInicio, setDataInicio] = useState(`${ANO_ATUAL}-01-01`)
  const [dataFim, setDataFim]       = useState(`${ANO_ATUAL}-12-31`)
  const [expanded, setExpanded] = useState({})
  const [toast, setToast]   = useState(null)

  function selecionarAno(a) {
    setAno(a)
    setDataInicio(`${a}-01-01`)
    setDataFim(`${a}-12-31`)
    setPeriodoTipo('ano')
  }

  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: async () => { const r = await obrasService.list(); return r.dados || [] },
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['financeiro_categorias'],
    queryFn: () => categoriasService.list(),
  })

  const { data: orcamentos = [] } = useQuery({
    queryKey: ['financeiro_orcamentos', obraId, ano],
    queryFn: () => orcamentosService.listByObraAno(obraId, ano),
  })

  const inicioEfetivo = periodoTipo === 'ano' ? `${ano}-01-01` : dataInicio
  const fimEfetivo    = periodoTipo === 'ano' ? `${ano}-12-31` : dataFim

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['financeiro_lancamentos_pxr', obraId, ano, inicioEfetivo, fimEfetivo],
    queryFn: () => lancamentosFinService.list({
      status: 'pago',
      inicio: inicioEfetivo,
      fim:    fimEfetivo,
      ...(obraId ? { obra_id: obraId } : {}),
    }),
  })

  const notify = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const mutSave = useMutation({
    mutationFn: ({ catId, mes, valor }) => orcamentosService.upsert(obraId, catId, ano, mes, valor),
    onSuccess: () => qc.invalidateQueries(['financeiro_orcamentos', obraId, ano]),
    onError: (e) => notify(e.message, 'error'),
  })

  const prevMap = useMemo(() => {
    const m = {}
    // Ordena por ano crescente para que o ano mais recente sobrescreva anos anteriores
    const sorted = [...orcamentos].sort((a, b) => (a.ano || 0) - (b.ano || 0))
    sorted.forEach(o => {
      if (!m[o.categoria_id]) m[o.categoria_id] = {}
      m[o.categoria_id][o.mes] = Number(o.valor)
    })
    return m
  }, [orcamentos])

  const realMap = useMemo(() => {
    const m = {}
    lancamentos.forEach(l => {
      if (!l.categoria_id) return
      const d = l.data_pagamento || l.data_vencimento
      if (!d) return
      const mes = parseInt(d.slice(5, 7), 10)
      if (!m[l.categoria_id]) m[l.categoria_id] = {}
      m[l.categoria_id][mes] = (m[l.categoria_id][mes] || 0) + Number(l.valor)
    })
    return m
  }, [lancamentos])

  const tree = useMemo(() => buildCategoriasTree(categorias), [categorias])
  const treeDespesas = tree.filter(c => c.tipo === 'despesa')
  const treeReceitas = tree.filter(c => c.tipo === 'receita')

  const { totalPrevisto, totalRealizado } = useMemo(() => {
    // Usa prevMap para evitar dupla contagem quando há orçamentos de múltiplos anos
    let tp = 0
    Object.values(prevMap).forEach(mesMapa => {
      Object.values(mesMapa).forEach(v => { tp += v })
    })
    const tr = lancamentos.reduce((s, l) => s + Number(l.valor), 0)
    return { totalPrevisto: tp, totalRealizado: tr }
  }, [prevMap, lancamentos])

  function getConsolidadoNode(node) {
    const filhos = node.subcategorias || []
    if (filhos.length === 0) return { prev: prevMap[node.id] || {}, real: realMap[node.id] || {} }
    const prev = {}, real = {}
    filhos.forEach(f => {
      const { prev: pf, real: rf } = getConsolidadoNode(f)
      MESES.forEach((_, i) => {
        const m = i + 1
        prev[m] = (prev[m] || 0) + (pf[m] || 0)
        real[m] = (real[m] || 0) + (rf[m] || 0)
      })
    })
    return { prev, real }
  }

  function getConsolidado(cat) {
    return getConsolidadoNode(cat)
  }

  function toggleExpand(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  const obraNome = obras.find(o => o.id === obraId)?.nome

  function renderGrupo(cats, tipo) {
    if (cats.length === 0) return null
    const tipoColor = tipo === 'despesa' ? C.bad : C.ok
    return (
      <>
        <tr>
          <td colSpan={14} style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800,
            letterSpacing: '.12em', color: tipoColor,
            background: tipo === 'despesa' ? '#FFF8F7' : '#F0FBF4',
            borderBottom: `1px solid ${C.line}` }}>
            {tipo === 'despesa' ? 'DESPESAS' : 'RECEITAS'}
          </td>
        </tr>
        {cats.map(cat => {
          const isExp = expanded[cat.id] !== undefined ? expanded[cat.id] : (cat.subcategorias?.length > 0)
          const { prev, real } = getConsolidado(cat)
          return (
            <React.Fragment key={cat.id}>
              <LinhaGrupo cat={cat} isExpanded={isExp} onToggle={() => toggleExpand(cat.id)}
                prevPorMes={prev} realPorMes={real} obraId={obraId}
                onSave={(catId, mes, val) => mutSave.mutate({ catId, mes, valor: val })} />
              {isExp && (cat.subcategorias || []).map(sub => {
                const isExpSub = expanded[sub.id] !== undefined ? expanded[sub.id] : (sub.subcategorias?.length > 0)
                const { prev: sp, real: sr } = getConsolidado(sub)
                return (
                  <React.Fragment key={sub.id}>
                    <LinhaSubcat cat={sub} isExpanded={isExpSub} onToggle={() => toggleExpand(sub.id)}
                      prevPorMes={sp} realPorMes={sr}
                      obraId={obraId}
                      onSave={(catId, mes, val) => mutSave.mutate({ catId, mes, valor: val })} />
                    {isExpSub && (sub.subcategorias || []).map(leaf => (
                      <LinhaCategoria key={leaf.id} cat={leaf}
                        prevPorMes={prevMap[leaf.id] || {}} realPorMes={realMap[leaf.id] || {}}
                        obraId={obraId}
                        onSave={(catId, mes, val) => mutSave.mutate({ catId, mes, valor: val })} />
                    ))}
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          )
        })}
      </>
    )
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Obra */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={15} color={C.ink3} />
          <select value={obraId ?? ''} onChange={e => setObraId(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: '7px 28px 7px 12px', borderRadius: 8, border: `1px solid ${C.line}`,
              fontSize: 13, color: C.ink, background: C.surface, cursor: 'pointer', outline: 'none' }}>
            <option value="">Todas as obras</option>
            {obras.filter(o => o.status !== 'concluida').map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
            {obras.filter(o => o.status === 'concluida').length > 0 && (
              <optgroup label="Concluidas">
                {obras.filter(o => o.status === 'concluida').map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Tipo de período */}
        <select value={periodoTipo} onChange={e => setPeriodoTipo(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.line}`,
            fontSize: 13, color: C.ink, background: C.surface, cursor: 'pointer', outline: 'none' }}>
          <option value="ano">Ano inteiro</option>
          <option value="custom">Período personalizado</option>
        </select>

        {/* Se modo 'ano': seletor de ano + atalhos */}
        {periodoTipo === 'ano' && (
          <>
            <select value={ano} onChange={e => selecionarAno(Number(e.target.value))}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.line}`,
                fontSize: 13, color: C.ink, background: C.surface, cursor: 'pointer', outline: 'none' }}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
              {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => (
                <button key={a} onClick={() => selecionarAno(a)}
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${ano === a ? C.navy : C.line}`,
                    background: ano === a ? C.navy : C.surface,
                    color: ano === a ? '#fff' : C.ink2 }}>
                  {a === ANO_ATUAL - 1 ? '← ' + a : a === ANO_ATUAL + 1 ? a + ' →' : String(a)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Se modo 'custom': inputs de data */}
        {periodoTipo === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 12, color: C.ink3 }}>até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        )}

        {!obraId && (
          <span style={{ fontSize: 11, color: C.warn, background: '#FDF3DF',
            border: `1px solid ${C.warn}`, borderRadius: 6, padding: '4px 10px' }}>
            Selecione uma obra para editar o previsto
          </span>
        )}
      </div>

      <Banner totalPrevisto={totalPrevisto} totalRealizado={totalRealizado} obraNome={obraNome} ano={ano} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, fontSize: 10, color: C.ink3 }}>
        <span>Linha sup: Previsto (clique p/ editar) | Linha inf: Realizado | Barra: execucao</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setExpanded(Object.fromEntries(categorias.map(c => [c.id, true])))}
            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface, cursor: 'pointer', fontSize: 11, color: C.ink2 }}>
            Expandir tudo
          </button>
          <button onClick={() => setExpanded(Object.fromEntries(categorias.map(c => [c.id, false])))}
            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface, cursor: 'pointer', fontSize: 11, color: C.ink2 }}>
            Recolher tudo
          </button>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, padding: '60px 20px', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
          Carregando...
        </div>
      ) : categorias.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, padding: '60px 20px', textAlign: 'center', color: C.ink3, fontSize: 14 }}>
          Nenhuma categoria cadastrada.{' '}
          <a href="#/cadastros/financeiro" style={{ color: C.navy, fontWeight: 600 }}>Cadastre aqui.</a>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <thead>
              <tr style={{ background: C.navy }}>
                <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, fontWeight: 700,
                  color: 'rgba(255,255,255,.65)', position: 'sticky', left: 0, zIndex: 3,
                  background: C.navy, minWidth: 200 }}>CATEGORIA</th>
                {MESES.map((m, i) => (
                  <th key={i} style={{ textAlign: 'center', padding: '9px 4px', fontSize: 10, fontWeight: 700,
                    color: 'rgba(255,255,255,.65)', minWidth: 90 }}>{m}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '9px 10px', fontSize: 10, fontWeight: 700,
                  color: C.amber, minWidth: 90, borderLeft: `2px solid rgba(255,255,255,.15)` }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {renderGrupo(treeDespesas, 'despesa')}
              {renderGrupo(treeReceitas, 'receita')}
            </tbody>
          </table>
        </div>
      )}

      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  )
}
