import {
  Document, Page, Text, View, StyleSheet, Svg, Rect, G,
} from '@react-pdf/renderer'

// ── Paleta ──────────────────────────────────────────────────────────
const C = {
  navy:    '#17273C',
  navyMid: '#243448',
  amber:   '#E8A628',
  amberBg: '#FDF1D0',
  ok:      '#3D7A50',
  okBg:    '#E4F1E8',
  bad:     '#B84A33',
  badBg:   '#F9E8E4',
  ink:     '#1C2330',
  ink2:    '#45505F',
  ink3:    '#7F8A99',
  line:    '#DDD6C7',
  line2:   '#E8E2D5',
  surface: '#FFFFFF',
  bg:      '#F6F3ED',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.surface,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.ink,
  },

  // ── Capa ──────────────────────────────────────────────────
  cover: { backgroundColor: C.navy, flex: 1 },
  coverBody: { padding: 56, flex: 1, justifyContent: 'space-between' },
  coverBadge: {
    backgroundColor: 'rgba(232,166,40,0.25)',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.amber,
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 36,
  },
  coverAccent: { width: 48, height: 4, backgroundColor: C.amber, marginBottom: 16 },
  coverTitle: {
    fontSize: 38,
    fontFamily: 'Helvetica-Bold',
    color: C.surface,
    lineHeight: 1.15,
    marginBottom: 12,
  },
  coverSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 40 },
  coverInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 20 },
  coverInfoItem: { minWidth: 120 },
  coverInfoLabel: { fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  coverInfoValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.surface },
  coverFooter: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 14,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  coverFooterText: { fontSize: 8, color: 'rgba(255,255,255,0.4)' },

  // ── Header / Footer das páginas ──────────────────────────
  pageHeader: {
    backgroundColor: C.navy,
    paddingVertical: 10,
    paddingHorizontal: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageHeaderTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.surface, letterSpacing: 0.8 },
  pageHeaderSub:   { fontSize: 8, color: 'rgba(255,255,255,0.6)' },
  pageFooter: {
    position: 'absolute', bottom: 16, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: C.line2,
    paddingTop: 6,
  },
  pageFooterText: { fontSize: 7, color: C.ink3 },

  body: { padding: '24px 36px', flex: 1 },

  // ── KPIs ─────────────────────────────────────────────────
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  kpiCard: {
    flex: 1, borderRadius: 7, padding: 14,
    borderWidth: 1, borderColor: C.line2,
    backgroundColor: C.bg,
  },
  kpiLabel: {
    fontSize: 7, color: C.ink3, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 6, fontFamily: 'Helvetica-Bold',
  },
  kpiValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 },
  kpiSub:   { fontSize: 7, color: C.ink3 },

  // ── Section ───────────────────────────────────────────────
  sectionTitle:  { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 3 },
  sectionSub:    { fontSize: 8, color: C.ink3, marginBottom: 10 },
  sectionAccent: { width: 32, height: 3, backgroundColor: C.amber, marginBottom: 14, marginTop: 2 },

  // ── Tabela de pedidos ─────────────────────────────────────
  table: { borderRadius: 6, borderWidth: 1, borderColor: C.line, overflow: 'hidden', marginBottom: 20 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeadText: {
    color: C.surface, fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line2,
  },
  tableRowAlt: { backgroundColor: C.bg },
  tableCell:     { fontSize: 8, color: C.ink2 },
  tableCellBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.ink },

  // ── Itens sub-tabela ──────────────────────────────────────
  itemsBlock: {
    marginLeft: 20, marginTop: 2, marginBottom: 4,
    borderLeftWidth: 2, borderLeftColor: C.amber,
    paddingLeft: 8,
  },
  itemRow: { flexDirection: 'row', marginBottom: 2 },
  itemText: { fontSize: 7.5, color: C.ink2 },
  itemBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.ink },

  // ── Pill de status ─────────────────────────────────────────
  pill: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },

  // ── Gráfico de barras ─────────────────────────────────────
  chartCard: {
    borderWidth: 1, borderColor: C.line2,
    borderRadius: 7, padding: 14, marginBottom: 18,
    backgroundColor: C.surface,
  },
  chartTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 3 },
  chartSub:   { fontSize: 8, color: C.ink3, marginBottom: 10 },

  // ── Rodapé de totais ──────────────────────────────────────
  totaisRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 28,
    padding: 10,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.line, borderTopWidth: 0,
    borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    marginBottom: 22,
  },
  totaisLabel: { fontSize: 8, color: C.ink3 },
  totaisValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.ink },
})

