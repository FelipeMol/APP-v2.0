// Importar Lançamentos via CSV
// Suporta o formato exportado pelo sistema antigo (ponto-e-vírgula, datas dd/mm/yyyy, valores -1.234,56)
import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { lancamentosFinService, categoriasService, contasService, centrosCustoService } from '@/services/financeiroService'
import obrasService from '@/services/obrasService'
import supabase from '@/lib/supabase'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Utilitários de parse ──────────────────────────────────────────
function parseDateBR(str) {
  if (!str) return ''
  const [d, m, y] = str.trim().split('/')
  if (!d || !m || !y) return ''
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

function parseValueBR(str) {
  if (!str) return 0
  // Remove sinal, pontos de milhar, troca vírgula por ponto
  return Math.abs(parseFloat(str.replace(/\./g, '').replace(',', '.'))) || 0
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(';').map(h => h.trim())
  return lines.slice(1).map(line => {
    const cols = line.split(';')
    const row = {}
    header.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
    return row
  })
}

// ── Regras de mapeamento de conta bancária ────────────────────────
function guessConta(bancoStr, contas) {
  if (!bancoStr) return null
  const b = bancoStr.toLowerCase()
  // tenta encontrar por conta (ex: "29776-3")
  const match = bancoStr.match(/[\d]+-[\d]+/)
  if (match) {
    const acct = match[0].replace('-', '')
    const found = contas.find(c => c.conta && c.conta.replace(/[^0-9]/g, '').includes(acct.replace(/[^0-9]/g, '')))
    if (found) return found.id
  }
  // fallback por nome
  if (b.includes('sicoob')) return contas.find(c => c.banco?.toLowerCase().includes('sicoob'))?.id ?? null
  if (b.includes('itaú') || b.includes('itau')) return contas.find(c => c.banco?.toLowerCase().includes('itaú') || c.banco?.toLowerCase().includes('itau'))?.id ?? null
  if (b.includes('bradesco')) return contas.find(c => c.banco?.toLowerCase().includes('bradesco'))?.id ?? null
  if (b.includes('banco do brasil') || b.includes('bb -')) return contas.find(c => c.banco?.toLowerCase().includes('brasil'))?.id ?? null
  if (b.includes('santander')) return contas.find(c => c.banco?.toLowerCase().includes('santander'))?.id ?? null
  return null
}

// ── Regras de mapeamento de centro de custo / obra ────────────────
function guessCCouObra(ccStr, centrosCusto, obras) {
  if (!ccStr || ccStr === 'Sem identificador') return { cc: null, obra: null }
  const s = ccStr.trim()
  // Remove prefixo "XX - "
  const stripped = s.replace(/^\d+\s*-\s*/, '').trim()
  // Tenta match por obra (nome da obra está dentro do campo)
  const obra = obras.find(o =>
    stripped.toLowerCase().includes(o.nome.toLowerCase()) ||
    o.nome.toLowerCase().includes(stripped.toLowerCase())
  )
  if (obra) return { cc: null, obra: obra.id }
  // Tenta match por centro de custo
  const cc = centrosCusto.find(c =>
    stripped.toLowerCase() === c.nome.toLowerCase() ||
    stripped.toLowerCase().includes(c.nome.toLowerCase()) ||
    c.nome.toLowerCase().includes(stripped.toLowerCase())
  )
  if (cc) return { cc: cc.id, obra: null }
  return { cc: null, obra: null }
}

// ── Mapeamento de categoria por palavras-chave ────────────────────
const CAT_KEYWORDS = [
  // Mão de obra
  { keys: ['ajudante de apoio', 'ajudante'], id: 97 },
  { keys: ['coordenador da obra', 'encarregado de obra', 'encarregado'], id: 96 },
  { keys: ['mão de obra de pintura', 'm.o. pintura', 'pintor'], id: 75 },
  { keys: ['mão de obra para estrutura', 'mão de obra estrutura', 'pedreiro'], id: 44 },
  { keys: ['mão de obra elétrica', 'empreite de elétrica'], id: 52 },
  { keys: ['mão de obra hidráulica'], id: 56 },
  { keys: ['mão de obra gesso', 'm.o. gesso'], id: 63 },
  // Materiais
  { keys: ['materiais de gesso', 'material de gesso', 'guia', 'montante', 'placa ru', 'gesso lento'], id: 62 },
  { keys: ['materiais de pintura', 'tintas', 'tinta'], id: 74 },
  { keys: ['materiais diversos elétric', 'material elétric', 'elétrica div'], id: 55 },
  { keys: ['materiais diversos hidráulic', 'colas', 'veda rosca', 'registros', 'joelhos', 'material hidráulic'], id: 57 },
  { keys: ['materiais para execução', 'materiais execução', 'tijolo', 'areia', 'cimento', 'argamassa', 'graute'], id: 45 },
  { keys: ['materiais diversos pisos', 'pisos e revestimentos', 'rejuntes', 'argamassa pisos', 'munari', 'artefato'], id: 61 },
  { keys: ['matéria prima de marmoraria', 'pedra do'], id: 71 },
  // Serviços / obras
  { keys: ['marcenaria completa', 'marcenaria', 'gavetas', 'móveis garçom'], id: 70 },
  { keys: ['fachada - letreiros', 'fachada', 'acm fachada', 'letreiro'], id: 79 },
  { keys: ['decorativo em geral', 'decorativo', 'cortina'], id: 86 },
  { keys: ['vasos sanitários', 'sanitário', 'vaso sanit'], id: 57 },
  { keys: ['art e fiscalização', 'pagamento da art', 'art - '], id: 41 },
  { keys: ['plotagens e cópias', 'plotagem', 'impressão', 'envelope'], id: 40 },
  { keys: ['equipamentos e ferramentas', 'aquisição equipamentos', 'aquisição de ferramentas', 'ferramentas', 'escada articulado', 'broca', 'lixadeira', 'kit nivelador', 'vibrador', 'misturador', 'alicate'], id: 3 },
  // Locações
  { keys: ['locação de caçamba', 'caçamba'], id: 89 },
  { keys: ['locação de andaime', 'andaimes', 'locação de martelete', 'locação de equipamento'], id: 90 },
  { keys: ['frete', 'fretes e carretos'], id: 7 },
  // Administrativo / financeiro
  { keys: ['passagens', 'alojamento', 'alimentação', 'abastecimento', 'hospedagem', 'hotelaria', 'combustível'], id: 98 },
  { keys: ['limpeza do escritório', 'faxina', 'faxineira', 'diarista'], id: 92 },
  { keys: ['aluguel escritório', 'aluguel de imóvel', 'aluguel'], id: 5 },
  { keys: ['iptu', 'impostos e taxas', 'darf', 'inss', 'tributo'], id: 6 },
  { keys: ['despesas bancárias', 'tarifa', 'tarifa bancária', 'tar pix', 'tar conta', 'tarifa pix', 'pacote serviços', 'tarifa conta'], id: 7 },
  { keys: ['retirada de capital', 'retirada dos sócios'], id: 7 },
  { keys: ['dízimo', 'oferta'], id: 7 },
  { keys: ['marketing digital', 'tráfego pago', 'google ads', 'facebook', 'instagram', 'agência de publicidad', 'impressão de material publicitário', 'brindes', 'bolsas de juta'], id: 95 },
  { keys: ['sistema de informação', 'site', 'nibo', 'alterdata', 'software'], id: 95 },
  { keys: ['consultoria administrativa', 'assessoria contábil', 'honorários contábeis', 'contabilidade'], id: 95 },
  { keys: ['salário', 'bolsa estágio', 'assistente administrativa', 'assistente admin', 'funcionário'], id: 95 },
  { keys: ['condomínio', 'condominio'], id: 95 },
  { keys: ['deslocamento', 'uber', 'taxi', 'táxi', 'passagem', 'bolsa transporte', 'bolsa transp'], id: 98 },
  { keys: ['telefon', 'internet', 'claro', 'tim', 'vivo', 'oi '], id: 95 },
  { keys: ['comissão', 'comissoes'], id: 95 },
  { keys: ['convênio estágio', 'ciee'], id: 94 },
  { keys: ['arquitetura', 'projeto arquitetônico', 'acompanhamento de obra', 'alc duarte'], id: 94 },
  { keys: ['engenharia da obra'], id: 93 },
  { keys: ['material de copa', 'garrafa térmica', 'copa'], id: 88 },
]

function guessCategoria(detalhe, catNome, categorias) {
  const haystack = `${detalhe} ${catNome}`.toLowerCase()
  for (const rule of CAT_KEYWORDS) {
    if (rule.keys.some(k => haystack.includes(k.toLowerCase()))) {
      const cat = categorias.find(c => c.id === rule.id)
      if (cat) return cat.id
    }
  }
  return null
}

// ── Componente principal ──────────────────────────────────────────
export default function ImportarCSV() {
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [mapped, setMapped] = useState([])
  const [step, setStep] = useState(0) // 0=upload 1=mapeamento 2=preview 3=done
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [drag, setDrag] = useState(false)
  const [catOverrides, setCatOverrides] = useState({}) // csvCategoria → db cat_id

  const { data: categorias = [] } = useQuery({ queryKey: ['fin-categorias'], queryFn: () => categoriasService.list(), staleTime: 10 * 60 * 1000 })
  const { data: contas = [] } = useQuery({ queryKey: ['fin-contas'], queryFn: () => contasService.list(), staleTime: 10 * 60 * 1000 })
  const { data: centrosCusto = [] } = useQuery({ queryKey: ['fin-centros-custo'], queryFn: () => centrosCustoService.list(), staleTime: 10 * 60 * 1000 })
  const { data: obrasRaw } = useQuery({ queryKey: ['obras'], queryFn: () => obrasService.list(), staleTime: 10 * 60 * 1000 })
  const obras = obrasRaw?.dados ?? obrasRaw ?? []

  // Categorias: pais + filhos
  const catFlat = categorias // já chegam flat

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      // tenta detectar encoding (UTF-8 ou ISO-8859-1)
      let text = e.target.result
      const parsed = parseCSV(text)
      if (!parsed.length) { toast.error('CSV sem dados ou formato inválido'); return }
      setRows(parsed)
      // Gera mapeamento automático
      const m = parsed.map(r => {
        const dt_pgto = parseDateBR(r['Data de pagamento'] || r['Vencimento'])
        const dt_venc = parseDateBR(r['Vencimento'])
        const valor = parseValueBR(r['Valor categoria/centro de custo'] || r['Valor'])
        const tipo = (parseFloat((r['Valor categoria/centro de custo'] || r['Valor'] || '0').replace(',', '.')) || 0) < 0 ? 'despesa' : 'receita'
        const bancoStr = r['Banco'] || ''
        const ccStr = r['Centro de Custo'] || ''
        const detalhe = r['Detalhamento'] || r['Categoria'] || ''
        const conta_id = guessConta(bancoStr, contas)
        const { cc: centro_custo_id, obra: obra_id } = guessCCouObra(ccStr, centrosCusto, obras)
        const categoria_id = guessCategoria(detalhe, r['Categoria'] || '', catFlat)
        return {
          _csvId: r['Id'],
          _banco: bancoStr,
          _cc: ccStr,
          _detalhe: detalhe,
          _catNome: r['Categoria'] || '',
          descricao: r['Descrição'] || r['Descricao'] || '',
          valor,
          tipo,
          data_vencimento: dt_venc,
          data_pagamento: dt_pgto,
          status: dt_pgto ? 'pago' : 'pendente',
          categoria_id,
          conta_id,
          centro_custo_id,
          obra_id: obra_id ?? null,
          observacao: r['Nome'] || '',
          numero_documento: r['Referência'] || r['Referencia'] || null,
        }
      })
      setMapped(m)
      setStep(1)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleFile(file) {
    if (!file?.name.match(/\.csv$/i)) { toast.error('Selecione um arquivo .csv'); return }
    processFile(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    handleFile(e.dataTransfer.files[0])
  }

  // Linhas com categoria não mapeada
  const semCategoria = [...new Set(
    mapped.filter(r => !r.categoria_id).map(r => r._detalhe || r._catNome || '(sem detalhe)')
  )]

  // Atualiza categoria de todas as linhas com aquele detalhe
  function setOverride(detalhe, catId) {
    setCatOverrides(prev => ({ ...prev, [detalhe]: catId }))
  }

  function getMappedFinal() {
    return mapped.map(r => {
      const key = r._detalhe || r._catNome || '(sem detalhe)'
      return { ...r, categoria_id: r.categoria_id ?? catOverrides[key] ?? null }
    })
  }

  async function importar() {
    setImporting(true)
    setProgress(0)
    const final = getMappedFinal()
    const CHUNK = 50
    let done = 0
    try {
      for (let i = 0; i < final.length; i += CHUNK) {
        const chunk = final.slice(i, i + CHUNK).map(r => ({
          descricao: r.descricao,
          valor: r.valor,
          tipo: r.tipo,
          categoria_id: r.categoria_id || null,
          conta_id: r.conta_id || null,
          centro_custo_id: r.centro_custo_id || null,
          obra_id: r.obra_id || null,
          data_vencimento: r.data_vencimento || null,
          data_pagamento: r.data_pagamento || null,
          status: r.status,
          observacao: r.observacao || null,
          numero_documento: r.numero_documento || null,
        }))
        const { error } = await supabase.from('financeiro_lancamentos').insert(chunk)
        if (error) throw error
        done += chunk.length
        setProgress(Math.round((done / final.length) * 100))
      }
      toast.success(`${done} lançamentos importados com sucesso!`)
      setStep(3)
    } catch (err) {
      toast.error('Erro na importação: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const finalRows = getMappedFinal()
  const semContaBanco = finalRows.filter(r => !r.conta_id).length
  const semCat = finalRows.filter(r => !r.categoria_id).length
  const totalValor = finalRows.reduce((s, r) => s + (r.tipo === 'despesa' ? -r.valor : r.valor), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F6F3ED', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Link to="/financeiro/lancamentos" style={{ color: C.ink3, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>← Lançamentos</Link>
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>FINANCEIRO</div>
          <h1 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 28, fontWeight: 500, color: C.navy, margin: '4px 0 6px' }}>Importar CSV</h1>
          <p style={{ color: C.ink3, fontSize: 13 }}>Importe lançamentos a partir do arquivo exportado do sistema financeiro. Suporta formato ponto-e-vírgula com datas dd/mm/aaaa.</p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
          {['Arquivo', 'Mapeamento', 'Revisão', 'Concluído'].map((lbl, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 16px', textAlign: 'center', background: step === i ? C.navy : step > i ? '#E4F1E8' : '', borderRight: i < 3 ? `1px solid ${C.line}` : '' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: step === i ? '#FFF' : step > i ? C.ok : C.ink3 }}>{i + 1}. {lbl.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* ── STEP 0: Upload ── */}
        {step === 0 && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, padding: 40 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${drag ? C.amber : C.line}`, borderRadius: 12, padding: '48px 32px', textAlign: 'center', cursor: 'pointer', background: drag ? '#FEF9EC' : '#FAFAF8', transition: 'all 0.15s' }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 20, color: C.ink, marginBottom: 8 }}>
                {drag ? 'Solte o arquivo aqui' : 'Arraste o arquivo CSV ou clique para selecionar'}
              </div>
              <div style={{ color: C.ink3, fontSize: 12 }}>Formato esperado: separado por ponto-e-vírgula (;) · Datas no padrão dd/mm/aaaa</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
            <div style={{ marginTop: 20, padding: 16, background: '#F6F3ED', borderRadius: 8, fontSize: 12, color: C.ink2 }}>
              <strong>Colunas esperadas:</strong> Id · Vencimento · Data de pagamento · Nome · Descrição · Detalhamento · Centro de Custo · Valor categoria/centro de custo · Banco
            </div>
          </div>
        )}

        {/* ── STEP 1: Mapeamento de categorias não reconhecidas ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Registros', value: mapped.length, color: C.navy },
                { label: 'Sem categoria', value: semCat, color: semCat > 0 ? C.bad : C.ok },
                { label: 'Sem conta bancária', value: semContaBanco, color: semContaBanco > 0 ? '#B87A00' : C.ok },
                { label: 'Total despesas', value: 'R$ ' + Math.abs(totalValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), color: C.bad },
              ].map(k => (
                <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 22, color: k.color, marginTop: 4 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Mapeamento de categorias desconhecidas */}
            {semCategoria.length > 0 && (
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line2}`, background: '#FEF9EC' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>⚠️ Categorias não reconhecidas automaticamente</div>
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>Associe cada tipo de lançamento a uma categoria do sistema. Os demais foram mapeados automaticamente.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {semCategoria.map((detalhe, i) => (
                    <div key={detalhe} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: i < semCategoria.length - 1 ? `1px solid ${C.line2}` : '' }}>
                      <div style={{ flex: 1, fontSize: 12, color: C.ink2, fontWeight: 500 }}>{detalhe || '(sem detalhe)'}</div>
                      <div style={{ fontSize: 10, color: C.ink3, minWidth: 80, textAlign: 'right' }}>
                        {mapped.filter(r => (r._detalhe || r._catNome || '(sem detalhe)') === detalhe).length}× lançamento(s)
                      </div>
                      <select
                        value={catOverrides[detalhe] || ''}
                        onChange={e => setOverride(detalhe, e.target.value ? parseInt(e.target.value) : null)}
                        style={{ padding: '7px 10px', border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, color: C.ink, background: C.surface, fontFamily: 'inherit', minWidth: 240 }}
                      >
                        <option value="">— sem categoria —</option>
                        {catFlat.filter(c => !c.parent_id).map(pai => {
                          const filhos = catFlat.filter(f => f.parent_id === pai.id)
                          if (filhos.length > 0) {
                            return (
                              <optgroup key={pai.id} label={pai.nome}>
                                {filhos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                              </optgroup>
                            )
                          }
                          return <option key={pai.id} value={pai.id}>{pai.nome}</option>
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {semCategoria.length === 0 && (
              <div style={{ background: '#E4F1E8', border: `1px solid #B3D9C0`, borderRadius: 10, padding: 16, color: C.ok, fontSize: 13, fontWeight: 600 }}>
                ✓ Todas as categorias foram mapeadas automaticamente!
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => { setStep(0); setRows([]); setMapped([]) }} style={{ padding: '10px 20px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink2, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>Voltar</button>
              <button onClick={() => setStep(2)} style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: C.navy, color: '#FFF', fontFamily: 'inherit', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Revisar {mapped.length} registros →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview + importar ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Prévia dos lançamentos ({finalRows.length} registros)</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>Mostrando primeiros 50 · total: {finalRows.length}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#F6F3ED' }}>
                      {['Data', 'Descrição', 'Fornecedor', 'Categoria', 'CC / Obra', 'Conta', 'Valor'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: C.ink3, letterSpacing: '0.06em', fontSize: 10, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finalRows.slice(0, 50).map((r, i) => {
                      const cat = catFlat.find(c => c.id === r.categoria_id)
                      const conta = contas.find(c => c.id === r.conta_id)
                      const cc = centrosCusto.find(c => c.id === r.centro_custo_id)
                      const obra = obras.find(o => o.id === r.obra_id)
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.line2}`, background: i % 2 === 0 ? '' : '#FAFAF8' }}>
                          <td style={{ padding: '7px 12px', color: C.ink3, whiteSpace: 'nowrap' }}>{r.data_vencimento}</td>
                          <td style={{ padding: '7px 12px', color: C.ink, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</td>
                          <td style={{ padding: '7px 12px', color: C.ink2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacao}</td>
                          <td style={{ padding: '7px 12px' }}>
                            {cat ? <span style={{ color: C.ink2 }}>{cat.nome}</span> : <span style={{ color: C.bad, fontWeight: 600 }}>—</span>}
                          </td>
                          <td style={{ padding: '7px 12px', color: C.ink2 }}>{cc?.nome || obra?.nome || <span style={{ color: C.ink3 }}>—</span>}</td>
                          <td style={{ padding: '7px 12px', color: C.ink3, whiteSpace: 'nowrap', fontSize: 10 }}>{conta?.nome || <span style={{ color: C.bad }}>?</span>}</td>
                          <td style={{ padding: '7px 12px', fontWeight: 700, color: r.tipo === 'despesa' ? C.bad : C.ok, whiteSpace: 'nowrap', textAlign: 'right' }}>
                            {r.tipo === 'despesa' ? '−' : '+'}R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {finalRows.length > 50 && (
                <div style={{ padding: '10px 16px', background: '#F6F3ED', borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.ink3, textAlign: 'center' }}>
                  + {finalRows.length - 50} registros adicionais não exibidos · todos serão importados
                </div>
              )}
            </div>

            {/* Aviso categorias sem mapeamento */}
            {semCat > 0 && (
              <div style={{ padding: '12px 16px', background: '#FEF9EC', border: `1px solid #F0D070`, borderRadius: 8, fontSize: 12, color: '#7A5800' }}>
                ⚠️ {semCat} lançamento(s) ficarão sem categoria. Você pode corrigir individualmente após a importação.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 20px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink2, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>Voltar</button>
              <button
                onClick={importar} disabled={importing}
                style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: importing ? '#999' : C.amber, color: C.navy, fontFamily: 'inherit', cursor: importing ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, minWidth: 200 }}>
                {importing ? `Importando... ${progress}%` : `🚀 Importar ${finalRows.length} lançamentos`}
              </button>
            </div>

            {/* Barra de progresso */}
            {importing && (
              <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.line}`, overflow: 'hidden', height: 8 }}>
                <div style={{ height: '100%', background: C.amber, width: `${progress}%`, transition: 'width 0.2s' }} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Concluído ── */}
        {step === 3 && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, color: C.ok, marginBottom: 8 }}>Importação concluída!</h2>
            <p style={{ color: C.ink3, fontSize: 13, marginBottom: 28 }}>{finalRows.length} lançamentos foram importados com sucesso.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/financeiro/lancamentos" style={{ padding: '11px 24px', border: 'none', borderRadius: 8, background: C.navy, color: '#FFF', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Ver lançamentos</Link>
              <button onClick={() => { setStep(0); setRows([]); setMapped([]); setCatOverrides({}) }} style={{ padding: '11px 24px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink2, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>Importar outro arquivo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
