// Financeiro — Previsto x Realizado
// Design: navy banner + tabela 12 meses com subgrupos expansíveis
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { lancamentosFinService, categoriasService } from '@/services/financeiroService'

// ── Palette ──────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
  subgrupo: 'rgba(23,39,60,0.04)',
}

// ── Constants ─────────────────────────────────────────────────────
const ANO = new Date().getFullYear()
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ── Helpers ───────────────────────────────────────────────────────
function brl(n) {
  if (!n && n !== 0) return '—'
  const abs = Math.abs(n)
  return (n < 0 ? '−' : '') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function brlK(n) {
  const abs = Math.abs(n)
  if (abs === 0) return '—'
  if (abs >= 1_000_000) return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1_000)     return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000).toFixed(0) + 'k'
  return brl(n)
}
function pct(realizado, previsto) {
  if (!previsto) return null
  return Math.round((realizado / previsto) * 100)
}

// Status da célula: dentro (verde), próximo do limite (âmbar), estouro (vermelho)
function cellStatus(realizado, previsto) {
  if (!previsto) return 'neutro'
  const p = realizado / previsto
  if (p <= 0.85) return 'ok'
  if (p <= 1.0)  return 'warn'
  return 'bad'
}

const STATUS_COLORS = {
  ok:     { bg: '#E4F1E8', fg: '#3D7A50' },
  warn:   { bg: '#FDF3DF', fg: '#8A6210' },
  bad:    { bg: '#FBE9E4', fg: '#B84A33' },
  neutro: { bg: 'transparent', fg: C.ink3 },
}

// ── KPI Banner ────────────────────────────────────────────────────
function Banner({ totalPrevisto, totalRealizado }) {
  const diff    = totalPrevisto - totalRealizado
  const execPct = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0

  return (
    <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 14 }}>
      <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>PREVISTO · {ANO}</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>{brlK(totalPrevisto)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Orçamento anual total</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>REALIZADO · {ANO}</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 32, fontWeight: 500, marginTop: 6, color: '#F4B19C' }}>
          {brlK(totalRealizado)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Despesas pagas no ano</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>DIFERENÇA</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 32, fontWeight: 500, marginTop: 6, color: diff >= 0 ? '#8ED1A5' : '#F4B19C' }}>
          {diff >= 0 ? '+' : ''}{brlK(diff)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
          {diff >= 0 ? 'Dentro do orçamento' : 'Acima do orçamento'}
        </div>
      </div>
      <div style={{ paddingLeft: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>EXECUÇÃO</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 32, fontWeight: 500, marginTop: 6, color: execPct <= 100 ? '#8ED1A5' : '#F4B19C' }}>
          {totalPrevisto > 0 ? `${execPct}%` : '—'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Do orçamento utilizado</div>
      </div>
    </div>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────
const FILTROS = [
  { key: 'todos',       label: 'Todos' },
  { key: 'com_gastos',  label: 'Com gastos' },
  { key: 'sem_gastos',  label: 'Sem gastos' },
  { key: 'economia',    label: 'Economia' },
  { key: 'estouro',     label: 'Estouro' },
]

function Toolbar({ filtro, setFiltro, busca, setBusca, expandAll, collapseAll }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filtro === f.key ? C.navy : C.surface2,
              color: filtro === f.key ? '#FFF' : C.ink2,
              fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar subgrupo…"
        style={{
          padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 12, color: C.ink,
          background: C.surface, outline: 'none', fontFamily: 'inherit', minWidth: 180,
        }}
      />

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <button onClick={expandAll}   style={ghostBtnStyle}>Expandir tudo</button>
        <button onClick={collapseAll} style={ghostBtnStyle}>Recolher tudo</button>
      </div>
    </div>
  )
}

const ghostBtnStyle = {
  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer',
  border: `1px solid ${C.line}`, background: C.surface, color: C.ink2, fontFamily: 'inherit',
}

// ── Célula de valor Prev/Real/Diff ────────────────────────────────
function CelulaTriple({ previsto, realizado }) {
  const diff   = realizado - previsto
  const status = cellStatus(realizado, previsto)
  const sc     = STATUS_COLORS[status]
  const execP  = pct(realizado, previsto)

  return (
    <td style={{ padding: '6px 4px', verticalAlign: 'top', minWidth: 96, borderLeft: `1px solid ${C.line2}` }}>
      {/* Mini status bar */}
      {previsto > 0 && (
        <div style={{ height: 2, background: C.line2, borderRadius: 1, marginBottom: 4, overflow: 'hidden' }}>
          <div style={{
            width: Math.min(execP || 0, 100) + '%', height: '100%', borderRadius: 1,
            background: status === 'ok' ? C.ok : status === 'warn' ? C.warn : C.bad,
          }} />
        </div>
      )}
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: C.ink3, marginBottom: 1 }}>
        {brlK(previsto)}
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 600, color: C.ink }}>
        {brlK(realizado)}
      </div>
      {(previsto > 0 || realizado > 0) && (
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: diff <= 0 ? sc.fg : C.ink3,
          background: diff > 0 ? sc.bg : 'transparent',
          padding: diff > 0 ? '1px 4px' : 0,
          borderRadius: 3,
          marginTop: 1,
        }}>
          {diff > 0 ? `+${brlK(diff)}` : diff < 0 ? brlK(diff) : '='}
        </div>
      )}
    </td>
  )
}