// ── Helpers ─────────────────────────────────────────────────────────
function brl(n) {
  if (!n && n !== 0) return 'R$ —'
  return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

const STATUS_LABEL = {
  rascunho:  { label: 'Rascunho',  bg: '#E8E2D5', fg: '#7F8A99' },
  confirmado:{ label: 'Confirmado',bg: '#EDF2FB', fg: '#2D5FA0' },
  recebido:  { label: 'Recebido',  bg: '#E4F1E8', fg: '#3D7A50' },
  cancelado: { label: 'Cancelado', bg: '#F3F0EA', fg: '#7F8A99' },
}

// ── Gráfico de barras horizontal ─────────────────────────────────────
function BarChart({ data, width = 480, maxBars = 12 }) {
  const items = data.slice(0, maxBars)
  if (!items.length) return null
  const max = Math.max(...items.map(d => d.value), 1)
  const rowH = 20
  const labelW = 160
  const chartW = width - labelW - 70
  const totalH = items.length * rowH + 8

  return (
    <Svg width={width} height={totalH}>
      {items.map((item, i) => {
        const barW = Math.max((item.value / max) * chartW, 2)
        const y = i * rowH + 4
        return (
          <G key={i}>
            <Rect x={labelW} y={y} width={chartW} height={rowH - 6} fill={C.line2} rx={2} />
            <Rect x={labelW} y={y} width={barW} height={rowH - 6} fill={C.amber} rx={2} />
            <Text x={labelW - 5} y={y + 9} style={{ fontSize: 7.5, textAnchor: 'end', fill: C.ink2 }}>
              {item.label.length > 26 ? item.label.slice(0, 26) + '…' : item.label}
            </Text>
            <Text x={labelW + barW + 4} y={y + 9} style={{ fontSize: 7.5, fill: C.ink, fontFamily: 'Helvetica-Bold' }}>
              {item.display}
            </Text>
          </G>
        )
      })}
    </Svg>
  )
}

// ── Header e Footer das páginas internas ─────────────────────────────
function PageHeader({ empresa, periodo }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View>
        <Text style={styles.pageHeaderTitle}>RELATÓRIO DE COMPRAS</Text>
        <Text style={styles.pageHeaderSub}>{empresa}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.pageHeaderSub}>{periodo}</Text>
        <Text style={styles.pageHeaderSub} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  )
}

function PageFooter({ geradoEm, empresa }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterText}>{empresa}</Text>
      <Text style={styles.pageFooterText}>Gerado em {geradoEm}</Text>
    </View>
  )
}

