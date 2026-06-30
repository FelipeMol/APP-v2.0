// RH — Ficha do Colaborador (P5)
// Modal de 8 abas: Dados Pessoais | Documentos | Experiência | Obras | Exames | Disciplinar | EPIs | Avaliações
import { useState, useEffect, useRef } from 'react'
import supabase from '../../lib/supabase.js'
import useTenantStore from '../../store/tenantStore.js'
import funcionariosService from '../../services/funcionariosService.js'
import { CID10_COMUM } from '../../utils/cid10_common.js'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

const getTenantId = () => useTenantStore.getState().selectedTenantId || 'construtora'

const TABS = [
  { key: 'dados',       label: 'Identificação' },
  { key: 'documentos',  label: 'Documentação', badge: '2' },
  { key: 'exames',      label: 'Exames ocupacionais' },
  { key: 'atestados',   label: 'Atestados' },
  { key: 'experiencia', label: 'Experiência', dot: true },
  { key: 'avaliacoes',  label: 'Avaliações' },
  { key: 'obras',       label: 'Histórico de obras' },
  { key: 'disciplinar', label: 'Disciplinar' },
  { key: 'epis',        label: 'Integração & EPIs' },
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

// ── CID Combobox ─────────────────────────────────────────────────
function CIDCombobox({ value, descricao, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim().length === 0
    ? CID10_COMUM.slice(0, 40)
    : CID10_COMUM.filter(c =>
        c.codigo.toLowerCase().includes(query.toLowerCase()) ||
        c.descricao.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50)

  const handleSelect = (item) => {
    setQuery(item.codigo)
    setOpen(false)
    onSelect(item)
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    setOpen(true)
    // Se o usuário limpar, limpa a seleção
    if (!e.target.value.trim()) onSelect({ codigo: '', descricao: '' })
  }

  const handleFocus = () => setOpen(true)

  return (
    <div ref={ref} style={{ position: 'relative', gridColumn: 'span 2' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>CID-10</div>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
        {/* Código */}
        <input
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Ex: M54.5"
          autoComplete="off"
          style={{ border: `1px solid ${C.line}`, borderRadius: 7, padding: '9px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}
        />
        {/* Descrição (readonly, preenchida automaticamente) */}
        <input
          value={descricao}
          readOnly
          placeholder="Selecione o código ao lado…"
          style={{ border: `1px solid ${C.line}`, borderRadius: 7, padding: '9px 11px', fontSize: 13, color: C.ink2, background: C.surface2, outline: 'none', fontFamily: 'inherit' }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 260, overflowY: 'auto', marginTop: 3,
        }}>
          {filtered.map(item => (
            <div
              key={item.codigo}
              onMouseDown={() => handleSelect(item)}
              style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface2}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, color: C.info, minWidth: 60, flexShrink: 0 }}>{item.codigo}</span>
              <span style={{ color: C.ink2 }}>{item.descricao}</span>
            </div>
          ))}
          {CID10_COMUM.filter(c =>
            c.codigo.toLowerCase().includes(query.toLowerCase()) ||
            c.descricao.toLowerCase().includes(query.toLowerCase())
          ).length > 50 && (
            <div style={{ padding: '8px 14px', fontSize: 11.5, color: C.ink3, borderTop: `1px solid ${C.line2}` }}>Refine a busca para ver mais resultados.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Aba Atestados ────────────────────────────────────────────────
const FORM_EMPTY = { data_inicio: '', data_fim: '', cid_codigo: '', cid_descricao: '', observacoes: '' }

function TabAtestados({ funcionario }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(FORM_EMPTY)
  const [formDisplay, setFormDisplay] = useState({ data_inicio: '', data_fim: '' })
  const [foto, setFoto]       = useState(null)       // File object
  const [fotoPreview, setFotoPreview] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]         = useState('')
  const [preview, setPreview] = useState(null)       // URL to show full-size

  // Extrai o "path" dentro do bucket a partir de um foto_url salvo
  const extrairPath = (foto_url) => {
    if (!foto_url) return null
    // URL completa do Supabase storage: .../object/sign/atestados/<path>?...
    if (/^https?:\/\//.test(foto_url)) {
      const marker = '/atestados/'
      const idx = foto_url.indexOf(marker)
      if (idx >= 0) return foto_url.substring(idx + marker.length)
      return null
    }
    // Path relativo direto (ex: "construtora/123/123456.jpg" ou "123/123456.jpg")
    return foto_url
  }

  const carregar = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('atestados')
        .select('*')
        .eq('tenant_id', getTenantId())
        .eq('funcionario_id', funcionario.id)
        .order('data_inicio', { ascending: false })
      const list = data || []
      // Bucket é privado: precisamos gerar signed URLs para exibir as imagens
      const withSigned = await Promise.all(list.map(async (r) => {
        const path = extrairPath(r.foto_url)
        if (!path) return r
        try {
          const { data: signed } = await supabase.storage
            .from('atestados')
            .createSignedUrl(path, 3600)
          return { ...r, foto_url_signed: signed?.signedUrl || null }
        } catch {
          return r
        }
      }))
      setRows(withSigned)
    } catch { setRows([]) } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [funcionario.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleSalvar = async () => {
    if (!form.data_inicio) { setMsg('Informe a data de início.'); return }
    setSalvando(true); setMsg('')
    try {
      let foto_url = null
      if (foto) {
        const ext  = foto.name.split('.').pop()
        const path = `${getTenantId()}/${funcionario.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('atestados').upload(path, foto, { upsert: false })
        if (upErr) throw upErr
        // Bucket é privado — guardamos o path; a URL assinada é gerada ao listar
        foto_url = path
      }
      const payload = {
        tenant_id:      getTenantId(),
        funcionario_id: funcionario.id,
        data_inicio:    form.data_inicio,
        data_fim:       form.data_fim || null,
        cid_codigo:     form.cid_codigo.trim() || null,
        cid_descricao:  form.cid_descricao.trim() || null,
        observacoes:    form.observacoes.trim() || null,
        foto_url,
      }
      const { error } = await supabase.from('atestados').insert(payload)
      if (error) throw error
      setMsg('Atestado registrado!')
      setForm(FORM_EMPTY); setFormDisplay({ data_inicio: '', data_fim: '' }); setFoto(null); setFotoPreview(null)
      setShowForm(false)
      carregar()
    } catch (e) {
      setMsg('Erro: ' + (e.message || 'falhou'))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (row) => {
    if (!confirm('Excluir este atestado?')) return
    try {
      if (row.foto_url) {
        const path = extrairPath(row.foto_url)
        if (path) await supabase.storage.from('atestados').remove([path])
      }
      await supabase.from('atestados').delete().eq('id', row.id)
      carregar()
    } catch (e) { alert('Erro ao excluir: ' + e.message) }
  }

  const inpDate = (label, key) => {
    const handleChange = (e) => {
      // Auto-mask: keep only digits and insert slashes at positions 2 and 5
      let digits = e.target.value.replace(/\D/g, '').slice(0, 8)
      let masked = digits
      if (digits.length > 4) masked = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
      else if (digits.length > 2) masked = digits.slice(0, 2) + '/' + digits.slice(2)
      setFormDisplay(fd => ({ ...fd, [key]: masked }))
      // Convert DD/MM/YYYY → YYYY-MM-DD for storage once the full date is entered
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(masked)) {
        const [d, m, y] = masked.split('/')
        set(key, `${y}-${m}-${d}`)
      } else {
        set(key, '')
      }
    }
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
        <input
          type="text"
          value={formDisplay[key]}
          onChange={handleChange}
          placeholder="DD/MM/AAAA"
          maxLength={10}
          style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '9px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>
    )
  }

  const fmtDate = (d) => d ? new Date(d + 'T12:00').toLocaleDateString('pt-BR') : '—'

  return (
    <div>
      {/* Preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <img src={preview} alt="Atestado" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Atestados médicos</div>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{rows.length} registro{rows.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setMsg('') }}
          style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {showForm ? '✕ Cancelar' : '+ Novo atestado'}
        </button>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Registrar novo atestado</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
            {inpDate('Data início *', 'data_inicio')}
            {inpDate('Data fim', 'data_fim')}
            <CIDCombobox
              value={form.cid_codigo}
              descricao={form.cid_descricao}
              onSelect={item => setForm(f => ({ ...f, cid_codigo: item.codigo, cid_descricao: item.descricao }))}
            />
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>Observações</div>
              <textarea
                value={form.observacoes}
                onChange={e => set('observacoes', e.target.value)}
                rows={2}
                placeholder="Anotações adicionais…"
                style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 7, padding: '9px 11px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Upload de foto */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Foto / arquivo do atestado</div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: C.surface, border: `1px dashed ${C.line}`, borderRadius: 8, padding: '10px 16px', fontSize: 12.5, color: C.ink2 }}>
                📎 {foto ? foto.name : 'Selecionar imagem ou PDF (máx. 5 MB)'}
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFoto} />
              </label>
              {fotoPreview && (
                <div style={{ marginTop: 10 }}>
                  <img src={fotoPreview} alt="Preview" style={{ height: 100, borderRadius: 7, border: `1px solid ${C.line}`, objectFit: 'cover', cursor: 'pointer' }} onClick={() => setPreview(fotoPreview)} />
                </div>
              )}
            </div>
          </div>

          {msg && (
            <div style={{ marginTop: 14, padding: '9px 13px', background: msg.startsWith('Erro') ? '#FBE9E4' : '#E4F1E8', borderRadius: 7, fontSize: 12, color: msg.startsWith('Erro') ? C.bad : C.ok }}>{msg}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={handleSalvar} disabled={salvando} style={{ background: C.ok, border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 8, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando…' : 'Salvar atestado'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando atestados…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '50px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🩺</div>
          <div>Nenhum atestado registrado para este colaborador.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => {
            const diasLabel = r.dias != null ? `${r.dias} dia${r.dias !== 1 ? 's' : ''}` : null
            const fotoSrc = r.foto_url_signed || null
            return (
              <div key={r.id} style={{ border: `1px solid ${C.line2}`, borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'flex-start', background: C.surface }}>
                {/* Foto miniatura */}
                {fotoSrc && (
                  <img
                    src={fotoSrc}
                    alt="Atestado"
                    style={{ width: 64, height: 64, borderRadius: 7, objectFit: 'cover', border: `1px solid ${C.line}`, cursor: 'zoom-in', flexShrink: 0 }}
                    onClick={() => setPreview(fotoSrc)}
                  />
                )}
                {!fotoSrc && (
                  <div style={{ width: 64, height: 64, borderRadius: 7, background: C.surface2, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, color: C.ink3 }}>📄</div>
                )}

                {/* Dados */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                      {fmtDate(r.data_inicio)}{r.data_fim ? ` → ${fmtDate(r.data_fim)}` : ''}
                    </span>
                    {diasLabel && (
                      <span style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, color: C.ink2 }}>{diasLabel}</span>
                    )}
                    {r.cid_codigo && (
                      <span style={{ background: '#EFF3FA', border: '1px solid #C5D2E8', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: C.info, fontFamily: '"JetBrains Mono", monospace' }}>{r.cid_codigo}</span>
                    )}
                  </div>
                  {r.cid_descricao && <div style={{ fontSize: 12.5, color: C.ink2, marginBottom: 4 }}>{r.cid_descricao}</div>}
                  {r.observacoes && <div style={{ fontSize: 12, color: C.ink3, fontStyle: 'italic' }}>{r.observacoes}</div>}
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {fotoSrc && (
                    <button
                      onClick={() => setPreview(fotoSrc)}
                      style={{ background: 'none', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                    >🔍 Ver</button>
                  )}
                  <button
                    onClick={() => handleExcluir(r)}
                    style={{ background: 'none', border: `1px solid ${C.line}`, color: C.bad, fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
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

// ── Ficha Principal (página cheia, sem drawer) ──────────────────────
export default function FichaColaborador({ funcionario, onClose, onAtualizado }) {
  const [activeTab, setActiveTab] = useState('dados')
  const [func, setFunc] = useState(funcionario)

  const handleAtualizado = (updated) => {
    setFunc(updated)
    if (onAtualizado) onAtualizado(updated)
  }

  const btnGhost = {
    background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12,
    fontWeight: 500, padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
  }
  const btnAmber = {
    background: C.amber, border: 'none', color: C.navy, fontSize: 12, fontWeight: 700,
    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }

  const admissaoFmt = func.data_admissao
    ? new Date(func.data_admissao + 'T12:00').toLocaleDateString('pt-BR')
    : '—'

  const STATUS_ROW = [
    { label: 'ADMISSÃO', value: admissaoFmt },
    { label: 'EXPERIÊNCIA', value: func.data_admissao ? '90 dias' : '—' },
    { label: 'DOCUMENTAÇÃO', value: '—', alert: false },
    { label: 'EXAME', value: '—' },
    { label: 'AVALIAÇÃO', value: '—' },
  ]

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Botão Voltar */}
      <div style={{ marginBottom: 14 }}>
        <button onClick={onClose} style={btnGhost}>← Colaboradores</button>
      </div>

      {/* ColabHeader Card */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 24, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <Avatar nome={func.nome} size={68} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{func.nome}</h1>
              <StatusBadge situacao={func.situacao} />
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.ink3 }}>
                #{String(func.id || '').slice(-6).toUpperCase() || '—'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.ink2, marginBottom: 14 }}>
              {func.funcao || '—'} · {func.empresa || '—'} · CLT
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btnGhost}>⬇ Exportar</button>
              <button style={btnGhost}>↗ Transferir obra</button>
              <button style={btnAmber}>✎ Editar ficha</button>
            </div>
          </div>
        </div>

        {/* Status row: 5 colunas */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          borderTop: `1px solid ${C.line2}`, marginTop: 20, paddingTop: 0,
        }}>
          {STATUS_ROW.map((s, i) => (
            <div key={i} style={{
              padding: '12px 16px',
              borderLeft: i === 0 ? 'none' : `1px solid ${C.line2}`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.ink3, letterSpacing: '0.1em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: s.alert === true ? C.bad : C.ink }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FichaTabs */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: `1px solid ${C.line2}` }}>
          {TABS.map(t => {
            const on = t.key === activeTab
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '12px 16px', background: 'none', border: 'none',
                  fontSize: 12.5, fontWeight: on ? 700 : 500,
                  color: on ? C.ink : C.ink3,
                  borderBottom: on ? `2px solid ${C.navy}` : '2px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                {t.label}
                {t.badge && (
                  <span style={{ background: C.warn, color: '#FFF', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{t.badge}</span>
                )}
                {t.dot && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.bad, display: 'inline-block', marginLeft: 2 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24 }}>
          {activeTab === 'dados'       && <TabDados funcionario={func} onAtualizado={handleAtualizado} />}
          {activeTab === 'documentos'  && <TabPlaceholder label="Documentação" icon="📄" />}
          {activeTab === 'experiencia' && <TabExperiencia funcionario={func} />}
          {activeTab === 'obras'       && <TabObras funcionario={func} />}
          {activeTab === 'exames'      && <TabPlaceholder label="Exames Ocupacionais" icon="🩺" />}
          {activeTab === 'atestados'   && <TabAtestados funcionario={func} />}
          {activeTab === 'disciplinar' && <TabPlaceholder label="Histórico Disciplinar" icon="⚖️" />}
          {activeTab === 'epis'        && <TabPlaceholder label="Integração & EPIs" icon="🦺" />}
          {activeTab === 'avaliacoes'  && <TabAvaliacoes funcionario={func} />}
        </div>
      </div>
    </div>
  )
}
