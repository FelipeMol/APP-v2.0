// Cadastros → Categorias Financeiro + Centros de Custo
// Duas abas: Categorias (com hierarquia pai/filho) e Centros de Custo
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriasService, centrosCustoService } from '@/services/financeiroService'
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown, Tag, Building2,
  Check, X, AlertCircle,
} from 'lucide-react'

// ── Palette ──────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
  red: '#B84A33', green: '#3D7A50',
}

const TIPOS = [
  { value: 'despesa', label: 'Despesa', color: '#B84A33', bg: '#FFF0EE' },
  { value: 'receita', label: 'Receita', color: '#3D7A50', bg: '#EAF5EE' },
]

// ── Toast simples ────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  if (!msg) return null
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: type === 'error' ? '#FFF0EE' : '#EAF5EE',
        border: `1px solid ${type === 'error' ? '#B84A33' : '#3D7A50'}`,
        borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center',
        gap: 10, minWidth: 260, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      }}
    >
      {type === 'error' ? <AlertCircle size={16} color="#B84A33" /> : <Check size={16} color="#3D7A50" />}
      <span style={{ fontSize: 14, color: C.ink, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <X size={14} color={C.ink3} />
      </button>
    </div>
  )
}

// ── Modal genérico ────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(23,39,60,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: C.surface, borderRadius: 14, width: '100%', maxWidth: 480,
        margin: 16, boxShadow: '0 8px 40px rgba(0,0,0,.22)',
      }}>
        <div style={{
          background: C.navy, borderRadius: '14px 14px 0 0',
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} color="rgba(255,255,255,.6)" />
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.ink2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const input = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: `1px solid ${C.line}`, fontSize: 14, color: C.ink,
  outline: 'none', background: '#FAFAF8', boxSizing: 'border-box',
}

