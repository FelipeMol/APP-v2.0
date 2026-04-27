// Financeiro — Contas Bancárias
// Design: cards com header colorido por banco + saldo banner navy + modal nova conta
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { contasService } from '@/services/financeiroService'
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

// Mapeamento de banco → cores do cartão
const BANCO_CORES = {
  'banco do brasil': { bgCor: '#0033A0', cor: '#FFE600' },
  'itaú':           { bgCor: '#EC7000', cor: '#FFFFFF' },
  'itau':           { bgCor: '#EC7000', cor: '#FFFFFF' },
  'bradesco':       { bgCor: '#CC092F', cor: '#FFFFFF' },
  'santander':      { bgCor: '#EC0000', cor: '#FFFFFF' },
  'caixa':          { bgCor: '#005CA9', cor: '#FFFFFF' },
  'nubank':         { bgCor: '#820AD1', cor: '#FFFFFF' },
  'inter':          { bgCor: '#FF7A00', cor: '#FFFFFF' },
  'sicoob':         { bgCor: '#006E3A', cor: '#FFFFFF' },
  'sicredi':        { bgCor: '#008542', cor: '#FFFFFF' },
}

function getBankColors(banco = '') {
  const lower = banco.toLowerCase()
  const key = Object.keys(BANCO_CORES).find(k => lower.includes(k))
  return BANCO_CORES[key] || { bgCor: C.navy, cor: '#FFFFFF' }
}

function getBankInitials(banco = '') {
  return banco.split(' ').filter(w => /[A-Za-z]/.test(w[0])).map(w => w[0]).join('').slice(0, 2).toUpperCase() || banco.slice(0, 2).toUpperCase()
}

const TIPO_LABEL = { corrente: 'Conta Corrente', poupanca: 'Poupança', investimento: 'Investimento', caixa: 'Caixa' }

const EMPTY = { nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '0' }

