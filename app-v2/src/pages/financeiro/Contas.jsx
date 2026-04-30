// Financeiro — Contas Bancárias
// Design: cards com header colorido por banco + saldo banner navy + modal nova conta
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { contasService } from '@/services/financeiroService'
import useAuthStore from '@/store/authStore'
import supabase from '@/lib/supabase'

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

function fmtData(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  const hoje = new Date()
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  if (d.toDateString() === hoje.toDateString()) return 'Hoje, ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  const mes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return d.getDate() + '/' + mes[d.getMonth()]
}

// ── Bancos do Brasil ──────────────────────────────────────────────
export const BANCOS_BRASIL = [
  { codigo: '001', nome: 'Banco do Brasil',      sigla: 'BB',  bgCor: '#0033A0', cor: '#FFE600' },
  { codigo: '341', nome: 'Itaú Unibanco',         sigla: 'IU',  bgCor: '#EC7000', cor: '#FFFFFF' },
  { codigo: '237', nome: 'Bradesco',              sigla: 'B',   bgCor: '#CC092F', cor: '#FFFFFF' },
  { codigo: '033', nome: 'Santander',             sigla: 'S',   bgCor: '#EC0000', cor: '#FFFFFF' },
  { codigo: '104', nome: 'Caixa Econômica',       sigla: 'CE',  bgCor: '#005CA9', cor: '#FFFFFF' },
  { codigo: '260', nome: 'Nubank',                sigla: 'NU',  bgCor: '#820AD1', cor: '#FFFFFF' },
  { codigo: '077', nome: 'Banco Inter',           sigla: 'IN',  bgCor: '#FF7A00', cor: '#FFFFFF' },
  { codigo: '748', nome: 'Sicredi',               sigla: 'SC',  bgCor: '#008542', cor: '#FFFFFF' },
  { codigo: '756', nome: 'Sicoob',                sigla: 'SB',  bgCor: '#006E3A', cor: '#FFFFFF' },
  { codigo: '422', nome: 'Safra',                 sigla: 'SF',  bgCor: '#1A3A5C', cor: '#FFFFFF' },
  { codigo: '212', nome: 'Banco Original',        sigla: 'OR',  bgCor: '#00A859', cor: '#FFFFFF' },
  { codigo: '336', nome: 'C6 Bank',               sigla: 'C6',  bgCor: '#242424', cor: '#F4C430' },
  { codigo: '290', nome: 'PagBank',               sigla: 'PB',  bgCor: '#05C15E', cor: '#FFFFFF' },
  { codigo: '380', nome: 'PicPay',                sigla: 'PP',  bgCor: '#21C25E', cor: '#FFFFFF' },
  { codigo: '323', nome: 'Mercado Pago',          sigla: 'MP',  bgCor: '#009EE3', cor: '#FFFFFF' },
  { codigo: '318', nome: 'Banco BMG',             sigla: 'BG',  bgCor: '#E04000', cor: '#FFFFFF' },
  { codigo: '047', nome: 'Banco do Nordeste',     sigla: 'BN',  bgCor: '#005BA0', cor: '#FFD700' },
  { codigo: '070', nome: 'BRB - Banco de Brasília', sigla: 'BRB', bgCor: '#003DA5', cor: '#FFFFFF' },
  { codigo: '041', nome: 'Banrisul',              sigla: 'BS',  bgCor: '#003087', cor: '#FFFFFF' },
  { codigo: 'OUT', nome: 'Outro banco',           sigla: '??',  bgCor: '#45505F', cor: '#FFFFFF' },
]

function getBanco(codigoOuNome) {
  if (!codigoOuNome) return BANCOS_BRASIL.find(b => b.codigo === 'OUT')
  return (
    BANCOS_BRASIL.find(b => b.codigo === codigoOuNome) ||
    BANCOS_BRASIL.find(b => (codigoOuNome || '').toLowerCase().includes(b.nome.toLowerCase().split(' ')[0].toLowerCase())) ||
    BANCOS_BRASIL.find(b => b.codigo === 'OUT')
  )
}

