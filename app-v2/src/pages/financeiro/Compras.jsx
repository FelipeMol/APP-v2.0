// Financeiro — Compras
// Registro de compras/despesas com formulário baseado no Relatório de Pagamentos por Vencimento
import { useMemo, useState, useRef, useEffect } from 'react'
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
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

// ── Extrai forma de pagamento do campo observacao ──────────────────
const FORMAS = [
  { val: 'boleto',         label: 'Boleto',          icon: '🏦' },
  { val: 'pix',            label: 'Pix',             icon: '⚡' },
  { val: 'cartao_credito', label: 'Cartão de crédito', icon: '💳' },
  { val: 'cartao_debito',  label: 'Cartão de débito',  icon: '💳' },
  { val: 'cheque',         label: 'Cheque',          icon: '📄' },
  { val: 'dinheiro',       label: 'Dinheiro',        icon: '💵' },
  { val: 'transferencia',  label: 'Transferência',   icon: '🔄' },
]

function getFormaLabel(val) {
  return FORMAS.find(f => f.val === val)?.label || val || '—'
}
function encodeObservacao(forma, obs) {
  const parts = []
  if (forma) parts.push(`[FORMA:${forma}]`)
  if (obs?.trim()) parts.push(obs.trim())
  return parts.join('\n')
}
function decodeObservacao(raw) {
  if (!raw) return { forma: '', obs: '' }
  const match = raw.match(/^\[FORMA:([^\]]+)\]/)
  if (!match) return { forma: '', obs: raw }
  const forma = match[1]
  const obs = raw.slice(match[0].length).replace(/^\n/, '')
  return { forma, obs }
}