// ============================================================
// ABA CATEGORIAS
// ============================================================
function AbaCategorias() {
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null) // null | { mode:'new'|'edit'|'sub', data? }
  const [expanded, setExpanded] = useState({})
  const [form, setForm] = useState({ nome: '', tipo: 'despesa', cor: '#3b82f6', icone: '📁', grupo: '', parent_id: null })

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['financeiro_categorias'],
    queryFn: () => categoriasService.list(),
  })

  // Monta árvore: raízes + filhos
  const raizes = categorias.filter(c => !c.parent_id)
  const filhosDe = (parentId) => categorias.filter(c => c.parent_id === parentId)

  const notify = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const mutCreate = useMutation({
    mutationFn: (payload) => categoriasService.create(payload),
    onSuccess: () => { qc.invalidateQueries(['financeiro_categorias']); setModal(null); notify('Categoria criada!') },
    onError: (e) => notify(e.message, 'error'),
  })
  const mutUpdate = useMutation({
    mutationFn: ({ id, payload }) => categoriasService.update(id, payload),
    onSuccess: () => { qc.invalidateQueries(['financeiro_categorias']); setModal(null); notify('Categoria atualizada!') },
    onError: (e) => notify(e.message, 'error'),
  })
  const mutRemove = useMutation({
    mutationFn: (id) => categoriasService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['financeiro_categorias']); notify('Categoria removida!') },
    onError: (e) => notify(e.message, 'error'),
  })

  function openNew() {
    setForm({ nome: '', tipo: 'despesa', cor: '#3b82f6', icone: '', grupo: '', parent_id: null })
    setModal({ mode: 'new' })
  }
  function openEdit(cat) {
    setForm({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor || '#3b82f6', icone: cat.icone || '', grupo: cat.grupo || '', parent_id: cat.parent_id })
    setModal({ mode: 'edit', id: cat.id })
  }
  function openSub(parent) {
    setForm({ nome: '', tipo: parent.tipo, cor: parent.cor || '#3b82f6', icone: '', grupo: parent.grupo || '', parent_id: parent.id })
    setModal({ mode: 'sub', parentNome: parent.nome })
  }
  function handleSave() {
    if (!form.nome.trim()) return notify('Nome é obrigatório', 'error')
    if (modal.mode === 'edit') {
      mutUpdate.mutate({ id: modal.id, payload: form })
    } else {
      mutCreate.mutate(form)
    }
  }

  const tipoInfo = (tipo) => TIPOS.find(t => t.value === tipo) || TIPOS[0]

  function CatRow({ cat, depth = 0 }) {
    const filhos = filhosDe(cat.id)
    const open = expanded[cat.id]
    const t = tipoInfo(cat.tipo)
    const paddingLeft = 14 + depth * 24
    const bgColors = [C.surface, C.surface2, '#F0EDE7']
    const bg = bgColors[Math.min(depth, bgColors.length - 1)]
    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderBottom: `1px solid ${C.line2}`,
          background: bg,
          paddingLeft,
        }}>
          {/* Expand icon */}
          {filhos.length > 0 ? (
            <button onClick={() => setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.ink3 }}>
              {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : <span style={{ width: 15 }} />}

          <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.cor || '#3b82f6', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: depth === 0 ? 600 : depth === 1 ? 500 : 400, color: C.ink }}>{cat.nome}</span>

          {cat.grupo && (
            <span style={{ fontSize: 11, color: C.ink3, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, padding: '2px 6px' }}>
              {cat.grupo}
            </span>
          )}

          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            color: t.color, background: t.bg,
          }}>{t.label}</span>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => openSub(cat)}
              style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: C.ink2 }}>
              + Sub
            </button>
            <button onClick={() => openEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Pencil size={14} color={C.ink3} />
            </button>
            <button onClick={() => { if (confirm(`Remover "${cat.nome}"?`)) mutRemove.mutate(cat.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={14} color={C.red} />
            </button>
          </div>
        </div>
        {open && filhos.map(f => <CatRow key={f.id} cat={f} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div>
      {/* Header da aba */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <Link to="/cadastros/importar-categorias" style={{
          background: C.surface, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 8,
          padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
        }}>
          ↑ Importar CSV
        </Link>
        <button onClick={openNew} style={{
          background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={15} /> Nova Categoria
        </button>
      </div>

      {/* Lista */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.ink3 }}>Carregando…</div>
        ) : raizes.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.ink3 }}>
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          raizes.map(cat => <CatRow key={cat.id} cat={cat} depth={0} />)
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal.mode === 'edit' ? 'Editar Categoria' : modal.mode === 'sub' ? `Subcategoria de: ${modal.parentNome}` : 'Nova Categoria'}
          onClose={() => setModal(null)}
        >
          <Field label="Nome">
            <input style={input} value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Materiais de construção" />
          </Field>
          {!form.parent_id && (
            <Field label="Tipo">
              <div style={{ display: 'flex', gap: 8 }}>
                {TIPOS.map(t => (
                  <button key={t.value} onClick={() => setForm(p => ({ ...p, tipo: t.value }))}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      border: `2px solid ${form.tipo === t.value ? t.color : C.line}`,
                      background: form.tipo === t.value ? t.bg : C.surface,
                      color: form.tipo === t.value ? t.color : C.ink2,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Grupo (opcional)">
            <input style={input} value={form.grupo} onChange={e => setForm(p => ({ ...p, grupo: e.target.value }))} placeholder="Ex: Mão de obra, Materiais…" />
          </Field>
          <Field label="Cor">
            <input type="color" value={form.cor} onChange={e => setForm(p => ({ ...p, cor: e.target.value }))}
              style={{ width: 48, height: 38, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button onClick={() => setModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, cursor: 'pointer', fontSize: 14, color: C.ink2 }}>
              Cancelar
            </button>
            <button onClick={handleSave} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Salvar
            </button>
          </div>
        </Modal>
      )}

      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

// ============================================================
// ABA CENTROS DE CUSTO
// ============================================================
function AbaCentrosCusto() {
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nome: '', codigo: '', descricao: '' })

  const { data: centros = [], isLoading } = useQuery({
    queryKey: ['financeiro_centros_custo'],
    queryFn: () => centrosCustoService.list(),
  })

  const notify = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const mutCreate = useMutation({
    mutationFn: (p) => centrosCustoService.create(p),
    onSuccess: () => { qc.invalidateQueries(['financeiro_centros_custo']); setModal(null); notify('Centro de custo criado!') },
    onError: (e) => notify(e.message, 'error'),
  })
  const mutUpdate = useMutation({
    mutationFn: ({ id, payload }) => centrosCustoService.update(id, payload),
    onSuccess: () => { qc.invalidateQueries(['financeiro_centros_custo']); setModal(null); notify('Centro de custo atualizado!') },
    onError: (e) => notify(e.message, 'error'),
  })
  const mutRemove = useMutation({
    mutationFn: (id) => centrosCustoService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['financeiro_centros_custo']); notify('Centro de custo removido!') },
    onError: (e) => notify(e.message, 'error'),
  })

  function openNew() {
    setForm({ nome: '', codigo: '', descricao: '' })
    setModal({ mode: 'new' })
  }
  function openEdit(cc) {
    setForm({ nome: cc.nome, codigo: cc.codigo || '', descricao: cc.descricao || '' })
    setModal({ mode: 'edit', id: cc.id })
  }
  function handleSave() {
    if (!form.nome.trim()) return notify('Nome é obrigatório', 'error')
    if (modal.mode === 'edit') mutUpdate.mutate({ id: modal.id, payload: form })
    else mutCreate.mutate(form)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openNew} style={{
          background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={15} /> Novo Centro de Custo
        </button>
      </div>

      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.ink3 }}>Carregando…</div>
        ) : centros.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.ink3 }}>Nenhum centro de custo cadastrado ainda.</div>
        ) : centros.map((cc, i) => (
          <div key={cc.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            borderBottom: i < centros.length - 1 ? `1px solid ${C.line2}` : 'none',
          }}>
            <Building2 size={16} color={C.ink3} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{cc.nome}</span>
              {cc.codigo && <span style={{ fontSize: 12, color: C.ink3, marginLeft: 8 }}>({cc.codigo})</span>}
              {cc.descricao && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.ink2 }}>{cc.descricao}</p>}
            </div>
            <button onClick={() => openEdit(cc)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Pencil size={14} color={C.ink3} />
            </button>
            <button onClick={() => { if (confirm(`Remover "${cc.nome}"?`)) mutRemove.mutate(cc.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={14} color={C.red} />
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Editar Centro de Custo' : 'Novo Centro de Custo'} onClose={() => setModal(null)}>
          <Field label="Nome">
            <input style={input} value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Obra Alphaville" />
          </Field>
          <Field label="Código (opcional)">
            <input style={input} value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ex: CC-001" />
          </Field>
          <Field label="Descrição (opcional)">
            <textarea style={{ ...input, resize: 'vertical', minHeight: 70 }} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição do centro de custo…" />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button onClick={() => setModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, cursor: 'pointer', fontSize: 14, color: C.ink2 }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Salvar</button>
          </div>
        </Modal>
      )}

      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
const ABAS = [
  { id: 'categorias',    label: 'Categorias',       icon: Tag },
  { id: 'centros_custo', label: 'Centros de Custo',  icon: Building2 },
]

export default function CategoriasFinanceiro() {
  const [aba, setAba] = useState('categorias')

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Banner */}
      <div style={{ background: C.navy, borderRadius: 12, padding: '20px 28px', marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Cadastros Financeiros</h1>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, margin: '4px 0 0' }}>
          Gerencie categorias, subcategorias e centros de custo
        </p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `2px solid ${C.line}` }}>
        {ABAS.map(a => {
          const Icon = a.icon
          const active = aba === a.id
          return (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: active ? 700 : 400,
              color: active ? C.navy : C.ink3,
              borderBottom: active ? `2px solid ${C.navy}` : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon size={15} />
              {a.label}
            </button>
          )
        })}
      </div>

      {aba === 'categorias'    && <AbaCategorias />}
      {aba === 'centros_custo' && <AbaCentrosCusto />}
    </div>
  )
}
