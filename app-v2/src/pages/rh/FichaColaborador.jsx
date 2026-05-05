// RH — Ficha do Colaborador (P5)
// Modal de 8 abas: Dados Pessoais | Documentos | Experiência | Obras | Exames | Disciplinar | EPIs | Avaliações
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

const TABS = [
  { key: 'dados',       label: 'Dados Pessoais' },
  { key: 'documentos',  label: 'Documentos' },
  { key: 'experiencia', label: 'Experiência' },
  { key: 'obras',       label: 'Obras' },
  { key: 'exames',      label: 'Exames' },
  { key: 'disciplinar', label: 'Disciplinar' },
  { key: 'epis',        label: 'EPIs' },
  { key: 'avaliacoes',  label: 'Avaliações' },
]

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const avatarColors = ['#3D5A80','#3D7A50','#B8862C','#17273C','#7A5C3D','#5A3D7A']
function avatarColor(nome) { return avatarColors[(nome || '').charCodeAt(0) % avatarColors.length] }

function Avatar({ nome, size = 48 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(nome), color: '#FFF', fontSize: size * 0.36, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials(nome)}
    </div>
  )
}

function StatusBadge({ situacao }) {
  const ok = situacao === 'Ativo'
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, background: ok ? '#E4F1E8' : '#FBE9E4', color: ok ? C.ok : C.bad, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
      {situacao || 'Ativo'}
    </span>
  )
}

