// RH — Requisições de Vagas  (P2)
// Padrão visual: inline styles, paleta C, sem shadcn
import { useState, useEffect } from 'react'
import rhService from '../../services/rhService'
import obrasService from '../../services/obrasService'
import funcoesService from '../../services/funcoesService'
import useAuthStore from '../../store/authStore'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Helpers ─────────────────────────────────────────────────────
function TH(extra = {}) {
  return { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 12px', borderBottom: `1px solid ${C.line}`, color: C.ink3, textAlign: 'left', background: C.surface2, ...extra }
}
function TD(extra = {}) {
  return { padding: '11px 12px', verticalAlign: 'middle', fontSize: 12.5, color: C.ink, borderBottom: `1px solid ${C.line2}`, ...extra }
}

// ── Pills ────────────────────────────────────────────────────────
const STATUS_CFG = {
  aberta:      { bg: '#E2E9F2', color: '#3D5A80', label: 'Aberta' },
  em_selecao:  { bg: '#FDF3DF', color: '#B8862C', label: 'Em Seleção' },
  aprovada:    { bg: '#E4F1E8', color: '#3D7A50', label: 'Aprovada' },
  contratada:  { bg: '#E4F1E8', color: '#3D7A50', label: 'Contratada' },
  cancelada:   { bg: '#FBE9E4', color: '#B84A33', label: 'Cancelada' },
}
const URG_CFG = {
  baixa:   { bg: C.surface2,  color: C.ink3,  label: 'Baixa' },
  media:   { bg: '#E2E9F2',   color: '#3D5A80', label: 'Média' },
  alta:    { bg: '#FDF3DF',   color: '#B8862C', label: 'Alta' },
  critica: { bg: '#FBE9E4',   color: '#B84A33', label: 'Crítica' },
}

function Pill({ cfg, small }) {
  if (!cfg) return null
  return (
    <span style={{ display: 'inline-block', padding: small ? '2px 7px' : '3px 9px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontSize: small ? 9.5 : 11, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {cfg.label?.toUpperCase()}
    </span>
  )
}

// ── StatusBar ─────────────────────────────────────────────────────
function StatusBar({ reqs, filtro, onFiltro }) {
  const counts = {
    '':           reqs.length,
    aberta:       reqs.filter(r => r.status === 'aberta').length,
    em_selecao:   reqs.filter(r => r.status === 'em_selecao').length,
    aprovada:     reqs.filter(r => r.status === 'aprovada').length,
    contratada:   reqs.filter(r => r.status === 'contratada').length,
    cancelada:    reqs.filter(r => r.status === 'cancelada').length,
  }
  const items = [
    { key: '',         label: 'Todas',       count: counts[''] },
    { key: 'aberta',   label: 'Abertas',     count: counts.aberta },
    { key: 'em_selecao', label: 'Em Seleção', count: counts.em_selecao },
    { key: 'aprovada', label: 'Aprovadas',   count: counts.aprovada },
    { key: 'contratada', label: 'Contratadas', count: counts.contratada },
    { key: 'cancelada', label: 'Canceladas', count: counts.cancelada },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
      {items.map(it => {
        const on = filtro === it.key
        return (
          <button key={it.key} onClick={() => onFiltro(it.key)}
            style={{ background: on ? C.navy : C.surface, border: `1px solid ${on ? C.navy : C.line}`, color: on ? '#FFF' : C.ink2, fontSize: 12, fontWeight: on ? 700 : 500, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            {it.label}
            <span style={{ background: on ? 'rgba(255,255,255,0.2)' : C.surface2, color: on ? '#FFF' : C.ink3, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{it.count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Modal Nova Requisição ──────────────────────────────────────────
function ModalNovaRequisicao({ onClose, onSalvo }) {
  const user = useAuthStore(s => s.user)
  const [form, setForm] = useState({ obra_id: '', funcao_id: '', quantidade: 1, urgencia: 'media', justificativa: '', data_limite: '', observacoes: '' })
  const [obras, setObras] = useState([])
  const [funcoes, setFuncoes] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    obrasService.list().then(r => setObras(r.dados || [])).catch(() => {})
    funcoesService.list().then(d => setFuncoes(d || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.obra_id || !form.funcao_id) { setErro('Selecione a Obra e a Função.'); return }
    if (!form.justificativa) { setErro('Justificativa é obrigatória.'); return }
    setSalvando(true)
    try {
      await rhService.criarRequisicao({
        obra_id: Number(form.obra_id),
        funcao_id: Number(form.funcao_id),
        requisitante_id: user?.id,
        quantidade: Number(form.quantidade),
        urgencia: form.urgencia,
        justificativa: form.justificativa,
        data_limite: form.data_limite || null,
        observacoes: form.observacoes,
      })
      onSalvo()
      onClose()
    } catch (err) {
      setErro(err.message || 'Erro ao criar requisição')
    } finally {
      setSalvando(false)
    }
  }

  const inp = (k, placeholder, type = 'text', extra = {}) => (
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
      style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...extra }} />
  )
  const selSimple = (k, options) => (
    <select value={form[k]} onChange={e => set(k, e.target.value)}
      style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
  const selDB = (k, items, placeholder) => (
    <select value={form[k]} onChange={e => set(k, e.target.value)}
      style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: form[k] ? C.ink : C.ink3, background: C.surface, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
      <option value="">{placeholder}</option>
      {items.map(it => <option key={it.id} value={it.id}>{it.nome}</option>)}
    </select>
  )
  const label = (txt) => <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{txt}</div>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Nova Requisição de Vaga</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>Preencha os dados para abrir a requisição</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.ink3, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {erro && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FBE9E4', borderRadius: 7, fontSize: 12, color: C.bad }}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              {label('Obra')}
              {selDB('obra_id', obras, 'Selecione a obra…')}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              {label('Função / Cargo')}
              {selDB('funcao_id', funcoes, 'Selecione a função…')}
            </div>
            <div>
              {label('Quantidade')}
              {inp('quantidade', '1', 'number', { min: 1 })}
            </div>
            <div>
              {label('Urgência')}
              {selSimple('urgencia', [['baixa','Baixa'],['media','Média'],['alta','Alta'],['critica','Crítica']])}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              {label('Justificativa *')}
              <textarea value={form.justificativa} onChange={e => set('justificativa', e.target.value)} placeholder="Por que precisa dessa vaga?" rows={3}
                style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div>
              {label('Data limite (opcional)')}
              {inp('data_limite', '', 'date')}
            </div>
            <div>
              {label('Observações')}
              {inp('observacoes', 'Observações adicionais')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.line2}` }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando} style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando…' : 'Abrir Requisição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Linha da tabela ───────────────────────────────────────────────
function ReqRow({ req, onAtualizar }) {
  const [expandido, setExpandido] = useState(false)

  const handleAprovar = async (nivel) => {
    try { await rhService.aprovarRequisicao(req.id, nivel); onAtualizar() } catch {}
  }
  const handleStatus = async (status) => {
    try { await rhService.atualizarStatusRequisicao(req.id, status, ''); onAtualizar() } catch {}
  }

  const dataAberta = (req.created_at || req.data_abertura) ? new Date(req.created_at || req.data_abertura).toLocaleDateString('pt-BR') : '—'
  const dataLimite = req.data_limite ? new Date(req.data_limite).toLocaleDateString('pt-BR') : '—'
  const diasAberta = (req.created_at || req.data_abertura) ? Math.floor((Date.now() - new Date(req.created_at || req.data_abertura)) / 86400000) : 0

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setExpandido(x => !x)}>
        <td style={TD()}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.ink3, fontWeight: 600 }}>#{req.id}</span>
        </td>
        <td style={TD({ fontWeight: 500 })}>{req.funcoes?.nome || req.funcao || '—'}</td>
        <td style={TD()}>{req.obras?.nome || '—'}</td>
        <td style={TD({ textAlign: 'center', fontWeight: 700 })}>{req.quantidade ?? 1}</td>
        <td style={TD()}><Pill cfg={URG_CFG[req.urgencia] || URG_CFG.media} small /></td>
        <td style={TD()}><Pill cfg={STATUS_CFG[req.status] || STATUS_CFG.aberta} small /></td>
        <td style={TD({ color: C.ink3 })}>{dataAberta}</td>
        <td style={TD({ color: diasAberta > 14 ? C.bad : C.ink3 })}>
          {diasAberta > 0 ? `${diasAberta}d` : 'hoje'}
        </td>
        <td style={TD()} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 5 }}>
            {req.status === 'aberta' && (
              <>
                {!req.aprovado_nivel1 && (
                  <button onClick={() => handleAprovar(1)} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Nível 1</button>
                )}
                {req.aprovado_nivel1 && !req.aprovado_nivel2 && (
                  <button onClick={() => handleAprovar(2)} style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Nível 2</button>
                )}
                {req.aprovado_nivel1 && req.aprovado_nivel2 && (
                  <button onClick={() => handleStatus('em_selecao')} style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Iniciar seleção</button>
                )}
              </>
            )}
            {req.status === 'em_selecao' && (
              <button onClick={() => handleStatus('contratada')} style={{ background: C.ok, border: 'none', color: '#FFF', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Contratar</button>
            )}
          </div>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={9} style={{ padding: '12px 16px 16px', background: '#FAFAF8', borderBottom: `1px solid ${C.line2}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                ['Justificativa', req.justificativa || '—'],
                ['Observações',   req.observacoes   || '—'],
                ['Data limite',   dataLimite],
                ['Dias em aberto', `${diasAberta} dia${diasAberta !== 1 ? 's' : ''}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 12.5, color: C.ink }}>{v}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function RequisicoesVagas() {
  const [todas, setTodas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await rhService.listarRequisicoes()
      setTodas(data)
    } catch (e) {
      setErro(e.message || 'Erro ao carregar requisições')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const filtradas = todas.filter(r => {
    if (filtroStatus && r.status !== filtroStatus) return false
    if (busca) {
      const q = busca.toLowerCase()
      return (r.funcao || r.funcao_nome || '').toLowerCase().includes(q)
          || (r.obras?.nome || r.obra_nome || '').toLowerCase().includes(q)
    }
    return true
  })

  const criticas = todas.filter(r => r.urgencia === 'critica' && r.status === 'aberta').length
  const aguardandoAp = todas.filter(r => r.status === 'aberta' && r.aprovado_nivel1 && !r.aprovado_nivel2).length

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Requisições de Vagas</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>{todas.length} requisições · {criticas > 0 ? `${criticas} crítica${criticas > 1 ? 's' : ''}` : 'nenhuma crítica'}{aguardandoAp > 0 ? ` · ${aguardandoAp} aguardando aprovação` : ''}</div>
        </div>
        <button onClick={() => setModal(true)} style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nova requisição
        </button>
      </div>

      {/* Status bar */}
      <StatusBar reqs={todas} filtro={filtroStatus} onFiltro={setFiltroStatus} />

      {/* Busca */}
      <div style={{ marginBottom: 14 }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por função ou obra…"
          style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', width: 300 }} />
      </div>

      {erro && (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: '#FBE9E4', borderRadius: 8, fontSize: 12, color: C.bad }}>{erro}</div>
      )}

      {/* Tabela */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.ink3, fontSize: 13 }}>Carregando requisições…</div>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: C.ink3 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{busca || filtroStatus ? 'Nenhuma requisição encontrada com esse filtro' : 'Nenhuma requisição cadastrada'}</div>
            {!busca && !filtroStatus && (
              <button onClick={() => setModal(true)} style={{ marginTop: 14, background: C.navy, border: 'none', color: '#FFF', fontSize: 12, fontWeight: 600, padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                Abrir primeira requisição
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH()}>ID</th>
                  <th style={TH()}>Função</th>
                  <th style={TH()}>Obra</th>
                  <th style={TH({ textAlign: 'center' })}>Qtd</th>
                  <th style={TH()}>Urgência</th>
                  <th style={TH()}>Status</th>
                  <th style={TH()}>Aberta em</th>
                  <th style={TH()}>Tempo</th>
                  <th style={TH()}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(r => (
                  <ReqRow key={r.id} req={r} onAtualizar={carregar} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rodapé count */}
      {filtradas.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.ink3, textAlign: 'right' }}>
          Exibindo {filtradas.length} de {todas.length} requisições
        </div>
      )}

      {/* Modal */}
      {modal && <ModalNovaRequisicao onClose={() => setModal(false)} onSalvo={carregar} />}
    </div>
  )
}
