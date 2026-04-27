// Financeiro — Lançamentos
// Design: KPI strip + tabela com ícones + filtros + modal novo lançamento
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lancamentosFinService, categoriasService, contasService, centrosCustoService } from '@/services/financeiroService'
import { contatosService } from '@/services/contatosService'
import useAuthStore from '@/store/authStore'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

function brl(n) {
  const abs = Math.abs(n)
  return (n < 0 ? '−' : '') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function brlK(n) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1_000) return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000).toFixed(0) + 'k'
  return brl(n)
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

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

function StatusPill({ status }) {
  const map = {
    agendado:  { label: 'Agendado',  bg: '#E8F0FB', fg: '#2D5FA0' },
    pago:      { label: 'Pago',      bg: '#E4F1E8', fg: '#3D7A50' },
    pendente:  { label: 'Pendente',  bg: '#FDF3DF', fg: '#8A6210' },
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

// Filter dropdown
function FilterField({ label, value, onChange, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface2, cursor: 'pointer', position: 'relative' }}>
      <span style={{ fontSize: 10, color: C.ink3, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      <select value={value} onChange={onChange} style={{ border: 'none', background: 'transparent', color: C.ink, fontSize: 12, fontWeight: 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', padding: 0 }}>
        {children}
      </select>
    </div>
  )
}

// Modal novo / editar lançamento
const EMPTY_FORM = { descricao: '', valor: '', tipo: 'despesa', categoria_id: '', conta_id: '', data_vencimento: '', data_pagamento: '', status: 'pendente', numero_documento: '', observacao: '', contato_id: '', centro_custo_id: '', parcela_numero: '', parcela_total: '' }

function LancamentoModal({ open, onClose, onSave, form, setForm, saving, editId, categorias, contas, contatos, centrosCusto }) {
  if (!open) return null
  const catsFiltradas = categorias.filter(c => !form.tipo || c.tipo === form.tipo)
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 640, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}` }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>FINANCEIRO · {editId ? 'EDITAR' : 'NOVO'}</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, fontWeight: 500, margin: '4px 0 0', color: C.ink }}>
              {editId ? 'Editar lançamento' : form.tipo === 'receita' ? 'Nova entrada' : 'Nova saída'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={onSave}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '62vh', overflowY: 'auto' }}>
            {/* Tipo toggle */}
            {!editId && (
              <div style={{ display: 'flex', gap: 6, padding: 4, background: C.surface2, borderRadius: 10 }}>
                {[['despesa', '↓ Saída / Despesa'], ['receita', '↑ Entrada / Receita']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tipo: val, categoria_id: '' }))}
                    style={{ flex: 1, padding: '9px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', background: form.tipo === val ? (val === 'receita' ? '#E4F1E8' : '#FBE9E4') : 'transparent', color: form.tipo === val ? (val === 'receita' ? '#3D7A50' : '#B84A33') : C.ink2 }}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <Field label="Descrição *">
                <input style={inp()} placeholder="Ex: Cimento Votorantim 200 sacos" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
              </Field>
              <Field label="Valor (R$) *">
                <input type="number" step="0.01" min="0" style={{ ...inp(), width: 140 }} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Vencimento *">
                <input type="date" style={inp()} value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} required />
              </Field>
              <Field label="Pagamento">
                <input type="date" style={inp()} value={form.data_pagamento} onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} />
              </Field>
              <Field label="Status">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="agendado">Agendado</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Categoria">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                  <option value="">Sem categoria</option>
                  {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                </select>
              </Field>
              <Field label="Conta">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.conta_id} onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))}>
                  <option value="">Selecionar</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Contato">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.contato_id} onChange={e => setForm(f => ({ ...f, contato_id: e.target.value }))}>
                  <option value="">Nenhum</option>
                  {contatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Centro de Custo">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.centro_custo_id} onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))}>
                  <option value="">Nenhum</option>
                  {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Nº Documento">
                <input style={inp()} placeholder="NF, Boleto, TED..." value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Parcela nº">
                <input type="number" min="1" style={inp()} placeholder="1" value={form.parcela_numero} onChange={e => setForm(f => ({ ...f, parcela_numero: e.target.value }))} />
              </Field>
              <Field label="de total">
                <input type="number" min="1" style={inp()} placeholder="1" value={form.parcela_total} onChange={e => setForm(f => ({ ...f, parcela_total: e.target.value }))} />
              </Field>
            </div>

            <Field label="Observação">
              <input style={inp()} value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
            </Field>
          </div>

          <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: C.surface2 }}>
            <button type="button" onClick={onClose} style={ghostBtnS()}>Cancelar</button>
            <button type="submit" disabled={saving} style={amberBtnS()}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar lançamento'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
function inp() { return { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' } }
function ghostBtnS() { return { background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' } }
function amberBtnS() { return { background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' } }

// Paginação simples
function Pager({ page, total, perPage, onPage }) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null
  return (
    <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface2 }}>
      <div style={{ fontSize: 11, color: C.ink3 }}>
        Mostrando {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} de {total} lançamentos
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <PBtn active={false} onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PBtn>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
          <PBtn key={p} active={p === page} onClick={() => onPage(p)}>{p}</PBtn>
        ))}
        <PBtn active={false} onClick={() => onPage(page + 1)} disabled={page === pages}>›</PBtn>
      </div>
    </div>
  )
}

function PBtn({ children, active, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ minWidth: 28, height: 28, padding: '0 8px', fontSize: 11, fontWeight: 600, border: `1px solid ${active ? C.navy : C.line}`, background: active ? C.navy : C.surface, color: active ? '#FFF' : disabled ? C.ink3 : C.ink2, borderRadius: 6, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}

const PER_PAGE = 15

// ── Main page ──────────────────────────────────────────────────────
export default function Lancamentos() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')
  const canEdit   = isAdmin() || hasPermission('financeiro', 'editar')
  const canDelete = isAdmin() || hasPermission('financeiro', 'excluir')
  const queryClient = useQueryClient()

  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [page, setPage]     = useState(1)
  const [filtros, setFiltros] = useState({ tipo: '', status: '', conta_id: '', inicio: '', fim: '' })

  // ── Queries (com cache) ──────────────────────────────────────────
  const { data: categorias = [] } = useQuery({ queryKey: ['fin-categorias'], queryFn: () => categoriasService.list(), staleTime: 5 * 60 * 1000 })
  const { data: contas = [] }     = useQuery({ queryKey: ['fin-contas'],     queryFn: () => contasService.list(),    staleTime: 5 * 60 * 1000 })
  const { data: contatos = [] }   = useQuery({ queryKey: ['contatos'],       queryFn: () => contatosService.list(),  staleTime: 5 * 60 * 1000 })
  const { data: centrosCusto = [] } = useQuery({ queryKey: ['fin-centros-custo'], queryFn: () => centrosCustoService.list(), staleTime: 5 * 60 * 1000 })

  const { data: lancamentos = [], isFetching: loading } = useQuery({
    queryKey: ['fin-lancamentos', filtros],
    queryFn: () => lancamentosFinService.list(filtros),
  })

  // ── Mutations ────────────────────────────────────────────────────
  const invalidateLanc = () => queryClient.invalidateQueries({ queryKey: ['fin-lancamentos'] })

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => id ? lancamentosFinService.update(id, payload) : lancamentosFinService.create(payload),
    onSuccess: (_, { id }) => { toast.success(id ? 'Atualizado!' : 'Criado!'); setOpen(false); invalidateLanc() },
    onError: (err) => toast.error(err.message),
  })

  const pagarMutation = useMutation({
    mutationFn: (id) => lancamentosFinService.marcarPago(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['fin-lancamentos'] })
      const prevEntries = queryClient.getQueriesData({ queryKey: ['fin-lancamentos'] })
      queryClient.setQueriesData({ queryKey: ['fin-lancamentos'] }, (old) =>
        old?.map(l => l.id === id ? { ...l, status: 'pago', data_pagamento: new Date().toISOString().slice(0, 10) } : l)
      )
      return { prevEntries }
    },
    onError: (err, _id, ctx) => { toast.error(err.message); ctx?.prevEntries?.forEach(([key, data]) => queryClient.setQueryData(key, data)) },
    onSuccess: () => toast.success('Marcado como pago ✅'),
    onSettled: () => invalidateLanc(),
  })

  const excluirMutation = useMutation({
    mutationFn: (id) => lancamentosFinService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['fin-lancamentos'] })
      const prevEntries = queryClient.getQueriesData({ queryKey: ['fin-lancamentos'] })
      queryClient.setQueriesData({ queryKey: ['fin-lancamentos'] }, (old) =>
        old?.filter(l => l.id !== id)
      )
      return { prevEntries }
    },
    onError: (err, _id, ctx) => { toast.error(err.message); ctx?.prevEntries?.forEach(([key, data]) => queryClient.setQueryData(key, data)) },
    onSuccess: () => toast.success('Excluído'),
    onSettled: () => invalidateLanc(),
  })

  const totais = useMemo(() => lancamentos.reduce((acc, l) => {
    const v = parseFloat(l.valor)
    if (l.tipo === 'receita') { acc.receitas += v; if (l.status === 'pendente') acc.aReceber += v }
    else { acc.despesas += v; if (l.status === 'pendente') acc.aPagar += v }
    return acc
  }, { receitas: 0, despesas: 0, aReceber: 0, aPagar: 0 }), [lancamentos])

  const paged = useMemo(() => lancamentos.slice((page - 1) * PER_PAGE, page * PER_PAGE), [lancamentos, page])

  function abrir(tipo = 'despesa', l = null) {
    if (l) {
      setForm({ descricao: l.descricao, valor: String(l.valor), tipo: l.tipo, categoria_id: l.categoria_id || '', conta_id: l.conta_id || '', data_vencimento: l.data_vencimento || '', data_pagamento: l.data_pagamento || '', status: l.status, numero_documento: l.numero_documento || '', observacao: l.observacao || '', contato_id: l.contato_id || '', centro_custo_id: l.centro_custo_id || '', parcela_numero: l.parcela_numero ? String(l.parcela_numero) : '', parcela_total: l.parcela_total ? String(l.parcela_total) : '' })
      setEditId(l.id)
    } else { setForm({ ...EMPTY_FORM, tipo }); setEditId(null) }
    setOpen(true)
  }

  function salvar(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.data_vencimento) { toast.error('Descrição, valor e vencimento obrigatórios'); return }
    const payload = { descricao: form.descricao, valor: parseFloat(form.valor), tipo: form.tipo, categoria_id: form.categoria_id || null, conta_id: form.conta_id || null, data_vencimento: form.data_vencimento, data_pagamento: form.data_pagamento || (form.status === 'pago' ? new Date().toISOString().slice(0, 10) : null), status: form.status, numero_documento: form.numero_documento || null, observacao: form.observacao || null, contato_id: form.contato_id || null, centro_custo_id: form.centro_custo_id || null, parcela_numero: form.parcela_numero ? parseInt(form.parcela_numero) : null, parcela_total: form.parcela_total ? parseInt(form.parcela_total) : null }
    saveMutation.mutate({ id: editId, payload })
  }

  function marcarPago(id) { pagarMutation.mutate(id) }

  function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    excluirMutation.mutate(id)
  }

  function limpar() { setFiltros({ tipo: '', status: '', conta_id: '', inicio: '', fim: '' }); setPage(1) }
  const saving = saveMutation.isPending
  const hoje = new Date().toISOString().slice(0, 10)
  const saldo = totais.receitas - totais.despesas

  return (
    <div className="page-enter" style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Lançamentos</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Histórico completo de entradas e saídas · {lancamentos.length} registros</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/financeiro/painel" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}>
            ← Painel
          </Link>
          {canCreate && (
            <button onClick={() => abrir('despesa')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Novo lançamento
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <FinKPI label="Entradas no período" value={brlK(totais.receitas)} delta={totais.receitas > 0 ? '+ok' : '—'} sub={`${lancamentos.filter(l => l.tipo === 'receita').length} lançamentos`} sparkData={[120,180,240,310,380,420,460,500,540,580,600,totais.receitas/1000].filter(v=>v>0)} sparkColor={C.ok} />
        <FinKPI label="Saídas no período" value={brlK(totais.despesas)} delta={totais.despesas > 0 ? '−' : '—'} deltaColor={C.bad} sub={`${lancamentos.filter(l => l.tipo === 'despesa').length} lançamentos`} sparkData={[80,90,110,130,160,180,210,240,260,280,300,totais.despesas/1000].filter(v=>v>0)} sparkColor={C.bad} />
        <FinKPI label="Saldo do período" value={brlK(Math.abs(saldo))} delta={saldo >= 0 ? 'positivo' : 'negativo'} deltaColor={saldo >= 0 ? C.ok : C.bad} sub={`Margem ${totais.receitas > 0 ? ((saldo/totais.receitas)*100).toFixed(1) : 0}%`} sparkData={[40,90,130,180,220,240,250,260,280,300,310,saldo/1000].filter(v=>v>0)} sparkColor={C.navy} />
        <FinKPI label="Pendentes" value={`${lancamentos.filter(l => l.status === 'pendente').length}`} delta={`${lancamentos.filter(l => l.status === 'pendente' && l.data_vencimento < hoje).length} vencidos`} deltaColor={C.bad} sub={brlK(totais.aPagar) + ' aguardando'} sparkData={[3,3,4,4,3,3,3,3,3,3,3,lancamentos.filter(l=>l.status==='pendente').length]} sparkColor="#B8862C" />
      </div>

      {/* Filter row */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FilterField label="Tipo" value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}>
          <option value="">Todos</option>
          <option value="receita">Entradas</option>
          <option value="despesa">Saídas</option>
        </FilterField>
        <FilterField label="Status" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
          <option value="">Todos</option>
          <option value="agendado">Agendado</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </FilterField>
        <FilterField label="Conta" value={filtros.conta_id} onChange={e => setFiltros(f => ({ ...f, conta_id: e.target.value }))}>
          <option value="">Todas as contas</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </FilterField>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface2 }}>
          <span style={{ fontSize: 10, color: C.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>De</span>
          <input type="date" value={filtros.inicio} onChange={e => setFiltros(f => ({ ...f, inicio: e.target.value }))} style={{ border: 'none', background: 'transparent', fontSize: 12, color: C.ink, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface2 }}>
          <span style={{ fontSize: 10, color: C.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Até</span>
          <input type="date" value={filtros.fim} onChange={e => setFiltros(f => ({ ...f, fim: e.target.value }))} style={{ border: 'none', background: 'transparent', fontSize: 12, color: C.ink, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => load(filtros)} style={{ fontSize: 11, padding: '7px 14px', background: C.navy, border: 'none', color: '#FFF', cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit', fontWeight: 600 }}>Filtrar</button>
        <button onClick={limpar} style={{ fontSize: 11, padding: '7px 14px', background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit', fontWeight: 500 }}>Limpar</button>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '8px 0' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.line2}`, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                <div style={{ flex: 2, height: 12, borderRadius: 6, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                <div style={{ flex: 1, height: 10, borderRadius: 6, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.1}s` }} />
                <div style={{ width: 60, height: 10, borderRadius: 6, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.2}s` }} />
                <div style={{ width: 80, height: 20, borderRadius: 4, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.3}s` }} />
              </div>
            ))}
          </div>
        ) : lancamentos.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: C.ink3 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>Nenhum lançamento encontrado</div>
            <div style={{ fontSize: 12 }}>Tente ajustar os filtros ou crie um novo lançamento.</div>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: C.surface2 }}>
                <tr style={{ color: C.ink3, textAlign: 'left' }}>
                  <th style={TH()}>Data</th>
                  <th style={TH()}>Descrição</th>
                  <th style={TH()}>Categoria</th>
                  <th style={TH()}>Conta</th>
                  <th style={TH()}>Doc.</th>
                  <th style={{ ...TH(), textAlign: 'right' }}>Valor</th>
                  <th style={TH()}>Status</th>
                  <th style={TH()} />
                </tr>
              </thead>
              <tbody>
                {paged.map(l => {
                  const isReceita = l.tipo === 'receita'
                  const vencido = l.status === 'pendente' && l.data_vencimento < hoje
                  const cat = l.financeiro_categorias
                  return (
                    <tr key={l.id} style={{ borderTop: `1px solid ${C.line2}`, background: vencido ? '#FFF5F3' : 'transparent' }}>
                      <td style={TD()}>
                        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.ink2 }}>
                          {fmtDate(l.data_vencimento)}
                        </div>
                        {vencido && <div style={{ fontSize: 10, color: C.bad, fontWeight: 600, marginTop: 1 }}>vencido</div>}
                      </td>
                      <td style={TD()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: isReceita ? '#E4F1E8' : '#F9ECE7', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: isReceita ? '#3D7A50' : '#B84A33' }}>
                            {isReceita ? '↑' : '↓'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: C.ink }}>{l.descricao}</div>
                            {l.contatos?.nome && <div style={{ fontSize: 10, color: C.ink3, marginTop: 1 }}>👤 {l.contatos.nome}</div>}
                            {l.numero_documento && <div style={{ fontSize: 10, color: C.ink3, marginTop: 1, fontFamily: '"JetBrains Mono", monospace' }}>{l.numero_documento}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={TD()}>
                        {cat ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.cor || C.ink3, flexShrink: 0 }} />
                            <span style={{ color: C.ink2 }}>{cat.icone} {cat.nome}</span>
                          </span>
                        ) : <span style={{ color: C.ink3, fontSize: 11 }}>—</span>}
                      </td>
                      <td style={TD()}><span style={{ fontSize: 11, color: C.ink2 }}>{l.financeiro_contas?.nome || '—'}</span></td>
                      <td style={TD()}><span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: C.ink3 }}>{l.numero_documento || '—'}</span></td>
                      <td style={{ ...TD(), textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: isReceita ? C.ok : C.ink, fontVariantNumeric: 'tabular-nums' }}>
                          {isReceita ? '+' : '−'}{brl(l.valor)}
                        </span>
                      </td>
                      <td style={TD()}><StatusPill status={l.status} /></td>
                      <td style={TD()}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {canEdit && (l.status === 'pendente' || l.status === 'agendado') && (
                            <button onClick={() => marcarPago(l.id)} title="Marcar pago" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 13 }}>✓</button>
                          )}
                          {canEdit && (
                            <button onClick={() => abrir(l.tipo, l)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>✎</button>
                          )}
                          {canDelete && (
                            <button onClick={() => excluir(l.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>×</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pager page={page} total={lancamentos.length} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </div>

      {/* Modal */}
      <LancamentoModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={salvar}
        form={form}
        setForm={setForm}
        saving={saving}
        editId={editId}
        categorias={categorias}
        contas={contas}
        contatos={contatos}
        centrosCusto={centrosCusto}
      />
    </div>
  )
}

function TH() { return { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px', color: C.ink3, whiteSpace: 'nowrap' } }
function TD() { return { padding: '12px 12px', verticalAlign: 'middle', color: C.ink } }