const TIPO_LABEL = { corrente: 'Conta Corrente', poupanca: 'Poupança', investimento: 'Investimento', caixa: 'Caixa' }

const EMPTY = { nome: '', banco_codigo: 'OUT', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '0', empresa_id: '' }

// ── Card de conta ─────────────────────────────────────────────────
function ContaCard({ conta, saldo, movMes, ultimoLanc, pendentesCount, onEdit, canEdit, canDelete, onDelete }) {
  const banco = getBanco(conta.banco_codigo || conta.banco)
  const tipo = TIPO_LABEL[conta.tipo] || conta.tipo
  const ag = conta.agencia ? `AG ${conta.agencia}` : ''
  const cc = conta.conta ? `CC ${conta.conta}` : ''
  const agcc = [ag, cc].filter(Boolean).join(' · ')

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Bank header */}
      <div style={{ background: banco.bgCor, color: banco.cor, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.22)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, letterSpacing: '-0.01em', flexShrink: 0 }}>
            {banco.sigla}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{banco.nome}</div>
            {agcc && (
              <div style={{ fontSize: 10, opacity: 0.8, fontFamily: '"JetBrains Mono", monospace', marginTop: 1 }}>{agcc}</div>
            )}
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {canEdit && (
              <button onClick={() => onEdit(conta)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: banco.cor, display: 'grid', placeItems: 'center', fontSize: 14 }}>✎</button>
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

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: `1px solid ${C.line2}`, paddingTop: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: C.ink3, fontWeight: 600 }}>MOV. MÊS</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginTop: 2 }}>{brlK(movMes || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: C.ink3, fontWeight: 600 }}>ULT. LANÇ</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.ink2, marginTop: 2 }}>{fmtData(ultimoLanc)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.line2}`, paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} />
            <span style={{ fontSize: 10, color: C.ink2, letterSpacing: '0.04em' }}>Ativa · {tipo}</span>
          </div>
          {pendentesCount > 0 && (
            <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
              {pendentesCount} pend.
            </span>
          )}
          {canDelete && !pendentesCount && (
            <button onClick={() => onDelete(conta.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', borderTop: `1px solid ${C.line2}` }}>
        <Link to={`/financeiro/extrato`} state={{ conta_id: conta.id }} style={cardBtn()}>Extrato</Link>
        <Link to="/financeiro/lancamentos" style={{ ...cardBtn(), borderLeft: `1px solid ${C.line2}` }}>Lançar</Link>
        <button type="button" onClick={() => toast('Conciliação em breve')} style={{ ...cardBtn(), borderLeft: `1px solid ${C.line2}`, background: 'transparent', border: 'none', paddingBlock: 0, borderLeft: `1px solid ${C.line2}` }}>Conciliar</button>
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
    <div onClick={onClick} style={{ background: 'transparent', border: '1.5px dashed #C9C2B0', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, minHeight: 290, cursor: 'pointer' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.surface, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontSize: 22, color: C.navy }}>+</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Adicionar conta</div>
      <div style={{ fontSize: 11, color: C.ink3, textAlign: 'center', maxWidth: 180 }}>Cadastre uma nova conta corrente para começar a registrar movimentações.</div>
    </div>
  )
}

// ── Seletor de banco visual ───────────────────────────────────────
function BancoSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const banco = BANCOS_BRASIL.find(b => b.codigo === value) || BANCOS_BRASIL[BANCOS_BRASIL.length - 1]

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 6, background: banco.bgCor, display: 'grid', placeItems: 'center', color: banco.cor, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
          {banco.sigla}
        </div>
        <span style={{ flex: 1, fontSize: 13, color: C.ink }}>{banco.nome}</span>
        <span style={{ color: C.ink3, fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: 280, overflowY: 'auto', marginTop: 4 }}>
          {BANCOS_BRASIL.map(b => (
            <div
              key={b.codigo}
              onClick={() => { onChange(b.codigo); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: value === b.codigo ? '#F0EDE7' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F6F3ED' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === b.codigo ? '#F0EDE7' : 'transparent' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: b.bgCor, display: 'grid', placeItems: 'center', color: b.cor, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {b.sigla}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{b.nome}</div>
                <div style={{ fontSize: 10, color: C.ink3 }}>Cód. {b.codigo}</div>
              </div>
              {value === b.codigo && <span style={{ marginLeft: 'auto', color: C.ok, fontSize: 14 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Modal nova / editar conta
function ContaModal({ open, onClose, onSave, form, setForm, saving, editId, empresas }) {
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
            <Field label="Banco *">
              <BancoSelector value={form.banco_codigo} onChange={v => setForm(f => ({ ...f, banco_codigo: v, banco: BANCOS_BRASIL.find(b => b.codigo === v)?.nome || '' }))} />
            </Field>
            <Field label="Apelido (como aparece no painel) *">
              <input style={inp()} placeholder="Ex: BB Operacional" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </Field>
            {empresas.length > 0 && (
              <Field label="Empresa">
                <select style={inp()} value={form.empresa_id || ''} onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value || null }))}>
                  <option value="">Todas as empresas</option>
                  {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                </select>
              </Field>
            )}
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

  const [contas, setContas]       = useState([])
  const [saldos, setSaldos]       = useState({})
  const [movMes, setMovMes]       = useState({})
  const [ultLanc, setUltLanc]     = useState({})
  const [pendentes, setPendentes] = useState({})
  const [empresas, setEmpresas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [open, setOpen]           = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)
  const [filtroEmpresa, setFiltroEmpresa] = useState('todas')
  const [ordenar, setOrdenar]     = useState('maior-saldo')

  useEffect(() => { load(); loadEmpresas() }, [])

  async function loadEmpresas() {
    const { data } = await supabase.from('empresas').select('id, nome').order('nome')
    setEmpresas(data || [])
  }

  async function load() {
    setLoading(true)
    try {
      const data = await contasService.list()
      setContas(data)
      if (data.length) {
        const ids = data.map(c => c.id)
        const [sMap, mMap, uMap, pMap] = await Promise.all([
          contasService.saldos(ids),
          contasService.movimentacaoMes(ids),
          contasService.ultimoLancamento(ids),
          contasService.pendentes(ids),
        ])
        const comInicial = {}
        data.forEach(c => { comInicial[c.id] = (sMap[c.id] || 0) + parseFloat(c.saldo_inicial || 0) })
        setSaldos(comInicial)
        setMovMes(mMap)
        setUltLanc(uMap)
        setPendentes(pMap)
      }
    } catch { toast.error('Erro ao carregar contas') }
    setLoading(false)
  }

  function abrir(conta = null) {
    if (conta) {
      setForm({
        nome: conta.nome,
        banco_codigo: conta.banco_codigo || 'OUT',
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        conta: conta.conta || '',
        tipo: conta.tipo,
        saldo_inicial: String(conta.saldo_inicial ?? 0),
        empresa_id: conta.empresa_id || '',
      })
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
      const payload = {
        ...form,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
        empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
        banco: BANCOS_BRASIL.find(b => b.codigo === form.banco_codigo)?.nome || form.banco,
      }
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

  const contasFiltradas = useMemo(() => {
    let arr = contas
    if (filtroEmpresa !== 'todas') {
      arr = arr.filter(c => String(c.empresa_id) === filtroEmpresa)
    }
    if (ordenar === 'maior-saldo') arr = [...arr].sort((a, b) => (saldos[b.id] || 0) - (saldos[a.id] || 0))
    else if (ordenar === 'menor-saldo') arr = [...arr].sort((a, b) => (saldos[a.id] || 0) - (saldos[b.id] || 0))
    else if (ordenar === 'nome') arr = [...arr].sort((a, b) => a.nome.localeCompare(b.nome))
    return arr
  }, [contas, filtroEmpresa, ordenar, saldos])

  const totalSaldo  = contasFiltradas.reduce((s, c) => s + (saldos[c.id] || 0), 0)
  const totalPend   = contasFiltradas.reduce((s, c) => s + (pendentes[c.id] || 0), 0)
  const totalBancos = new Set(contasFiltradas.map(c => c.banco_codigo || c.banco).filter(Boolean)).size

  const empresasComContas = useMemo(() => {
    const ids = new Set(contas.map(c => c.empresa_id).filter(Boolean))
    return empresas.filter(e => ids.has(e.id))
  }, [contas, empresas])

  function abrevEmpresa(nome) {
    const ignora = ['DE', 'DA', 'DO', 'E', 'S.A.', 'SA', 'LTDA']
    return nome.split(' ').filter(p => !ignora.includes(p.toUpperCase()) && p.length > 1).slice(0, 2).map(p => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }

  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Contas Bancárias</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Gerencie suas contas e acompanhe os saldos do grupo.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={ordenar}
            onChange={e => setOrdenar(e.target.value)}
            style={{ padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.ink2, background: C.surface, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <option value="maior-saldo">Ordenar por: Maior saldo</option>
            <option value="menor-saldo">Menor saldo</option>
            <option value="nome">Nome A–Z</option>
          </select>
          {canCreate && (
            <button onClick={() => abrir()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nova conta
            </button>
          )}
        </div>
      </div>

      {/* Saldo banner */}
      <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '24px 28px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 0, marginBottom: 16 }}>
        <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO TOTAL EM CAIXA</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>{brl(totalSaldo)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            {contasFiltradas.length} conta{contasFiltradas.length !== 1 ? 's' : ''} ativa{contasFiltradas.length !== 1 ? 's' : ''} · atualizado agora
          </div>
        </div>
        <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>EMPRESAS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6 }}>{empresasComContas.length || contasFiltradas.length}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            {empresasComContas.length ? empresasComContas.map(e => e.nome.split(' ').map(w => w[0]).join('')).slice(0, 4).join(' · ') : 'Grupo'}
          </div>
        </div>
        <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>BANCOS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6 }}>{totalBancos || contasFiltradas.length}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Distribuição multibanco</div>
        </div>
        <div style={{ paddingLeft: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>PENDÊNCIAS</div>
          <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: totalPend > 0 ? '#F4B19C' : '#8ED1A5' }}>{totalPend}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Conciliação · {totalPend} pend.</div>
        </div>
      </div>

      {/* Filtros por empresa */}
      {empresasComContas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: C.ink3, fontWeight: 600, marginRight: 2 }}>FILTRAR</span>
          {[{ id: 'todas', label: `Todas · ${contas.length}` }, ...empresasComContas.map(e => ({ id: String(e.id), label: `${abrevEmpresa(e.nome)} · ${contas.filter(c => String(c.empresa_id) === String(e.id)).length}` }))].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFiltroEmpresa(opt.id)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                border: `1px solid ${filtroEmpresa === opt.id ? C.navy : C.line}`,
                borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                background: filtroEmpresa === opt.id ? C.navy : C.surface,
                color: filtroEmpresa === opt.id ? '#FFF' : C.ink2,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 300, background: '#E2DDD6', borderRadius: 12, opacity: 0.6 }} />
          ))}
        </div>
      ) : contasFiltradas.length === 0 && contas.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: C.ink3 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink2, marginBottom: 8 }}>Nenhuma conta cadastrada</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Adicione sua primeira conta bancária para começar a registrar movimentações.</div>
          {canCreate && <button onClick={() => abrir()} style={amberBtnS()}>+ Adicionar conta</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {contasFiltradas.map(c => (
            <ContaCard
              key={c.id}
              conta={c}
              saldo={saldos[c.id] ?? 0}
              movMes={movMes[c.id] ?? 0}
              ultimoLanc={ultLanc[c.id]}
              pendentesCount={pendentes[c.id] ?? 0}
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
        empresas={empresas}
      />
    </div>
  )
}