// ── Aba Dados Pessoais ───────────────────────────────────────────
function TabDados({ funcionario, onAtualizado }) {
  const [form, setForm] = useState({ nome: funcionario.nome || '', funcao: funcionario.funcao || '', empresa: funcionario.empresa || '', situacao: funcionario.situacao || 'Ativo' })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSalvar = async () => {
    setSalvando(true); setMsg('')
    try {
      await funcionariosService.update(funcionario.id, form)
      setMsg('Salvo com sucesso!')
      onAtualizado({ ...funcionario, ...form })
    } catch (e) {
      setMsg('Erro: ' + (e.message || 'falhou'))
    } finally {
      setSalvando(false)
    }
  }

  const inp = (label, key, opts = {}) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {opts.select ? (
        <select value={form[key]} onChange={e => set(key, e.target.value)} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '9px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit' }}>
          {opts.select.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type="text" value={form[key]} onChange={e => set(key, e.target.value)} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '9px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
        <div style={{ gridColumn: 'span 2' }}>{inp('Nome completo', 'nome')}</div>
        {inp('Função / Cargo', 'funcao')}
        {inp('Empresa', 'empresa')}
        {inp('Situação', 'situacao', { select: [{ value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }] })}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>Cadastrado em</div>
          <div style={{ fontSize: 13, color: C.ink2 }}>{funcionario.criado_em ? new Date(funcionario.criado_em).toLocaleDateString('pt-BR') : '—'}</div>
        </div>
      </div>
      {msg && <div style={{ padding: '10px 14px', background: msg.startsWith('Erro') ? '#FBE9E4' : '#E4F1E8', borderRadius: 7, fontSize: 12, color: msg.startsWith('Erro') ? C.bad : C.ok }}>{msg}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSalvar} disabled={salvando} style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

// ── Aba Experiência (Lançamentos) ────────────────────────────────
function TabExperiencia({ funcionario }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase.from('lancamentos')
          .select('data, funcao, empresa, obra, horas, diarias, observacao')
          .eq('tenant_id', getTenantId())
          .ilike('funcionario', `%${funcionario.nome}%`)
          .order('data', { ascending: false })
          .limit(200)
        setRows(data || [])
      } catch { setRows([]) } finally { setLoading(false) }
    }
    fetch()
  }, [funcionario.id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando lançamentos…</div>

  const total_dias = rows.reduce((a, r) => a + Number(r.diarias || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <div style={{ background: C.surface2, borderRadius: 9, padding: '12px 18px', minWidth: 100 }}>
          <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Registros</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: 'Georgia, serif' }}>{rows.length}</div>
        </div>
        <div style={{ background: C.surface2, borderRadius: 9, padding: '12px 18px', minWidth: 100 }}>
          <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Total dias</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: 'Georgia, serif' }}>{total_dias.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>Nenhum lançamento encontrado para este colaborador.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.line}` }}>
                {['Data','Função','Empresa','Obra','Diárias','Horas'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: C.ink3, fontWeight: 600, fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.line2}`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ padding: '7px 10px', color: C.ink, whiteSpace: 'nowrap' }}>{r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.ink2 }}>{r.funcao || '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.ink2 }}>{r.empresa || '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.ink2 }}>{r.obra || '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.ink, textAlign: 'right' }}>{r.diarias || '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.ink2, whiteSpace: 'nowrap' }}>{r.horas || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Aba Obras ────────────────────────────────────────────────────
function TabObras({ funcionario }) {
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase.from('lancamentos')
          .select('obra, diarias')
          .eq('tenant_id', getTenantId())
          .ilike('funcionario', `%${funcionario.nome}%`)
          .not('obra', 'is', null)
        if (data) {
          const mapa = {}
          data.forEach(r => {
            if (!r.obra) return
            if (!mapa[r.obra]) mapa[r.obra] = { obra: r.obra, dias: 0, registros: 0 }
            mapa[r.obra].dias += Number(r.diarias || 0)
            mapa[r.obra].registros++
          })
          setObras(Object.values(mapa).sort((a, b) => b.dias - a.dias))
        }
      } catch { setObras([]) } finally { setLoading(false) }
    }
    fetch()
  }, [funcionario.id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando obras…</div>

  return obras.length === 0 ? (
    <div style={{ padding: '40px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>Nenhuma obra registrada para este colaborador.</div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {obras.map((o, i) => {
        const maxDias = obras[0].dias || 1
        const pct = Math.round((o.dias / maxDias) * 100)
        return (
          <div key={i} style={{ background: C.surface2, borderRadius: 9, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{o.obra}</span>
              <span style={{ fontSize: 12, color: C.ink3 }}>{o.dias.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} dias · {o.registros} reg.</span>
            </div>
            <div style={{ height: 5, background: C.line2, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: C.navy, borderRadius: 3 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Aba Avaliações ────────────────────────────────────────────────
function TabAvaliacoes({ funcionario }) {
  const [avs, setAvs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase.from('avaliacoes')
          .select('*')
          .eq('funcionario_id', funcionario.id)
          .order('data_avaliacao', { ascending: false })
        setAvs(data || [])
      } catch { setAvs([]) } finally { setLoading(false) }
    }
    fetch()
  }, [funcionario.id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando avaliações…</div>

  const CRITERIOS = [
    ['pontualidade', 'Pontualidade'],
    ['qualidade', 'Qualidade'],
    ['trabalho_equipe', 'Trabalho em equipe'],
    ['iniciativa', 'Iniciativa'],
    ['conhecimento_tecnico', 'Conhecimento técnico'],
    ['capacidade_aprendizado', 'Cap. aprendizado'],
  ]

  const Estrelas = ({ nota }) => {
    const n = Math.round(Number(nota || 0))
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: i <= n ? C.amber : C.line }} />
        ))}
        <span style={{ fontSize: 10.5, color: C.ink3, marginLeft: 4 }}>{nota || 0}/5</span>
      </div>
    )
  }

  return avs.length === 0 ? (
    <div style={{ padding: '40px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>Nenhuma avaliação registrada.</div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {avs.map((av, i) => {
        const media = CRITERIOS.reduce((s, [k]) => s + Number(av[k] || 0), 0) / CRITERIOS.length
        return (
          <div key={i} style={{ border: `1px solid ${C.line2}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{av.data_avaliacao ? new Date(av.data_avaliacao + 'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
              <div style={{ background: C.surface2, borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: C.navy }}>Média {media.toFixed(1)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              {CRITERIOS.map(([key, label]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.ink2 }}>{label}</span>
                  <Estrelas nota={av[key]} />
                </div>
              ))}
            </div>
            {av.observacoes && <div style={{ marginTop: 12, fontSize: 12, color: C.ink2, borderTop: `1px solid ${C.line2}`, paddingTop: 10 }}>{av.observacoes}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ── Aba Placeholder ──────────────────────────────────────────────
function TabPlaceholder({ label, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: C.ink3, gap: 10 }}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink2 }}>{label}</div>
      <div style={{ fontSize: 12.5 }}>Em breve disponível nesta ficha.</div>
    </div>
  )
}

// ── Modal Principal ──────────────────────────────────────────────
export default function FichaColaborador({ funcionario, onClose, onAtualizado }) {
  const [activeTab, setActiveTab] = useState('dados')
  const [func, setFunc] = useState(funcionario)

  const handleAtualizado = (updated) => {
    setFunc(updated)
    if (onAtualizado) onAtualizado(updated)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 680, background: C.surface, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: `1px solid ${C.line2}`, background: C.navy }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Avatar nome={func.nome} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#FFF', lineHeight: 1.25 }}>{func.nome}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>{func.funcao || '—'} · {func.empresa || '—'}</div>
              <div style={{ marginTop: 7 }}><StatusBadge situacao={func.situacao} /></div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#FFF', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ borderBottom: `1px solid ${C.line2}`, display: 'flex', overflowX: 'auto', background: C.surface, flexShrink: 0 }}>
          {TABS.map(t => {
            const on = t.key === activeTab
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding: '10px 14px', background: 'none', border: 'none', fontSize: 12, fontWeight: on ? 700 : 500, color: on ? C.ink : C.ink3, borderBottom: on ? `2px solid ${C.navy}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.1s' }}>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24, flex: 1 }}>
          {activeTab === 'dados'       && <TabDados funcionario={func} onAtualizado={handleAtualizado} />}
          {activeTab === 'documentos'  && <TabPlaceholder label="Documentos" icon="📄" />}
          {activeTab === 'experiencia' && <TabExperiencia funcionario={func} />}
          {activeTab === 'obras'       && <TabObras funcionario={func} />}
          {activeTab === 'exames'      && <TabPlaceholder label="Exames Ocupacionais" icon="🩺" />}
          {activeTab === 'disciplinar' && <TabPlaceholder label="Histórico Disciplinar" icon="⚖️" />}
          {activeTab === 'epis'        && <TabPlaceholder label="EPIs Entregues" icon="🦺" />}
          {activeTab === 'avaliacoes'  && <TabAvaliacoes funcionario={func} />}
        </div>
      </div>
    </div>
  )
}
