// RH — Colaboradores (P5)
// Lista de funcionários com busca + filtro de situação. Click abre FichaColaborador.
import { useState, useEffect, useMemo } from 'react'
import FichaColaborador from './FichaColaborador'
import funcionariosService from '../../services/funcionariosService.js'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
const avatarColors = ['#3D5A80','#3D7A50','#B8862C','#17273C','#7A5C3D','#5A3D7A']
function avatarColor(nome) { return avatarColors[(nome || '').charCodeAt(0) % avatarColors.length] }

function Avatar({ nome, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(nome), color: '#FFF', fontSize: size * 0.36, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials(nome)}
    </div>
  )
}

export default function FuncionariosRH() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')
  const [selecionado, setSelecionado] = useState(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await funcionariosService.list()
      const list = Array.isArray(res?.dados) ? res.dados : []
      list.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
      setItems(list)
    } catch { setItems([]) } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() => {
    let r = items
    if (filtroSituacao !== 'todos') r = r.filter(f => f.situacao === filtroSituacao)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      r = r.filter(f =>
        (f.nome || '').toLowerCase().includes(q) ||
        (f.funcao || '').toLowerCase().includes(q) ||
        (f.empresa || '').toLowerCase().includes(q)
      )
    }
    return r
  }, [items, busca, filtroSituacao])

  const totalAtivos  = items.filter(f => f.situacao === 'Ativo').length
  const totalInativos = items.filter(f => f.situacao === 'Inativo').length

  const handleAtualizado = (updated) => {
    setItems(prev => prev.map(f => f.id === updated.id ? updated : f))
    setSelecionado(updated)
  }

  // Quando ficha selecionada, renderiza inline (página cheia) no lugar do grid
  if (selecionado) {
    return (
      <FichaColaborador
        funcionario={selecionado}
        onClose={() => setSelecionado(null)}
        onAtualizado={handleAtualizado}
      />
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Colaboradores</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>
            <span style={{ color: C.ok, fontWeight: 700 }}>{totalAtivos} ativos</span>
            {totalInativos > 0 && <span style={{ marginLeft: 8 }}>{totalInativos} inativos</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, função ou empresa…"
            style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', width: 280 }} />
        </div>
      </div>

      {/* Filtro situação */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['todos', 'Todos'], ['Ativo', 'Ativos'], ['Inativo', 'Inativos']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroSituacao(v)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filtroSituacao === v ? C.navy : C.line}`, background: filtroSituacao === v ? C.navy : 'transparent', color: filtroSituacao === v ? '#FFF' : C.ink2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
            {l}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.ink3, alignSelf: 'center' }}>{filtrados.length} colaborador{filtrados.length !== 1 ? 'es' : ''}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.ink3, fontSize: 13 }}>Carregando colaboradores…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.ink3, fontSize: 13 }}>Nenhum colaborador encontrado.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {filtrados.map(f => (
            <button key={f.id} onClick={() => setSelecionado(f)}
              style={{ textAlign: 'left', background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 11, padding: '14px 15px', cursor: 'pointer', fontFamily: 'inherit', transition: 'box-shadow 0.12s, border-color 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = C.line }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.line2 }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <Avatar nome={f.nome} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.nome}</div>
                  <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.funcao || '—'} · {f.empresa || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: f.situacao === 'Ativo' ? '#E4F1E8' : '#FBE9E4', color: f.situacao === 'Ativo' ? C.ok : C.bad, fontWeight: 700, letterSpacing: '0.04em' }}>
                  {f.situacao || 'Ativo'}
                </span>
                <span style={{ fontSize: 11, color: C.ink3 }}>Ver ficha →</span>
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  )
}
