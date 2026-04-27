// Financeiro — Extrato & Conciliação Bancária
// Design: conta switcher + banner navy + tabela com saldo rolante + import CSV
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { extratoService, lancamentosFinService, contasService } from '@/services/financeiroService'
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
function makeHash(contaId, data, descricao, valor) {
  return btoa(unescape(encodeURIComponent(`${contaId}${data}${descricao}${valor}`))).slice(0, 64)
}

const BANCO_CORES = {
  'banco do brasil': { bgCor: '#0033A0', cor: '#FFE600' },
  'itaú': { bgCor: '#EC7000', cor: '#FFF' },
  'itau': { bgCor: '#EC7000', cor: '#FFF' },
  'bradesco': { bgCor: '#CC092F', cor: '#FFF' },
  'santander': { bgCor: '#EC0000', cor: '#FFF' },
  'caixa': { bgCor: '#005CA9', cor: '#FFF' },
  'nubank': { bgCor: '#820AD1', cor: '#FFF' },
  'inter': { bgCor: '#FF7A00', cor: '#FFF' },
}

function getBankColors(banco = '') {
  const lower = banco.toLowerCase()
  const key = Object.keys(BANCO_CORES).find(k => lower.includes(k))
  return BANCO_CORES[key] || { bgCor: C.navy, cor: '#FFF' }
}
function getBankInitials(banco = '') {
  return banco.split(' ').filter(w => /[A-Za-z]/.test(w[0])).map(w => w[0]).join('').slice(0, 2).toUpperCase() || banco.slice(0, 2).toUpperCase()
}

