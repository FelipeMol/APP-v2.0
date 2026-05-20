// Financeiro — Análise de Extrato Bancário com IA
// Workflow: selecionar conta → upload PDF → IA analisa → usuário categoriza → gera lançamentos
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase'
import { contasService, lancamentosFinService, centrosCustoService, extratoService, lancamentoItensService } from '@/services/financeiroService'
import { contatosService } from '@/services/contatosService'
import obrasService from '@/services/obrasService'
import useAuthStore from '@/store/authStore'

// ── Paleta ────────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  info: '#2D5FA0', purple: '#6B4FBB',
  surface: '#FFFFFF', surface2: '#F6F3ED', surface3: '#EEF2F8',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Grupo cores para agrupamentos ────────────────────────────────
const GRUPO_CORES = [
  { bg: '#EEF2F8', border: '#C5D2E8', label: '#2D5FA0' },
  { bg: '#F4EDF9', border: '#D4BFE8', label: '#6B4FBB' },
  { bg: '#FFF4E6', border: '#F2D49B', label: '#8A6210' },
  { bg: '#E8F4EE', border: '#A8D4B8', label: '#3D7A50' },
  { bg: '#FDE8E8', border: '#F2BABA', label: '#B84A33' },
]

// ── Utilitários ───────────────────────────────────────────────────
function brl(n) {
  const abs = Math.abs(n)
  return (n < 0 ? '−' : '') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}
