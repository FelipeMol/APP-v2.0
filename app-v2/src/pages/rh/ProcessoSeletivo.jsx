// RH — Processo Seletivo (P4)
// Kanban de candidatos: colunas por status, filtro por vaga, modal de candidato
import { useState, useEffect } from 'react'
import rhService from '../../services/rhService'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Status config ───────────────────────────────────────────────
const COLUNAS = [
  { key: 'cadastrado',          label: 'Triagem',        color: C.ink3,  bg: '#F4F1EC' },
  { key: 'em_analise',          label: 'Em análise',     color: C.info,  bg: '#E8EEF5' },
  { key: 'entrevista_agendada', label: 'Entrevista',     color: C.warn,  bg: '#FDF3DF' },
  { key: 'aprovado',            label: 'Aprovado',       color: C.ok,    bg: '#E4F1E8' },
  { key: 'reprovado',           label: 'Reprovado',      color: C.bad,   bg: '#FBE9E4' },
  { key: 'contratado',          label: 'Contratado',     color: '#3D5A80', bg: '#E2ECF8' },
]

const ORIGEM_LABEL = { indicacao: 'Indicação', site: 'Site', redes_sociais: 'Redes Sociais', outros: 'Outros' }

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Avatar ──────────────────────────────────────────────────────
function Avatar({ nome, size = 36 }) {
  const colors = ['#3D5A80','#3D7A50','#B8862C','#17273C','#7A5C3D']
  const idx = (nome || '').charCodeAt(0) % colors.length
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors[idx], color: '#FFF', fontSize: size * 0.36, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '0.01em' }}>
      {initials(nome)}
    </div>
  )
}

// ── Pill ────────────────────────────────────────────────────────
function Pill({ label, bg, color }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: bg || C.surface2, color: color || C.ink3, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {(label || '').toUpperCase()}
    </span>
  )
}

