// RH — Desligamentos (P6)
// Colaboradores inativados com data_demissao, KPI cards e modal de registro
import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase.js'
import useTenantStore from '../../store/tenantStore.js'
import funcionariosService from '../../services/funcionariosService.js'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}
const getTenantId = () => useTenantStore.getState().selectedTenantId || 'construtora'

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
const avatarColors = ['#3D5A80','#3D7A50','#B8862C','#17273C','#7A5C3D']
function Avatar({ nome, size = 36 }) {
  const bg = avatarColors[(nome || '').charCodeAt(0) % avatarColors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#FFF', fontSize: size * 0.36, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials(nome)}
    </div>
  )
}

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '14px 18px', flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.ink, fontFamily: 'Georgia, serif', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Modal Registrar Desligamento ─────────────────────────────────
function ModalDesligar({ ativos, onClose, onSalvo }) {
  const [funcId, setFuncId] = useState('')
  const [dataDemissao, setDataDemissao] = useState(new Date().toISOString().split('T')[0])
  const [motivo, setMotivo] = useState('pedido_demissao')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const MOTIVOS = [
    { value: 'pedido_demissao', label: 'Pedido de demissão' },
    { value: 'demissao_sem_justa', label: 'Demissão sem justa causa' },
    { value: 'demissao_justa_causa', label: 'Demissão por justa causa' },
    { value: 'termino_contrato', label: 'Término de contrato' },
    { value: 'aposentadoria', label: 'Aposentadoria' },
    { value: 'falecimento', label: 'Falecimento' },
    { value: 'outro', label: 'Outro' },
  ]

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!funcId) { setErro('Selecione o colaborador.'); return }
    setSalvando(true); setErro('')
    try {
      await funcionariosService.update(Number(funcId), {
        situacao: 'Inativo',
        data_demissao: dataDemissao || null,
        status: motivo,
      })
      onSalvo()
      onClose()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar desligamento')
    } finally {
      setSalvando(false)
    }
  }

  const lbl = (t) => <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>{t}</div>
  const sel = (val, onChange, children) => (
    <select value={val} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 11px', fontSize: 13, color: val ? C.ink : C.ink3, background: C.surface, outline: 'none', fontFamily: 'inherit' }}>
      {children}
    </select>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Registrar Desligamento</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>Inativar colaborador e registrar saída</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.ink3, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {erro && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FBE9E4', borderRadius: 7, fontSize: 12, color: C.bad }}>{erro}</div>}

        <form onSubmit={handleSalvar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {lbl('Colaborador *')}
              {sel(funcId, setFuncId, [
                <option key="" value="">Selecione o colaborador…</option>,
                ...ativos.map(f => <option key={f.id} value={f.id}>{f.nome} · {f.funcao || '—'}</option>)
              ])}
            </div>
            <div>
              {lbl('Data de saída')}
              <input type="date" value={dataDemissao} onChange={e => setDataDemissao(e.target.value)}
                style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              {lbl('Motivo')}
              {sel(motivo, setMotivo, MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>))}
            </div>
            <div>
              {lbl('Observações')}
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Detalhes adicionais…"
                style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.line2}` }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ background: C.bad, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Registrando…' : 'Confirmar desligamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function calcTempoEmpresa(admissao, demissao) {
  if (!admissao) return null
  const inicio = new Date(admissao)
  const fim = demissao ? new Date(demissao) : new Date()
  const meses = Math.round((fim - inicio) / (30.44 * 24 * 3600 * 1000))
  if (meses < 12) return `${meses}m`
  const anos = Math.floor(meses / 12)
  const m = meses % 12
  return m > 0 ? `${anos}a ${m}m` : `${anos}a`
}

const MOTIVO_LABEL = {
  pedido_demissao: 'Pedido de demissão',
  demissao_sem_justa: 'Sem justa causa',
  demissao_justa_causa: 'Justa causa',
  termino_contrato: 'Término de contrato',
  aposentadoria: 'Aposentadoria',
  falecimento: 'Falecimento',
  ativo: null,
}

export default function Desligamentos() {
  const [inativos, setInativos] = useState([])
  const [ativos, setAtivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await funcionariosService.list()
      const todos = Array.isArray(res?.dados) ? res.dados : []
      setAtivos(todos.filter(f => f.situacao !== 'Inativo'))
      const inat = todos.filter(f => f.situacao === 'Inativo')
      inat.sort((a, b) => (b.data_demissao || '').localeCompare(a.data_demissao || ''))
      setInativos(inat)
    } catch { setInativos([]); setAtivos([]) } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const filtrados = inativos.filter(f => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (f.nome || '').toLowerCase().includes(q) || (f.empresa || '').toLowerCase().includes(q) || (f.funcao || '').toLowerCase().includes(q)
  })

  // KPIs
  const total = inativos.length
  const thisMonth = inativos.filter(f => {
    if (!f.data_demissao) return false
    const d = new Date(f.data_demissao)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  const temposValidos = inativos
    .filter(f => f.data_admissao && f.data_demissao)
    .map(f => (new Date(f.data_demissao) - new Date(f.data_admissao)) / (30.44 * 24 * 3600 * 1000))
  const mediaTempo = temposValidos.length > 0 ? Math.round(temposValidos.reduce((a, b) => a + b, 0) / temposValidos.length) : null

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Desligamentos</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>Histórico de colaboradores desligados</div>
        </div>
        <button onClick={() => setModal(true)} style={{ background: C.bad, border: 'none', color: '#FFF', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Registrar desligamento
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <KPICard label="Total desligados" value={total} sub={`${ativos.length} ativos`} color={C.bad} />
        <KPICard label="Este mês" value={thisMonth} sub="saídas em maio/2026" />
        <KPICard label="Tempo médio na empresa" value={mediaTempo !== null ? (mediaTempo < 12 ? `${mediaTempo}m` : `${Math.floor(mediaTempo/12)}a ${mediaTempo%12}m`) : '—'} sub="em meses" />
        <KPICard label="Com data registrada" value={inativos.filter(f => f.data_demissao).length} sub={`de ${total} desligamentos`} />
      </div>

      {/* Busca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, função ou empresa…"
          style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', width: 300 }} />
        <span style={{ fontSize: 11.5, color: C.ink3 }}>{filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
          {inativos.length === 0 ? 'Nenhum desligamento registrado.' : 'Nenhum resultado para a busca.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.line}` }}>
                {['Colaborador','Função','Empresa','Admissão','Desligamento','Tempo','Motivo'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.ink3, fontWeight: 600, fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${C.line2}`, background: i % 2 === 0 ? C.surface : '#FDFCFA' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                      <Avatar nome={f.nome} size={30} />
                      <span style={{ fontWeight: 600, color: C.ink }}>{f.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: C.ink2 }}>{f.funcao || '—'}</td>
                  <td style={{ padding: '10px 12px', color: C.ink2 }}>{f.empresa || '—'}</td>
                  <td style={{ padding: '10px 12px', color: C.ink2, whiteSpace: 'nowrap' }}>{f.data_admissao ? new Date(f.data_admissao + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={{ padding: '10px 12px', color: C.ink2, whiteSpace: 'nowrap' }}>{f.data_demissao ? new Date(f.data_demissao + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={{ padding: '10px 12px', color: C.ink3, whiteSpace: 'nowrap' }}>{calcTempoEmpresa(f.data_admissao, f.data_demissao) || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {f.status && MOTIVO_LABEL[f.status] !== null && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: '#FBE9E4', color: C.bad, fontWeight: 600 }}>
                        {MOTIVO_LABEL[f.status] || f.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalDesligar
          ativos={ativos}
          onClose={() => setModal(false)}
          onSalvo={carregar}
        />
      )}
    </div>
  )
}
