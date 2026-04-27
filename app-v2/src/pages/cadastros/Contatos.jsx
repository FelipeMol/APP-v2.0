// Cadastros — Contatos
// CRUD completo com validação de CPF/CNPJ
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contatosService } from '@/services/contatosService'
import useAuthStore from '@/store/authStore'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Validações ────────────────────────────────────────────
function validarCPF(cpf) {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(c[10])
}

function validarCNPJ(cnpj) {
  const c = cnpj.replace(/\D/g, '')
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  let sum = 0, pos = 5
  for (let i = 0; i < 12; i++) { sum += parseInt(c[i]) * pos--; if (pos < 2) pos = 9 }
  let r = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (r !== parseInt(c[12])) return false
  sum = 0; pos = 6
  for (let i = 0; i < 13; i++) { sum += parseInt(c[i]) * pos--; if (pos < 2) pos = 9 }
  r = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return r === parseInt(c[13])
}

function formatarDocumento(valor, tipo) {
  const n = valor.replace(/\D/g, '')
  if (tipo === 'cpf') {
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
  }
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18)
}

// ── Helpers de estilo ──────────────────────────────────────
function inp() {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
}
function ghostBtn() {
  return { background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
}
function amberBtn() {
  return { background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
}
function TH() { return { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 14px', color: C.ink3, whiteSpace: 'nowrap' } }
function TD() { return { padding: '12px 14px', verticalAlign: 'middle', color: C.ink } }

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const TIPO_MAP = {
  cliente:     { label: 'Cliente',     bg: '#E4F1E8', fg: '#3D7A50' },
  fornecedor:  { label: 'Fornecedor',  bg: '#E8F0FB', fg: '#2D5FA0' },
  funcionario: { label: 'Funcionário', bg: '#FDF3DF', fg: '#8A6210' },
  socio:       { label: 'Sócio',       bg: '#F3E8FB', fg: '#6D2DA0' },
}

function TipoBadge({ tipo }) {
  const m = TIPO_MAP[tipo] || { label: tipo, bg: C.surface2, fg: C.ink3 }
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: m.bg, color: m.fg, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {m.label}
    </span>
  )
}

function fmtDoc(doc, tipo_documento) {
  if (!doc) return '—'
  const n = doc.replace(/\D/g, '')
  if (tipo_documento === 'cpf' || n.length === 11) {
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

// ── EMPTY_FORM ─────────────────────────────────────────────
const EMPTY_FORM = { nome: '', tipo: 'cliente', tipo_documento: 'cpf', documento: '', email: '', telefone: '' }

// ── Modal ─────────────────────────────────────────────────
function ContatoModal({ open, onClose, onSave, form, setForm, saving, editId }) {
  if (!open) return null

  function handleDocChange(e) {
    const fmt = formatarDocumento(e.target.value, form.tipo_documento)
    setForm(f => ({ ...f, documento: fmt }))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 540, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}` }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>CADASTROS · {editId ? 'EDITAR' : 'NOVO'}</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, fontWeight: 500, margin: '4px 0 0', color: C.ink }}>
              {editId ? 'Editar contato' : 'Novo contato'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={onSave}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '60vh' }}>
            <Field label="Nome *">
              <input style={inp()} placeholder="Nome completo ou razão social" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Tipo">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="cliente">Cliente</option>
                  <option value="fornecedor">Fornecedor</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="socio">Sócio</option>
                </select>
              </Field>
              <Field label="Tipo de Documento">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 0' }}>
                  {[['cpf', 'CPF'], ['cnpj', 'CNPJ']].map(([val, lbl]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: C.ink }}>
                      <input
                        type="radio" name="tipo_documento" value={val}
                        checked={form.tipo_documento === val}
                        onChange={() => setForm(f => ({ ...f, tipo_documento: val, documento: '' }))}
                        style={{ cursor: 'pointer' }}
                      />
                      {lbl}
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            <Field label={`Documento * (${form.tipo_documento.toUpperCase()})`}>
              <input
                style={inp()}
                placeholder={form.tipo_documento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                value={form.documento}
                onChange={handleDocChange}
                maxLength={form.tipo_documento === 'cpf' ? 14 : 18}
                required
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="E-mail">
                <input type="email" style={inp()} placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Telefone">
                <input style={inp()} placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </Field>
            </div>
          </div>

          <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: C.surface2 }}>
            <button type="button" onClick={onClose} style={ghostBtn()}>Cancelar</button>
            <button type="submit" disabled={saving} style={amberBtn()}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar contato'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function Contatos() {
  const { isAdmin } = useAuthStore()
  const queryClient = useQueryClient()

  const [open, setOpen]             = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editId, setEditId]         = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca]           = useState('')

  // ── Query ────────────────────────────────────────────────
  const { data: contatos = [], isFetching: loading } = useQuery({
    queryKey: ['contatos'],
    queryFn: () => contatosService.list(),
  })

  // ── Mutations ────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => id ? contatosService.update(id, payload) : contatosService.create(payload),
    onSuccess: (_, { id }) => { toast.success(id ? 'Contato atualizado!' : 'Contato criado!'); setOpen(false); queryClient.invalidateQueries({ queryKey: ['contatos'] }) },
    onError: (err) => toast.error(err.message),
  })
  const excluirMutation = useMutation({
    mutationFn: (id) => contatosService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contatos'] })
      const prev = queryClient.getQueryData(['contatos'])
      queryClient.setQueryData(['contatos'], (old) => old?.filter(c => c.id !== id))
      return { prev }
    },
    onError: (err, _id, ctx) => { toast.error(err.message); if (ctx?.prev) queryClient.setQueryData(['contatos'], ctx.prev) },
    onSuccess: () => toast.success('Contato desativado'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['contatos'] }),
  })

  const filtrados = useMemo(() => {
    return contatos.filter(c => {
      if (filtroTipo && c.tipo !== filtroTipo) return false
      if (busca) {
        const b = busca.toLowerCase()
        return (c.nome || '').toLowerCase().includes(b) || (c.documento || '').replace(/\D/g, '').includes(busca.replace(/\D/g, ''))
      }
      return true
    })
  }, [contatos, filtroTipo, busca])

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const kpis = useMemo(() => ({
    total: contatos.length,
    clientes: contatos.filter(c => c.tipo === 'cliente').length,
    fornecedores: contatos.filter(c => c.tipo === 'fornecedor').length,
    meAtual: contatos.filter(c => c.created_at >= inicioMes).length,
  }), [contatos])

  function abrir(c = null) {
    if (c) {
      setForm({ nome: c.nome, tipo: c.tipo, tipo_documento: c.tipo_documento || 'cpf', documento: fmtDoc(c.documento, c.tipo_documento), email: c.email || '', telefone: c.telefone || '' })
      setEditId(c.id)
    } else {
      setForm(EMPTY_FORM)
      setEditId(null)
    }
    setOpen(true)
  }

  function salvar(e) {
    e.preventDefault()
    const docLimpo = form.documento.replace(/\D/g, '')
    if (form.tipo_documento === 'cpf') {
      if (!validarCPF(docLimpo)) { toast.error('CPF inválido. Verifique os dígitos.'); return }
    } else {
      if (!validarCNPJ(docLimpo)) { toast.error('CNPJ inválido. Verifique os dígitos.'); return }
    }
    const payload = { nome: form.nome, tipo: form.tipo, tipo_documento: form.tipo_documento, documento: docLimpo, email: form.email || null, telefone: form.telefone || null, ativo: true }
    saveMutation.mutate({ id: editId, payload })
  }

  function excluir(id) {
    if (!confirm('Desativar este contato?')) return
    excluirMutation.mutate(id)
  }

  const saving = saveMutation.isPending

  return (
    <div className="page-enter" style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)' }}>
      {/* Banner navy */}
      <div style={{ background: C.navy, padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 26, fontWeight: 500, margin: 0, color: '#FFF' }}>Contatos</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {contatos.length} contatos cadastrados
          </div>
        </div>
        <button onClick={() => abrir()} style={{ background: '#E8A628', border: 'none', color: C.navy, fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Novo contato
        </button>
      </div>

      <div style={{ padding: '24px 28px 40px' }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total de contatos', value: kpis.total, color: C.ink },
            { label: 'Clientes ativos', value: kpis.clientes, color: C.ok },
            { label: 'Fornecedores ativos', value: kpis.fornecedores, color: '#2D5FA0' },
            { label: 'Cadastrados este mês', value: kpis.meAtual, color: C.amber },
          ].map(k => (
            <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 500, letterSpacing: '0.04em', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 28, fontWeight: 500, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['', 'Todos'], ['cliente', 'Clientes'], ['fornecedor', 'Fornecedores'], ['funcionario', 'Funcionários'], ['socio', 'Sócios']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFiltroTipo(val)}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: `1px solid ${filtroTipo === val ? C.navy : C.line}`, background: filtroTipo === val ? C.navy : 'transparent', color: filtroTipo === val ? '#FFF' : C.ink2, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <input
            style={{ ...inp(), width: 220, padding: '7px 12px' }}
            placeholder="Buscar por nome ou documento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {/* Tabela */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '8px 0' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.line2}`, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                  <div style={{ flex: 2, height: 12, borderRadius: 6, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                  <div style={{ width: 70, height: 20, borderRadius: 4, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.1}s` }} />
                  <div style={{ flex: 1, height: 10, borderRadius: 6, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.2}s` }} />
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: C.ink3 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>Nenhum contato encontrado</div>
              <div style={{ fontSize: 12 }}>Tente ajustar os filtros ou crie um novo contato.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: C.surface2 }}>
                <tr style={{ color: C.ink3, textAlign: 'left' }}>
                  <th style={TH()}>Nome</th>
                  <th style={TH()}>Documento</th>
                  <th style={TH()}>Tipo</th>
                  <th style={TH()}>E-mail</th>
                  <th style={TH()}>Telefone</th>
                  <th style={TH()} />
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.line2}` }}>
                    <td style={TD()}>
                      <div style={{ fontWeight: 500, color: C.ink }}>{c.nome}</div>
                    </td>
                    <td style={TD()}>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.ink2 }}>
                        {fmtDoc(c.documento, c.tipo_documento)}
                      </span>
                    </td>
                    <td style={TD()}><TipoBadge tipo={c.tipo} /></td>
                    <td style={TD()}><span style={{ color: C.ink2 }}>{c.email || '—'}</span></td>
                    <td style={TD()}><span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.ink2 }}>{c.telefone || '—'}</span></td>
                    <td style={TD()}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <button onClick={() => abrir(c)} title="Editar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>✎</button>
                        <button onClick={() => excluir(c.id)} title="Desativar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ContatoModal
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