// ── Modal Candidato ─────────────────────────────────────────────
function ModalCandidato({ cand, onClose, onAtualizar }) {
  const [novoStatus, setNovoStatus] = useState(cand.status)
  const [obs, setObs] = useState(cand.observacoes || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const col = COLUNAS.find(c => c.key === cand.status) || COLUNAS[0]

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await rhService.atualizarCandidato({ id: cand.id, status: novoStatus, observacoes: obs })
      onAtualizar()
      onClose()
    } catch (e) {
      setErro(e.message || 'Erro ao atualizar')
    } finally {
      setSalvando(false)
    }
  }

  const campo = (label, value) => (
    <div>
      <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? C.ink : C.ink3 }}>{value || '—'}</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 14, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: `1px solid ${C.line2}`, display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar nome={cand.nome} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>{cand.nome}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>{cand.telefone || '—'} {cand.email ? `· ${cand.email}` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Pill label={col.label} bg={col.bg} color={col.color} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.ink3, cursor: 'pointer', lineHeight: 1, padding: 2 }}>×</button>
          </div>
        </div>

        {/* Dados */}
        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
          {campo('Cidade/Estado', [cand.cidade, cand.estado].filter(Boolean).join(' - '))}
          {campo('Pretensão salarial', cand.pretensao_salarial ? `R$ ${Number(cand.pretensao_salarial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null)}
          {campo('Origem', ORIGEM_LABEL[cand.origem] || cand.origem)}
          {campo('Indicado por', cand.indicado_por)}
          {campo('Disponibilidade imediata', cand.disponibilidade_imediata ? 'Sim' : 'Não')}
          {campo('Cadastrado em', cand.created_at ? new Date(cand.created_at).toLocaleDateString('pt-BR') : null)}
          {cand.requisicoes_vagas && (
            <div style={{ gridColumn: 'span 2' }}>
              {campo('Vaga', `${cand.requisicoes_vagas?.funcoes?.nome || '—'} · ${cand.requisicoes_vagas?.obras?.nome || '—'}`)}
            </div>
          )}
        </div>

        {erro && <div style={{ margin: '0 24px', padding: '10px 14px', background: '#FBE9E4', borderRadius: 7, fontSize: 12, color: C.bad }}>{erro}</div>}

        {/* Ações */}
        <div style={{ padding: '16px 24px 22px', borderTop: `1px solid ${C.line2}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Mover para</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COLUNAS.filter(c => c.key !== cand.status).map(c => (
                <button key={c.key} onClick={() => setNovoStatus(c.key)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: `1.5px solid ${novoStatus === c.key ? c.color : C.line}`, background: novoStatus === c.key ? c.bg : 'transparent', color: novoStatus === c.key ? c.color : C.ink2, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Observações</div>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Anotações sobre o candidato…"
              style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 13, fontWeight: 500, padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              Fechar
            </button>
            <button onClick={handleSalvar} disabled={salvando} style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Novo Candidato ────────────────────────────────────────
function ModalNovoCandidato({ requisicoes, onClose, onSalvo }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', cidade: '', estado: '', pretensao_salarial: '', disponibilidade_imediata: 1, origem: 'outros', indicado_por: '', requisicao_id: '', observacoes: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome) { setErro('Nome é obrigatório.'); return }
    setSalvando(true)
    try {
      await rhService.criarCandidato({ ...form, requisicao_id: form.requisicao_id ? Number(form.requisicao_id) : null, pretensao_salarial: form.pretensao_salarial ? Number(form.pretensao_salarial) : null, disponibilidade_imediata: Number(form.disponibilidade_imediata), status: 'cadastrado' })
      onSalvo()
      onClose()
    } catch (err) {
      setErro(err.message || 'Erro ao cadastrar candidato')
    } finally {
      setSalvando(false)
    }
  }

  const inp = (k, ph, type = 'text', extra = {}) => (
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
      style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...extra }} />
  )
  const lbl = (txt) => <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{txt}</div>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Novo Candidato</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>Cadastrar candidato no processo seletivo</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.ink3, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {erro && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FBE9E4', borderRadius: 7, fontSize: 12, color: C.bad }}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>{lbl('Nome completo *')}{inp('nome', 'Nome do candidato')}</div>
            <div>{lbl('Telefone')}{inp('telefone', '(99) 99999-9999', 'tel')}</div>
            <div>{lbl('E-mail')}{inp('email', 'email@exemplo.com', 'email')}</div>
            <div>{lbl('Cidade')}{inp('cidade', 'Cidade')}</div>
            <div>{lbl('Estado')}<input value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0,2))} maxLength={2} placeholder="UF"
              style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', textTransform: 'uppercase' }} /></div>
            <div>{lbl('Pretensão salarial')}{inp('pretensao_salarial', 'R$ 0,00', 'number', { min: 0 })}</div>
            <div>{lbl('Origem')}
              <select value={form.origem} onChange={e => set('origem', e.target.value)} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit' }}>
                {Object.entries(ORIGEM_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {form.origem === 'indicacao' && <div style={{ gridColumn: 'span 2' }}>{lbl('Indicado por')}{inp('indicado_por', 'Nome de quem indicou')}</div>}
            <div style={{ gridColumn: 'span 2' }}>{lbl('Vincular a vaga (opcional)')}
              <select value={form.requisicao_id} onChange={e => set('requisicao_id', e.target.value)} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: form.requisicao_id ? C.ink : C.ink3, background: C.surface, outline: 'none', fontFamily: 'inherit' }}>
                <option value="">Sem vaga específica</option>
                {requisicoes.filter(r => r.status === 'aberta' || r.status === 'em_selecao').map(r => (
                  <option key={r.id} value={r.id}>#{r.id} · {r.funcoes?.nome || '—'} · {r.obras?.nome || '—'}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="disp" checked={!!form.disponibilidade_imediata} onChange={e => set('disponibilidade_imediata', e.target.checked ? 1 : 0)} style={{ width: 14, height: 14 }} />
              <label htmlFor="disp" style={{ fontSize: 12.5, color: C.ink, cursor: 'pointer' }}>Disponibilidade imediata</label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.line2}` }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando…' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Card Candidato ──────────────────────────────────────────────
function CardCandidato({ cand, onClick }) {
  const dias = cand.created_at ? Math.floor((Date.now() - new Date(cand.created_at)) / 86400000) : 0
  const vaga = cand.requisicoes_vagas
  return (
    <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 9, padding: '12px 13px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 8 }}>
        <Avatar nome={cand.nome} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{cand.nome}</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>{cand.telefone || '—'}</div>
        </div>
      </div>
      {vaga && (
        <div style={{ fontSize: 10.5, color: C.ink2, background: C.surface2, borderRadius: 5, padding: '3px 7px', marginBottom: 7, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {vaga.funcoes?.nome || '—'} · {vaga.obras?.nome || '—'}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: C.ink3 }}>
        <span>{ORIGEM_LABEL[cand.origem] || cand.origem}</span>
        <span>{dias === 0 ? 'hoje' : `${dias}d`}</span>
      </div>
    </div>
  )
}

// ── Coluna Kanban ───────────────────────────────────────────────
function Coluna({ col, candidatos, onCard }) {
  return (
    <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      {/* Cabeçalho da coluna */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: '0.01em' }}>{col.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, padding: '1px 7px', borderRadius: 10 }}>{candidatos.length}</span>
      </div>
      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {candidatos.length === 0 ? (
          <div style={{ border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: '20px 0', textAlign: 'center', color: C.ink3, fontSize: 11 }}>Vazio</div>
        ) : (
          candidatos.map(c => <CardCandidato key={c.id} cand={c} onClick={() => onCard(c)} />)
        )}
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────
export default function ProcessoSeletivo() {
  const [candidatos, setCandidatos] = useState([])
  const [requisicoes, setRequisicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroVaga, setFiltroVaga] = useState('')
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [modalNovo, setModalNovo] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const [cands, reqs] = await Promise.all([
        rhService.listarCandidatos(),
        rhService.listarRequisicoes().catch(() => []),
      ])
      setCandidatos(cands)
      setRequisicoes(reqs)
    } catch {
      setCandidatos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const filtrados = candidatos.filter(c => {
    if (filtroVaga && String(c.requisicao_id) !== filtroVaga) return false
    if (busca) {
      const q = busca.toLowerCase()
      return c.nome.toLowerCase().includes(q) || (c.telefone || '').includes(q)
    }
    return true
  })

  const vagasAbertas = requisicoes.filter(r => r.status === 'aberta' || r.status === 'em_selecao')

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Processo Seletivo</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>{candidatos.length} candidato{candidatos.length !== 1 ? 's' : ''} · {vagasAbertas.length} vaga{vagasAbertas.length !== 1 ? 's' : ''} em aberto</div>
        </div>
        <button onClick={() => setModalNovo(true)} style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Novo candidato
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar candidato…"
          style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 13px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', width: 220 }} />
        <select value={filtroVaga} onChange={e => setFiltroVaga(e.target.value)}
          style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, color: filtroVaga ? C.ink : C.ink3, background: C.surface, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', maxWidth: 280 }}>
          <option value="">Todas as vagas</option>
          {requisicoes.map(r => (
            <option key={r.id} value={r.id}>#{r.id} · {r.funcoes?.nome || '—'} · {r.obras?.nome || '—'}</option>
          ))}
        </select>
        {(busca || filtroVaga) && (
          <button onClick={() => { setBusca(''); setFiltroVaga('') }} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink3, fontSize: 12, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            Limpar filtros
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.ink3 }}>
          {filtrados.length} candidato{filtrados.length !== 1 ? 's' : ''} exibido{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: C.ink3, fontSize: 13 }}>Carregando candidatos…</div>
      ) : (
        /* Kanban */
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
          {COLUNAS.map(col => (
            <Coluna key={col.key} col={col} candidatos={filtrados.filter(c => c.status === col.key)} onCard={setSelecionado} />
          ))}
        </div>
      )}

      {/* Modal detalhes candidato */}
      {selecionado && (
        <ModalCandidato cand={selecionado} onClose={() => setSelecionado(null)} onAtualizar={() => { setSelecionado(null); carregar() }} />
      )}

      {/* Modal novo candidato */}
      {modalNovo && (
        <ModalNovoCandidato requisicoes={requisicoes} onClose={() => setModalNovo(false)} onSalvo={carregar} />
      )}
    </div>
  )
}
