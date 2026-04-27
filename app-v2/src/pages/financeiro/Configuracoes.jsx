// Financeiro — Configurações
// Gerenciamento de Categorias e Centros de Custo
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriasService, centrosCustoService } from '@/services/financeiroService'
import useAuthStore from '@/store/authStore'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

function inp() {
  return { width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
}
function ghostBtn() {
  return { background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
}
function amberBtn() {
  return { background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 10, letterSpacing: '0.14em', color: C.ink3, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

// ── Modal Categoria ────────────────────────────────────────
const EMPTY_CAT = { nome: '', tipo: 'despesa', icone: '', cor: '#7F8A99' }

function CategoriaModal({ open, onClose, onSave, form, setForm, saving, editId }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 420, boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}`, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 18, fontWeight: 500, margin: 0, color: C.ink }}>{editId ? 'Editar categoria' : 'Nova categoria'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4, lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={onSave}>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome *">
              <input style={inp()} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Ex: Material de Obra" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Tipo">
                <select style={{ ...inp(), cursor: 'pointer' }} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </Field>
              <Field label="Ícone (emoji)">
                <input style={inp()} value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))} placeholder="🏗️" maxLength={4} />
              </Field>
            </div>
            <Field label="Cor">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                  style={{ width: 36, height: 36, border: `1px solid ${C.line}`, borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <input style={{ ...inp(), flex: 1 }} value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="#7F8A99" maxLength={7} />
              </div>
            </Field>
          </div>
          <div style={{ padding: '12px 22px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: C.surface2 }}>
            <button type="button" onClick={onClose} style={ghostBtn()}>Cancelar</button>
            <button type="submit" disabled={saving} style={amberBtn()}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Centro de Custo ──────────────────────────────────
const EMPTY_CC = { nome: '' }

function CentroCustoModal({ open, onClose, onSave, form, setForm, saving, editId }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,0.55)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div style={{ background: C.surface, borderRadius: 14, width: 380, boxShadow: '0 30px 80px rgba(0,0,0,0.25)', border: `1px solid ${C.line}`, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 18, fontWeight: 500, margin: 0, color: C.ink }}>{editId ? 'Editar centro de custo' : 'Novo centro de custo'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, padding: 4, lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={onSave}>
          <div style={{ padding: '18px 22px' }}>
            <Field label="Nome *">
              <input style={inp()} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Ex: Obra Rua das Flores" />
            </Field>
          </div>
          <div style={{ padding: '12px 22px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: C.surface2 }}>
            <button type="button" onClick={onClose} style={ghostBtn()}>Cancelar</button>
            <button type="submit" disabled={saving} style={amberBtn()}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function Configuracoes() {
  const { isAdmin } = useAuthStore()
  const queryClient = useQueryClient()

  const [catModal, setCatModal]   = useState(false)
  const [catForm, setCatForm]     = useState(EMPTY_CAT)
  const [catEditId, setCatEditId] = useState(null)
  const [catFiltro, setCatFiltro] = useState('')

  const [ccModal, setCcModal]   = useState(false)
  const [ccForm, setCcForm]     = useState(EMPTY_CC)
  const [ccEditId, setCcEditId] = useState(null)

  // ── Queries ─────────────────────────────────────────────
  const { data: categorias = [], isFetching: loadingCats } = useQuery({ queryKey: ['fin-categorias'], queryFn: () => categoriasService.list(), staleTime: 5 * 60 * 1000 })
  const { data: centros = [],    isFetching: loadingCC }   = useQuery({ queryKey: ['fin-centros-custo'], queryFn: () => centrosCustoService.list(), staleTime: 5 * 60 * 1000 })

  // ── Mutations ────────────────────────────────────────────
  const catMutation = useMutation({
    mutationFn: ({ id, payload }) => id ? categoriasService.update(id, payload) : categoriasService.create(payload),
    onSuccess: (_, { id }) => { toast.success(id ? 'Categoria atualizada!' : 'Categoria criada!'); setCatModal(false); queryClient.invalidateQueries({ queryKey: ['fin-categorias'] }) },
    onError: (err) => toast.error(err.message),
  })
  const desativarCatMutation = useMutation({
    mutationFn: (id) => categoriasService.remove(id),
    onSuccess: () => { toast.success('Categoria desativada'); queryClient.invalidateQueries({ queryKey: ['fin-categorias'] }) },
    onError: (err) => toast.error(err.message),
  })
  const ccMutation = useMutation({
    mutationFn: ({ id, payload }) => id ? centrosCustoService.update(id, payload) : centrosCustoService.create(payload),
    onSuccess: (_, { id }) => { toast.success(id ? 'Centro de custo atualizado!' : 'Centro de custo criado!'); setCcModal(false); queryClient.invalidateQueries({ queryKey: ['fin-centros-custo'] }) },
    onError: (err) => toast.error(err.message),
  })
  const desativarCCMutation = useMutation({
    mutationFn: (id) => centrosCustoService.remove(id),
    onSuccess: () => { toast.success('Centro de custo desativado'); queryClient.invalidateQueries({ queryKey: ['fin-centros-custo'] }) },
    onError: (err) => toast.error(err.message),
  })

  // ── Categorias handlers ──────────────────────────────────
  function abrirCat(c = null) {
    if (c) { setCatForm({ nome: c.nome, tipo: c.tipo, icone: c.icone || '', cor: c.cor || '#7F8A99' }); setCatEditId(c.id) }
    else { setCatForm(EMPTY_CAT); setCatEditId(null) }
    setCatModal(true)
  }

  function salvarCat(e) {
    e.preventDefault()
    const payload = { nome: catForm.nome, tipo: catForm.tipo, icone: catForm.icone || null, cor: catForm.cor || null, ativo: true }
    catMutation.mutate({ id: catEditId, payload })
  }

  function desativarCat(id) {
    if (!confirm('Desativar esta categoria?')) return
    desativarCatMutation.mutate(id)
  }

  // ── Centros de custo handlers ────────────────────────────
  function abrirCC(c = null) {
    if (c) { setCcForm({ nome: c.nome }); setCcEditId(c.id) }
    else { setCcForm(EMPTY_CC); setCcEditId(null) }
    setCcModal(true)
  }

  function salvarCC(e) {
    e.preventDefault()
    ccMutation.mutate({ id: ccEditId, payload: { nome: ccForm.nome, ativo: true } })
  }

  function desativarCC(id) {
    if (!confirm('Desativar este centro de custo?')) return
    desativarCCMutation.mutate(id)
  }

  const catsFiltradas = catFiltro ? categorias.filter(c => c.tipo === catFiltro) : categorias
  const catSaving = catMutation.isPending
  const ccSaving  = ccMutation.isPending

  return (
    <div className="page-enter" style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)' }}>
      {/* Banner navy */}
      <div style={{ background: C.navy, padding: '18px 28px' }}>
        <h1 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 26, fontWeight: 500, margin: 0, color: '#FFF' }}>Configurações Financeiras</h1>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
          Categorias de lançamento e centros de custo
        </div>
      </div>

      <div style={{ padding: '24px 28px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Card: Categorias ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Categorias de Lançamento</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{categorias.length} categorias</div>
            </div>
            <button onClick={() => abrirCat()} style={amberBtn()}>+ Nova categoria</button>
          </div>

          {/* Filtro tipo */}
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.line2}`, display: 'flex', gap: 4 }}>
            {[['', 'Todas'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([val, lbl]) => (
              <button key={val} onClick={() => setCatFiltro(val)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: `1px solid ${catFiltro === val ? C.navy : C.line}`, background: catFiltro === val ? C.navy : 'transparent', color: catFiltro === val ? '#FFF' : C.ink2, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {lbl}
              </button>
            ))}
          </div>

          {loadingCats ? (
            <div style={{ padding: '8px 0' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${C.line2}`, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
                  <div style={{ flex: 1, height: 11, borderRadius: 5, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08 + 0.1}s` }} />
                  <div style={{ width: 50, height: 16, borderRadius: 3, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08 + 0.2}s` }} />
                </div>
              ))}
            </div>
          ) : catsFiltradas.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: C.ink3 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🏷️</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink2 }}>Nenhuma categoria</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Crie a primeira categoria para começar.</div>
            </div>
          ) : (
            <div>
              {catsFiltradas.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: `1px solid ${C.line2}` }}>
                  <div style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{cat.icone || '•'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.nome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: cat.tipo === 'receita' ? '#E4F1E8' : '#F9ECE7', color: cat.tipo === 'receita' ? '#3D7A50' : '#B84A33', fontWeight: 600, textTransform: 'uppercase' }}>
                        {cat.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.cor || C.ink3, display: 'inline-block', flexShrink: 0 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => abrirCat(cat)} title="Editar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>✎</button>
                    <button onClick={() => desativarCat(cat.id)} title="Desativar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Card: Centros de Custo ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Centros de Custo</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{centros.length} centros cadastrados</div>
            </div>
            <button onClick={() => abrirCC()} style={amberBtn()}>+ Novo centro</button>
          </div>

          {loadingCC ? (
            <div style={{ padding: '8px 0' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${C.line2}`, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.line2, flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 11, borderRadius: 5, background: C.line2, animation: 'rr-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
                </div>
              ))}
            </div>
          ) : centros.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: C.ink3 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🏢</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink2 }}>Nenhum centro de custo</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Agrupe lançamentos por obras ou departamentos.</div>
            </div>
          ) : (
            <div>
              {centros.map(cc => (
                <div key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${C.line2}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.ink3, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: 500, fontSize: 13, color: C.ink }}>{cc.nome}</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => abrirCC(cc)} title="Editar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>✎</button>
                    <button onClick={() => desativarCC(cc.id)} title="Desativar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, padding: '3px 6px', borderRadius: 4, fontSize: 12 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <CategoriaModal
        open={catModal} onClose={() => setCatModal(false)} onSave={salvarCat}
        form={catForm} setForm={setCatForm} saving={catSaving} editId={catEditId}
      />
      <CentroCustoModal
        open={ccModal} onClose={() => setCcModal(false)} onSave={salvarCC}
        form={ccForm} setForm={setCcForm} saving={ccSaving} editId={ccEditId}
      />
    </div>
  )
}
