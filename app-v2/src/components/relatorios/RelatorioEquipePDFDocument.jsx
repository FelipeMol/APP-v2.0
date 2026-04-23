import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Path,
  G,
  Circle,
} from '@react-pdf/renderer';

const colors = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  slate900: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

const palette = [
  colors.primary,
  colors.accent,
  colors.warning,
  colors.purple,
  colors.pink,
  colors.danger,
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.slate700,
  },
  coverPage: {
    backgroundColor: colors.primary,
    padding: 0,
    fontFamily: 'Helvetica',
    color: colors.white,
  },
  coverInner: {
    padding: 60,
    flex: 1,
    justifyContent: 'space-between',
  },
  coverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  coverTitle: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 40,
  },
  coverDivider: {
    width: 60,
    height: 3,
    backgroundColor: colors.white,
    marginBottom: 24,
  },
  coverInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  coverInfoLabel: {
    fontSize: 10,
    opacity: 0.7,
    width: 90,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverInfoValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverFooterText: {
    fontSize: 9,
    opacity: 0.75,
  },

  header: {
    backgroundColor: colors.primary,
    color: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 9,
    color: colors.white,
    opacity: 0.85,
  },

  body: {
    padding: 36,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.slate900,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: colors.slate500,
    marginBottom: 14,
  },
  sectionAccent: {
    width: 28,
    height: 3,
    backgroundColor: colors.primary,
    marginBottom: 12,
    marginTop: 2,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
  },
  kpiLabel: {
    fontSize: 8,
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colors.slate900,
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 8,
    color: colors.slate500,
  },

  table: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
    marginBottom: 22,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  tableRowAlt: {
    backgroundColor: colors.slate50,
  },
  tableCell: {
    fontSize: 9,
    color: colors.slate700,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.slate900,
  },

  chartCard: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
    backgroundColor: colors.white,
  },
  chartTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.slate900,
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 8,
    color: colors.slate500,
    marginBottom: 12,
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 5,
  },
  legendLabel: {
    fontSize: 8,
    color: colors.slate700,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: colors.slate500,
  },
});

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function minutesToHoursLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function BarChartHorizontal({ data, width = 500, height = 220, maxBars = 10 }) {
  const items = data.slice(0, maxBars);
  if (items.length === 0) return null;

  const max = Math.max(...items.map((d) => d.value), 1);
  const rowHeight = Math.min(22, (height - 20) / items.length);
  const labelWidth = 140;
  const chartWidth = width - labelWidth - 60;

  return (
    <Svg width={width} height={items.length * rowHeight + 16}>
      {items.map((item, i) => {
        const barW = (item.value / max) * chartWidth;
        const y = i * rowHeight + 8;
        return (
          <G key={i}>
            <Rect
              x={labelWidth}
              y={y - 6}
              width={chartWidth}
              height={rowHeight - 6}
              fill={colors.slate100}
              rx={2}
            />
            <Rect
              x={labelWidth}
              y={y - 6}
              width={barW}
              height={rowHeight - 6}
              fill={colors.primary}
              rx={2}
            />
            <Text
              x={labelWidth - 6}
              y={y + 5}
              style={{ fontSize: 8, textAnchor: 'end', fill: colors.slate700 }}
            >
              {item.label.length > 22 ? `${item.label.slice(0, 22)}…` : item.label}
            </Text>
            <Text
              x={labelWidth + barW + 4}
              y={y + 5}
              style={{ fontSize: 8, fill: colors.slate900, fontFamily: 'Helvetica-Bold' }}
            >
              {item.display}
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}

function LineChart({ data, width = 500, height = 160 }) {
  if (data.length === 0) return null;
  const pad = { top: 16, right: 16, bottom: 24, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;
  const points = data.map((d, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + plotH - (d.value / max) * plotH;
    return { x, y, d };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath =
    `M ${points[0].x} ${pad.top + plotH} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${pad.top + plotH} Z`;

  const gridLines = 4;
  const showLabelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Svg width={width} height={height}>
      {[...Array(gridLines + 1)].map((_, i) => {
        const y = pad.top + (plotH / gridLines) * i;
        const v = Math.round(max - (max / gridLines) * i);
        return (
          <G key={i}>
            <Line
              x1={pad.left}
              y1={y}
              x2={pad.left + plotW}
              y2={y}
              stroke={colors.slate200}
              strokeWidth={0.5}
            />
            <Text
              x={pad.left - 4}
              y={y + 3}
              style={{ fontSize: 7, textAnchor: 'end', fill: colors.slate500 }}
            >
              {v}h
            </Text>
          </G>
        );
      })}
      <Path d={areaPath} fill={colors.primary} fillOpacity={0.12} />
      <Path d={linePath} stroke={colors.primary} strokeWidth={1.5} fill="none" />
      {points.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={2.5} fill={colors.primary} />
          {i % showLabelEvery === 0 && (
            <Text
              x={p.x}
              y={height - 8}
              style={{ fontSize: 7, textAnchor: 'middle', fill: colors.slate500 }}
            >
              {p.d.label}
            </Text>
          )}
        </G>
      ))}
    </Svg>
  );
}

function PieChart({ data, size = 160 }) {
  if (data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const color = palette[i % palette.length];
    startAngle = endAngle;
    return { path, color, d };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => (
        <Path key={i} d={s.path} fill={s.color} />
      ))}
      <Circle cx={cx} cy={cy} r={r * 0.45} fill={colors.white} />
      <Text
        x={cx}
        y={cy + 2}
        style={{ fontSize: 8, textAnchor: 'middle', fill: colors.slate500 }}
      >
        Total
      </Text>
      <Text
        x={cx}
        y={cy - 6}
        style={{
          fontSize: 11,
          textAnchor: 'middle',
          fill: colors.slate900,
          fontFamily: 'Helvetica-Bold',
        }}
      >
        {minutesToHoursLabel(total)}
      </Text>
    </Svg>
  );
}

function PageHeader({ obra }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerTitle}>RELATÓRIO DE EQUIPE</Text>
        <Text style={styles.headerSub}>{obra}</Text>
      </View>
      <Text style={styles.headerSub} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function PageFooter({ geradoEm, empresa }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{empresa || 'Construtora RR'}</Text>
      <Text style={styles.footerText}>Gerado em {geradoEm}</Text>
    </View>
  );
}

export default function RelatorioEquipePDFDocument({
  obra = 'Obra',
  empresa = 'Construtora RR',
  periodoInicio,
  periodoFim,
  kpis = {},
  funcionarios = [],
  horasPorFuncionario = [],
  horasPorDia = [],
  horasPorFuncao = [],
  geradoEm = new Date().toLocaleString('pt-BR'),
}) {
  const totalPieSlices = horasPorFuncao.slice(0, 10);

  return (
    <Document
      title={`Relatório de Equipe - ${obra}`}
      author={empresa}
      subject="Relatório de Equipe por Período"
    >
      {/* CAPA */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverInner}>
          <View style={styles.coverHeader}>
            <Text style={styles.coverBadge}>RELATÓRIO OFICIAL</Text>
            <Text style={styles.coverBadge}>{empresa}</Text>
          </View>

          <View>
            <View style={styles.coverDivider} />
            <Text style={styles.coverTitle}>Relatório{'\n'}de Equipe</Text>
            <Text style={styles.coverSubtitle}>
              Análise completa de horas trabalhadas por funcionário
            </Text>

            <View style={{ marginTop: 30 }}>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Obra</Text>
                <Text style={styles.coverInfoValue}>{obra}</Text>
              </View>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Período</Text>
                <Text style={styles.coverInfoValue}>
                  {formatDateBR(periodoInicio)}  —  {formatDateBR(periodoFim)}
                </Text>
              </View>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Funcionários</Text>
                <Text style={styles.coverInfoValue}>{kpis.totalFuncionarios || 0}</Text>
              </View>
              <View style={styles.coverInfoRow}>
                <Text style={styles.coverInfoLabel}>Total de horas</Text>
                <Text style={styles.coverInfoValue}>
                  {kpis.totalHorasLabel || '0h'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.coverFooter}>
            <Text style={styles.coverFooterText}>Documento gerado automaticamente</Text>
            <Text style={styles.coverFooterText}>{geradoEm}</Text>
          </View>
        </View>
      </Page>

      {/* PÁGINA 2 - RESUMO EXECUTIVO */}
      <Page size="A4" style={styles.page}>
        <PageHeader obra={obra} />
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <Text style={styles.sectionSubtitle}>
            Indicadores-chave do período selecionado
          </Text>
          <View style={styles.sectionAccent} />

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Horas</Text>
              <Text style={styles.kpiValue}>{kpis.totalHorasLabel || '0h'}</Text>
              <Text style={styles.kpiSub}>no período</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Funcionários</Text>
              <Text style={styles.kpiValue}>{kpis.totalFuncionarios || 0}</Text>
              <Text style={styles.kpiSub}>pessoas únicas</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Dias Trab.</Text>
              <Text style={styles.kpiValue}>{kpis.diasTrabalhados || 0}</Text>
              <Text style={styles.kpiSub}>dias c/ registro</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Média/Dia</Text>
              <Text style={styles.kpiValue}>{kpis.mediaHorasDiaLabel || '0h'}</Text>
              <Text style={styles.kpiSub}>total ÷ dias</Text>
            </View>
          </View>

          {/* Gráfico de horas por dia */}
          {horasPorDia.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Horas Trabalhadas por Dia</Text>
              <Text style={styles.chartSubtitle}>
                Evolução das horas ao longo do período
              </Text>
              <LineChart data={horasPorDia} width={520} height={160} />
            </View>
          )}

          {/* Gráfico de horas por função (pizza) + legenda */}
          {totalPieSlices.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Distribuição por Função</Text>
              <Text style={styles.chartSubtitle}>
                Percentual de horas trabalhadas por função
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                <PieChart data={totalPieSlices} size={150} />
                <View style={{ flex: 1, marginLeft: 20 }}>
                  {totalPieSlices.map((s, i) => {
                    const total = totalPieSlices.reduce((sum, d) => sum + d.value, 0);
                    const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
                    return (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 5,
                        }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: palette[i % palette.length],
                            marginRight: 8,
                          }}
                        />
                        <Text style={{ fontSize: 9, flex: 1, color: colors.slate700 }}>
                          {s.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 9,
                            fontFamily: 'Helvetica-Bold',
                            color: colors.slate900,
                            marginRight: 10,
                          }}
                        >
                          {minutesToHoursLabel(s.value)}
                        </Text>
                        <Text style={{ fontSize: 9, color: colors.slate500, width: 40, textAlign: 'right' }}>
                          {pct}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>
        <PageFooter geradoEm={geradoEm} empresa={empresa} />
      </Page>

      {/* PÁGINA 3 - RANKING DE FUNCIONÁRIOS */}
      <Page size="A4" style={styles.page}>
        <PageHeader obra={obra} />
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Horas por Funcionário</Text>
          <Text style={styles.sectionSubtitle}>
            Top {Math.min(horasPorFuncionario.length, 10)} por total de horas no período
          </Text>
          <View style={styles.sectionAccent} />

          {horasPorFuncionario.length > 0 && (
            <View style={styles.chartCard}>
              <BarChartHorizontal data={horasPorFuncionario} width={520} maxBars={10} />
            </View>
          )}
        </View>
        <PageFooter geradoEm={geradoEm} empresa={empresa} />
      </Page>

      {/* PÁGINA 4+ - TABELA DETALHADA */}
      <Page size="A4" style={styles.page}>
        <PageHeader obra={obra} />
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Detalhamento por Funcionário</Text>
          <Text style={styles.sectionSubtitle}>
            Total de dias trabalhados e horas no período
          </Text>
          <View style={styles.sectionAccent} />

          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Funcionário</Text>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Função</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>
                Dias
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 1.3, textAlign: 'right' }]}>
                Total Horas
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>
                Média/Dia
              </Text>
            </View>
            {funcionarios.map((f, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                wrap={false}
              >
                <Text style={[styles.tableCellBold, { flex: 3 }]}>{f.nome}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{f.funcao || '—'}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {f.dias}
                </Text>
                <Text
                  style={[styles.tableCellBold, { flex: 1.3, textAlign: 'right' }]}
                >
                  {f.totalHorasLabel}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>
                  {f.mediaDiaLabel}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <PageFooter geradoEm={geradoEm} empresa={empresa} />
      </Page>
    </Document>
  );
}