// ── Card de conta ─────────────────────────────────────────────────
function ContaCard({ conta, saldo, onEdit, onDelete, canEdit, canDelete }) {
  const { bgCor, cor } = getBankColors(conta.banco)
  const initials = getBankInitials(conta.banco)
  const tipo = TIPO_LABEL[conta.tipo] || conta.tipo

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Bank header */}
      <div style={{ background: bgCor, color: cor, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{conta.banco || conta.nome}</div>
            {(conta.agencia || conta.conta) && (
              <div style={{ fontSize: 10, opacity: 0.8, fontFamily: '"JetBrains Mono", monospace', marginTop: 1 }}>
                {conta.agencia ? `AG ${conta.agencia}` : ''}{conta.agencia && conta.conta ? ' · ' : ''}{conta.conta ? `CC ${conta.conta}` : ''}
              </div>
            )}
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {canEdit && (
              <button onClick={() => onEdit(conta)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: cor, display: 'grid', placeItems: 'center', fontSize: 14 }}>
                ✎
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600 }}>APELIDO</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginTop: 2 }}>{conta.nome}</div>
        </div>

        <div style={{ borderTop: `1px solid ${C.line2}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600 }}>SALDO ATUAL</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 26, fontWeight: 500, color: saldo >= 0 ? C.ink : C.bad, letterSpacing: '-0.01em', marginTop: 3 }}>
            {brl(saldo)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.line2}`, paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} />
            <span style={{ fontSize: 10, color: C.ink2, letterSpacing: '0.04em' }}>Ativa · {tipo}</span>
          </div>
          {canDelete && (
            <button onClick={() => onDelete(conta.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', borderTop: `1px solid ${C.line2}` }}>
        <Link to={`/financeiro/extrato`} style={cardBtn()}>Extrato</Link>
        <Link to="/financeiro/lancamentos" style={{ ...cardBtn(), borderLeft: `1px solid ${C.line2}` }}>Lançar</Link>
      </div>
    </div>
  )
}

function cardBtn() {
  return { flex: 1, padding: '10px 0', background: 'transparent', border: 'none', fontSize: 11, fontWeight: 600, color: C.ink2, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'block', textAlign: 'center' }
}

// Card "adicionar conta"
function AddCard({ onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'transparent', border: '1.5px dashed #C9C2B0', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, minHeight: 260, cursor: 'pointer' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.surface, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontSize: 22, color: C.navy }}>+</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Adicionar conta</div>
      <div style={{ fontSize: 11, color: C.ink3, textAlign: 'center', maxWidth: 180 }}>Cadastre uma nova conta corrente para começar a registrar movimentações.</div>
    </div>
  )
}

// Modal nova / editar conta
function ContaModal({ open, onClose, onSave, form, setForm, saving, editId }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 560, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}` }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>FINANCEIRO · CADASTRO</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, fontWeight: 500, margin: '4px 0 0', color: C.ink }}>{editId ? 'Editar conta' : 'Nova conta bancária'}</h2>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Vincule uma conta para registrar movimentações financeiras.</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <form onSubmit={onSave}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>
            <Field label="Apelido (como aparece no painel) *">
              <input style={inp()} placeholder="Ex: BB Operacional" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </Field>
            <Field label="Banco">
              <input style={inp()} placeholder="Ex: Banco do Brasil" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
              <Field label="Agência">
                <input style={inp()} placeholder="0000-0" value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} />
              </Field>
              <Field label="Conta corrente">
                <input style={inp()} placeholder="00000-0" value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} />
              </Field>
            </div>
            <Field label="Tipo">
              <div style={{ display: 'flex', gap: 6, padding: 3, background: C.surface2, borderRadius: 8 }}>
                {[['corrente', 'Conta Corrente'], ['poupanca', 'Poupança'], ['investimento', 'Investimento']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, tipo: val }))} style={{ flex: 1, padding: '7px 10px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 6, background: form.tipo === val ? C.navy : 'transparent', color: form.tipo === val ? '#FFF' : C.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Saldo inicial (R$)" hint="Use o saldo na data do cadastro para manter o painel consistente.">
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
                <span style={{ padding: '8px 12px', borderRight: `1px solid ${C.line}`, fontSize: 12, color: C.ink3, fontWeight: 600, background: C.surface2 }}>R$</span>
                <input type="number" step="0.01" style={{ ...inp(), border: 'none', borderRadius: 0, flex: 1 }} value={form.saldo_inicial} onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))} />
              </div>
            </Field>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: C.surface2 }}>
            <button type="button" onClick={onClose} style={ghostBtnS()}>Cancelar</button>
            <button type="submit" disabled={saving} style={amberBtnS()}>{saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar conta'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: C.ink3, marginTop: 5, fontStyle: 'italic' }}>{hint}</div>}
    </div>
  )
}
function inp() { return { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' } }
function ghostBtnS() { return { background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' } }
function amberBtnS() { return { background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' } }

// ── Main page ──────────────────────────────────────────────────────
export default function Contas() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')
  const canEdit   = isAdmin() || hasPermission('financeiro', 'editar')
  const canDelete = isAdmin() || hasPermission('financeiro', 'excluir')

  const [contas, setContas]   = useState([])
  const [saldos, setSaldos]   = useState({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await contasService.list()
      setContas(data)
      if (data.length) {
        const map = await contasService.saldos(data.map(c => c.id))
        const comInicial = {}
        data.forEach(c => { comInicial[c.id] = (map[c.id] || 0) + parseFloat(c.saldo_inicial || 0) })
        setSaldos(comInicial)
      }
    } catch { toast.error('Erro ao carregar contas') }
    setLoading(false)
  }

  function abrir(conta = null) {
    if (conta) {
      setForm({ nome: conta.nome, banco: conta.banco || '', agencia: conta.agencia || '', conta: conta.conta || '', tipo: conta.tipo, saldo_inicial: String(conta.saldo_inicial ?? 0) })
      setEditId(conta.id)
    } else {
      setForm(EMPTY); setEditId(null)
    }
    setOpen(true)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Apelido obrigatório'); return }
    setSaving(true)
    try {
      const payload = { ...form, saldo_inicial: parseFloat(form.saldo_inicial) || 0 }
      editId ? await contasService.update(editId, payload) : await contasService.create(payload)
      toast.success(editId ? 'Conta atualizada!' : 'Conta criada!')
      setOpen(false); load()
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir esta conta?')) return
    try { await contasService.remove(id); toast.success('Conta removida'); load() }
    catch (err) { toast.error(err.message) }
  }

  const totalSaldo = Object.values(saldos).reduce((a, b) => a + b, 0)
  const totalPend  = contas.reduce((s, c) => s + (c.pendentes || 0), 0)

  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Contas Bancárias</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Gerencie suas contas e acompanhe os saldos do grupo.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/financeiro/painel" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', textDecoration: 'none' }}>
            ← Painel
          </Link>
          {canCreate && (
            <button onClick={() => abrir()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nova conta
            </button>
          )}
        </div>
      </div>

      {/* Saldo banner */}
      <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '24px 28px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 0, marginBottom: 20 }}>
        <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO TOTAL EM CAIXA</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>{brl(totalSaldo)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{contas.length} conta{contas.length !== 1 ? 's' : ''} ativa{contas.length !== 1 ? 's' : ''} · atualizado agora</div>
        </div>
        <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>BANCOS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6 }}>
            {new Set(contas.map(c => c.banco).filter(Boolean)).size || contas.length}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Distribuição multibanco</div>
        </div>
        <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>CONTAS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6 }}>{contas.length}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Corrente · poupança · invest.</div>
        </div>
        <div style={{ paddingLeft: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>PENDÊNCIAS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: totalPend > 0 ? '#F4B19C' : '#8ED1A5' }}>{totalPend}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Para conciliação</div>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 280, background: '#E2DDD6', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : contas.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: C.ink3 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink2, marginBottom: 8 }}>Nenhuma conta cadastrada</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Adicione sua primeira conta bancária para começar a registrar movimentações.</div>
          {canCreate && (
            <button onClick={() => abrir()} style={amberBtnS()}>+ Adicionar conta</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {contas.map(c => (
            <ContaCard
              key={c.id}
              conta={c}
              saldo={saldos[c.id] ?? 0}
              onEdit={abrir}
              onDelete={excluir}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
          {canCreate && <AddCard onClick={() => abrir()} />}
        </div>
      )}

      {/* Modal */}
      <ContaModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={salvar}
        form={form}
        setForm={setForm}
        saving={saving}
        editId={editId}
      />
    </div>
  )
}
