// Importar Categorias via CSV
// Formato esperado: Grupo;Subgrupo;Categoria;Tipo  (Entrada=receita / Saída=despesa)
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Parse CSV ponto-e-vírgula ─────────────────────────────
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

// ── Monta estrutura em árvore a partir das linhas CSV ─────
function buildTree(rows) {
  // grupos únicos
  const grupos = [...new Set(rows.map(r => r['Grupo']).filter(Boolean))]
  // subgrupos únicos por grupo
  const subgrupos = {}
  rows.forEach(r => {
    if (!r['Grupo'] || !r['Subgrupo']) return
    if (!subgrupos[r['Grupo']]) subgrupos[r['Grupo']] = new Set()
    subgrupos[r['Grupo']].add(r['Subgrupo'])
  })
  return { grupos, subgrupos, rows }
}

// ── Componente ────────────────────────────────────────────
export default function ImportarCategorias() {
  const fileRef = useRef(null)
  const [step, setStep] = useState(0)
  const [rows, setRows] = useState([])
  const [tree, setTree] = useState(null)
  const [drag, setDrag] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFile(file) {
    if (!file?.name.match(/\.csv$/i)) { toast.error('Selecione um arquivo .csv'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target.result)
      if (!parsed.length) { toast.error('CSV sem dados ou formato inválido'); return }
      setRows(parsed)
      setTree(buildTree(parsed))
      setStep(1)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    handleFile(e.dataTransfer.files[0])
  }

  // Conta grupos / subgrupos / categorias únicos
  const stats = tree ? {
    grupos: tree.grupos.length,
    subgrupos: Object.values(tree.subgrupos).reduce((s, v) => s + v.size, 0),
    categorias: rows.length,
    receitas: rows.filter(r => r['Tipo']?.toLowerCase() === 'entrada').length,
    despesas: rows.filter(r => r['Tipo']?.toLowerCase() === 'saída' || r['Tipo']?.toLowerCase() === 'saida').length,
  } : null

  async function importar() {
    setImporting(true)
    setProgress(0)
    try {
      // PASSO 1: inserir grupos (nível 1, sem parent_id)
      const gruposUnicos = tree.grupos
      const gruposPayload = gruposUnicos.map(nome => {
        // tipo do grupo = inferido pelo conteúdo (se tem alguma receita, marca como receita; se misto, despesa)
        const linhasDoGrupo = rows.filter(r => r['Grupo'] === nome)
        const temReceita = linhasDoGrupo.some(r => r['Tipo']?.toLowerCase() === 'entrada')
        const temDespesa = linhasDoGrupo.some(r => r['Tipo']?.toLowerCase().startsWith('sa'))
        const tipo = temReceita && !temDespesa ? 'receita' : 'despesa'
        return { nome, tipo }
      })
      setProgress(10)

      const { data: gruposInseridos, error: e1 } = await supabase
        .from('financeiro_categorias').insert(gruposPayload).select('id, nome')
      if (e1) throw e1

      // mapa nome → id
      const grupoMap = Object.fromEntries(gruposInseridos.map(g => [g.nome, g.id]))
      setProgress(25)

      // PASSO 2: inserir subgrupos (nível 2, parent = grupo)
      const subgruposPayload = []
      for (const [grupoNome, subs] of Object.entries(tree.subgrupos)) {
        for (const subNome of subs) {
          const linhasDoSub = rows.filter(r => r['Grupo'] === grupoNome && r['Subgrupo'] === subNome)
          const temReceita = linhasDoSub.some(r => r['Tipo']?.toLowerCase() === 'entrada')
          const temDespesa = linhasDoSub.some(r => r['Tipo']?.toLowerCase().startsWith('sa'))
          const tipo = temReceita && !temDespesa ? 'receita' : 'despesa'
          subgruposPayload.push({ nome: subNome, tipo, parent_id: grupoMap[grupoNome] })
        }
      }

      const { data: subgruposInseridos, error: e2 } = await supabase
        .from('financeiro_categorias').insert(subgruposPayload).select('id, nome, parent_id')
      if (e2) throw e2

      // mapa "grupo_id:subNome" → id do subgrupo
      const subMap = {}
      subgruposInseridos.forEach(s => { subMap[`${s.parent_id}:${s.nome}`] = s.id })
      setProgress(50)

      // PASSO 3: inserir categorias folha (nível 3 se tem subgrupo, nível 2 se não tem)
      const catPayload = rows.map(r => {
        const tipo = r['Tipo']?.toLowerCase() === 'entrada' ? 'receita' : 'despesa'
        const grupoId = grupoMap[r['Grupo']]
        let parent_id = grupoId // fallback: direto no grupo

        if (r['Subgrupo'] && grupoId) {
          const subId = subMap[`${grupoId}:${r['Subgrupo']}`]
          if (subId) parent_id = subId
        }

        return {
          nome: r['Categoria'] || r['Subgrupo'] || r['Grupo'],
          tipo,
          parent_id: parent_id || null,
        }
      }).filter(r => r.nome) // ignora linhas sem nome

      // Insere em chunks de 100
      let done = 0
      const CHUNK = 100
      for (let i = 0; i < catPayload.length; i += CHUNK) {
        const chunk = catPayload.slice(i, i + CHUNK)
        const { error: e3 } = await supabase.from('financeiro_categorias').insert(chunk)
        if (e3) throw e3
        done += chunk.length
        setProgress(50 + Math.round((done / catPayload.length) * 50))
      }

      setResult({
        grupos: gruposInseridos.length,
        subgrupos: subgruposInseridos.length,
        categorias: catPayload.length,
        total: gruposInseridos.length + subgruposInseridos.length + catPayload.length,
      })
      setStep(2)
    } catch (err) {
      toast.error('Erro na importação: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F6F3ED', padding: '32px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 4 }}>
            <Link to="/cadastros/financeiro" style={{ color: C.ink3, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>← Categorias</Link>
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: C.ink3, fontWeight: 600 }}>CADASTROS</div>
          <h1 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 28, fontWeight: 500, color: C.navy, margin: '4px 0 6px' }}>Importar Categorias</h1>
          <p style={{ color: C.ink3, fontSize: 13 }}>Importe o plano de contas a partir de arquivo CSV com colunas: <strong>Grupo · Subgrupo · Categoria · Tipo</strong></p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
          {['Arquivo', 'Prévia', 'Concluído'].map((lbl, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 16px', textAlign: 'center', background: step === i ? C.navy : step > i ? '#E4F1E8' : '', borderRight: i < 2 ? `1px solid ${C.line}` : '' }}>
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
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
              <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 20, color: C.ink, marginBottom: 8 }}>
                {drag ? 'Solte o arquivo aqui' : 'Arraste o CSV ou clique para selecionar'}
              </div>
              <div style={{ color: C.ink3, fontSize: 12 }}>Separado por ponto-e-vírgula (;) · Primeira linha = cabeçalho</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
            <div style={{ marginTop: 20, padding: 16, background: '#F6F3ED', borderRadius: 8, fontSize: 12, color: C.ink2 }}>
              <strong>Colunas esperadas:</strong>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  ['Grupo', 'Nível 1 (ex: Custos operacionais)'],
                  ['Subgrupo', 'Nível 2 (ex: Instalação Elétrica)'],
                  ['Categoria', 'Nível 3 — categoria folha'],
                  ['Tipo', '"Entrada" ou "Saída"'],
                ].map(([col, desc]) => (
                  <div key={col} style={{ background: C.surface, borderRadius: 6, padding: '8px 10px', border: `1px solid ${C.line}` }}>
                    <div style={{ fontWeight: 700, color: C.ink, marginBottom: 2 }}>{col}</div>
                    <div style={{ color: C.ink3, fontSize: 11 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Prévia ── */}
        {step === 1 && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
              {[
                { label: 'Grupos', value: stats.grupos, color: C.navy },
                { label: 'Subgrupos', value: stats.subgrupos, color: '#5B6E84' },
                { label: 'Categorias', value: stats.categorias, color: C.ink2 },
                { label: 'Receitas', value: stats.receitas, color: C.ok },
                { label: 'Despesas', value: stats.despesas, color: C.bad },
              ].map(k => (
                <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: C.ink3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, color: k.color, marginTop: 4 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Prévia da árvore */}
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Estrutura detectada</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>Primeiros 60 registros</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F6F3ED' }}>
                      {['Grupo', 'Subgrupo', 'Categoria', 'Tipo'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: C.ink3, letterSpacing: '0.06em', fontSize: 10, borderBottom: `1px solid ${C.line}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 60).map((r, i) => {
                      const isReceita = r['Tipo']?.toLowerCase() === 'entrada'
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.line2}`, background: i % 2 === 0 ? '' : '#FAFAF8' }}>
                          <td style={{ padding: '7px 14px', color: C.ink2, fontWeight: 500 }}>{r['Grupo']}</td>
                          <td style={{ padding: '7px 14px', color: C.ink3 }}>{r['Subgrupo'] || <span style={{ opacity: 0.4 }}>—</span>}</td>
                          <td style={{ padding: '7px 14px', color: C.ink }}>{r['Categoria']}</td>
                          <td style={{ padding: '7px 14px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isReceita ? '#E4F1E8' : '#FFF0EE', color: isReceita ? C.ok : C.bad }}>
                              {isReceita ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 60 && (
                <div style={{ padding: '10px 16px', background: '#F6F3ED', borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.ink3, textAlign: 'center' }}>
                  + {rows.length - 60} registros adicionais · todos serão importados
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', background: '#F6F3ED', borderRadius: 8, fontSize: 12, color: C.ink2, border: `1px solid ${C.line}` }}>
              <strong>O que será criado:</strong> {stats.grupos} grupos (nível 1) → {stats.subgrupos} subgrupos (nível 2) → {stats.categorias} categorias (nível 3)
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setStep(0); setRows([]); setTree(null) }} style={{ padding: '10px 20px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink2, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>Voltar</button>
              <button
                onClick={importar}
                disabled={importing}
                style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: importing ? '#999' : C.amber, color: C.navy, fontFamily: 'inherit', cursor: importing ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, minWidth: 220 }}>
                {importing ? `Importando... ${progress}%` : `🚀 Importar ${stats.grupos + stats.subgrupos + stats.categorias} registros`}
              </button>
            </div>

            {importing && (
              <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.line}`, overflow: 'hidden', height: 8 }}>
                <div style={{ height: '100%', background: C.amber, width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Concluído ── */}
        {step === 2 && result && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, color: C.ok, marginBottom: 12 }}>Importação concluída!</h2>
            <div style={{ display: 'inline-flex', gap: 24, background: '#F6F3ED', border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 28px', marginBottom: 28 }}>
              <div><div style={{ fontSize: 28, fontWeight: 700, color: C.navy }}>{result.grupos}</div><div style={{ fontSize: 11, color: C.ink3 }}>GRUPOS</div></div>
              <div style={{ borderLeft: `1px solid ${C.line}` }} />
              <div><div style={{ fontSize: 28, fontWeight: 700, color: C.navy }}>{result.subgrupos}</div><div style={{ fontSize: 11, color: C.ink3 }}>SUBGRUPOS</div></div>
              <div style={{ borderLeft: `1px solid ${C.line}` }} />
              <div><div style={{ fontSize: 28, fontWeight: 700, color: C.navy }}>{result.categorias}</div><div style={{ fontSize: 11, color: C.ink3 }}>CATEGORIAS</div></div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/cadastros/financeiro" style={{ padding: '11px 24px', border: 'none', borderRadius: 8, background: C.navy, color: '#FFF', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Ver categorias</Link>
              <button onClick={() => { setStep(0); setRows([]); setTree(null); setResult(null) }} style={{ padding: '11px 24px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink2, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>Importar outro arquivo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