// ── Linha de categoria ────────────────────────────────────────────
function LinhaCategoria({ categoria, realizadoPorMes, orcamentoPorMes }) {
  return (
    <tr style={{ background: C.surface }}>
      <td style={{ padding: '8px 12px 8px 32px', fontSize: 12, color: C.ink2, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: C.surface, zIndex: 1 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: categoria.cor || C.ink3, marginRight: 8, flexShrink: 0 }} />
        {categoria.nome}
      </td>
      {Array.from({ length: 12 }, (_, i) => (
        <CelulaTriple
          key={i}
          previsto={orcamentoPorMes[i + 1] || 0}
          realizado={realizadoPorMes[i + 1] || 0}
        />
      ))}
      <CelulaTriple
        previsto={Object.values(orcamentoPorMes).reduce((s, v) => s + v, 0)}
        realizado={Object.values(realizadoPorMes).reduce((s, v) => s + v, 0)}
      />
    </tr>
  )
}

// ── Linha de subgrupo (header expansível) ─────────────────────────
function LinhaSubgrupo({ nome, totalPrevisto, totalRealizado, prevPorMes, realPorMes, expandido, onToggle }) {
  return (
    <tr
      onClick={onToggle}
      style={{ background: C.subgrupo, cursor: 'pointer', userSelect: 'none' }}
    >
      <td style={{
        padding: '10px 12px', fontSize: 12, fontWeight: 700, color: C.ink,
        whiteSpace: 'nowrap', position: 'sticky', left: 0, background: C.subgrupo, zIndex: 1,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: 3, background: C.navy, color: '#FFF', fontSize: 9, fontWeight: 700,
          transform: expandido ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s',
          flexShrink: 0,
        }}>▼</span>
        {nome}
      </td>
      {Array.from({ length: 12 }, (_, i) => (
        <CelulaTriple
          key={i}
          previsto={prevPorMes[i + 1] || 0}
          realizado={realPorMes[i + 1] || 0}
        />
      ))}
      <CelulaTriple previsto={totalPrevisto} realizado={totalRealizado} />
    </tr>
  )
}