// ── Documento principal ──────────────────────────────────────────────
export default function ComprasPDFDocument({
  pedidos = [],
  empresa = 'Empresa',
  periodo = '',
  geradoEm = new Date().toLocaleString('pt-BR'),
}) {
  // KPIs
  const totalGasto     = pedidos.reduce((s, p) => s + (+p.valor_total || 0), 0)
  const totalItens     = pedidos.reduce((s, p) => s + (p.itens?.length || 0), 0)
  const fornecedores   = [...new Set(pedidos.filter(p => p.contato?.nome).map(p => p.contato.nome))]
  const obras          = [...new Set(pedidos.filter(p => p.obra?.nome).map(p => p.obra.nome))]

  // Agrupamento por fornecedor para o gráfico
  const porFornecedor = Object.entries(
    pedidos.reduce((acc, p) => {
      const nome = p.contato?.nome || 'Sem fornecedor'
      acc[nome] = (acc[nome] || 0) + (+p.valor_total || 0)
      return acc
    }, {})
  )
    .map(([label, value]) => ({ label, value, display: brl(value) }))
    .sort((a, b) => b.value - a.value)

  // Agrupamento por obra para o gráfico
  const porObra = Object.entries(
    pedidos.reduce((acc, p) => {
      const nome = p.obra?.nome || 'Sem obra'
      acc[nome] = (acc[nome] || 0) + (+p.valor_total || 0)
      return acc
    }, {})
  )
    .map(([label, value]) => ({ label, value, display: brl(value) }))
    .sort((a, b) => b.value - a.value)

  // Itens mais comprados (por descrição)
  const itensMaisComprados = Object.entries(
    pedidos.flatMap(p => p.itens || []).reduce((acc, item) => {
      const k = item.descricao
      if (!acc[k]) acc[k] = { valor: 0, qtd: 0 }
      acc[k].valor += +(item.valor_total || 0)
      acc[k].qtd   += +(item.quantidade || 0)
      return acc
    }, {})
  )
    .map(([label, v]) => ({ label, value: v.valor, display: brl(v.valor) }))
    .sort((a, b) => b.value - a.value)

  const periodoLabel = periodo || 'Todos os períodos'

  return (
    <Document title={`Relatório de Compras - ${periodoLabel}`} author={empresa} subject="Relatório de Compras">

      {/* ──────────────────── CAPA ──────────────────── */}
      <Page size="A4" style={{ backgroundColor: C.navy }}>
        <View style={styles.coverBody}>
          <View>
            <Text style={styles.coverBadge}>RELATÓRIO OFICIAL</Text>
            <View style={styles.coverAccent} />
            <Text style={styles.coverTitle}>Relatório{'\n'}de Compras</Text>
            <Text style={styles.coverSubtitle}>Registro completo de pedidos e materiais adquiridos</Text>

            <View style={styles.coverInfoGrid}>
              <View style={styles.coverInfoItem}>
                <Text style={styles.coverInfoLabel}>Empresa</Text>
                <Text style={styles.coverInfoValue}>{empresa}</Text>
              </View>
              <View style={styles.coverInfoItem}>
                <Text style={styles.coverInfoLabel}>Período</Text>
                <Text style={styles.coverInfoValue}>{periodoLabel}</Text>
              </View>
              <View style={styles.coverInfoItem}>
                <Text style={styles.coverInfoLabel}>Pedidos</Text>
                <Text style={styles.coverInfoValue}>{pedidos.length}</Text>
              </View>
              <View style={styles.coverInfoItem}>
                <Text style={styles.coverInfoLabel}>Total Gasto</Text>
                <Text style={[styles.coverInfoValue, { color: C.amber }]}>{brl(totalGasto)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.coverFooter}>
            <Text style={styles.coverFooterText}>Documento gerado automaticamente pelo sistema</Text>
            <Text style={styles.coverFooterText}>{geradoEm}</Text>
          </View>
        </View>
      </Page>

      {/* ──────────────────── RESUMO EXECUTIVO ──────────────────── */}
      <Page size="A4" style={styles.page}>
        <PageHeader empresa={empresa} periodo={periodoLabel} />
        <View style={[styles.body, { paddingBottom: 48 }]}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <Text style={styles.sectionSub}>Indicadores-chave do período selecionado</Text>
          <View style={styles.sectionAccent} />

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Gasto</Text>
              <Text style={[styles.kpiValue, { color: C.bad, fontSize: 16 }]}>{brl(totalGasto)}</Text>
              <Text style={styles.kpiSub}>no período</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Pedidos</Text>
              <Text style={styles.kpiValue}>{pedidos.length}</Text>
              <Text style={styles.kpiSub}>notas / pedidos</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Itens Comprados</Text>
              <Text style={styles.kpiValue}>{totalItens}</Text>
              <Text style={styles.kpiSub}>linhas de itens</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Fornecedores</Text>
              <Text style={styles.kpiValue}>{fornecedores.length}</Text>
              <Text style={styles.kpiSub}>{obras.length} obra(s)</Text>
            </View>
          </View>

          {/* Gráfico por fornecedor */}
          {porFornecedor.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Gastos por Fornecedor</Text>
              <Text style={styles.chartSub}>Valor total comprado de cada fornecedor no período</Text>
              <BarChart data={porFornecedor} maxBars={10} />
            </View>
          )}

          {/* Gráfico por obra */}
          {porObra.length > 1 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Gastos por Obra</Text>
              <Text style={styles.chartSub}>Distribuição dos pedidos por obra</Text>
              <BarChart data={porObra} maxBars={8} />
            </View>
          )}

          {/* Itens mais comprados */}
          {itensMaisComprados.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Materiais por Valor Total</Text>
              <Text style={styles.chartSub}>Top materiais pelo valor gasto no período</Text>
              <BarChart data={itensMaisComprados} maxBars={10} />
            </View>
          )}
        </View>
        <PageFooter geradoEm={geradoEm} empresa={empresa} />
      </Page>

      {/* ──────────────────── DETALHAMENTO POR PEDIDO ──────────────────── */}
      <Page size="A4" style={styles.page}>
        <PageHeader empresa={empresa} periodo={periodoLabel} />
        <View style={[styles.body, { paddingBottom: 48 }]}>
          <Text style={styles.sectionTitle}>Detalhamento dos Pedidos</Text>
          <Text style={styles.sectionSub}>Todos os pedidos do período com seus itens</Text>
          <View style={styles.sectionAccent} />

          <View style={styles.table}>
            {/* Cabeçalho */}
            <View style={styles.tableHead} fixed>
              <Text style={[styles.tableHeadText, { width: 58 }]}>Data</Text>
              <Text style={[styles.tableHeadText, { flex: 2 }]}>Fornecedor</Text>
              <Text style={[styles.tableHeadText, { flex: 2 }]}>Obra</Text>
              <Text style={[styles.tableHeadText, { width: 60 }]}>NF</Text>
              <Text style={[styles.tableHeadText, { width: 50, textAlign: 'right' }]}>Itens</Text>
              <Text style={[styles.tableHeadText, { width: 72, textAlign: 'right' }]}>Total</Text>
              <Text style={[styles.tableHeadText, { width: 52, textAlign: 'right' }]}>Status</Text>
            </View>

            {pedidos.map((p, idx) => {
              const st = STATUS_LABEL[p.status] || STATUS_LABEL.recebido
              return (
                <View key={p.id} wrap={false}>
                  {/* Linha do pedido */}
                  <View style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCell, { width: 58 }]}>{fmtDate(p.data)}</Text>
                    <Text style={[styles.tableCellBold, { flex: 2 }]}>
                      {p.contato?.nome || '—'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2, color: C.ink2 }]}>
                      {p.obra?.nome || '—'}
                    </Text>
                    <Text style={[styles.tableCell, { width: 60 }]}>
                      {p.numero_nf || '—'}
                    </Text>
                    <Text style={[styles.tableCell, { width: 50, textAlign: 'right' }]}>
                      {p.itens?.length || 0}
                    </Text>
                    <Text style={[styles.tableCellBold, { width: 72, textAlign: 'right', color: C.bad }]}>
                      {brl(p.valor_total)}
                    </Text>
                    <View style={{ width: 52, alignItems: 'flex-end' }}>
                      <Text style={[styles.pill, { backgroundColor: st.bg, color: st.fg }]}>
                        {st.label}
                      </Text>
                    </View>
                  </View>

                  {/* Itens do pedido */}
                  {p.itens && p.itens.length > 0 && (
                    <View style={{ paddingHorizontal: 10, paddingBottom: 6, backgroundColor: idx % 2 === 1 ? C.bg : C.surface }}>
                      <View style={styles.itemsBlock}>
                        {/* Cabeçalho dos itens */}
                        <View style={[styles.itemRow, { marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.line2, paddingBottom: 3 }]}>
                          <Text style={[styles.itemBold, { flex: 4 }]}>Material / Descrição</Text>
                          <Text style={[styles.itemBold, { width: 36 }]}>Un.</Text>
                          <Text style={[styles.itemBold, { width: 44, textAlign: 'right' }]}>Qtd.</Text>
                          <Text style={[styles.itemBold, { width: 68, textAlign: 'right' }]}>Vl. Unitário</Text>
                          <Text style={[styles.itemBold, { width: 68, textAlign: 'right' }]}>Total</Text>
                        </View>
                        {p.itens.map((item, ii) => (
                          <View key={ii} style={styles.itemRow}>
                            <Text style={[styles.itemText, { flex: 4 }]}>{item.descricao}</Text>
                            <Text style={[styles.itemText, { width: 36 }]}>{item.unidade}</Text>
                            <Text style={[styles.itemText, { width: 44, textAlign: 'right' }]}>
                              {Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                            </Text>
                            <Text style={[styles.itemText, { width: 68, textAlign: 'right' }]}>{brl(item.valor_unitario)}</Text>
                            <Text style={[styles.itemBold, { width: 68, textAlign: 'right', color: C.ink }]}>{brl(item.valor_total)}</Text>
                          </View>
                        ))}
                      </View>
                      {p.observacao && (
                        <Text style={{ fontSize: 7, color: C.ink3, marginLeft: 20, marginTop: 2, fontStyle: 'italic' }}>
                          Obs: {p.observacao}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )
            })}
          </View>

          {/* Rodapé totais */}
          <View style={styles.totaisRow}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.totaisLabel}>Total de pedidos:</Text>
              <Text style={styles.totaisValue}>{pedidos.length}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.totaisLabel}>Total de itens:</Text>
              <Text style={styles.totaisValue}>{totalItens}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.totaisLabel}>Valor total:</Text>
              <Text style={[styles.totaisValue, { color: C.bad }]}>{brl(totalGasto)}</Text>
            </View>
          </View>
        </View>
        <PageFooter geradoEm={geradoEm} empresa={empresa} />
      </Page>

    </Document>
  )
}