function inp() {
  return { width: '100%', padding: '8px 11px', border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, background: C.surface, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
}
function getAIUrl() {
  return (
    import.meta.env.VITE_AI_API_URL ||
    (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat` : 'http://localhost:8000/chat')
  )
}

// ── Extrai texto do PDF (lazy-load pdfjs) ────────────────────────
async function extractPDFText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lineMap = {}
    content.items.forEach(item => {
      const y = Math.round(item.transform[5])
      if (!lineMap[y]) lineMap[y] = []
      lineMap[y].push(item.str)
    })
    Object.keys(lineMap).sort((a, b) => b - a).forEach(y => {
      text += lineMap[y].join(' ') + '\n'
    })
    text += '\n'
  }
  return text.trim()
}

// ── Chama a IA e parseia o JSON de transações ────────────────────
async function analisarExtrato(texto, banco) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token || null
  let tenantId = null
  try { tenantId = JSON.parse(localStorage.getItem('selected_tenant'))?.id } catch {}

  const prompt = `Você é um assistente financeiro especializado em análise de extratos bancários brasileiros.

Analise o extrato bancário ${banco ? `do banco ${banco} ` : ''}abaixo e retorne um JSON estruturado com TODAS as movimentações encontradas.

Para cada movimentação, forneça:
- "data": data no formato YYYY-MM-DD (se não tiver ano, use o ano atual)
- "descricao": descrição original do extrato (exatamente como aparece)
- "valor": valor em número decimal positivo (ex: 1500.00)
- "tipo": "credito" se for entrada/crédito, "debito" se for saída/débito/pagamento
- "explicacao": explicação clara e objetiva em português do que provavelmente é esse lançamento (máximo 100 caracteres)
- "sugestao_descricao": sugestão de descrição amigável para o lançamento (máximo 80 caracteres)

Retorne APENAS o JSON, sem markdown, sem texto adicional, no formato exato:
{"transacoes":[{"data":"...","descricao":"...","valor":0.00,"tipo":"debito","explicacao":"...","sugestao_descricao":"..."}]}

Extrato bancário:
${texto.slice(0, 8000)}`

  const res = await fetch(getAIUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'X-Tenant-ID': String(tenantId) } : {}),
    },
    body: JSON.stringify({ message: prompt, history: [], tenant_id: tenantId }),
  })
  if (!res.ok) throw new Error(`Erro ${res.status} na IA`)
  const data = await res.json()
  const raw = data.response || data.message || ''

  // Extrai JSON da resposta (pode vir com texto antes/depois)
  const match = raw.match(/\{[\s\S]*"transacoes"[\s\S]*\}/)
  if (!match) throw new Error('IA não retornou JSON válido')
  const parsed = JSON.parse(match[0])
  return (parsed.transacoes || []).map((t, i) => ({
    _id: `t_${i}_${Date.now()}`,
    data: t.data || '',
    descricao: t.descricao || '',
    valor: parseFloat(t.valor) || 0,
    tipo: t.tipo === 'credito' ? 'credito' : 'debito',
    explicacao: t.explicacao || '',
    // campos editáveis
    descricaoCustom: t.sugestao_descricao || t.descricao || '',
    contato_id: '',
    cc_id: '',
    obra_id: '',
    etapa: '',
    categoria_id: '',
    // agrupamento
    grupo: null,
    selecionado: false,
  }))
}

// ── Componente de linha de transação ─────────────────────────────
function TransacaoCard({ tx, idx, onUpdate, contatos, centrosCusto, obras, grupoInfo, totalGrupo }) {
  const isCredito = tx.tipo === 'credito'
  const grupoCor = grupoInfo ? GRUPO_CORES[grupoInfo.cor % GRUPO_CORES.length] : null

  return (
    <div style={{
      border: `1.5px solid ${grupoCor ? grupoCor.border : C.line2}`,
      borderRadius: 10,
      background: grupoCor ? grupoCor.bg : C.surface,
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Linha do grupo */}
      {grupoInfo && (
        <div style={{ background: grupoCor.bg, borderBottom: `1px solid ${grupoCor.border}`, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: grupoCor.label, letterSpacing: '0.1em' }}>
            GRUPO {grupoInfo.num} · {grupoInfo.count} transações · Total: {brl(totalGrupo)}
          </span>
          <button
            onClick={() => onUpdate(tx._id, 'grupo', null)}
            style={{ fontSize: 10, color: grupoCor.label, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
          >× Desagrupar</button>
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0 14px' }}>
        {/* Checkbox */}
        <div style={{ paddingTop: 2 }}>
          <input
            type="checkbox"
            checked={tx.selecionado}
            onChange={e => onUpdate(tx._id, 'selecionado', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.navy }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Cabeçalho */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: isCredito ? '#E4F1E8' : '#F9ECE7', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 14, color: isCredito ? C.ok : C.bad, fontWeight: 700 }}>
              {isCredito ? '↑' : '↓'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{tx.descricao}</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 1, fontFamily: '"JetBrains Mono", monospace' }}>{fmtDate(tx.data)}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: isCredito ? C.ok : C.bad, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {isCredito ? '+' : '−'}{brl(tx.valor)}
            </div>
          </div>

          {/* Explicação da IA */}
          {tx.explicacao && (
            <div style={{ background: '#F0F4FA', border: '1px solid #C5D2E8', borderRadius: 7, padding: '7px 11px', fontSize: 11, color: C.info, lineHeight: 1.5 }}>
              💡 <em>{tx.explicacao}</em>
            </div>
          )}

          {/* Campos de categorização */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            {/* Descrição customizável */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 10, letterSpacing: '0.1em', color: C.ink3, fontWeight: 600, display: 'block', marginBottom: 4 }}>DESCRIÇÃO DO LANÇAMENTO</label>
              <input
                style={inp()}
                value={tx.descricaoCustom}
                onChange={e => onUpdate(tx._id, 'descricaoCustom', e.target.value)}
                placeholder="Descrição para o lançamento financeiro..."
              />
            </div>

            {/* Fornecedor */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: '0.1em', color: C.ink3, fontWeight: 600, display: 'block', marginBottom: 4 }}>FORNECEDOR / CONTATO</label>
              <select style={{ ...inp(), cursor: 'pointer' }} value={tx.contato_id} onChange={e => onUpdate(tx._id, 'contato_id', e.target.value)}>
                <option value="">Sem fornecedor</option>
                {contatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {/* Centro de Custo */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: '0.1em', color: C.ink3, fontWeight: 600, display: 'block', marginBottom: 4 }}>CENTRO DE CUSTO</label>
              <select style={{ ...inp(), cursor: 'pointer' }} value={tx.cc_id} onChange={e => onUpdate(tx._id, 'cc_id', e.target.value)}>
                <option value="">Sem centro de custo</option>
                {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {/* Obra */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: '0.1em', color: C.ink3, fontWeight: 600, display: 'block', marginBottom: 4 }}>OBRA</label>
              <select style={{ ...inp(), cursor: 'pointer' }} value={tx.obra_id} onChange={e => onUpdate(tx._id, 'obra_id', e.target.value)}>
                <option value="">Sem obra</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>

            {/* Etapa */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: '0.1em', color: C.ink3, fontWeight: 600, display: 'block', marginBottom: 4 }}>ETAPA</label>
              <input
                style={inp()}
                value={tx.etapa}
                onChange={e => onUpdate(tx._id, 'etapa', e.target.value)}
                placeholder="Ex: Fundação, Acabamento..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function ExtratoIA() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')

  // Dados de referência
  const [contas, setContas]         = useState([])
  const [contatos, setContatos]     = useState([])
  const [centrosCusto, setCentros]  = useState([])
  const [obras, setObras]           = useState([])

  // Workflow
  const [contaId, setContaId]       = useState('')
  const [step, setStep]             = useState(1) // 1: upload | 2: review | 3: done
  const [pdfFile, setPdfFile]       = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [analyzing, setAnalyzing]   = useState(false)
  const [transactions, setTxs]      = useState([])
  const [saving, setSaving]         = useState(false)
  const [grupoCounter, setGrupoCounter] = useState(0)

  const fileRef = useRef()
  const dropRef = useRef()

  // Carrega dados de referência
  useEffect(() => {
    contasService.list().then(setContas)
    contatosService.list().then(setContatos)
    centrosCustoService.list().then(setCentros)
    obrasService.list().then(r => setObras(r?.dados ?? r ?? []))
  }, [])

  // ── Drag & Drop ──────────────────────────────────────────────
  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') setPdfFile(file)
    else toast.error('Envie um arquivo PDF')
  }

  // ── Processar PDF + IA ───────────────────────────────────────
  async function handleAnalisar() {
    if (!contaId) { toast.error('Selecione uma conta'); return }
    if (!pdfFile) { toast.error('Selecione um PDF'); return }

    setExtracting(true)
    let texto = ''
    try {
      texto = await extractPDFText(pdfFile)
      if (!texto.trim()) throw new Error('PDF vazio ou sem texto legível')
    } catch (e) {
      toast.error('Erro ao ler PDF: ' + e.message)
      setExtracting(false)
      return
    }
    setExtracting(false)
    setAnalyzing(true)

    const contaSel = contas.find(c => c.id === contaId)
    try {
      const txs = await analisarExtrato(texto, contaSel?.banco || '')
      if (!txs.length) throw new Error('Nenhuma transação encontrada no extrato')
      setTxs(txs)
      setStep(2)
    } catch (e) {
      toast.error('Erro na análise: ' + e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Atualizar campo de uma transação ────────────────────────
  function updateTx(id, field, value) {
    setTxs(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t))
  }

  // ── Agrupar selecionadas ─────────────────────────────────────
  function handleAgrupar() {
    const sel = transactions.filter(t => t.selecionado)
    if (sel.length < 2) { toast.error('Selecione ao menos 2 transações para agrupar'); return }
    const novoGrupo = grupoCounter + 1
    setGrupoCounter(novoGrupo)
    setTxs(prev => prev.map(t => t.selecionado ? { ...t, grupo: novoGrupo, selecionado: false } : t))
    toast.success(`Grupo ${novoGrupo} criado com ${sel.length} transações`)
  }

  // ── Desmarcar todas ──────────────────────────────────────────
  function desmarcarTodas() {
    setTxs(prev => prev.map(t => ({ ...t, selecionado: false })))
  }

  // ── Criar lançamentos ─────────────────────────────────────────
  async function handleCriarLancamentos() {
    if (!canCreate) { toast.error('Sem permissão para criar lançamentos'); return }
    setSaving(true)

    try {
      const contaSel = contas.find(c => c.id === contaId)
      const hoje = new Date().toISOString().slice(0, 10)

      // Agrupa: { grupo_key → [txs] } e individuais → grupo_key = null
      const grupos = {}
      transactions.forEach(t => {
        const key = t.grupo != null ? `g_${t.grupo}` : `i_${t._id}`
        if (!grupos[key]) grupos[key] = []
        grupos[key].push(t)
      })

      let criados = 0
      for (const [, txList] of Object.entries(grupos)) {
        const isGrupo = txList.length > 1 || txList[0].grupo != null
        const total = txList.reduce((s, t) => s + t.valor, 0)
        const first = txList[0]
        const tipoLanc = first.tipo === 'credito' ? 'receita' : 'despesa'

        const payload = {
          descricao: isGrupo
            ? txList.map(t => t.descricaoCustom || t.descricao).join(' + ').slice(0, 200)
            : (first.descricaoCustom || first.descricao),
          valor: total,
          tipo: tipoLanc,
          status: 'pago',
          data_vencimento: first.data || hoje,
          data_pagamento: first.data || hoje,
          conta_id: contaId,
          contato_id: first.contato_id || null,
          centro_custo_id: isGrupo ? null : (first.cc_id || null),
          obra_id: isGrupo ? null : (first.obra_id ? parseInt(first.obra_id) : null),
          observacao: [
            first.etapa ? `Etapa: ${first.etapa}` : '',
            ...txList.slice(1).map(t => t.etapa ? `Etapa: ${t.etapa}` : ''),
          ].filter(Boolean).join(' | ') || null,
        }

        // Cria o lançamento principal
        const { data: lanc, error: lancErr } = await supabase
          .from('financeiro_lancamentos')
          .insert(payload)
          .select()
          .single()
        if (lancErr) throw new Error(lancErr.message)

        // Se for grupo ou multi-item, cria itens
        if (isGrupo) {
          const itens = txList.map(t => ({
            lancamento_id: lanc.id,
            descricao: t.descricaoCustom || t.descricao,
            centro_custo_id: t.cc_id ? parseInt(t.cc_id) : null,
            categoria_id: null,
            valor: t.valor,
          }))
          const { error: itensErr } = await supabase.from('financeiro_lancamento_itens').insert(itens)
          if (itensErr) console.warn('Erro ao criar itens:', itensErr.message)
        }

        // Insere no extrato e concilia
        for (const t of txList) {
          const hash = btoa(unescape(encodeURIComponent(`${contaId}${t.data}${t.descricao}${t.valor}`))).slice(0, 64)
          const { data: extLinha } = await supabase
            .from('financeiro_extrato')
            .upsert({
              conta_id: contaId,
              data: t.data || hoje,
              descricao: t.descricao,
              valor: t.valor,
              tipo: t.tipo,
              hash_linha: hash,
              status: 'conciliado',
              lancamento_id: lanc.id,
            }, { onConflict: 'conta_id,hash_linha' })
            .select()
            .single()
          // silencia erro de duplicata
          void extLinha
        }

        criados++
      }

      toast.success(`✅ ${criados} lançamento${criados !== 1 ? 's' : ''} criado${criados !== 1 ? 's' : ''}!`)
      setStep(3)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Informações de grupo ─────────────────────────────────────
  function getGrupoInfo(grupoNum) {
    if (grupoNum == null) return null
    const txsGrupo = transactions.filter(t => t.grupo === grupoNum)
    return {
      num: grupoNum,
      count: txsGrupo.length,
      cor: (grupoNum - 1) % GRUPO_CORES.length,
    }
  }
  function getTotalGrupo(grupoNum) {
    return transactions.filter(t => t.grupo === grupoNum).reduce((s, t) => s + t.valor, 0)
  }

  const contaSel = contas.find(c => c.id === contaId)
  const selectedCount = transactions.filter(t => t.selecionado).length
  const isProcessing = extracting || analyzing

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: C.ink3, letterSpacing: '0.12em', fontWeight: 600 }}>FINANCEIRO · EXTRATO</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em', color: C.ink }}>
            Analisar Extrato com IA
          </h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>
            Faça upload do PDF do extrato → IA extrai as transações → você categoriza e gera os lançamentos
          </div>
        </div>
        <Link to="/financeiro/extrato" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}>
          ← Extrato
        </Link>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {[
          { n: 1, label: 'Upload' },
          { n: 2, label: 'Revisar' },
          { n: 3, label: 'Concluído' },
        ].map(({ n, label }) => (
          <div
            key={n}
            style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              borderRight: n < 3 ? `1px solid ${C.line}` : 'none',
              background: step === n ? C.navy : step > n ? '#E4F1E8' : 'transparent',
              transition: 'background .2s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: step === n ? '#FFF' : step > n ? C.ok : C.ink3 }}>
              {step > n ? '✓' : n}. {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload ───────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Selecionar conta */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '24px 28px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16 }}>1. Selecione a conta bancária</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contas.length === 0 && (
                <div style={{ fontSize: 12, color: C.ink3, padding: '16px 0' }}>Nenhuma conta cadastrada.</div>
              )}
              {contas.map(c => (
                <button
                  key={c.id}
                  onClick={() => setContaId(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    border: `1.5px solid ${contaId === c.id ? C.navy : C.line}`,
                    borderRadius: 9, background: contaId === c.id ? '#EEF2F8' : C.surface2,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    boxShadow: contaId === c.id ? `0 0 0 1px ${C.navy} inset` : 'none',
                    transition: 'border-color .15s',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: C.navy, color: '#FFF', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, letterSpacing: '0.04em' }}>
                    {(c.banco || c.nome || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{c.banco}{c.agencia ? ` · AG ${c.agencia}` : ''}</div>
                  </div>
                  {contaId === c.id && <div style={{ marginLeft: 'auto', color: C.navy, fontSize: 16 }}>✓</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Upload PDF */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>2. Faça upload do extrato em PDF</div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); dropRef.current.style.borderColor = C.navy }}
              onDragLeave={() => { dropRef.current.style.borderColor = C.line }}
              onDrop={e => { dropRef.current.style.borderColor = C.line; handleDrop(e) }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${pdfFile ? C.ok : C.line}`,
                borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
                background: pdfFile ? '#F0FAF3' : C.surface2, transition: 'border-color .15s, background .15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{ fontSize: 28 }}>{pdfFile ? '✅' : '📄'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: pdfFile ? C.ok : C.ink2 }}>
                {pdfFile ? pdfFile.name : 'Arraste o PDF aqui ou clique para selecionar'}
              </div>
              {pdfFile && (
                <div style={{ fontSize: 11, color: C.ink3 }}>{(pdfFile.size / 1024).toFixed(0)} KB</div>
              )}
              {!pdfFile && (
                <div style={{ fontSize: 11, color: C.ink3 }}>Formatos aceitos: PDF</div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setPdfFile(f)
                  e.target.value = ''
                }}
              />
            </div>

            {pdfFile && (
              <button
                onClick={() => setPdfFile(null)}
                style={{ background: 'none', border: `1px solid ${C.line}`, color: C.ink3, fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
              >× Remover PDF</button>
            )}

            <div style={{ background: '#F0F4FA', borderRadius: 8, padding: '12px 14px', fontSize: 11, color: C.info, lineHeight: 1.6 }}>
              <strong>Como funciona:</strong><br />
              A IA lê o texto do extrato, identifica cada transação (data, valor, tipo) e gera uma explicação do que provavelmente é cada lançamento. Você então preenche os campos e cria os lançamentos financeiros automaticamente.
            </div>

            <button
              onClick={handleAnalisar}
              disabled={!contaId || !pdfFile || isProcessing}
              style={{
                background: !contaId || !pdfFile || isProcessing ? '#C0C0C0' : C.amber,
                border: 'none', color: C.navy, fontSize: 13, fontWeight: 700,
                padding: '12px 20px', borderRadius: 9, cursor: !contaId || !pdfFile || isProcessing ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {extracting ? '⏳ Lendo PDF...' : analyzing ? '🤖 IA analisando...' : '✨ Analisar com IA'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review ──────────────────────────────────────── */}
      {step === 2 && (
        <div>
          {/* Barra de ações */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: C.ink2 }}>
                <strong>{transactions.length}</strong> transações · {transactions.filter(t => t.grupo != null).length} agrupadas
                {selectedCount > 0 && <span style={{ marginLeft: 8, color: C.navy, fontWeight: 600 }}>{selectedCount} selecionadas</span>}
              </div>
              {contaSel && (
                <span style={{ fontSize: 11, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, padding: '2px 8px', color: C.ink2 }}>
                  🏦 {contaSel.nome}
                </span>
              )}
            </div>

            {selectedCount >= 2 && (
              <button
                onClick={handleAgrupar}
                style={{ background: C.navy, border: 'none', color: '#FFF', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                🔗 Agrupar {selectedCount} selecionadas
              </button>
            )}

            {selectedCount > 0 && (
              <button
                onClick={desmarcarTodas}
                style={{ background: 'none', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 11, padding: '7px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Desmarcar
              </button>
            )}

            <button
              onClick={() => { setStep(1); setTxs([]) }}
              style={{ background: 'none', border: `1px solid ${C.line}`, color: C.ink2, fontSize: 11, padding: '7px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Voltar
            </button>
          </div>

          {/* Dica de agrupamento */}
          <div style={{ background: '#FFF8E6', border: `1px solid #F2D49B`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: '#7A5500', lineHeight: 1.6 }}>
            <strong>💡 Agrupamento:</strong> Marque múltiplas transações com o checkbox e clique em "Agrupar" para vincular vários pagamentos a um único lançamento financeiro (com rateio automático nos itens).
          </div>

          {/* Lista de transações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {transactions.map((tx, idx) => {
              const grupoInfo = getGrupoInfo(tx.grupo)
              const totalGrupo = tx.grupo != null ? getTotalGrupo(tx.grupo) : 0
              return (
                <TransacaoCard
                  key={tx._id}
                  tx={tx}
                  idx={idx}
                  onUpdate={updateTx}
                  contatos={contatos}
                  centrosCusto={centrosCusto}
                  obras={obras}
                  grupoInfo={grupoInfo}
                  totalGrupo={totalGrupo}
                />
              )
            })}
          </div>

          {/* Botão criar lançamentos */}
          <div style={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleCriarLancamentos}
              disabled={saving || !canCreate}
              style={{
                background: saving ? '#C0C0C0' : C.ok,
                border: 'none', color: '#FFF', fontSize: 14, fontWeight: 700,
                padding: '14px 36px', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              {saving
                ? '⏳ Criando lançamentos...'
                : `✅ Criar ${Object.keys(transactions.reduce((acc, t) => { const k = t.grupo != null ? `g_${t.grupo}` : `i_${t._id}`; acc[k] = 1; return acc }, {})).length} lançamento${Object.keys(transactions.reduce((acc, t) => { const k = t.grupo != null ? `g_${t.grupo}` : `i_${t._id}`; acc[k] = 1; return acc }, {})).length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ─────────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>🎉</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Lançamentos criados com sucesso!</div>
            <div style={{ fontSize: 13, color: C.ink3 }}>As transações foram registradas e já estão conciliadas no extrato bancário.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button
              onClick={() => { setStep(1); setTxs([]); setPdfFile(null); setContaId('') }}
              style={{ background: C.amber, border: 'none', color: C.navy, fontSize: 13, fontWeight: 700, padding: '11px 24px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Analisar outro extrato
            </button>
            <Link
              to="/financeiro/lancamentos"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#FFF', fontSize: 13, fontWeight: 600, padding: '11px 24px', borderRadius: 9, textDecoration: 'none' }}
            >
              Ver lançamentos →
            </Link>
            <Link
              to="/financeiro/extrato"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 13, fontWeight: 500, padding: '11px 24px', borderRadius: 9, textDecoration: 'none' }}
            >
              Ver extrato
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