// Linha do extrato
function ExtratoLinha({ linha, onConciliar, onDesconciliar, onIgnorar, onRemover, canEdit }) {
  const isCredito = linha.tipo === 'credito'
  const bgMap = { conciliado: '#F0FAF3', ignorado: 'transparent', nao_conciliado: 'transparent' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.line2}`, background: bgMap[linha.status] || 'transparent', opacity: linha.status === 'ignorado' ? 0.5 : 1 }}>
      {/* Data */}
      <div style={{ width: 72, flexShrink: 0 }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.ink2 }}>{fmtDate(linha.data)}</div>
      </div>

      {/* Tipo icon */}
      <div style={{ width: 28, height: 28, borderRadius: 6, background: isCredito ? '#E4F1E8' : '#F9ECE7', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: isCredito ? C.ok : C.bad }}>
        {isCredito ? '↑' : '↓'}
      </div>

      {/* Descrição */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linha.descricao}</div>
        {linha.financeiro_lancamentos && (
          <div style={{ fontSize: 10, color: C.ok, marginTop: 1 }}>✓ Conciliado: {linha.financeiro_lancamentos.descricao}</div>
        )}
      </div>

      {/* Status badge */}
      {linha.status === 'conciliado' && (
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#E4F1E8', color: C.ok, fontWeight: 600 }}>Conciliado</span>
      )}
      {linha.status === 'ignorado' && (
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: C.surface2, color: C.ink3, fontWeight: 600 }}>Ignorado</span>
      )}

      {/* Valor */}
      <div style={{ width: 120, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isCredito ? C.ok : C.bad, flexShrink: 0 }}>
        {isCredito ? '+' : '−'}{brl(linha.valor)}
      </div>

      {/* Ações */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {linha.status === 'nao_conciliado' && (
            <>
              <ActionBtn title="Conciliar" color={C.navy} onClick={() => onConciliar(linha)}>🔗</ActionBtn>
              <ActionBtn title="Ignorar" color={C.ink3} onClick={() => onIgnorar(linha.id)}>🚫</ActionBtn>
            </>
          )}
          {linha.status === 'conciliado' && (
            <ActionBtn title="Desfazer conciliação" color="#B8862C" onClick={() => onDesconciliar(linha)}>↩</ActionBtn>
          )}
          <ActionBtn title="Remover" color={C.bad} onClick={() => onRemover(linha.id)}>×</ActionBtn>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ title, color, onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 28, height: 28, borderRadius: 6, background: hov ? color + '18' : 'transparent', border: 'none', cursor: 'pointer', color, display: 'grid', placeItems: 'center', fontSize: 13, transition: 'background .15s' }}>
      {children}
    </button>
  )
}

// Modal linha manual
function LinhaModal({ open, onClose, onSave, form, setForm, saving }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 480, boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}`, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>EXTRATO · MANUAL</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 20, fontWeight: 500, margin: '4px 0 0', color: C.ink }}>Adicionar linha manual</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4 }}>×</button>
        </div>
        <form onSubmit={onSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Data *">
              <input type="date" style={inp()} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
            </Field>
            <Field label="Tipo">
              <select style={{ ...inp(), cursor: 'pointer' }} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="debito">Débito (saída)</option>
                <option value="credito">Crédito (entrada)</option>
              </select>
            </Field>
          </div>
          <Field label="Descrição *">
            <input style={inp()} placeholder="Descrição da movimentação" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
          </Field>
          <Field label="Valor (R$) *">
            <input type="number" step="0.01" min="0" style={inp()} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
          </Field>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={ghostBtnS()}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...amberBtnS(), flex: 1 }}>{saving ? 'Adicionando...' : 'Adicionar linha'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal conciliação
function ConciliacaoModal({ open, onClose, onConciliar, linha, pendentes }) {
  const [lancSel, setLancSel] = useState('')
  if (!open || !linha) return null

  const isCredito = linha.tipo === 'credito'
  const tipoLanc = isCredito ? 'receita' : 'despesa'
  const sugestoes = pendentes.filter(l => l.tipo === tipoLanc && Math.abs(parseFloat(l.valor) - parseFloat(linha.valor)) < 0.01)
  const demais = pendentes.filter(l => l.tipo === tipoLanc)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 540, maxHeight: '90vh', overflow: 'hidden auto', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}` }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>EXTRATO · CONCILIAÇÃO</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 20, fontWeight: 500, margin: '4px 0 0', color: C.ink }}>Conciliar com lançamento</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Linha do extrato */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, marginBottom: 8 }}>LINHA DO EXTRATO</div>
            <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, color: C.ink }}>{linha.descricao}</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{fmtDate(linha.data)}</div>
              </div>
              <span style={{ fontWeight: 700, color: isCredito ? C.ok : C.bad }}>{isCredito ? '+' : '−'}{brl(linha.valor)}</span>
            </div>
          </div>

          {/* Sugestões */}
          {sugestoes.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, marginBottom: 8 }}>SUGESTÕES (mesmo valor)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sugestoes.map(l => (
                  <button key={l.id} onClick={() => setLancSel(String(l.id))} style={{ padding: '10px 14px', border: `1px solid ${lancSel == l.id ? C.navy : C.line}`, borderRadius: 8, background: lancSel == l.id ? '#EEF2F8' : C.surface2, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{l.descricao}</div>
                      <div style={{ fontSize: 10, color: C.ink3, marginTop: 1 }}>Venc. {fmtDate(l.data_vencimento)}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: C.ink }}>{brl(l.valor)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, marginBottom: 8 }}>OU SELECIONE MANUALMENTE</div>
            <select style={{ ...inp(), cursor: 'pointer' }} value={lancSel} onChange={e => setLancSel(e.target.value)}>
              <option value="">Selecionar lançamento...</option>
              {demais.map(l => <option key={l.id} value={l.id}>{fmtDate(l.data_vencimento)} | {l.descricao} | {brl(l.valor)}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={ghostBtnS()}>Cancelar</button>
            <button onClick={() => { onConciliar(lancSel); setLancSel('') }} disabled={!lancSel} style={{ ...amberBtnS(), flex: 1, opacity: lancSel ? 1 : 0.5 }}>✓ Conciliar</button>
          </div>
        </div>
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

// ── Main page ──────────────────────────────────────────────────────
export default function Extrato() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')
  const canEdit   = isAdmin() || hasPermission('financeiro', 'editar')

  const [contas, setContas]           = useState([])
  const [contaId, setContaId]         = useState('')
  const [extrato, setExtrato]         = useState([])
  const [pendentes, setPendentes]     = useState([])
  const [loading, setLoading]         = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('nao_conciliado')

  const [addOpen, setAddOpen]         = useState(false)
  const [addForm, setAddForm]         = useState({ data: '', descricao: '', valor: '', tipo: 'debito' })
  const [saving, setSaving]           = useState(false)

  const [concOpen, setConcOpen]       = useState(false)
  const [linhaConc, setLinhaConc]     = useState(null)

  const [csvText, setCsvText]         = useState('')
  const [csvPreview, setCsvPreview]   = useState(null)

  useEffect(() => { contasService.list().then(setContas) }, [])
  useEffect(() => { if (contaId) { loadExtrato(); loadPendentes() } }, [contaId, filtroStatus])

  async function loadExtrato() {
    setLoading(true)
    try { setExtrato(await extratoService.list(contaId, filtroStatus || null)) }
    catch (err) { toast.error(err.message) }
    setLoading(false)
  }

  async function loadPendentes() {
    try { setPendentes(await lancamentosFinService.list({ status: 'pendente' })) }
    catch {}
  }

  const saldo = extrato.reduce((acc, l) => acc + (l.tipo === 'credito' ? +l.valor : -l.valor), 0)
  const entradas = extrato.filter(l => l.tipo === 'credito').reduce((s, l) => s + +l.valor, 0)
  const saidas = extrato.filter(l => l.tipo === 'debito').reduce((s, l) => s + +l.valor, 0)
  const contaSel = contas.find(c => c.id === contaId)

  async function salvarLinha(e) {
    e.preventDefault()
    if (!contaId) { toast.error('Selecione uma conta'); return }
    setSaving(true)
    try {
      const valor = parseFloat(addForm.valor)
      await extratoService.addLinha({ conta_id: contaId, data: addForm.data, descricao: addForm.descricao, valor: Math.abs(valor), tipo: addForm.tipo, hash_linha: makeHash(contaId, addForm.data, addForm.descricao, valor) })
      toast.success('Linha adicionada!'); setAddOpen(false); setAddForm({ data: '', descricao: '', valor: '', tipo: 'debito' }); loadExtrato()
    } catch (err) { toast.error(err.code === '23505' ? 'Linha duplicada' : err.message) }
    setSaving(false)
  }

  function abrirConc(linha) { setLinhaConc(linha); setConcOpen(true) }

  async function conciliar(lancSel) {
    if (!lancSel) { toast.error('Selecione um lançamento'); return }
    try {
      await extratoService.conciliar(linhaConc.id, parseInt(lancSel), linhaConc.data)
      toast.success('Conciliado! ✅'); setConcOpen(false); setLinhaConc(null); loadExtrato(); loadPendentes()
    } catch (err) { toast.error(err.message) }
  }

  async function desconciliar(linha) {
    if (!confirm('Desfazer conciliação?')) return
    try { await extratoService.desconciliar(linha.id, linha.lancamento_id); toast.success('Desfeita'); loadExtrato(); loadPendentes() }
    catch (err) { toast.error(err.message) }
  }

  async function ignorar(id) {
    try { await extratoService.ignorar(id); loadExtrato() }
    catch (err) { toast.error(err.message) }
  }

  async function remover(id) {
    if (!confirm('Remover esta linha?')) return
    try { await extratoService.remove(id); loadExtrato() }
    catch (err) { toast.error(err.message) }
  }

  function processarCSV() {
    if (!csvText.trim()) { toast.error('Cole o conteúdo CSV'); return }
    if (!contaId) { toast.error('Selecione uma conta'); return }
    const linhas = csvText.trim().split('\n').filter(l => l.trim())
    const ok = [], erros = []
    linhas.forEach((linha, i) => {
      const sep = linha.includes(';') ? ';' : ','
      const [rawData, desc, rawVal] = linha.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''))
      if (!rawData || !desc || !rawVal) { erros.push(`Linha ${i + 1}: incompleta`); return }
      const valor = parseFloat(rawVal.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
      if (isNaN(valor)) { erros.push(`Linha ${i + 1}: valor inválido`); return }
      let data = rawData
      if (rawData.includes('/')) { const [d, m, y] = rawData.split('/'); data = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { erros.push(`Linha ${i + 1}: data inválida`); return }
      ok.push({ data, descricao: desc, valor: Math.abs(valor), tipo: valor >= 0 ? 'credito' : 'debito' })
    })
    setCsvPreview({ ok, erros })
  }

  async function importarCSV() {
    if (!csvPreview?.ok?.length) return
    try {
      const rows = csvPreview.ok.map(l => ({ conta_id: contaId, ...l, hash_linha: makeHash(contaId, l.data, l.descricao, l.valor) }))
      const inserted = await extratoService.importarLinhas(rows)
      toast.success(`${inserted.length} linhas importadas!`); setCsvText(''); setCsvPreview(null); loadExtrato()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: C.ink3, letterSpacing: '0.12em', fontWeight: 600 }}>EXTRATO BANCÁRIO</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em', color: C.ink }}>
            {contaSel ? contaSel.nome : 'Selecione uma conta'}
          </h1>
          {contaSel?.banco && (
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 4, fontFamily: '"JetBrains Mono", monospace' }}>
              {contaSel.banco}{contaSel.agencia ? ` · AG ${contaSel.agencia}` : ''}{contaSel.conta ? ` · CC ${contaSel.conta}` : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/financeiro/painel" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}>
            ← Painel
          </Link>
          {canCreate && contaId && (
            <button onClick={() => setAddOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Linha manual
            </button>
          )}
        </div>
      </div>

      {/* Conta switcher */}
      {contas.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {contas.map(c => {
            const { bgCor, cor } = getBankColors(c.banco)
            const initials = getBankInitials(c.banco)
            const isSelected = c.id === contaId
            return (
              <button key={c.id} onClick={() => setContaId(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit', background: isSelected ? C.surface : 'transparent', border: `1px solid ${isSelected ? C.navy : C.line}`, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: isSelected ? `0 0 0 1px ${C.navy} inset` : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: bgCor, color: cor, fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{initials}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: C.ink2, fontWeight: 600 }}>{c.banco || c.nome}</div>
                  <div style={{ fontSize: 10, color: C.ink3 }}>{c.nome}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Coluna principal */}
        <div>
          {/* Saldo banner */}
          {contaId && (
            <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '22px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: 14 }}>
              <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO DO EXTRATO</div>
                <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6, color: saldo >= 0 ? '#8ED1A5' : '#F4B19C' }}>
                  {brl(Math.abs(saldo))}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{extrato.length} linha{extrato.length !== 1 ? 's' : ''} no período</div>
              </div>
              <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>ENTRADAS</div>
                <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: '#8ED1A5' }}>+{brl(entradas)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{extrato.filter(l => l.tipo === 'credito').length} créditos</div>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SAÍDAS</div>
                <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: '#F4B19C' }}>−{brl(saidas)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{extrato.filter(l => l.tipo === 'debito').length} débitos</div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <select value={contaId} onChange={e => setContaId(e.target.value)} style={{ flex: 1, padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
              <option value="">Selecione uma conta</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 180, padding: '7px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: C.surface2, color: C.ink, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
              <option value="">Todos os status</option>
              <option value="nao_conciliado">Não conciliados</option>
              <option value="conciliado">Conciliados</option>
              <option value="ignorado">Ignorados</option>
            </select>
          </div>

          {/* Linhas do extrato */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
            {!contaId ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: C.ink3 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🏦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>Selecione uma conta acima</div>
                <div style={{ fontSize: 12 }}>O extrato bancário será exibido aqui.</div>
              </div>
            ) : loading ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: C.ink3 }}>Carregando extrato...</div>
            ) : extrato.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: C.ink3 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>Nenhuma linha encontrada</div>
                <div style={{ fontSize: 12 }}>Importe o extrato em CSV ou adicione linhas manualmente.</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '10px 16px', background: C.surface2, borderBottom: `1px solid ${C.line}`, display: 'flex', gap: 12, fontSize: 11, color: C.ink3 }}>
                  <span style={{ width: 72 }}>Data</span>
                  <span style={{ width: 28 }} />
                  <span style={{ flex: 1 }}>Histórico</span>
                  <span style={{ width: 120, textAlign: 'right' }}>Valor</span>
                  {canEdit && <span style={{ width: 60 }} />}
                </div>
                {extrato.map(linha => (
                  <ExtratoLinha
                    key={linha.id}
                    linha={linha}
                    onConciliar={abrirConc}
                    onDesconciliar={desconciliar}
                    onIgnorar={ignorar}
                    onRemover={remover}
                    canEdit={canEdit}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Coluna lateral: importar CSV */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>📥 Importar CSV</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>Cole o extrato do banco em formato CSV</div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, color: C.ink3, background: C.surface2, borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
                <strong style={{ color: C.ink2 }}>Formato:</strong><br />
                <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>AAAA-MM-DD;Descrição;Valor</code><br />
                Negativos = débito · separador <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>;</code> ou <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>,</code>
              </div>
              <textarea
                style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, padding: '10px 12px', fontSize: 11, fontFamily: '"JetBrains Mono", monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: C.ink }}
                rows={7}
                placeholder={'2024-01-15;Pag. cimento;-1500.00\n2024-01-16;Recebimento;5000.00'}
                value={csvText}
                onChange={e => { setCsvText(e.target.value); setCsvPreview(null) }}
              />
              <button style={{ ...amberBtnS(), width: '100%', justifyContent: 'center' }} onClick={processarCSV}>Processar CSV</button>

              {csvPreview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {csvPreview.erros.length > 0 && (
                    <div style={{ fontSize: 11, color: C.bad, background: '#FBE9E4', borderRadius: 8, padding: '8px 12px' }}>
                      {csvPreview.erros.join(' · ')}
                    </div>
                  )}
                  {csvPreview.ok.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: C.ok, background: '#E4F1E8', borderRadius: 8, padding: '8px 12px' }}>
                        ✓ {csvPreview.ok.length} linhas prontas para importação
                      </div>
                      <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {csvPreview.ok.slice(0, 4).map((l, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.ink2, borderBottom: `1px solid ${C.line2}`, paddingBottom: 4 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{l.descricao}</span>
                            <span style={{ color: l.tipo === 'credito' ? C.ok : C.bad, fontWeight: 600 }}>
                              {l.tipo === 'credito' ? '+' : '−'}{brl(l.valor)}
                            </span>
                          </div>
                        ))}
                        {csvPreview.ok.length > 4 && <div style={{ fontSize: 10, color: C.ink3 }}>+ {csvPreview.ok.length - 4} mais...</div>}
                      </div>
                      <button style={{ ...amberBtnS(), width: '100%', justifyContent: 'center' }} onClick={importarCSV}>
                        📥 Importar {csvPreview.ok.length} linhas
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status resumo */}
          {contaId && extrato.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Resumo conciliação</div>
              {[
                { label: 'Conciliadas', count: extrato.filter(l => l.status === 'conciliado').length, color: C.ok },
                { label: 'Pendentes', count: extrato.filter(l => l.status === 'nao_conciliado').length, color: '#B8862C' },
                { label: 'Ignoradas', count: extrato.filter(l => l.status === 'ignorado').length, color: C.ink3 },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: C.ink2 }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <LinhaModal open={addOpen} onClose={() => setAddOpen(false)} onSave={salvarLinha} form={addForm} setForm={setAddForm} saving={saving} />
      <ConciliacaoModal open={concOpen} onClose={() => { setConcOpen(false); setLinhaConc(null) }} onConciliar={conciliar} linha={linhaConc} pendentes={pendentes} />
    </div>
  )
}
