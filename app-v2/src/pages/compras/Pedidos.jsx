// Compras — Pedidos de Compra
// Módulo independente para lançamento e acompanhamento de compras de materiais
import { useMemo, useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { comprasPedidosService, comprasItensService } from '@/services/comprasService'
import { contatosService } from '@/services/contatosService'
import { obrasService } from '@/services/obrasService'
import useAuthStore from '@/store/authStore'
import useTenantBranding from '@/hooks/useTenantBranding'
import ComprasPDFDocument from '@/components/compras/ComprasPDFDocument'

// ── Paleta ────────────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Utilidades ────────────────────────────────────────────────────────
function brl(n) {
  const v = parseFloat(n) || 0
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}
function today() {
  return new Date().toISOString().split('T')[0]
}

// ── Status ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  rascunho:  { label: 'Rascunho',   bg: '#E8E2D5', fg: '#7F8A99' },
  confirmado:{ label: 'Confirmado', bg: '#EDF2FB', fg: '#2D5FA0' },
  recebido:  { label: 'Recebido',   bg: '#E4F1E8', fg: '#3D7A50' },
  cancelado: { label: 'Cancelado',  bg: '#F3F0EA', fg: '#7F8A99' },
}
function StatusPill({ status }) {
  const m = STATUS_MAP[status] || STATUS_MAP.recebido
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: m.bg, color: m.fg, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

// ── Unidades comuns na construção ─────────────────────────────────────
const UNIDADES = ['un', 'saco', 'kg', 'g', 't', 'm', 'm²', 'm³', 'litro', 'ml', 'pç', 'cx', 'rolo', 'par', 'jg', 'fardo', 'pacote', 'barra', 'folha', 'dúzia', 'lata', 'galão']

// ── Combobox de contatos ──────────────────────────────────────────────
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

  const inpS = { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ ...inpS, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '0 10px' }}
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
              style={{ ...inpS, padding: '6px 10px', fontSize: 12 }} autoComplete="off" />
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
                  style={{ ...inpS, padding: '6px 10px', fontSize: 12, flex: 1 }}
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

// ── Label / Field helpers ─────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.ink2, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
      {children}{required && <span style={{ color: C.bad, marginLeft: 2 }}>*</span>}
    </label>
  )
}