// ── Status pill ───────────────────────────────────────────────────
const STATUS_MAP = {
  pago:      { label: 'Pago',      bg: '#E4F1E8', fg: '#3D7A50' },
  pendente:  { label: 'Pendente',  bg: '#FDF3DF', fg: '#8A6210' },
  agendado:  { label: 'Agendado',  bg: '#EDF2FB', fg: '#2D5FA0' },
  cancelado: { label: 'Cancelado', bg: '#F3F0EA', fg: '#7F8A99' },
}
function StatusPill({ status }) {
  const m = STATUS_MAP[status] || STATUS_MAP.pendente
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: m.bg, color: m.fg, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

// ── Combobox de contatos ──────────────────────────────────────────
function ContatoCombobox({ value, onChange, contatos, queryClient: qc }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newNome, setNewNome] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)
  const selected = contatos.find(c => c.id === value)

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contatos.slice(0, 80)
    return contatos.filter(c => c.nome.toLowerCase().includes(q)).slice(0, 80)
  }, [contatos, query])

  async function handleCreate() {
    const nome = newNome.trim()
    if (!nome) return
    try {
      const novo = await contatosService.create({ nome, tipo: 'fornecedor', documento: 'nome:' + nome.toLowerCase(), ativo: true })
      if (qc) qc.invalidateQueries({ queryKey: ['contatos'] })
      onChange(novo.id)
      setNewNome(''); setCreating(false); setOpen(false)
    } catch (err) { toast.error('Erro ao criar contato: ' + err.message) }
  }

  const inpStyle = { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ ...inpStyle, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '0 10px' }}
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50) }}>
        <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? C.ink : C.ink3, padding: '9px 0' }}>
          {selected ? selected.nome : 'Selecionar fornecedor...'}
        </span>
        {selected
          ? <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }} style={{ background: 'none', border: 'none', color: C.ink3, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 0', flexShrink: 0 }}>×</button>
          : <span style={{ color: C.ink3, fontSize: 11, flexShrink: 0 }}>▾</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, maxHeight: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.line2}` }}>
            <input ref={inputRef} type="text" placeholder="Pesquisar..." value={query} onChange={e => setQuery(e.target.value)}
              style={{ ...inpStyle, padding: '6px 10px', fontSize: 12 }} autoComplete="off" />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ padding: '6px 10px', fontSize: 12, color: C.ink3, cursor: 'pointer', fontStyle: 'italic' }}
              onClick={() => { onChange(''); setQuery(''); setOpen(false) }}>Nenhum</div>
            {filtered.map(c => (
              <div key={c.id} onClick={() => { onChange(c.id); setQuery(''); setOpen(false) }}
                style={{ padding: '7px 10px', fontSize: 12, color: C.ink, cursor: 'pointer', background: c.id === value ? '#F0EDE7' : 'transparent' }}
                onMouseEnter={e => { if (c.id !== value) e.currentTarget.style.background = C.surface2 }}
                onMouseLeave={e => { if (c.id !== value) e.currentTarget.style.background = 'transparent' }}>
                {c.nome}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '10px', fontSize: 12, color: C.ink3, textAlign: 'center' }}>Nenhum resultado</div>}
          </div>
          <div style={{ borderTop: `1px solid ${C.line2}`, padding: '6px 10px' }}>
            {creating ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" placeholder="Nome do novo fornecedor" value={newNome} onChange={e => setNewNome(e.target.value)}
                  style={{ ...inpStyle, padding: '6px 10px', fontSize: 12, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } if (e.key === 'Escape') setCreating(false) }}
                  autoFocus />
                <button type="button" onClick={handleCreate} style={{ padding: '6px 12px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Criar</button>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: '6px 10px', background: C.surface2, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setCreating(true); setNewNome(query) }}
                style={{ width: '100%', padding: '6px 10px', background: 'transparent', border: `1px dashed ${C.line}`, borderRadius: 6, fontSize: 12, color: C.ink2, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                + Cadastrar novo fornecedor{query ? ` "${query}"` : ''}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Label helper ──────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.ink2, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
      {children}{required && <span style={{ color: C.bad, marginLeft: 2 }}>*</span>}
    </label>
  )
}
function Field({ label, required, children, half }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}

const inp = { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

// ── Formulário de lançamento de compra ────────────────────────────
const EMPTY = {
  contato_id: '',
  descricao: '',
  categoria_id: '',
  valor: '',
  forma_pagamento: '',
  conta_id: '',
  condicao: 'avista',
  parcela_numero: '',
  parcela_total: '',
  numero_documento: '',
  data_vencimento: '',
  status: 'pendente',
  data_pagamento: '',
  centro_custo_id: '',
  observacao: '',
}

function FormCompra({ initialData, categorias, contas, centrosCusto, contatos, queryClient: qc, onSuccess, onCancel }) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState(() => {
    if (!initialData) return { ...EMPTY }
    const { forma, obs } = decodeObservacao(initialData.observacao)
    return {
      contato_id: initialData.contato_id || '',
      descricao: initialData.descricao || '',
      categoria_id: initialData.categoria_id ? String(initialData.categoria_id) : '',
      valor: initialData.valor ? String(initialData.valor) : '',
      forma_pagamento: forma,
      conta_id: initialData.conta_id ? String(initialData.conta_id) : '',
      condicao: (initialData.parcela_total && initialData.parcela_total > 1) ? 'parcelado' : 'avista',
      parcela_numero: initialData.parcela_numero ? String(initialData.parcela_numero) : '',
      parcela_total: initialData.parcela_total ? String(initialData.parcela_total) : '',
      numero_documento: initialData.numero_documento || '',
      data_vencimento: initialData.data_vencimento || '',
      status: initialData.status || 'pendente',
      data_pagamento: initialData.data_pagamento || '',
      centro_custo_id: initialData.centro_custo_id ? String(initialData.centro_custo_id) : '',
      observacao: obs,
    }
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        tipo: 'despesa',
        descricao: form.descricao.trim(),
        valor: parseFloat(form.valor) || 0,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        conta_id: form.conta_id ? parseInt(form.conta_id) : null,
        contato_id: form.contato_id || null,
        data_vencimento: form.data_vencimento || null,
        data_pagamento: form.status === 'pago' ? (form.data_pagamento || null) : null,
        status: form.status,
        numero_documento: form.numero_documento.trim() || null,
        observacao: encodeObservacao(form.forma_pagamento, form.observacao) || null,
        centro_custo_id: form.centro_custo_id ? parseInt(form.centro_custo_id) : null,
        parcela_numero: form.condicao === 'parcelado' && form.parcela_numero ? parseInt(form.parcela_numero) : null,
        parcela_total: form.condicao === 'parcelado' && form.parcela_total ? parseInt(form.parcela_total) : null,
      }
      if (isEdit) return lancamentosFinService.update(initialData.id, payload)
      return lancamentosFinService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras'] })
      qc.invalidateQueries({ queryKey: ['fin-lancamentos'] })
      toast.success(isEdit ? 'Compra atualizada!' : 'Compra registrada!')
      onSuccess()
    },
    onError: err => toast.error('Erro: ' + err.message),
  })

  const catsDespesa = useMemo(() => categorias.filter(c => c.tipo === 'despesa' || !c.tipo), [categorias])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.descricao.trim()) { toast.error('Informe a descrição'); return }
    if (!form.valor || parseFloat(form.valor) <= 0) { toast.error('Informe o valor'); return }
    saveMut.mutate()
  }

  const secTitle = { fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12, marginTop: 4 }
  const divider = { borderTop: `1px solid ${C.line2}`, margin: '16px 0' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Valor em destaque */}
      <div style={{ background: '#FDF1EE', border: `2px solid #F0BDB0`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.bad, flexShrink: 0 }}>R$</span>
        <input
          type="number" step="0.01" min="0" placeholder="0,00"
          value={form.valor} onChange={e => set('valor', e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 36, fontWeight: 700, color: C.bad, fontFamily: '"Libre Caslon Text", Georgia, serif', letterSpacing: '-0.02em', minWidth: 0 }}
        />
      </div>

      {/* Status */}
      <div style={{ marginBottom: 18 }}>
        <Label>Status</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { val: 'pendente', label: 'Em aberto', bg: '#FDF3DF', fg: '#8A6210', ab: '#E8A628', af: '#17273C' },
            { val: 'pago',     label: 'Pago',      bg: '#E4F1E8', fg: '#3D7A50', ab: '#3D7A50', af: '#FFFFFF' },
            { val: 'agendado', label: 'Agendado',  bg: '#EDF2FB', fg: '#2D5FA0', ab: '#2D5FA0', af: '#FFFFFF' },
          ].map(o => (
            <button key={o.val} type="button" onClick={() => set('status', o.val)}
              style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${form.status === o.val ? o.ab : 'transparent'}`, background: form.status === o.val ? o.ab : o.bg, color: form.status === o.val ? o.af : o.fg, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={divider} />
      <p style={secTitle}>Identificação</p>

      {/* Grid 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>

        {/* Favorecido — span full */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Favorecido (Fornecedor)</Label>
          <ContatoCombobox value={form.contato_id} onChange={v => set('contato_id', v)} contatos={contatos} queryClient={qc} />
        </div>

        {/* Descrição — span full */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label required>Descrição</Label>
          <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3} placeholder="Ex: 60 SACOS DE CIMENTO CP3 MIZU"
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>

        {/* Categoria */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Categoria</Label>
          <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} style={inp}>
            <option value="">— Selecionar —</option>
            {catsDespesa.map(c => (
              <option key={c.id} value={c.id}>{c.parent_id ? '  ' : ''}{c.nome}</option>
            ))}
          </select>
        </div>

      </div>

      <div style={divider} />
      <p style={secTitle}>Pagamento</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>

        {/* Forma de pagamento */}
        <div>
          <Label>Forma de pagamento</Label>
          <select value={form.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} style={inp}>
            <option value="">— Selecionar —</option>
            {FORMAS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
          </select>
        </div>

        {/* Conta */}
        <div>
          <Label>Conta</Label>
          <select value={form.conta_id} onChange={e => set('conta_id', e.target.value)} style={inp}>
            <option value="">— Selecionar —</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Condição */}
        <div>
          <Label>Condição</Label>
          <select value={form.condicao} onChange={e => set('condicao', e.target.value)} style={inp}>
            <option value="avista">À Vista</option>
            <option value="parcelado">Parcelado</option>
          </select>
        </div>

        {/* Parcelas — só aparece se parcelado */}
        {form.condicao === 'parcelado' && (
          <>
            <div>
              <Label>Parcela Nº</Label>
              <input type="number" min="1" placeholder="Ex: 1" value={form.parcela_numero} onChange={e => set('parcela_numero', e.target.value)} style={inp} />
            </div>
            <div>
              <Label>Total de parcelas</Label>
              <input type="number" min="1" placeholder="Ex: 3" value={form.parcela_total} onChange={e => set('parcela_total', e.target.value)} style={inp} />
            </div>
          </>
        )}

        {/* Nº Documento */}
        <div>
          <Label>Nº Documento / NF</Label>
          <input type="text" placeholder="Ex: NF 251153" value={form.numero_documento} onChange={e => set('numero_documento', e.target.value)} style={inp} />
        </div>

        {/* Data de vencimento */}
        <div>
          <Label>Data de Vencimento</Label>
          <input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} style={inp} />
        </div>

        {/* Data de pagamento — só se pago */}
        {form.status === 'pago' && (
          <div>
            <Label>Data de Pagamento</Label>
            <input type="date" value={form.data_pagamento} onChange={e => set('data_pagamento', e.target.value)} style={inp} />
          </div>
        )}

      </div>

      <div style={divider} />
      <p style={secTitle}>Centro de Custo & Rateio</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Centro de Custo</Label>
          <select value={form.centro_custo_id} onChange={e => set('centro_custo_id', e.target.value)} style={inp}>
            <option value="">— Selecionar —</option>
            {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <p style={{ fontSize: 11, color: C.ink3, marginTop: 4, marginBottom: 0 }}>
            Para rateio entre múltiplos centros de custo, use a página de Lançamentos.
          </p>
        </div>

        {/* Observação */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Observação</Label>
          <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)} rows={2} placeholder="Observações adicionais..."
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saveMut.isPending}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMut.isPending ? 0.7 : 1 }}>
          {saveMut.isPending ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Registrar compra')}
        </button>
      </div>
    </form>
  )
}

// ── Drawer lateral ────────────────────────────────────────────────
function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* overlay */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(23,39,60,0.35)', zIndex: 400, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s' }} />
      {/* painel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '95vw',
        background: C.surface, zIndex: 401, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.ink3, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function Compras() {
  const qc = useQueryClient()
  const { hasPermission, isAdmin, isSuperAdmin } = useAuthStore()
  const canEdit = isAdmin() || isSuperAdmin() || hasPermission('financeiro', 'editar')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroMes, setFiltroMes] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroBusca, setFiltroBusca] = useState('')

  // Dados
  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['compras', filtroMes, filtroStatus],
    queryFn: async () => {
      const [ano, mes] = filtroMes.split('-')
      const inicio = `${ano}-${mes}-01`
      const ultimo = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0]
      const filtros = { tipo: 'despesa', inicio, fim: ultimo }
      if (filtroStatus) filtros.status = filtroStatus
      return lancamentosFinService.list(filtros)
    },
    staleTime: 30_000,
  })
  const { data: categorias = [] } = useQuery({ queryKey: ['fin-categorias'], queryFn: () => categoriasService.list(), staleTime: 5 * 60 * 1000 })
  const { data: contas = [] }     = useQuery({ queryKey: ['fin-contas'],     queryFn: () => contasService.list(),    staleTime: 5 * 60 * 1000 })
  const { data: centrosCusto = [] } = useQuery({ queryKey: ['fin-centros-custo'], queryFn: () => centrosCustoService.list(), staleTime: 5 * 60 * 1000 })
  const { data: contatos = [] }   = useQuery({ queryKey: ['contatos'],       queryFn: () => contatosService.list(),  staleTime: 5 * 60 * 1000 })

  const deleteMut = useMutation({
    mutationFn: id => lancamentosFinService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); toast.success('Removido.') },
    onError: err => toast.error('Erro: ' + err.message),
  })
  const pagarMut = useMutation({
    mutationFn: id => lancamentosFinService.marcarPago(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); toast.success('Marcado como pago!') },
    onError: err => toast.error('Erro: ' + err.message),
  })

  // Filtragem local por busca
  const items = useMemo(() => {
    const q = filtroBusca.trim().toLowerCase()
    if (!q) return lancamentos
    return lancamentos.filter(l =>
      (l.descricao || '').toLowerCase().includes(q) ||
      (l.contatos?.nome || '').toLowerCase().includes(q) ||
      (l.numero_documento || '').toLowerCase().includes(q)
    )
  }, [lancamentos, filtroBusca])

  // KPIs
  const kpis = useMemo(() => {
    const total   = items.reduce((s, l) => s + (+l.valor || 0), 0)
    const pago    = items.filter(l => l.status === 'pago').reduce((s, l) => s + (+l.valor || 0), 0)
    const aberto  = items.filter(l => l.status !== 'pago' && l.status !== 'cancelado').reduce((s, l) => s + (+l.valor || 0), 0)
    const vencidos = items.filter(l => {
      if (l.status === 'pago' || l.status === 'cancelado') return false
      if (!l.data_vencimento) return false
      return l.data_vencimento < new Date().toISOString().split('T')[0]
    }).length
    return { total, pago, aberto, vencidos }
  }, [items])

  function openNew() { setEditItem(null); setDrawerOpen(true) }
  function openEdit(item) { setEditItem(item); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false); setEditItem(null) }

  // Gerar lista de meses (12 meses para trás + atual + 3 à frente)
  const meses = useMemo(() => {
    const lista = []
    const now = new Date()
    for (let i = -12; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      lista.push({ val, label })
    }
    return lista
  }, [])

  const hoje = new Date().toISOString().split('T')[0]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.ink, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>Compras</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.ink3 }}>Registro e acompanhamento de compras e despesas</p>
        </div>
        {canEdit && (
          <button onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova compra
          </button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total do período', value: brl(kpis.total), color: C.ink },
          { label: 'Pago',             value: brl(kpis.pago),  color: C.ok },
          { label: 'Em aberto',        value: brl(kpis.aberto), color: '#8A6210' },
          { label: 'Vencidos',         value: kpis.vencidos + ' lançamento(s)', color: kpis.vencidos > 0 ? C.bad : C.ink3 },
        ].map(k => (
          <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value="">Todos os status</option>
          <option value="pendente">Em aberto</option>
          <option value="pago">Pago</option>
          <option value="agendado">Agendado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <input type="text" placeholder="Buscar por descrição ou fornecedor..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', minWidth: 240, flex: 1 }} />
        <span style={{ fontSize: 12, color: C.ink3, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{items.length} registro(s)</span>
      </div>

      {/* Tabela */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Cabeçalho da tabela */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px 120px 120px 110px 80px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface2 }}>
          {['Vencimento', 'Favorecido / Descrição', 'Categoria', 'Forma Pgto', 'Conta', 'Valor', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {isLoading && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🛒</div>
            <p style={{ margin: 0, fontSize: 14, color: C.ink2, fontWeight: 600 }}>Nenhuma compra encontrada</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.ink3 }}>Clique em "Nova compra" para registrar a primeira</p>
          </div>
        )}

        {items.map((item, idx) => {
          const { forma } = decodeObservacao(item.observacao)
          const isVencido = item.status !== 'pago' && item.status !== 'cancelado' && item.data_vencimento && item.data_vencimento < hoje
          const rowBg = isVencido ? '#FFF8F7' : (idx % 2 === 0 ? C.surface : '#FAFAF8')

          return (
            <div key={item.id}
              style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px 120px 120px 110px 80px', gap: 0, padding: '12px 16px', borderBottom: `1px solid ${C.line2}`, background: rowBg, alignItems: 'center', cursor: 'pointer' }}
              onClick={() => canEdit && openEdit(item)}>

              {/* Vencimento */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: isVencido ? C.bad : C.ink }}>{fmtDate(item.data_vencimento)}</div>
                {item.parcela_total > 1 && (
                  <div style={{ fontSize: 10, color: C.ink3 }}>{item.parcela_numero}/{item.parcela_total} parcelas</div>
                )}
              </div>

              {/* Favorecido + descrição */}
              <div style={{ paddingRight: 8 }}>
                {item.contatos?.nome && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{item.contatos.nome}</div>
                )}
                <div style={{ fontSize: 12, color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.descricao}>{item.descricao}</div>
                {item.numero_documento && <div style={{ fontSize: 10, color: C.ink3 }}>Nº {item.numero_documento}</div>}
              </div>

              {/* Categoria */}
              <div style={{ fontSize: 11, color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.financeiro_categorias?.nome || '—'}
              </div>

              {/* Forma pagamento */}
              <div style={{ fontSize: 11, color: C.ink2 }}>{getFormaLabel(forma)}</div>

              {/* Conta */}
              <div style={{ fontSize: 11, color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.financeiro_contas?.nome || '—'}
              </div>

              {/* Valor */}
              <div style={{ fontSize: 13, fontWeight: 700, color: C.bad }}>{brl(item.valor)}</div>

              {/* Status + ações */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <StatusPill status={item.status} />
                {canEdit && item.status !== 'pago' && item.status !== 'cancelado' && (
                  <button
                    onClick={e => { e.stopPropagation(); pagarMut.mutate(item.id) }}
                    title="Marcar como pago"
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.ok}`, background: 'transparent', color: C.ok, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ✓ Pagar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Total rodapé */}
      {items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '12px 16px', background: C.surface2, border: `1px solid ${C.line}`, borderTop: 'none', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, fontSize: 12 }}>
          <span style={{ color: C.ink3 }}>Pago: <strong style={{ color: C.ok }}>{brl(kpis.pago)}</strong></span>
          <span style={{ color: C.ink3 }}>Em aberto: <strong style={{ color: '#8A6210' }}>{brl(kpis.aberto)}</strong></span>
          <span style={{ color: C.ink3 }}>Total: <strong style={{ color: C.ink }}>{brl(kpis.total)}</strong></span>
        </div>
      )}

      {/* Drawer de lançamento */}
      <Drawer open={drawerOpen} onClose={closeDrawer} title={editItem ? 'Editar compra' : 'Nova compra'}>
        {drawerOpen && (
          <FormCompra
            initialData={editItem}
            categorias={categorias}
            contas={contas}
            centrosCusto={centrosCusto}
            contatos={contatos}
            queryClient={qc}
            onSuccess={closeDrawer}
            onCancel={closeDrawer}
          />
        )}
      </Drawer>
    </div>
  )
}