// ── Main table ────────────────────────────────────────────────────
function TabelaPVR({ grupos, realizadoMap, orcamentoMap, filtro, busca, expandidos, toggleGrupo }) {
  // Totals por mês (all groups)
  const totPrevPorMes  = useMemo(() => {
    const r = {}
    for (let m = 1; m <= 12; m++) {
      r[m] = grupos.flatMap(g => g.categorias).reduce((s, c) => s + (orcamentoMap[c.id]?.[m] || 0), 0)
    }
    return r
  }, [grupos, orcamentoMap])
  const totRealPorMes  = useMemo(() => {
    const r = {}
    for (let m = 1; m <= 12; m++) {
      r[m] = grupos.flatMap(g => g.categorias).reduce((s, c) => s + (realizadoMap[c.id]?.[m] || 0), 0)
    }
    return r
  }, [grupos, realizadoMap])

  const filteredGrupos = useMemo(() => {
    let gs = grupos
    if (busca) gs = gs.filter(g => g.nome.toLowerCase().includes(busca.toLowerCase()))
    if (filtro === 'com_gastos')  gs = gs.filter(g => g.categorias.some(c => Object.values(realizadoMap[c.id] || {}).some(v => v > 0)))
    if (filtro === 'sem_gastos')  gs = gs.filter(g => g.categorias.every(c => Object.values(realizadoMap[c.id] || {}).every(v => !v)))
    if (filtro === 'economia')    gs = gs.filter(g => {
      const rTotal = g.categorias.reduce((s, c) => s + Object.values(realizadoMap[c.id] || {}).reduce((x, v) => x + v, 0), 0)
      const pTotal = g.categorias.reduce((s, c) => s + Object.values(orcamentoMap[c.id] || {}).reduce((x, v) => x + v, 0), 0)
      return pTotal > 0 && rTotal < pTotal
    })
    if (filtro === 'estouro')     gs = gs.filter(g => {
      const rTotal = g.categorias.reduce((s, c) => s + Object.values(realizadoMap[c.id] || {}).reduce((x, v) => x + v, 0), 0)
      const pTotal = g.categorias.reduce((s, c) => s + Object.values(orcamentoMap[c.id] || {}).reduce((x, v) => x + v, 0), 0)
      return pTotal > 0 && rTotal > pTotal
    })
    return gs
  }, [grupos, filtro, busca, realizadoMap, orcamentoMap])

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.navy, color: '#FFF' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', position: 'sticky', left: 0, background: C.navy, zIndex: 2, minWidth: 200 }}>
              Categoria
            </th>
            {MESES.map((m, i) => (
              <th key={i} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 96, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {m}
              </th>
            ))}
            <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 96, borderLeft: '1px solid rgba(255,255,255,0.15)', color: C.amber }}>
              Total
            </th>
          </tr>
          {/* Sub-header: Prev / Real / Dif */}
          <tr style={{ background: '#0F1D2E', color: 'rgba(255,255,255,0.5)' }}>
            <th style={{ padding: '4px 12px', position: 'sticky', left: 0, background: '#0F1D2E', zIndex: 2 }} />
            {Array.from({ length: 13 }, (_, i) => (
              <th key={i} style={{ padding: '4px 4px', fontSize: 9, fontWeight: 500, letterSpacing: '0.04em', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Prev</span>
                  <span style={{ color: '#FFF' }}>Real</span>
                  <span style={{ color: C.amber }}>Dif</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredGrupos.length === 0 ? (
            <tr>
              <td colSpan={14} style={{ padding: '40px 20px', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
                Nenhum subgrupo encontrado
              </td>
            </tr>
          ) : filteredGrupos.map(grupo => {
            const expandido = expandidos.has(grupo.nome)
            const prevPorMes = {}
            const realPorMes = {}
            for (let m = 1; m <= 12; m++) {
              prevPorMes[m] = grupo.categorias.reduce((s, c) => s + (orcamentoMap[c.id]?.[m] || 0), 0)
              realPorMes[m] = grupo.categorias.reduce((s, c) => s + (realizadoMap[c.id]?.[m] || 0), 0)
            }
            const totalPrevisto  = Object.values(prevPorMes).reduce((s, v) => s + v, 0)
            const totalRealizado = Object.values(realPorMes).reduce((s, v) => s + v, 0)

            return [
              <LinhaSubgrupo
                key={`sg-${grupo.nome}`}
                nome={grupo.nome}
                totalPrevisto={totalPrevisto}
                totalRealizado={totalRealizado}
                prevPorMes={prevPorMes}
                realPorMes={realPorMes}
                expandido={expandido}
                onToggle={() => toggleGrupo(grupo.nome)}
              />,
              ...(expandido ? grupo.categorias.map(c => (
                <LinhaCategoria
                  key={`cat-${c.id}`}
                  categoria={c}
                  realizadoPorMes={realizadoMap[c.id] || {}}
                  orcamentoPorMes={orcamentoMap[c.id] || {}}
                />
              )) : []),
            ]
          })}
          {/* Total row */}
          <tr style={{ background: C.navy, color: '#FFF', fontWeight: 700 }}>
            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, position: 'sticky', left: 0, background: C.navy, zIndex: 1, color: '#FFF' }}>
              TOTAL GERAL
            </td>
            {Array.from({ length: 12 }, (_, i) => (
              <CelulaTriple
                key={i}
                previsto={totPrevPorMes[i + 1] || 0}
                realizado={totRealPorMes[i + 1] || 0}
              />
            ))}
            <CelulaTriple
              previsto={Object.values(totPrevPorMes).reduce((s, v) => s + v, 0)}
              realizado={Object.values(totRealPorMes).reduce((s, v) => s + v, 0)}
            />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function PrevistoRealizado() {
  const [filtro, setFiltro]   = useState('todos')
  const [busca, setBusca]     = useState('')
  const [expandidos, setExpandidos] = useState(() => new Set())

  // Fetch all despesa categories
  const { data: categorias = [] } = useQuery({
    queryKey: ['fin-categorias'],
    queryFn: () => categoriasService.list('despesa'),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch all lancamentos for the current year (despesas pagas)
  const inicioAno = `${ANO}-01-01`
  const fimAno    = `${ANO}-12-31`
  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['fin-lancamentos-pvr', ANO],
    queryFn: () => lancamentosFinService.list({ inicio: inicioAno, fim: fimAno }),
  })

  // Group categories by grupo (fallback to type label)
  const grupos = useMemo(() => {
    const map = {}
    categorias.forEach(c => {
      const g = c.grupo || 'Sem grupo'
      if (!map[g]) map[g] = []
      map[g].push(c)
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nome, cats]) => ({ nome, categorias: cats }))
  }, [categorias])

  // realizadoMap: { categoria_id: { mes: valor } }
  const realizadoMap = useMemo(() => {
    const m = {}
    lancamentos
      .filter(l => l.tipo === 'despesa' && l.status === 'pago' && l.categoria_id)
      .forEach(l => {
        const mes = parseInt(l.data_vencimento?.slice(5, 7) || l.data_pagamento?.slice(5, 7) || '0', 10)
        if (!mes) return
        if (!m[l.categoria_id]) m[l.categoria_id] = {}
        m[l.categoria_id][mes] = (m[l.categoria_id][mes] || 0) + (+l.valor || 0)
      })
    return m
  }, [lancamentos])

  // orcamentoMap: empty until financeiro_orcamentos table is populated
  const orcamentoMap = useMemo(() => ({}), [])

  const totalRealizado = useMemo(() =>
    Object.values(realizadoMap).flatMap(m => Object.values(m)).reduce((s, v) => s + v, 0),
    [realizadoMap]
  )

  function toggleGrupo(nome) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome)
      else next.add(nome)
      return next
    })
  }

  function expandAll()   { setExpandidos(new Set(grupos.map(g => g.nome))) }
  function collapseAll() { setExpandidos(new Set()) }

  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Previsto × Realizado</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>
            Orçamento anual vs. despesas pagas · {ANO}
          </div>
        </div>
      </div>

      {/* Banner */}
      <Banner totalPrevisto={0} totalRealizado={totalRealizado} />

      {/* Toolbar */}
      <Toolbar
        filtro={filtro}
        setFiltro={setFiltro}
        busca={busca}
        setBusca={setBusca}
        expandAll={expandAll}
        collapseAll={collapseAll}
      />

      {/* Table */}
      {isLoading ? (
        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, padding: '60px 20px', textAlign: 'center', color: C.ink3, fontSize: 13 }}>
          Carregando lançamentos…
        </div>
      ) : (
        <TabelaPVR
          grupos={grupos}
          realizadoMap={realizadoMap}
          orcamentoMap={orcamentoMap}
          filtro={filtro}
          busca={busca}
          expandidos={expandidos}
          toggleGrupo={toggleGrupo}
        />
      )}

      {/* Info box: previsto ainda zerado */}
      {categorias.length > 0 && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#FDF3DF', border: '1px solid #E8D5A0', fontSize: 12, color: '#8A6210' }}>
          <strong>Coluna Previsto zerada</strong> · Os valores orçados serão preenchidos após criar a tabela{' '}
          <code style={{ fontFamily: '"JetBrains Mono", monospace', background: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: 3 }}>financeiro_orcamentos</code>{' '}
          no Supabase e inserir os dados via modal de edição.
        </div>
      )}
    </div>
  )
}