const inp = { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

// ── Linha de item do pedido ───────────────────────────────────────────
function ItemRow({ item, idx, onChange, onRemove, isLast }) {
  const totalItem = (parseFloat(item.quantidade) || 0) * (parseFloat(item.valor_unitario) || 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 110px 100px 32px', gap: 6, alignItems: 'center', padding: '6px 0', borderBottom: isLast ? 'none' : `1px solid ${C.line2}` }}>
      {/* Descrição */}
      <input
        type="text"
        placeholder="Ex: Cimento CP III MIZU"
        value={item.descricao}
        onChange={e => onChange(idx, 'descricao', e.target.value)}
        style={{ ...inp, padding: '7px 10px', fontSize: 12 }}
      />
      {/* Unidade */}
      <select value={item.unidade} onChange={e => onChange(idx, 'unidade', e.target.value)}
        style={{ ...inp, padding: '7px 6px', fontSize: 12 }}>
        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      {/* Quantidade */}
      <input
        type="number" min="0" step="0.001" placeholder="0"
        value={item.quantidade}
        onChange={e => onChange(idx, 'quantidade', e.target.value)}
        style={{ ...inp, padding: '7px 10px', fontSize: 12, textAlign: 'right' }}
      />
      {/* Valor unitário */}
      <input
        type="number" min="0" step="0.01" placeholder="0,00"
        value={item.valor_unitario}
        onChange={e => onChange(idx, 'valor_unitario', e.target.value)}
        style={{ ...inp, padding: '7px 10px', fontSize: 12, textAlign: 'right' }}
      />
      {/* Total calculado */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, textAlign: 'right', paddingRight: 4, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>
        {brl(totalItem)}
      </div>
      {/* Remover */}
      <button type="button" onClick={() => onRemove(idx)}
        style={{ background: 'none', border: 'none', color: C.ink3, cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4 }}
        onMouseEnter={e => e.currentTarget.style.background = '#FDE8E4'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        title="Remover item">
        ×
      </button>
    </div>
  )
}

// ── Formulário do pedido ──────────────────────────────────────────────
const EMPTY_PEDIDO = { data: today(), contato_id: '', obra_id: '', numero_nf: '', status: 'recebido', observacao: '' }
const EMPTY_ITEM   = { descricao: '', unidade: 'un', quantidade: '', valor_unitario: '' }

function FormPedido({ initialData, obras, contatos, queryClient: qc, onSuccess, onCancel }) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState(() => {
    if (!initialData) return { ...EMPTY_PEDIDO }
    return {
      data:       initialData.data || today(),
      contato_id: initialData.contato_id || '',
      obra_id:    initialData.obra_id ? String(initialData.obra_id) : '',
      numero_nf:  initialData.numero_nf || '',
      status:     initialData.status || 'recebido',
      observacao: initialData.observacao || '',
    }
  })
  const [itens, setItens] = useState(() => {
    if (initialData?.itens?.length) {
      return initialData.itens.map(i => ({
        descricao:      i.descricao,
        unidade:        i.unidade || 'un',
        quantidade:     String(i.quantidade),
        valor_unitario: String(i.valor_unitario),
      }))
    }
    return [{ ...EMPTY_ITEM }]
  })

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function changeItem(idx, key, val) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it))
  }
  function addItem() { setItens(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(idx) { setItens(prev => prev.filter((_, i) => i !== idx)) }

  const totalGeral = useMemo(() =>
    itens.reduce((s, it) => s + (parseFloat(it.quantidade) || 0) * (parseFloat(it.valor_unitario) || 0), 0),
  [itens])

  const saveMut = useMutation({
    mutationFn: async () => {
      const itensValidos = itens.filter(it => it.descricao.trim())
      if (!itensValidos.length) throw new Error('Adicione ao menos um item com descrição')

      const payload = {
        data:       form.data,
        contato_id: form.contato_id || null,
        obra_id:    form.obra_id ? parseInt(form.obra_id) : null,
        numero_nf:  form.numero_nf.trim() || null,
        status:     form.status,
        observacao: form.observacao.trim() || null,
        valor_total: totalGeral,
      }

      let pedido
      if (isEdit) {
        pedido = await comprasPedidosService.update(initialData.id, payload)
      } else {
        pedido = await comprasPedidosService.create(payload)
      }

      await comprasItensService.replaceAll(pedido.id, itensValidos)
      return pedido
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras-pedidos'] })
      toast.success(isEdit ? 'Pedido atualizado!' : 'Pedido registrado!')
      onSuccess()
    },
    onError: err => toast.error('Erro: ' + err.message),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.data) { toast.error('Informe a data'); return }
    saveMut.mutate()
  }

  const secTitle = { fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }
  const divider  = { borderTop: `1px solid ${C.line2}`, margin: '16px 0' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Cabeçalho do pedido */}
      <p style={secTitle}>Dados do Pedido</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px', marginBottom: 4 }}>

        {/* Data */}
        <div>
          <Label required>Data</Label>
          <input type="date" value={form.data} onChange={e => setField('data', e.target.value)} style={inp} />
        </div>

        {/* NF */}
        <div>
          <Label>Nº NF / Documento</Label>
          <input type="text" placeholder="Ex: NF 251153" value={form.numero_nf} onChange={e => setField('numero_nf', e.target.value)} style={inp} />
        </div>

        {/* Fornecedor — span full */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Fornecedor</Label>
          <ContatoCombobox value={form.contato_id} onChange={v => setField('contato_id', v)} contatos={contatos} queryClient={qc} />
        </div>

        {/* Obra — span full */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Obra</Label>
          <select value={form.obra_id} onChange={e => setField('obra_id', e.target.value)} style={inp}>
            <option value="">— Selecionar obra —</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        {/* Status */}
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Status</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { val: 'rascunho',   label: 'Rascunho',   bg: '#F3F0EA', fg: '#7F8A99', ab: '#7F8A99', af: '#fff' },
              { val: 'confirmado', label: 'Confirmado',  bg: '#EDF2FB', fg: '#2D5FA0', ab: '#2D5FA0', af: '#fff' },
              { val: 'recebido',   label: 'Recebido',    bg: '#E4F1E8', fg: '#3D7A50', ab: '#3D7A50', af: '#fff' },
              { val: 'cancelado',  label: 'Cancelado',   bg: '#F3F0EA', fg: '#7F8A99', ab: '#B84A33', af: '#fff' },
            ].map(o => (
              <button key={o.val} type="button" onClick={() => setField('status', o.val)}
                style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${form.status === o.val ? o.ab : 'transparent'}`, background: form.status === o.val ? o.ab : o.bg, color: form.status === o.val ? o.af : o.fg, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div style={divider} />

      {/* Itens */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ ...secTitle, marginBottom: 0, marginTop: 0 }}>Itens da Compra</p>
        <button type="button" onClick={addItem}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Adicionar item
        </button>
      </div>

      {/* Cabeçalho da tabela de itens */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 110px 100px 32px', gap: 6, padding: '0 0 6px', borderBottom: `1px solid ${C.line}`, marginBottom: 4 }}>
        {['Descrição / Material', 'Unidade', 'Quantidade', 'Vl. Unitário', 'Total', ''].map((h, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>

      {/* Linhas de itens */}
      <div style={{ minHeight: 40 }}>
        {itens.map((item, idx) => (
          <ItemRow key={idx} item={item} idx={idx} onChange={changeItem} onRemove={removeItem} isLast={idx === itens.length - 1} />
        ))}
      </div>

      {itens.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
          Nenhum item adicionado. Clique em "Adicionar item".
        </div>
      )}

      {/* Total geral */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `2px solid ${C.line}`, marginTop: 8 }}>
        <span style={{ fontSize: 12, color: C.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total do Pedido</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.navy, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>{brl(totalGeral)}</span>
      </div>

      <div style={divider} />

      {/* Observação */}
      <p style={secTitle}>Observações</p>
      <textarea value={form.observacao} onChange={e => setField('observacao', e.target.value)} rows={2} placeholder="Observações sobre a compra..."
        style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />

      {/* Botões */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saveMut.isPending}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMut.isPending ? 0.7 : 1 }}>
          {saveMut.isPending ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Registrar pedido')}
        </button>
      </div>
    </form>
  )
}

// ── Drawer lateral ────────────────────────────────────────────────────
function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(23,39,60,0.35)', zIndex: 400, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 620, maxWidth: '97vw',
        background: C.surface, zIndex: 401, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.ink3, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Card de itens expandido ───────────────────────────────────────────
function ItensExpand({ itens }) {
  if (!itens || itens.length === 0) return <div style={{ fontSize: 12, color: C.ink3, padding: '8px 16px' }}>Sem itens</div>
  return (
    <div style={{ background: C.surface2, borderTop: `1px solid ${C.line2}`, padding: '10px 16px 10px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 110px 110px', gap: '4px 8px', marginBottom: 6 }}>
        {['Material / Descrição', 'Un.', 'Qtd.', 'Vl. Unitário', 'Total'].map((h, i) => (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {itens.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 110px 110px', gap: '4px 8px', padding: '4px 0', borderTop: i === 0 ? `1px solid ${C.line2}` : 'none' }}>
          <div style={{ fontSize: 12, color: C.ink, fontWeight: 500 }}>{it.descricao}</div>
          <div style={{ fontSize: 11, color: C.ink3, textAlign: 'right' }}>{it.unidade}</div>
          <div style={{ fontSize: 11, color: C.ink2, textAlign: 'right' }}>
            {Number(it.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
          </div>
          <div style={{ fontSize: 11, color: C.ink2, textAlign: 'right' }}>{brl(it.valor_unitario)}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, textAlign: 'right' }}>{brl(it.valor_total)}</div>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────
export default function ComprasPedidos() {
  const qc = useQueryClient()
  const { hasPermission, isAdmin, isSuperAdmin } = useAuthStore()
  const branding = useTenantBranding()
  const canEdit = isAdmin() || isSuperAdmin() || hasPermission('compras', 'editar')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Filtros
  const [filtroMes, setFiltroMes] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroObra, setFiltroObra]     = useState('')
  const [filtroBusca, setFiltroBusca]   = useState('')

  // Dados
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['compras-pedidos', filtroMes, filtroStatus, filtroObra],
    queryFn: async () => {
      const [ano, mes] = filtroMes.split('-')
      const inicio = `${ano}-${mes}-01`
      const fim    = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0]
      const filtros = { inicio, fim }
      if (filtroStatus) filtros.status  = filtroStatus
      if (filtroObra)   filtros.obra_id = parseInt(filtroObra)
      return comprasPedidosService.list(filtros)
    },
    staleTime: 30_000,
  })

  const { data: obrasData = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => obrasService.list().then(r => r.dados || r || []),
    staleTime: 5 * 60_000,
  })
  const { data: contatos = [] } = useQuery({
    queryKey: ['contatos'],
    queryFn: () => contatosService.list(),
    staleTime: 5 * 60_000,
  })

  const deleteMut = useMutation({
    mutationFn: id => comprasPedidosService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras-pedidos'] }); toast.success('Pedido removido.') },
    onError: err => toast.error('Erro: ' + err.message),
  })

  // Busca local
  const items = useMemo(() => {
    const q = filtroBusca.trim().toLowerCase()
    if (!q) return pedidos
    return pedidos.filter(p =>
      (p.contato?.nome || '').toLowerCase().includes(q) ||
      (p.obra?.nome || '').toLowerCase().includes(q) ||
      (p.numero_nf || '').toLowerCase().includes(q) ||
      (p.itens || []).some(it => it.descricao.toLowerCase().includes(q)) ||
      (p.observacao || '').toLowerCase().includes(q)
    )
  }, [pedidos, filtroBusca])

  // KPIs
  const kpis = useMemo(() => {
    const total        = items.reduce((s, p) => s + (+p.valor_total || 0), 0)
    const totalItens   = items.reduce((s, p) => s + (p.itens?.length || 0), 0)
    const fornecedores = new Set(items.filter(p => p.contato_id).map(p => p.contato_id)).size
    const mediaValor   = items.length ? total / items.length : 0
    return { total, totalItens, fornecedores, mediaValor, qtd: items.length }
  }, [items])

  // Lista de meses
  const meses = useMemo(() => {
    const lista = []
    const now = new Date()
    for (let i = -18; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      lista.push({ val, label })
    }
    return lista
  }, [])

  function openNew()    { setEditItem(null); setDrawerOpen(true) }
  function openEdit(p)  { setEditItem(p); setDrawerOpen(true) }
  function closeDrawer(){ setDrawerOpen(false); setEditItem(null) }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Remover este pedido? Esta ação não pode ser desfeita.')) return
    deleteMut.mutate(id)
  }

  const geradoEm = new Date().toLocaleString('pt-BR')
  const periodoLabel = meses.find(m => m.val === filtroMes)?.label || filtroMes

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.ink, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>Compras</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.ink3 }}>Registro e acompanhamento de pedidos de materiais</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Botão exportar PDF */}
          <PDFDownloadLink
            document={
              <ComprasPDFDocument
                pedidos={items}
                empresa={branding.nomeExibicao}
                periodo={periodoLabel}
                geradoEm={geradoEm}
              />
            }
            fileName={`compras_${filtroMes}.pdf`}
            style={{ textDecoration: 'none' }}
          >
            {({ loading }) => (
              <button type="button" disabled={loading || items.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: loading || items.length === 0 ? C.surface2 : C.surface2, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: items.length === 0 ? 0.5 : 1 }}>
                <span style={{ fontSize: 15 }}>⬇</span>
                {loading ? 'Gerando PDF...' : 'Exportar PDF'}
              </button>
            )}
          </PDFDownloadLink>

          {canEdit && (
            <button onClick={openNew}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Novo Pedido
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total do período', value: brl(kpis.total),       color: C.ink },
          { label: 'Pedidos',          value: kpis.qtd + ' pedido(s)', color: C.ink },
          { label: 'Itens comprados',  value: kpis.totalItens + ' iten(s)', color: C.ink2 },
          { label: 'Fornecedores',     value: kpis.fornecedores + ' fornecedor(es)', color: C.ink2 },
        ].map(k => (
          <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>

        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value="">Todas as obras</option>
          {obrasData.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>

        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MAP).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
        </select>

        <input type="text" placeholder="Buscar por fornecedor, material, NF..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
          style={{ padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', minWidth: 260, flex: 1 }} />

        <span style={{ fontSize: 12, color: C.ink3, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{items.length} pedido(s)</span>
      </div>

      {/* Lista de pedidos */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Cabeçalho da tabela */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 160px 1fr 90px 60px 120px 90px 80px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface2 }}>
          {['Data', 'Fornecedor', 'Itens / Obra', 'NF', 'Itens', 'Total', 'Status', 'Ações'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {isLoading && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando...</div>
        )}

        {!isLoading && items.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
            <p style={{ margin: 0, fontSize: 14, color: C.ink2, fontWeight: 600 }}>Nenhum pedido encontrado</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.ink3 }}>Clique em "Novo Pedido" para registrar a primeira compra</p>
          </div>
        )}

        {items.map((pedido, idx) => {
          const expanded = expandedIds.has(pedido.id)
          const rowBg = idx % 2 === 0 ? C.surface : '#FAFAF8'
          const primeiroItem = pedido.itens?.[0]

          return (
            <div key={pedido.id} style={{ borderBottom: `1px solid ${C.line2}` }}>
              {/* Linha principal */}
              <div
                style={{ display: 'grid', gridTemplateColumns: '100px 160px 1fr 90px 60px 120px 90px 80px', gap: 0, padding: '11px 16px', background: rowBg, alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => toggleExpand(pedido.id)}
                onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = rowBg}
              >
                {/* Data */}
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{fmtDate(pedido.data)}</div>

                {/* Fornecedor */}
                <div style={{ fontSize: 12, color: C.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 4 }}>
                  {pedido.contato?.nome || <span style={{ color: C.ink3, fontStyle: 'italic' }}>Sem fornecedor</span>}
                </div>

                {/* Primeiro item + obra */}
                <div style={{ paddingRight: 8 }}>
                  {primeiroItem && (
                    <div style={{ fontSize: 12, color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {primeiroItem.descricao}
                      {pedido.itens.length > 1 && <span style={{ color: C.ink3, fontSize: 11 }}> +{pedido.itens.length - 1} itens</span>}
                    </div>
                  )}
                  {pedido.obra?.nome && (
                    <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>{pedido.obra.nome}</div>
                  )}
                </div>

                {/* NF */}
                <div style={{ fontSize: 11, color: C.ink3 }}>{pedido.numero_nf || '—'}</div>

                {/* Nº de itens */}
                <div style={{ fontSize: 12, color: C.ink2, textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {pedido.itens?.length || 0}
                    <span style={{ fontSize: 9, color: expanded ? C.amber : C.ink3, transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </span>
                </div>

                {/* Total */}
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, fontFamily: '"Libre Caslon Text", Georgia, serif' }}>
                  {brl(pedido.valor_total)}
                </div>

                {/* Status */}
                <div><StatusPill status={pedido.status} /></div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {canEdit && (
                    <button onClick={() => openEdit(pedido)}
                      title="Editar"
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: `1px solid ${C.line}`, background: C.surface2, color: C.ink2, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                      ✏
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={e => handleDelete(e, pedido.id)}
                      title="Excluir"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: `1px solid transparent`, background: 'transparent', color: C.ink3, cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FDE8E4'; e.currentTarget.style.color = C.bad }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.ink3 }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Itens expandidos */}
              {expanded && <ItensExpand itens={pedido.itens} />}
            </div>
          )
        })}
      </div>

      {/* Rodapé totais */}
      {items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 28, padding: '12px 16px', background: C.surface2, border: `1px solid ${C.line}`, borderTop: 'none', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, fontSize: 12 }}>
          <span style={{ color: C.ink3 }}>Pedidos: <strong style={{ color: C.ink }}>{kpis.qtd}</strong></span>
          <span style={{ color: C.ink3 }}>Itens: <strong style={{ color: C.ink }}>{kpis.totalItens}</strong></span>
          <span style={{ color: C.ink3 }}>Total: <strong style={{ color: C.navy, fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 14 }}>{brl(kpis.total)}</strong></span>
        </div>
      )}

      {/* Drawer de lançamento */}
      <Drawer open={drawerOpen} onClose={closeDrawer} title={editItem ? 'Editar Pedido' : 'Novo Pedido de Compra'}>
        {drawerOpen && (
          <FormPedido
            initialData={editItem}
            obras={obrasData}
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
